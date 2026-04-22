# Sprint 5 Workflow Engine Handoff

**Date:** April 22, 2026  
**Vue App Commit:** `037ea76`  
**Status:** ✅ Vue App Ready for Integration  

---

## Executive Summary

The Xayma.sh Vue management app has completed all frontend implementation for Sprint 5. The application is now ready to hand off to the workflow engine team for implementing the 6 automation workflows that drive credit management, deployment lifecycle, and multi-channel notifications.

This document serves as the bridge between the Vue app and the workflow engine (n8n) team. All detailed technical specifications are in `docs/workflow-engine-sprint5-contracts.md`.

---

## What the Workflow Engine Team Needs to Build

### Critical Path (Sprint 5 Requirements)

These 5 workflows are **required** for Sprint 5 completion and core platform functionality:

#### 1. **5.3 — Credit Deduction Cron**
- **Trigger:** Schedule, every 15 minutes (`*/15 * * * *` UTC)
- **Input:** Active deployments with service plans from database
- **Output:** Publishes `CREDIT_DEBIT` events to Kafka topic `credit.debit`
- **Logic:** Calculate per-15-minute credit consumption and emit one message per active deployment
- **Error Handling:** Retry database queries; log failures to Sentry
- **Status Check:** Verify 10 active deployments produce 10 Kafka messages every 15 minutes

#### 2. **5.4 — credit.debit Consumer**
- **Trigger:** Kafka consumer, topic `credit.debit`, group `we-credit-debit-consumer`
- **Input:** `CREDIT_DEBIT` events with partner_id, deployment_id, amount
- **Output:** 
  - Atomically decrement partner balance
  - Insert transaction record
  - Publish `DEPLOYMENT_SUSPEND` events if balance ≤ 0 and conditions met
- **Logic:** Lock partner record, debit balance, check suspension condition, publish if needed
- **Error Handling:** Transient errors (DB locked) → retry 3x with backoff; permanent errors → log and continue
- **Status Check:** Test with balance 10, debit 15; verify balance = -5 and suspension published

#### 3. **5.5 — deployment.suspend Consumer**
- **Trigger:** Kafka consumer, topic `deployment.suspend`, group `we-suspend-consumer`
- **Input:** `DEPLOYMENT_SUSPEND` events with deployment_id, reason (e.g., `ZERO_BALANCE`)
- **Output:**
  - Call deployment engine `/stop` API
  - Mark deployment as `suspended` in database
  - Publish `NOTIFICATION_SEND` event
- **Logic:** Stop container via deployment engine, update DB, fan-out notification
- **Error Handling:** Deployment engine 4xx (already stopped) → warn and continue; 5xx → retry
- **Status Check:** Verify notification published after suspension

#### 4. **5.6 & 5.7 — Resumption Logic**
Two linked consumers that handle deployment restart after credit top-up:

**5.6 — credit.topup Consumer**
- **Trigger:** Kafka consumer, topic `credit.topup`, group `we-credit-topup-consumer`
- **Input:** `CREDIT_TOPUP` events (published by payment IPN webhook, Task 4.7)
- **Output:** Query suspended deployments, publish `DEPLOYMENT_RESUME` events for each

**5.7 — deployment.resume Consumer**
- **Trigger:** Kafka consumer, topic `deployment.resume`, group `we-resume-consumer`
- **Input:** `DEPLOYMENT_RESUME` events with deployment_id
- **Output:**
  - Call deployment engine `/start` API
  - Mark deployment as `active` in database
  - Publish `NOTIFICATION_SEND` event
- **Error Handling:** Deployment engine 5xx → log to Sentry, mark active anyway (engine will retry)

#### 5. **5.8 — notification.send Consumer (Kafka Fan-Out)**
- **Trigger:** Kafka consumer, topic `notification.send`, group `we-notification-fanout`
- **Input:** Single `NOTIFICATION_SEND` event
- **Output:** 4 parallel outbound calls (in-app, WhatsApp, Email, SMS)
- **Parallel Branches:**
  - **In-app:** INSERT into `notifications` table
  - **WhatsApp:** POST to RapidPro `flow_starts.json` endpoint
  - **Email:** POST to Brevo SMTP API with template
  - **SMS:** POST to Africa's Talking API
- **Error Handling:** Branch failures are isolated; failure in one branch doesn't block others
- **Status Check:** 1 message produces 4 outbound requests; verify each channel receives correct payload

---

### Optional (Post-Sprint 5)

#### 6. **5.14 — Kafka Consumer Lag Monitoring**
- **Trigger:** Schedule, every 5 minutes (`*/5 * * * *` UTC)
- **Purpose:** Monitor health of all Kafka consumers
- **Output:** Publish `kafka.consumer.lag` metrics to Datadog
- **Deployment:** After Sprint 5, for ops visibility

---

## Platform Settings Required

All settings are stored in `xayma_app.settings` table (key/value pairs). Workflow engine must load these at startup and refresh on each invocation.

| Key | Type | Required | Example | Workflow(s) |
|-----|------|----------|---------|------------|
| `deployment_engine_base_url` | URL | Yes | `https://deployment-engine.xayma.sh` | 5.5, 5.7 |
| `deployment_engine_api_token` | String | Yes | `sk_live_...` | 5.5, 5.7 |
| `rapidpro_api_token` | String | Yes | `abcd1234...` | 5.8 (WhatsApp) |
| `rapidpro_base_url` | URL | No | `https://api.rapidpro.io` | 5.8 (WhatsApp) |
| `rapidpro_flow_uuid_deployment_suspended` | UUID | Yes | `550e8400-...` | 5.8 (WhatsApp) |
| `rapidpro_flow_uuid_deployment_resumed` | UUID | Yes | `550e8400-...` | 5.8 (WhatsApp) |
| `brevo_api_key` | String | Yes | `xkeysib-...` | 5.8 (Email) |
| `brevo_from_email` | Email | No | `noreply@xayma.sh` | 5.8 (Email) |
| `brevo_template_id_deployment_suspended` | Integer | Yes | `1` | 5.8 (Email) |
| `brevo_template_id_deployment_resumed` | Integer | Yes | `2` | 5.8 (Email) |
| `africas_talking_api_key` | String | Yes | `atsk_...` | 5.8 (SMS) |
| `africas_talking_username` | String | Yes | `xayma_prod` | 5.8 (SMS) |
| `africas_talking_from_sender` | String | Yes | `XAYMA` | 5.8 (SMS) |
| `datadog_api_key` | String | No | `dd_...` | 5.14 (monitoring) |

**Note:** The `deployment_engine_api_token` and other external service keys are sensitive — store only in workflow engine environment variables, never commit to any repo.

---

## Kafka Topics Reference

All topics use the partition keys listed below to ensure ordering guarantees per partition.

| Topic | Partition Key | Producer | Consumer | Partition Strategy |
|-------|---------------|----------|----------|------------------|
| `credit.debit` | `partner_id` | 5.3 Cron | 5.4 | All debit events for a partner go to same partition → ordered by timestamp |
| `deployment.suspend` | `deployment_id` | 5.4 (conditional) | 5.5 | One suspension per deployment |
| `deployment.resume` | `deployment_id` | 5.6 (loop) | 5.7 | Multiple resumes (one per suspended deployment) |
| `credit.topup` | `partner_id` | 4.7 IPN, 4.20 Voucher | 5.6 | All topup events for a partner ordered |
| `notification.send` | `partner_id` | 5.5, 5.7 | 5.8 | All notifications for a partner grouped |

**Implementation Notes:**
- Use Kafka producer's built-in retry mechanism for publish failures
- Consumer groups must be created in Kafka before workflows start consuming
- Use database service (Supabase) JavaScript SDK for all database operations — credentials are in workflow engine environment variables
- All timestamps in payloads must be ISO 8601 UTC format

---

## Integration Testing Checklist

Before signing off on Sprint 5 completion, verify the following end-to-end:

### Credit Deduction (5.3 → 5.4)
- [ ] Cron fires every 15 minutes; check workflow engine logs for executions
- [ ] 10 active deployments with Starter plan (100 credits/month) produce 10 `credit.debit` events
- [ ] Amount per event: `(100 * 15 / 43200)` = 0.034722... credits (verify calculation)
- [ ] Partner balance decrements atomically; no race conditions with concurrent debits
- [ ] Suspension triggered when balance ≤ 0 and `allowCreditDebt` = false OR debt ≥ threshold

### Deployment Suspend (5.5)
- [ ] Deployment engine API returns 200: verify deployment marked `suspended` in DB
- [ ] Deployment engine API returns 404: verify logged as warning, workflow continues
- [ ] `notification.send` event published with correct partner_id and reason
- [ ] Deployment status visible as "Suspended" in Vue app (Realtime update)

### Resumption (5.6 → 5.7)
- [ ] Partner with 3 suspended deployments receives credit top-up
- [ ] 5.6 queries DB, finds 3 suspended deployments, publishes 3 `deployment.resume` events
- [ ] 5.7 calls deployment engine `/start` for each deployment
- [ ] All 3 deployments marked `active` in DB
- [ ] Notifications published; Vue app shows all 3 as "Active" (Realtime)

### Notification Fan-Out (5.8)
- [ ] Single `notification.send` event produces 4 parallel HTTP requests:
  - [ ] In-app: row inserted in `notifications` table, `read=false`
  - [ ] WhatsApp: RapidPro `flow_starts.json` request sent with phone in E.164 format
  - [ ] Email: Brevo API request sent with correct template ID
  - [ ] SMS: Africa's Talking POST request sent with E.164 phone
- [ ] Failure in one branch (e.g., Brevo 5xx) doesn't block other branches
- [ ] Phone numbers correctly converted to E.164 format (see Appendix in contracts doc)

### Consumer Lag Monitoring (5.14)
- [ ] Cron fires every 5 minutes; check logs
- [ ] Datadog receives `kafka.consumer.lag` metrics for 5 consumer groups
- [ ] Lag values match Kafka UI consumer groups API

---

## Vue App Integration Points

The Vue app is ready to consume these workflows via:

1. **Realtime Subscriptions:** Listening to changes on `deployments.status` and `partners.remainingCredits`
2. **Settings Service:** Loading configuration from `xayma_app.settings` table
3. **Database Service Auth:** Using service role key in workflow engine (never exposed to browser)

The Vue app does **not** make direct HTTP calls to the deployment engine or send notifications — all business logic flows through the workflow engine.

---

## Reference Documentation

**For detailed implementation specifications, read:**
- `docs/workflow-engine-sprint5-contracts.md` — Full technical contract for all 6 workflows

**For database schema context:**
- `docs/specs/SPEC_05_DATABASE_DESIGN.md` — Table schemas, RLS policies, audit triggers
- `docs/specs/SPEC_06_API_SPECIFICATIONS.md` — Authentication, long-running operations, async patterns

**For Kafka and infrastructure:**
- `docs/kafka.md` — Kafka cluster setup, topics, consumer groups, KRaft configuration

---

## Contacts & Handoff

**Vue App Team:** Ready for integration  
**Database Service Project ID:** See `.env` for `SUPABASE_PROJECT_ID`  
**Workflow Engine Base URL:** Set via `VITE_WORKFLOW_ENGINE_BASE_URL` in Vue app  

### Next Steps

1. Clone/pull the Vue app repository
2. Set up 5 Kafka consumer groups in the KRaft cluster
3. Create all required settings keys in `xayma_app.settings` table
4. Implement workflows 5.3–5.8 in n8n following the contract specification
5. Run integration testing checklist above
6. Verify all 5 workflows in production logs; confirm consumer lag in Datadog

---

## Appendix: Key Contract Excerpts

For quick reference, key algorithmic details are below. For complete specifications, see `docs/workflow-engine-sprint5-contracts.md`.

### Credit Deduction Calculation
```javascript
// Per 15-minute cycle
const monthlyCreditConsumption = 100; // example Starter plan
const debitAmount = Math.round(
  (monthlyCreditConsumption * 15 / 43200) * 1000000
) / 1000000; // Round to 6 decimals
// Result: 0.034722 credits
```

### Suspension Trigger Logic
```javascript
IF (newBalance <= 0) AND (
  (allowCreditDebt === false) 
  OR (Math.abs(newBalance) >= creditDebtThreshold)
) THEN
  publishSuspensionEvent()
END IF
```

### E.164 Phone Format (West Africa)
```javascript
// Conversion examples:
'+221781234567'  // Senegal
'+225012345678'  // Côte d'Ivoire
'+223601234567'  // Mali
```

---

**Document Version:** 1.0  
**Last Updated:** April 22, 2026  
**For Questions:** Refer to CLAUDE.md for team contacts
