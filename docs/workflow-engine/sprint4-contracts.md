# Workflow Engine Webhook Contracts

This document defines the contract specifications for all workflow engine webhooks used in Sprint 4 (Credits & Payments). These are implementation specifications for the n8n workflow engine automation tasks.

The PayTech-specific contracts below derive **only** from the official PayTech
documentation (https://doc.intech.sn/doc_paytech.php) and the PayTech Postman
collection (https://doc.intech.sn/PayTech%20x%20DOC.postman_collection.json).
Anything not present in those two sources is flagged explicitly as undocumented.

---

## Task 4.5: Initiate Checkout (`/webhook/initiate-checkout`)

**Purpose:** Create a `pending` `credit_transactions` row and call PayTech's
`request-payment` endpoint, then return the hosted-checkout URL to Vue so the
browser can redirect.

**Trigger:** Vue POST from `src/services/workflow-engine.ts` `initiateCheckout()`.

**HTTP Method:** POST

**Request Body (from Vue):**
```json
{
  "bundleId":          "string (CreditBundle.id)",
  "partnerId":         "string (UUID, partners.id)",
  "paymentGatewayId":  "string (PaymentGateway.id from xayma_app.settings['PAYMENT_GATEWAYS'])"
}
```

**Workflow Engine Steps:**

1. Load `CreditBundle` for `bundleId` and `PaymentGateway` for `paymentGatewayId`
   from `xayma_app.settings`.
2. Generate a fresh `ref_command` (the existing `XAY-XXX-XXX` format produced
   by `Buy.vue` is already passed through; if absent, mint one server-side).
3. Insert `credit_transactions` row: `{ partner_id, type: 'CREDIT',
   amount: bundle.priceXOF, status: 'PENDING', reference: ref_command,
   payment_method: gateway.provider }`. Capture the new `transactionId`.
4. POST PayTech (auth via headers, body as JSON):
   ```
   POST https://paytech.sn/api/payment/request-payment
   Headers:
     API_KEY:    <gateway.apiKey>
     API_SECRET: <gateway.secretKey>
   Body:
     {
       "item_name":    "<bundle.label>",
       "item_price":   <bundle.priceXOF>,                 // integer FCFA
       "ref_command":  "<ref_command>",
       "command_name": "<bundle.label> credits topup",
       "currency":     "XOF",
       "env":          "prod" | "test",                    // gateway.mode → env
       "ipn_url":      "<gateway.ipnUrl>",
       "success_url":  "<gateway.successUrl>",
       "cancel_url":   "<gateway.cancelUrl>",
       "custom_field": "<base64(JSON({ transactionId }))>"  // belt-and-suspenders
     }
   ```
   Mapping: `gateway.mode === 'live'` → `env: "prod"`; `gateway.mode === 'sandbox'`
   → `env: "test"`. Same base URL `https://paytech.sn/api` for both.

5. On PayTech `{ success: 1, token, redirect_url }`: persist `token` against
   the `credit_transactions` row (in a `gateway_token` column or a
   `gateway_meta` JSONB blob — choose at the workflow-engine team's discretion;
   not currently a hard requirement of the schema).

6. Reply to Vue (HTTP 200):
   ```json
   {
     "paymentUrl":    "<redirect_url>",
     "transactionId": "<our credit_transactions.id>",
     "reference":     "<ref_command>"
   }
   ```

**Failure handling:**

- PayTech `{ "success": 0 | -1, "message": "..." }` → mark
  `credit_transactions` row `FAILED`, return HTTP 502 to Vue with
  `{ "error": "GATEWAY_REJECTED", "message": "<paytech message>" }`.
- Network/5xx to PayTech → the Vue caller already implements retry with
  exponential backoff in `callWorkflowEngineWebhookWithResponse`; the workflow
  engine itself should not retry the PayTech call inside one request (PayTech
  may have already created the session — re-tries risk duplicate sessions for
  the same `ref_command`).
- Validation errors on the inbound Vue payload → 400.

---

## Task 4.7 & 4.8: PayTech IPN Processing (`/webhook/payment-ipn`)

**Purpose:** Process PayTech Instant Payment Notifications and atomically
update transaction status + partner credit balance.

**Trigger:** PayTech POSTs the IPN to `gateway.ipnUrl` after payment settles.
Async — may arrive before the browser redirect to `success_url` returns.

**HTTP Method:** POST  · **Content-Type:** PayTech sends `application/x-www-form-urlencoded`
(per the Postman collection's IPN sample); accept JSON too defensively.

**Request Body (PayTech → us):**
```
type_event:           "sale_complete" | "sale_canceled" | "refund_complete"
                      | "transfer_success" | "transfer_failed"
ref_command:          string  (matches what we sent in initiate-checkout)
token:                string  (PayTech payment token)
item_name:            string
item_price:           integer (FCFA)
currency:             string  ("XOF" etc.)
command_name:         string
env:                  "prod" | "test"
payment_method:       string  (e.g. "Orange Money", "Wave", "Carte Bancaire")
client_phone:         string
custom_field:         string  (Base64 JSON we set during initiate-checkout)
final_item_price:     integer (price actually charged, post-promo)
final_item_price_xof: integer
initial_item_price:   integer (pre-promo)
initial_item_price_xof: integer
promo_enabled:        boolean
promo_value_percent:  number  (when promo_enabled)

# auth fields — verify at least one of:
hmac_compute:         hex string  (HMAC-SHA256, see Verification below)
api_key_sha256:       hex string  (SHA256(API_KEY))
api_secret_sha256:    hex string  (SHA256(API_SECRET))
```

**Verification (PayTech-documented):**

Preferred: `HMAC-SHA256` over the literal string
`"${final_item_price}|${ref_command}|${api_key}"` signed with `api_secret`,
then constant-time-compare to `hmac_compute` (hex digest — encoding implied by
PayTech's JS examples but not explicitly stated in the docs).

Fallback: equality-compare `api_key_sha256 === SHA256(gateway.apiKey)` AND
`api_secret_sha256 === SHA256(gateway.secretKey)`.

Mismatch on both → reject with HTTP 401.

**Branching on `type_event`:**

| `type_event`       | Action |
|---|---|
| `sale_complete`    | Idempotent credit (see Success Flow below). |
| `sale_canceled`    | Mark `credit_transactions` row `FAILED`. No balance change. |
| `refund_complete`  | Reverse the credit: insert a `DEBIT` row referencing the original `ref_command`, decrement `partners.remainingCredits`. |
| `transfer_success` / `transfer_failed` | Out of scope for the topup flow (relate to the `transferFund` API, see Postman collection); ignore for credit-topup IPNs. |

**Success Flow (`type_event === "sale_complete"`):**

1. **Idempotency check** — keyed by `ref_command`:
   ```sql
   SELECT id, status FROM xayma_app.credit_transactions
   WHERE reference = $1 FOR UPDATE;
   ```
   If the row's `status` is already `COMPLETED`, reply HTTP 200 body `OK` and stop.

2. **Atomic update:**
   ```sql
   BEGIN;
   UPDATE xayma_app.credit_transactions
     SET status='COMPLETED', modified=NOW()
     WHERE reference = $1;
   UPDATE xayma_app.partners
     SET remainingCredits = remainingCredits + $2
     WHERE id = $3;
   INSERT INTO general_audit (...) VALUES (...);
   COMMIT;
   ```
   The `$2` amount is `final_item_price_xof` from the IPN (post-promo charged
   amount) — not the original `bundle.priceXOF`, in case PayTech applied a
   promotion.

3. **Downstream credit event** — publish `CREDIT_TOPUP` per the existing
   Sprint 5 webhook-bridge pattern (Kafka is provided by the external
   `infra-kafka-setup` project; this repo emits via the workflow-engine
   bridge — see `kafka_external_dependency.md`). Payload:
   ```json
   {
     "event_type":     "CREDIT_TOPUP",
     "partner_id":     "<UUID>",
     "amount":         <final_item_price_xof>,
     "payment_method": "<IPN payment_method>",
     "reference":      "<ref_command>",
     "timestamp":      "<ISO 8601>"
   }
   ```

**Response to PayTech:**

PayTech expects HTTP 200 with the **plain-text body `OK`**. Returning JSON or
any non-200 may trigger a re-delivery; PayTech's exact retry policy is **not
documented**.

**Error responses (to PayTech):**

| Condition | Status | Body |
|---|---|---|
| Auth verification failed (both hmac_compute and the SHA256 pair fail) | 401 | `Invalid signature` |
| Required field missing (`ref_command`, `type_event`, etc.) | 400 | `Invalid payload` |
| `ref_command` not found in `credit_transactions` | 404 | `Transaction not found` |
| DB transaction failed | 500 | `Database error` |

---

## Task 4.14: Credit Expiry Cron Job

**Purpose:** Daily scheduled job to expire credits that have passed their expiration date.

**Trigger:** Cron schedule: `0 0 5 * * *` (05:00 UTC daily)

**Logic:**

```sql
BEGIN TRANSACTION;

-- Find all partners with expired credits and remaining balance > 0
SELECT id, remainingCredits FROM partners 
WHERE creditExpiryDate < NOW() 
  AND remainingCredits > 0 
  AND status != 'INACTIVE';

FOR EACH partner:
  -- Zero out balance
  UPDATE partners SET remainingCredits = 0 WHERE id = partner_id;
  
  -- Insert EXPIRY transaction
  INSERT INTO credit_transactions (
    partner_id, type, amount, status, reference, reason
  ) VALUES (
    partner_id, 'EXPIRY', remainingCredits, 'COMPLETED', 
    'AUTO_EXPIRY_' || DATE(NOW()), 
    'Credits expired on ' || TO_CHAR(creditExpiryDate, 'YYYY-MM-DD')
  );
  
  -- Insert audit record
  INSERT INTO general_audit (...) VALUES (...);

COMMIT;
```

**Kafka Event:** For each expired partner, publish to `credit.expiry`:
```json
{
  "event_type": "CREDIT_EXPIRY",
  "partner_id": "UUID",
  "amount_expired": 5000,
  "previous_balance": 5000,
  "new_balance": 0,
  "timestamp": "ISO 8601 datetime"
}
```

**Notification:** Send email to partner `support@xayma.sh` template `credit_expiry_notification`:
```
Subject: Your Xayma credits have expired
Body: 
  Dear {{partner_name}},
  Your Xayma credits worth {{amount_expired}} FCFA expired on {{expiry_date}}.
  Your current balance is {{new_balance}} FCFA.
  Click here to purchase new credits: {{dashboard_link}}/credits/buy
```

---

## Task 4.15: Credit Debt & Suspension Logic

**Purpose:** Suspend partners when they reach zero or negative balance (if `allowCreditDebt=false`).

**Trigger:** Kafka consumer on `credit.debit` topic.

**Consumer Logic:**

```ts
ON credit.debit MESSAGE:
  
  GET partner where partner_id = message.partner_id
  GET current balance from partners.remainingCredits
  
  IF balance <= 0 AND allowCreditDebt = false THEN
    -- Suspend account
    UPDATE partners SET status='SUSPENDED', updated_at=NOW() 
    WHERE id = partner_id;
    
    INSERT INTO general_audit (...) VALUES (...);
    
    PUBLISH TO credit.suspension:
    {
      event_type: "PARTNER_SUSPENDED",
      partner_id: message.partner_id,
      reason: "ZERO_BALANCE",
      suspension_date: NOW(),
      balance: balance
    }
    
    SEND EMAIL to partner with subject:
    "Your Xayma account has been suspended"
    Body: "Your deployments are paused. Purchase credits to resume."
  
  ELSE IF balance > 0 AND status='SUSPENDED' THEN
    -- Resume account (credit was added while suspended)
    UPDATE partners SET status='ACTIVE', updated_at=NOW() 
    WHERE id = partner_id;
    
    PUBLISH TO credit.resumption:
    {
      event_type: "PARTNER_RESUMED",
      partner_id: message.partner_id,
      resume_date: NOW(),
      new_balance: balance
    }
    
    SEND EMAIL to partner:
    "Your Xayma account has been reactivated"
    Body: "Your deployments are running again. Thank you for purchasing credits."
```

**Resumption Guard:** Before resuming, verify:
- `partners.status = 'SUSPENDED'`
- `partners.remainingCredits > 0`
- No failed deployments due to suspension (they stay paused; user must manually restart)

---

## Task 4.18: Voucher Generation (`/webhook/generate-vouchers`)

**Purpose:** Bulk-generate redeemable voucher codes.

**HTTP Method:** POST

**Authentication:** Bearer token (admin or sales role only)

**Request Body:**
```json
{
  "creditsAmount": 5000,
  "quantity": 100,
  "expiryDate": "2026-06-30T23:59:59Z",
  "partnerTypeRestriction": "CUSTOMER" | "RESELLER" | null,
  "targetPartnerId": "UUID (optional, if null codes are unrestricted)"
}
```

**Validation:**
- `creditsAmount > 0`
- `quantity > 0 && quantity <= 10000`
- `expiryDate > NOW()`
- If `targetPartnerId` provided, must exist and `partnerTypeRestriction` must match its type

**Code Generation:**
- Format: `XAYMA-XXXX-XXXX` (12 alphanumeric chars + hyphens, no ambiguous chars O/0/I/l)
- Generate 100 random codes, check for collisions, retry if any duplicate found
- Store in `partner_vouchers` table with initial `uses_count=0`

**SQL:**
```sql
INSERT INTO partner_vouchers (
  code, credits_amount, expiry_date, partner_type_restriction, 
  target_partner_id, uses_count, created_by, created_at
) VALUES (
  'XAYMA-ABCD-1234', 5000, '2026-06-30T23:59:59Z', 'CUSTOMER', 
  NULL, 0, auth.uid(), NOW()
) REPEAT 100 times;

INSERT INTO general_audit (...) VALUES (
  'partner_vouchers', NULL, 'INSERT', 100, auth.uid(), ...
);
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "generated_count": 100,
  "vouchers": [
    {
      "code": "XAYMA-ABCD-1234",
      "credits_amount": 5000,
      "expiry_date": "2026-06-30T23:59:59Z"
    }
  ],
  "download_url": "/admin/vouchers/download-csv?batch_id=..."
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "INVALID_QUANTITY",
  "message": "quantity must be between 1 and 10000"
}
```

---

## Task 4.20: Voucher Redemption (`/webhook/redeem-voucher`)

**Purpose:** Atomically validate, increment, and redeem a voucher code.

**HTTP Method:** POST

**Request Body:**
```json
{
  "voucherCode": "XAYMA-ABCD-1234",
  "partnerId": "UUID"
}
```

**Atomic Redemption Flow:**

```sql
BEGIN TRANSACTION;

-- 1. Validate voucher exists and is not expired
SELECT id, credits_amount, expiry_date, partner_type_restriction, 
       target_partner_id, uses_count, max_uses 
FROM partner_vouchers 
WHERE code = $1 AND deleted_at IS NULL
FOR UPDATE;

IF NOT FOUND THEN
  ROLLBACK;
  RETURN error: "VOUCHER_INVALID"
END IF;

IF expiry_date < NOW() THEN
  ROLLBACK;
  RETURN error: "VOUCHER_EXPIRED"
END IF;

IF uses_count >= COALESCE(max_uses, 1) THEN
  ROLLBACK;
  RETURN error: "VOUCHER_ALREADY_REDEEMED"
END IF;

-- 2. Validate partner type restriction (if any)
SELECT partner_type FROM partners WHERE id = $2;

IF partner_type_restriction IS NOT NULL 
   AND partner_type_restriction != partners.partner_type THEN
  ROLLBACK;
  RETURN error: "VOUCHER_WRONG_TYPE"
END IF;

IF target_partner_id IS NOT NULL 
   AND target_partner_id != $2 THEN
  ROLLBACK;
  RETURN error: "VOUCHER_NOT_FOR_THIS_PARTNER"
END IF;

-- 3. Increment uses count
UPDATE partner_vouchers SET uses_count = uses_count + 1 WHERE id = voucher.id;

-- 4. Insert credit transaction
INSERT INTO credit_transactions (
  partner_id, type, amount, payment_method, reference, status
) VALUES (
  $2, 'TOPUP', voucher.credits_amount, 'VOUCHER', voucher.code, 'COMPLETED'
);

-- 5. Insert voucher redemption record
INSERT INTO voucher_redemptions (
  voucher_id, partner_id, redeemed_at, amount
) VALUES (
  voucher.id, $2, NOW(), voucher.credits_amount
);

-- 6. Update partner balance
UPDATE partners SET remainingCredits = remainingCredits + voucher.credits_amount 
WHERE id = $2;

-- 7. Insert audit record
INSERT INTO general_audit (...) VALUES (...);

COMMIT;
```

**Kafka Event:** On success, publish to `credit.topup`:
```json
{
  "event_type": "CREDIT_TOPUP",
  "partner_id": "UUID",
  "amount": 5000,
  "payment_method": "VOUCHER",
  "reference": "XAYMA-ABCD-1234",
  "timestamp": "ISO 8601 datetime"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Voucher redeemed successfully",
  "credits_added": 5000,
  "new_balance": 25000,
  "voucher_code": "XAYMA-ABCD-1234"
}
```

**Error Responses (4xx):**

```json
{
  "error": "VOUCHER_INVALID",
  "message": "This voucher code is invalid or does not exist."
}
```

```json
{
  "error": "VOUCHER_EXPIRED",
  "message": "This voucher has expired and can no longer be redeemed."
}
```

```json
{
  "error": "VOUCHER_ALREADY_REDEEMED",
  "message": "This voucher has already been fully redeemed."
}
```

```json
{
  "error": "VOUCHER_WRONG_TYPE",
  "message": "This voucher is not valid for your account type."
}
```

```json
{
  "error": "VOUCHER_NOT_FOR_THIS_PARTNER",
  "message": "This voucher is restricted to a specific partner."
}
```

---

## Error Handling Patterns

All workflow engine webhooks follow these error response patterns:

**Client Errors (4xx):**
- Return the HTTP status code (400, 401, 404, 409, etc.)
- Body: `{ "error": "ERROR_CODE", "message": "Human-readable description" }`
- Frontend parses `error` field and maps to i18n key (e.g., `credits.voucher_invalid`)

**Server Errors (5xx):**
- Return 500 Internal Server Error
- Body: `{ "error": "INTERNAL_ERROR", "message": "An unexpected error occurred" }`
- Frontend logs to Sentry, shows generic error message to user
- Workflow engine should implement exponential backoff + max 3 retries on 5xx

---

## Kafka Topics (Event Schema)

All events publish to Apache Kafka (KRaft cluster on CX32) with the following topics:

### `credit.topup` (Partition key: `partner_id`)
```json
{
  "event_type": "CREDIT_TOPUP",
  "partner_id": "UUID",
  "amount": "number (FCFA)",
  "payment_method": "WAVE" | "ORANGE_MONEY" | "VOUCHER",
  "reference": "string (transaction_id or voucher_code)",
  "timestamp": "ISO 8601 datetime"
}
```

### `credit.debit` (Partition key: `partner_id`)
```json
{
  "event_type": "CREDIT_DEBIT",
  "partner_id": "UUID",
  "amount": "number (FCFA)",
  "reason": "DEPLOYMENT_CHARGE" | "SUSPENSION" | "REFUND",
  "reference": "string (deployment_id or transaction_id)",
  "timestamp": "ISO 8601 datetime"
}
```

### `credit.expiry` (Partition key: `partner_id`)
```json
{
  "event_type": "CREDIT_EXPIRY",
  "partner_id": "UUID",
  "amount_expired": "number",
  "previous_balance": "number",
  "new_balance": "number (always 0)",
  "timestamp": "ISO 8601 datetime"
}
```

### `credit.suspension` (Partition key: `partner_id`)
```json
{
  "event_type": "PARTNER_SUSPENDED",
  "partner_id": "UUID",
  "reason": "ZERO_BALANCE" | "PAYMENT_FAILED" | "LEGAL_HOLD",
  "suspension_date": "ISO 8601 datetime",
  "balance": "number"
}
```

### `credit.resumption` (Partition key: `partner_id`)
```json
{
  "event_type": "PARTNER_RESUMED",
  "partner_id": "UUID",
  "resume_date": "ISO 8601 datetime",
  "new_balance": "number"
}
```

---

## Testing Contracts

### IPN Testing
- Mock payment gateway sends 5 IPNs with same `transaction_id` (simulating retries)
- Verify: idempotency check works, only one credit added, no duplicates
- Verify: Kafka `credit.topup` published exactly once

### Voucher Testing
- Generate 10 vouchers for CUSTOMER type
- Redeem as CUSTOMER → success
- Redeem as RESELLER with same code → VOUCHER_WRONG_TYPE error
- Redeem twice → VOUCHER_ALREADY_REDEEMED error
- Wait until after expiry_date → VOUCHER_EXPIRED error

### Suspension Testing
- Partner with balance > 0, status='ACTIVE'
- Kafka `credit.debit` brings balance to -1
- Verify: `partners.status` becomes 'SUSPENDED'
- Kafka `credit.topup` brings balance back to +100
- Verify: `partners.status` becomes 'ACTIVE' again

---

## Version History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-04-21 | Sprint 4 Team | Initial contract definitions for Tasks 4.7–4.20 |

