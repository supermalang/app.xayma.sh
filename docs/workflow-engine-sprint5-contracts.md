# Workflow Engine Automation Contracts — Sprint 5

This document specifies the automation workflows for Sprint 5 (Recurring Credit Deduction, Deployment Suspension/Resumption, Multi-channel Notifications, and Monitoring). These are implementation specifications for the workflow engine (n8n) operator.

---

## 5.3 — Credit Deduction Cron

**Purpose:** Periodically deduct credits from partners based on their active deployments' service plans.

**Trigger:** Schedule node, cron expression: `*/15 * * * *` (every 15 minutes, UTC)

**Workflow Steps:**

1. **Query Active Deployments with Service Plans**
   - HTTP GET to Supabase database service query endpoint (or use database service SQL node)
   - Query:
     ```sql
     SELECT 
       d.id AS deployment_id,
       d.partner_id,
       sp.monthlyCreditConsumption,
       s.label AS plan_label
     FROM xayma_app.deployments d
     JOIN xayma_app.serviceplans sp ON d.serviceplan_id = sp.id
     JOIN xayma_app.services s ON sp.service_id = s.id
     WHERE d.status = 'active'
     ORDER BY d.partner_id;
     ```
   - Expected output: Array of objects with `deployment_id`, `partner_id`, `monthlyCreditConsumption`, `plan_label`

2. **Code Node: Calculate Per-15-Minute Debit**
   - Input: Array of active deployments
   - Logic:
     ```javascript
     // 43200 seconds per 15 minutes = 43200 seconds in 300 seconds… wait, let me recalculate:
     // 15 minutes = 900 seconds
     // 1 month = 30 days * 24 hours * 60 minutes = 43200 minutes = 2,592,000 seconds
     // So: 15 minutes / 2,592,000 seconds per month = 15 / 43200 (in minutes)
     // Or: amount_per_15_min = monthlyCreditConsumption * (15 / 43200)
     
     const results = [];
     for (const deployment of items) {
       const monthlyCreditConsumption = deployment.monthlyCreditConsumption;
       // 15 minutes in 30-day month (43200 minutes)
       const debitAmount = Math.round(
         (monthlyCreditConsumption * 15 / 43200) * 1000000
       ) / 1000000; // Round to 6 decimals
       
       results.push({
         deployment_id: deployment.deployment_id,
         partner_id: deployment.partner_id,
         amount: debitAmount,
         plan_label: deployment.plan_label,
         timestamp: new Date().toISOString(),
         event_type: 'CREDIT_DEBIT'
       });
     }
     return results;
     ```
   - Output: Array of debit objects with `deployment_id`, `partner_id`, `amount` (6 decimals), `plan_label`, `timestamp`, `event_type`

3. **Kafka Publish: For Each Deployment**
   - Use Kafka producer node to publish to topic `credit.debit`
   - Partition key: `partner_id` (ensures all events for a partner go to same partition, maintaining order)
   - Payload per message:
     ```json
     {
       "event_type": "CREDIT_DEBIT",
       "deployment_id": "string (UUID)",
       "partner_id": "string (UUID)",
       "amount": 1.234567,
       "plan_label": "Starter",
       "timestamp": "2026-04-21T14:30:00Z"
     }
     ```
   - Parallel publish (iterate over results array)

**Notes:**
- Runs every 15 minutes; do NOT debit inactive/suspended deployments
- Amount is per 15-min slice; must be rounded to 6 decimals for precision
- Each deployment generates ONE Kafka message
- Timestamp must be ISO 8601 UTC

---

## 5.4 — credit.debit Consumer

**Purpose:** Process credit debit events, update partner balance atomically, and trigger suspension if balance reaches zero.

**Trigger:** Kafka consumer on topic `credit.debit`, consumer group: `we-credit-debit-consumer`

**Expected Input Payload:**
```json
{
  "event_type": "CREDIT_DEBIT",
  "deployment_id": "string (UUID)",
  "partner_id": "string (UUID)",
  "amount": 1.234567,
  "plan_label": "Starter",
  "timestamp": "2026-04-21T14:30:00Z"
}
```

**Workflow Steps:**

1. **Atomic Database Update: Decrement Credits**
   - Use Supabase SQL transaction node
   - SQL:
     ```sql
     BEGIN TRANSACTION;
     
     -- Fetch current balance (with FOR UPDATE lock to prevent race conditions)
     SELECT id, remainingCredits, allowCreditDebt, status 
     FROM xayma_app.partners
     WHERE id = $1
     FOR UPDATE;
     
     -- Decrement balance
     UPDATE xayma_app.partners
     SET remainingCredits = remainingCredits - $2,
         modified = NOW(),
         modifiedby = NULL  -- system process, no user
     WHERE id = $1;
     
     -- Get new balance
     SELECT remainingCredits FROM xayma_app.partners WHERE id = $1;
     
     COMMIT;
     ```
   - Bindings: `[$1 = partner_id, $2 = amount]`
   - Expected output: New `remainingCredits` value

2. **Insert Credit Transaction Record**
   - Supabase SQL INSERT
   - SQL:
     ```sql
     INSERT INTO xayma_app.credit_transactions (
       partner_id,
       transactionType,
       creditsUsed,
       creditsRemaining,
       paymentMethod,
       status,
       created,
       createdby
     ) VALUES (
       $1,
       'debit',
       $2,
       $3,
       'DEPLOYMENT_CHARGE',
       'completed',
       NOW(),
       NULL
     ) RETURNING id;
     ```
   - Bindings: `[$1 = partner_id, $2 = amount, $3 = new_remaining_credits_after_debit]`
   - Expected output: Transaction ID

3. **IF Node: Check Suspension Condition**
   - Evaluate:
     ```
     IF (new_balance <= 0) AND (
       (allowCreditDebt = false) 
       OR (ABS(new_balance) >= creditDebtThreshold)
     ) THEN
       → Go to Step 4 (Publish suspension event)
     ELSE
       → End workflow (no suspension needed)
     END IF
     ```
   - Inputs needed: `new_balance`, `allowCreditDebt`, `creditDebtThreshold` from partner record

4. **Publish Deployment Suspension Events**
   - For each ACTIVE deployment belonging to this partner:
     - Query:
       ```sql
       SELECT id FROM xayma_app.deployments
       WHERE partner_id = $1 AND status = 'active';
       ```
     - Kafka publish to topic `deployment.suspend` for EACH deployment:
       ```json
       {
         "event_type": "DEPLOYMENT_SUSPEND",
         "deployment_id": "string (UUID)",
         "partner_id": "string (UUID)",
         "reason": "ZERO_BALANCE",
         "timestamp": "2026-04-21T14:31:00Z"
       }
       ```
     - Partition key: `deployment_id`

**Error Handling:**
- If database transaction fails, retry up to 3 times with exponential backoff
- If balance update fails, log error to Sentry and continue (credit transaction may be incomplete; manual reconciliation needed)
- Kafka publish failures: use Kafka producer's built-in retry mechanism (broker-side)

---

## 5.5 — deployment.suspend Consumer

**Purpose:** Stop active deployments when credit balance reaches zero or debt threshold exceeded.

**Trigger:** Kafka consumer on topic `deployment.suspend`, consumer group: `we-suspend-consumer`

**Expected Input Payload:**
```json
{
  "event_type": "DEPLOYMENT_SUSPEND",
  "deployment_id": "string (UUID)",
  "partner_id": "string (UUID)",
  "reason": "ZERO_BALANCE",
  "timestamp": "2026-04-21T14:31:00Z"
}
```

**Workflow Steps:**

1. **HTTP Call: Deployment Engine Stop API**
   - HTTP POST to: `{VITE_DEPLOYMENT_ENGINE_BASE_URL}/deployments/{deployment_id}/stop`
   - Headers: `Authorization: Bearer {deployment_engine_api_token}` (from `xayma_app.settings.deployment_engine_api_token`)
   - Timeout: 30 seconds
   - Expected response: `{ "status": "stopped", "deployment_id": "...", "timestamp": "..." }`
   - On error (4xx/5xx): Skip to Step 3, log warning (deployment may already be stopped)

2. **Supabase Update: Mark Deployment as Suspended**
   - SQL:
     ```sql
     UPDATE xayma_app.deployments
     SET status = 'suspended',
         modified = NOW(),
         modifiedby = NULL
     WHERE id = $1;
     ```
   - Bindings: `[$1 = deployment_id]`
   - Expected output: Row count (should be 1)

3. **Publish Notification Event**
   - Kafka publish to topic `notification.send`:
     ```json
     {
       "event_type": "NOTIFICATION_SEND",
       "partner_id": "string (UUID)",
       "notification_type": "DEPLOYMENT_SUSPENDED",
       "user_id": null,
       "title": "Deployment Suspended",
       "message": "Your deployment '{deployment_id}' has been suspended due to insufficient credits.",
       "in_app": true,
       "whatsapp": true,
       "email": true,
       "sms": true,
       "template": "deployment_suspended",
       "context": {
         "deployment_id": "string (UUID)",
         "reason": "ZERO_BALANCE"
       },
       "timestamp": "2026-04-21T14:31:30Z"
     }
     ```
   - Partition key: `partner_id`

---

## 5.6 — credit.topup Consumer (Resumption Logic)

**Purpose:** Resume suspended deployments when partner receives a credit top-up.

**Trigger:** Kafka consumer on topic `credit.topup`, consumer group: `we-credit-topup-consumer`

**Expected Input Payload:**
```json
{
  "event_type": "CREDIT_TOPUP",
  "partner_id": "string (UUID)",
  "amount": 5000,
  "payment_method": "WAVE",
  "reference": "string (transaction_id)",
  "timestamp": "2026-04-21T15:00:00Z"
}
```

**Workflow Steps:**

1. **Query Suspended Deployments**
   - SQL:
     ```sql
     SELECT id FROM xayma_app.deployments
     WHERE partner_id = $1 AND status = 'suspended'
     ORDER BY created DESC;
     ```
   - Bindings: `[$1 = partner_id]`
   - Expected output: Array of deployment IDs (may be empty)

2. **For Each Suspended Deployment: Publish Resume Event**
   - Kafka publish to topic `deployment.resume` for EACH deployment:
     ```json
     {
       "event_type": "DEPLOYMENT_RESUME",
       "deployment_id": "string (UUID)",
       "partner_id": "string (UUID)",
       "credit_topup_amount": 5000,
       "timestamp": "2026-04-21T15:00:30Z"
     }
     ```
   - Partition key: `deployment_id`
   - If no deployments: workflow ends (no resume events published)

---

## 5.7 — deployment.resume Consumer

**Purpose:** Restart deployments after credit top-up.

**Trigger:** Kafka consumer on topic `deployment.resume`, consumer group: `we-resume-consumer`

**Expected Input Payload:**
```json
{
  "event_type": "DEPLOYMENT_RESUME",
  "deployment_id": "string (UUID)",
  "partner_id": "string (UUID)",
  "credit_topup_amount": 5000,
  "timestamp": "2026-04-21T15:00:30Z"
}
```

**Workflow Steps:**

1. **HTTP Call: Deployment Engine Start API**
   - HTTP POST to: `{VITE_DEPLOYMENT_ENGINE_BASE_URL}/deployments/{deployment_id}/start`
   - Headers: `Authorization: Bearer {deployment_engine_api_token}`
   - Timeout: 30 seconds
   - Expected response: `{ "status": "deploying", "deployment_id": "...", "timestamp": "..." }`
   - On error (4xx/5xx): Log to Sentry, continue to Step 2 (mark as active anyway; deployment engine will retry)

2. **Supabase Update: Mark Deployment as Active**
   - SQL:
     ```sql
     UPDATE xayma_app.deployments
     SET status = 'active',
         modified = NOW(),
         modifiedby = NULL
     WHERE id = $1;
     ```
   - Bindings: `[$1 = deployment_id]`

3. **Publish Notification Event**
   - Kafka publish to topic `notification.send`:
     ```json
     {
       "event_type": "NOTIFICATION_SEND",
       "partner_id": "string (UUID)",
       "notification_type": "DEPLOYMENT_RESUMED",
       "user_id": null,
       "title": "Deployment Resumed",
       "message": "Your deployment '{deployment_id}' has been resumed.",
       "in_app": true,
       "whatsapp": true,
       "email": true,
       "sms": true,
       "template": "deployment_resumed",
       "context": {
         "deployment_id": "string (UUID)",
         "credit_topup_amount": 5000
       },
       "timestamp": "2026-04-21T15:01:00Z"
     }
     ```
   - Partition key: `partner_id`

---

## 5.8 — notification.send Consumer (Kafka Fan-Out)

**Purpose:** Atomically fan-out notifications to 4 delivery channels (in-app, WhatsApp, Email, SMS) from a single Kafka event.

**Trigger:** Kafka consumer on topic `notification.send`, consumer group: `we-notification-fanout`

**Expected Input Payload:**
```json
{
  "event_type": "NOTIFICATION_SEND",
  "partner_id": "string (UUID)",
  "notification_type": "DEPLOYMENT_SUSPENDED" | "DEPLOYMENT_RESUMED" | "CREDIT_LOW" | "CREDIT_TOPUP" | "CREDIT_EXPIRY",
  "user_id": "UUID (nullable, if null send to all partner users)",
  "title": "string",
  "message": "string",
  "in_app": true,
  "whatsapp": true,
  "email": true,
  "sms": true,
  "template": "string (template key for messages)",
  "context": {
    "deployment_id": "UUID (optional)",
    "amount": "number (optional)",
    "reason": "string (optional)"
  },
  "timestamp": "2026-04-21T15:01:00Z"
}
```

**Workflow Steps:**

1. **Determine Recipient(s)**
   - If `user_id` is provided: use single user
   - If `user_id` is null:
     ```sql
     SELECT id, email, phone FROM xayma_app.users
     WHERE company_id = (
       SELECT id FROM xayma_app.partners WHERE id = $1
     );
     ```
   - Output: Array of user objects with `id`, `email`, `phone`

2. **Parallel Branches (Workflow Parallel Node)**
   - All 4 branches execute in parallel; failures in one branch do NOT block others

### **Branch 1: In-App Notification**

   - For each user:
     - SQL INSERT:
       ```sql
       INSERT INTO xayma_app.notifications (
         user_id,
         notification_type,
         title,
         message,
         related_entity_id,
         related_entity_type,
         read,
         created
       ) VALUES (
         $1,
         $2,
         $3,
         $4,
         $5,
         $6,
         false,
         NOW()
       ) RETURNING id;
       ```
     - Bindings: `[$1 = user_id, $2 = notification_type, $3 = title, $4 = message, $5 = deployment_id (or NULL), $6 = 'deployment' (or NULL)]`
   - No error handling; if INSERT fails, log to Sentry and continue

### **Branch 2: WhatsApp via RapidPro**

   - For each user with valid phone:
     - Fetch from `xayma_app.settings`:
       - `rapidpro_api_token`
       - `rapidpro_flow_uuid` (template UUID for this notification type)
       - `rapidpro_base_url` (default: `https://api.rapidpro.io`)
     - HTTP POST to `{rapidpro_base_url}/api/v2/flow_starts.json`
     - Headers:
       ```
       Authorization: Bearer {rapidpro_api_token}
       Content-Type: application/json
       ```
     - Body:
       ```json
       {
         "flow": "{rapidpro_flow_uuid}",
         "urns": ["tel:{phone_e164}"],
         "extra": {
           "partner_name": "string (from partners.name)",
           "title": "{title}",
           "message": "{message}",
           "context": {}
         }
       }
       ```
     - Note: Phone must be converted to E.164 format (e.g., `+221781234567`)
   - Error handling: 4xx (invalid phone, unknown flow) → log warning; 5xx → retry 3 times with backoff

### **Branch 3: Email via Brevo**

   - For each user with valid email:
     - Fetch from `xayma_app.settings`:
       - `brevo_api_key`
       - `brevo_template_id_{notification_type}` (template ID for this notification type, e.g., `brevo_template_id_deployment_suspended`)
       - `brevo_from_email` (default: `noreply@xayma.sh`)
     - HTTP POST to `https://api.brevo.com/v3/smtp/email`
     - Headers:
       ```
       api-key: {brevo_api_key}
       Content-Type: application/json
       ```
     - Body:
       ```json
       {
         "to": [
           {
             "email": "{user.email}",
             "name": "{user.firstname} {user.lastname}"
           }
         ],
         "templateId": {brevo_template_id},
         "params": {
           "partner_name": "string (from partners.name)",
           "title": "{title}",
           "message": "{message}",
           "deployment_id": "string (from context, if present)",
           "amount": "string (from context, if present)",
           "dashboard_url": "https://app.xayma.sh"
         },
         "headers": {
           "X-Mailer": "Xayma.sh Notification System"
         }
       }
       ```
   - Error handling: 4xx (invalid template, bad email) → log warning; 5xx → retry 3 times

### **Branch 4: SMS via Africa's Talking**

   - For each user with valid phone:
     - Fetch from `xayma_app.settings`:
       - `africas_talking_api_key`
       - `africas_talking_username` (account username)
       - `africas_talking_from_sender` (sender ID/shortcode, e.g., `XAYMA`)
     - Compose SMS text:
       ```
       {title}: {message}
       ```
     - Truncate to 160 characters (if longer, send as concatenated SMS; Africa's Talking handles this)
     - HTTP POST to `https://api.africastalking.com/version1/messaging`
     - Headers:
       ```
       Accept: application/json
       Content-Type: application/x-www-form-urlencoded
       ```
     - Body (form-encoded):
       ```
       username={africas_talking_username}&
       APIkey={africas_talking_api_key}&
       recipients={phone_e164}&
       message={sms_text}&
       shortCode={africas_talking_from_sender}
       ```
     - Note: Phone must be E.164 format
   - Error handling: 4xx (invalid phone) → log warning; 5xx → retry 3 times

---

## 5.14 — Kafka Consumer Lag → Datadog Monitoring

**Purpose:** Monitor health of Kafka consumers by publishing consumer lag metrics to Datadog.

**Trigger:** Schedule node, cron expression: `*/5 * * * *` (every 5 minutes, UTC)

**Workflow Steps:**

1. **HTTP GET: Kafka UI Consumer Metrics**
   - HTTP GET to Kafka UI API (Kafka UI runs on CX32 at `http://localhost:8080` or via reverse proxy)
   - Endpoint: `http://kafka-ui.internal.xayma.sh/api/clusters/0/consumer-groups` (or via settings table)
   - Expected response:
     ```json
     [
       {
         "name": "we-credit-debit-consumer",
         "lag": 0,
         "members": 1
       },
       {
         "name": "we-suspend-consumer",
         "lag": 0,
         "members": 1
       },
       ...
     ]
     ```
   - Error: If Kafka UI unavailable, log to Sentry and skip to next interval

2. **Code Node: Format Metrics for Datadog**
   - Input: Array of consumer group objects
   - Logic:
     ```javascript
     const datadog_metrics = [];
     const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp
     
     for (const group of items) {
       datadog_metrics.push({
         metric: "kafka.consumer.lag",
         points: [
           [timestamp, group.lag]
         ],
         type: "gauge",
         tags: [
           `consumer_group:${group.name}`,
           "service:workflow-engine",
           "environment:production"
         ]
       });
     }
     
     return datadog_metrics;
     ```
   - Output: Array of Datadog metric objects

3. **HTTP POST: Datadog Metrics API**
   - HTTP POST to: `https://api.datadoghq.com/api/v1/series`
   - Headers:
     ```
     DD-API-KEY: {datadog_api_key}
     Content-Type: application/json
     ```
     - Fetch `datadog_api_key` from `xayma_app.settings.datadog_api_key`
   - Body:
     ```json
     {
       "series": [
         {
           "metric": "kafka.consumer.lag",
           "points": [[1713696600, 0]],
           "type": "gauge",
           "tags": [
             "consumer_group:we-credit-debit-consumer",
             "service:workflow-engine",
             "environment:production"
           ]
         },
         ...
       ]
     }
     ```
   - Timeout: 10 seconds
   - Error handling: Log to Sentry; do NOT fail the workflow (metrics can be skipped)

---

## Kafka Topic Reference

All topics used in Sprint 5 workflows:

| Topic | Partition Key | Trigger | Consumer |
|-------|---------------|---------|----------|
| `credit.debit` | `partner_id` | 5.3 Cron | 5.4 credit.debit Consumer |
| `deployment.suspend` | `deployment_id` | 5.4 IF condition met | 5.5 deployment.suspend Consumer |
| `deployment.resume` | `deployment_id` | 5.6 credit.topup loop | 5.7 deployment.resume Consumer |
| `credit.topup` | `partner_id` | 4.7 IPN Webhook, 4.20 Voucher Redemption | 5.6 credit.topup Consumer |
| `notification.send` | `partner_id` | 5.5, 5.7 publish | 5.8 notification.send Consumer |

---

## Settings Table Keys (xayma_app.settings)

All settings fetched at workflow startup and cached in memory. Reload on each workflow invocation to support hot-updates.

| Key | Type | Required | Example | Description |
|-----|------|----------|---------|-------------|
| `deployment_engine_base_url` | URL | Yes | `https://deployment-engine.xayma.sh` | Base URL for deployment engine API |
| `deployment_engine_api_token` | String | Yes | `sk_live_...` | Bearer token for deployment engine API |
| `rapidpro_api_token` | String | Yes | `abcd1234...` | RapidPro API authentication token |
| `rapidpro_base_url` | URL | No | `https://api.rapidpro.io` | RapidPro API base URL (defaults to RapidPro cloud) |
| `rapidpro_flow_uuid_deployment_suspended` | UUID | Yes | `550e8400-e29b-41d4-a716-446655440000` | RapidPro flow UUID for deployment suspended notifications |
| `rapidpro_flow_uuid_deployment_resumed` | UUID | Yes | `550e8400-e29b-41d4-a716-446655440001` | RapidPro flow UUID for deployment resumed notifications |
| `rapidpro_flow_uuid_credit_low` | UUID | No | `550e8400-e29b-41d4-a716-446655440002` | RapidPro flow UUID for low credit alerts |
| `brevo_api_key` | String | Yes | `xkeysib-...` | Brevo (formerly Sendinblue) API key |
| `brevo_from_email` | Email | No | `noreply@xayma.sh` | Sender email address for Brevo (must be verified domain) |
| `brevo_template_id_deployment_suspended` | Integer | Yes | `1` | Brevo template ID for suspension emails |
| `brevo_template_id_deployment_resumed` | Integer | Yes | `2` | Brevo template ID for resumption emails |
| `brevo_template_id_credit_low` | Integer | No | `3` | Brevo template ID for credit warnings |
| `africas_talking_api_key` | String | Yes | `atsk_...` | Africa's Talking API key |
| `africas_talking_username` | String | Yes | `xayma_prod` | Africa's Talking account username |
| `africas_talking_from_sender` | String | Yes | `XAYMA` | Africa's Talking sender ID (5-11 alphanumeric) |
| `datadog_api_key` | String | No | `dd_...` | Datadog API key for metrics publishing |

---

## Database Tables

All tables live in schema `xayma_app`.

### xayma_app.deployments
- Columns used: `id`, `partner_id`, `status` (ENUM: pending_deployment, deploying, failed, active, stopped, suspended, archived)
- RLS enforced: Yes (customers see only own deployments)

### xayma_app.partners
- Columns used: `id`, `remainingCredits`, `allowCreditDebt`, `creditDebtThreshold`, `status`
- RLS enforced: Yes (customers see only own partner record)

### xayma_app.credit_transactions
- Columns used: `id` (PK), `partner_id` (FK), `transactionType` (ENUM: credit, debit), `creditsUsed`, `creditsRemaining`, `paymentMethod`, `status` (ENUM: pending, completed, failed), `created`, `createdby`
- Audit logged: Yes (general_audit trigger)
- RLS enforced: No (workflow engine writes via service role)

### xayma_app.notifications
- Columns used: `id`, `user_id`, `notification_type`, `title`, `message`, `related_entity_id`, `related_entity_type`, `read`, `created`
- RLS enforced: Yes (users see only own notifications)
- Note: `user_id` must be UUID (foreign key to auth.users)

### xayma_app.users
- Columns used: `id`, `company_id`, `email`, `phone`, `firstname`, `lastname`
- RLS enforced: Yes
- Note: `id` is UUID (from auth.uid())

### xayma_app.serviceplans
- Columns used: `id`, `label`, `monthlyCreditConsumption`
- No write operations; read-only

### xayma_app.settings
- Columns used: `key`, `value`, `description`, `updatedAt`
- RLS enforced: No (admin-only updates via admin role or API)
- All values stored as VARCHAR; no type conversions needed (parse JSON if complex type)

---

## Error Handling Patterns

All workflow engine consumers follow these error patterns:

**Transient Errors (5xx, network timeout):**
- Retry up to 3 times with exponential backoff (1s, 2s, 4s)
- If all retries fail, publish to Kafka DLQ (Dead Letter Queue) or Sentry for manual investigation

**Permanent Errors (4xx, malformed payload, missing settings):**
- Log full error context to Sentry with Kafka message offset
- Do NOT retry
- Continue processing next message (do not stop consumer)

**Database Errors (constraint violation, RLS denial):**
- Log to Sentry with SQL error text
- Retry transaction once
- If second attempt fails, log and continue (partition may be in bad state; operator must investigate)

---

## Testing & Validation

### Credit Deduction (5.3)
- [ ] Verify cron fires every 15 minutes (check logs)
- [ ] Verify 10 active deployments produce 10 Kafka messages to `credit.debit`
- [ ] Verify amount calculation: `(100 * 15 / 43200)` = 0.034722... credits per 15-min for Starter plan
- [ ] Verify timestamp is current UTC

### Credit Debit Consumer (5.4)
- [ ] Send 5 messages for same partner, verify balance decrements 5 times
- [ ] Partner with balance 10, debit 15: verify balance = -5
- [ ] With allowCreditDebt=false and balance <= 0: verify `deployment.suspend` published
- [ ] With allowCreditDebt=true: verify NO suspension event

### Deployment Suspend (5.5)
- [ ] Deployment API returns success: verify deployment status = 'suspended' in DB
- [ ] Deployment API returns 404 (already stopped): verify log warning, continue
- [ ] Verify `notification.send` published

### Deployment Resume (5.7)
- [ ] Deployment API returns success: verify deployment status = 'active' in DB
- [ ] Deployment API returns 5xx: verify log to Sentry, status still marked active
- [ ] Verify `notification.send` published

### Notification Fan-Out (5.8)
- [ ] 1 `notification.send` message produces 4 parallel outbound calls (in-app, WhatsApp, Email, SMS)
- [ ] In-app: verify row in notifications table with `read=false`
- [ ] WhatsApp: verify RapidPro flow_starts.json request sent
- [ ] Email: verify Brevo API request sent with correct template ID
- [ ] SMS: verify Africa's Talking POST sent with E.164 phone
- [ ] 1 branch fails (e.g., Brevo 5xx): verify other 3 branches still execute

### Consumer Lag (5.14)
- [ ] Cron fires every 5 minutes (check logs)
- [ ] Datadog receives `kafka.consumer.lag` metric for each consumer group
- [ ] Lag value matches Kafka UI consumer groups API

---

## Version History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-04-21 | Sprint 5 Team | Initial contract definitions for Tasks 5.3–5.10, 5.14 |

---

## Appendix: E.164 Phone Number Format

All WhatsApp and SMS operations require phone numbers in E.164 format.

**Format:** `+{country_code}{national_number}` (no spaces, dashes, or parentheses)

**Examples (West Africa):**
- Senegal (+221): `+221781234567`
- Côte d'Ivoire (+225): `+225012345678`
- Mali (+223): `+223601234567`

**Conversion logic (JavaScript):**
```javascript
function toE164(phone, countryCode = '221') {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If already has country code, ensure format
  if (cleaned.startsWith(countryCode)) {
    return '+' + cleaned;
  }
  
  // Otherwise prepend country code
  return '+' + countryCode + cleaned;
}

// Examples:
toE164('781234567', '221') // => '+221781234567'
toE164('70 123 4567', '221') // => '+221701234567'
toE164('+221781234567') // => '+221781234567'
```

---

## Appendix: Deployment Engine API Reference

### POST /deployments/{deployment_id}/stop

**Purpose:** Stop a running deployment (pause containers, release resources).

**Response (200 OK):**
```json
{
  "status": "stopped",
  "deployment_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-21T14:31:30Z"
}
```

**Errors:**
- `404 Not Found`: Deployment doesn't exist
- `409 Conflict`: Deployment is already in stopped/suspended state
- `500 Internal Server Error`: Infrastructure failure

### POST /deployments/{deployment_id}/start

**Purpose:** Start a previously stopped deployment (resume containers).

**Response (200 OK):**
```json
{
  "status": "deploying",
  "deployment_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-21T15:01:00Z"
}
```

**Errors:**
- `404 Not Found`: Deployment doesn't exist
- `409 Conflict`: Deployment is already active/deploying
- `500 Internal Server Error`: Infrastructure failure

---

## Appendix: Brevo Email Template Variables

All Brevo templates referenced in Branch 3 must accept these `params`:

```javascript
{
  "partner_name": "ACME Corp",
  "title": "Deployment Suspended",
  "message": "Your deployment has been suspended due to insufficient credits.",
  "deployment_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": "5000",
  "dashboard_url": "https://app.xayma.sh"
}
```

Templates must be pre-created in Brevo account and IDs stored in `xayma_app.settings`.

---

## Appendix: RapidPro Flow Context Variables

All RapidPro flows referenced in Branch 2 must accept `extra` context:

```javascript
{
  "partner_name": "ACME Corp",
  "title": "Deployment Suspended",
  "message": "Your deployment has been suspended due to insufficient credits.",
  "context": {}
}
```

Flows are invoked via `flow_starts.json` endpoint; ensure flow UUIDs match the notification type.
