# Workflow Engine Webhook Contracts

This document defines the contract specifications for all workflow engine webhooks used in Sprint 4 (Credits & Payments). These are implementation specifications for the n8n workflow engine automation tasks.

---

## Task 4.7 & 4.8: IPN Processing (`/webhook/payment-ipn`)

**Purpose:** Process payment gateway Instant Payment Notifications (IPNs) and atomically update transaction status + partner credit balance.

**Trigger:** Payment gateway calls this webhook with IPN payload after payment settles (async, may arrive before UI redirect).

**HTTP Method:** POST

**Request Body:**
```json
{
  "transaction_id": "string (UUID, from wave/orange money gateway)",
  "amount": "number (in FCFA)",
  "currency": "XOF",
  "status": "SUCCESS" | "FAILED" | "PENDING",
  "timestamp": "ISO 8601 datetime",
  "signature": "HMAC-SHA256 hex string (signed with payment gateway secret key)"
}
```

**Signature Verification:**
- Verify `signature` matches `HMAC-SHA256(request_body, payment_gateway_secret_key)`
- Reject on mismatch with 401 Unauthorized

**Success Flow (status=SUCCESS):**

1. **Idempotency Check:** Query `credit_transactions` table
   - If `transaction_id` already exists with status='COMPLETED', return 200 `{"already_processed": true}` and STOP
   - Prevents double-crediting on duplicate IPNs

2. **Atomic Update:**
   ```sql
   BEGIN TRANSACTION;
   -- Fetch transaction
   SELECT id, partner_id, amount FROM credit_transactions WHERE reference = $1 FOR UPDATE;
   
   -- Update transaction status
   UPDATE credit_transactions SET status='COMPLETED', updated_at=NOW() WHERE id=$2;
   
   -- Increment partner balance
   UPDATE partners SET remainingCredits = remainingCredits + $3 WHERE id=$4;
   
   -- Insert audit record
   INSERT INTO general_audit (table_name, record_id, action, ...) VALUES (...);
   
   COMMIT;
   ```

3. **Publish Event:** Emit Kafka event to topic `credit.topup`:
   ```json
   {
     "event_type": "CREDIT_TOPUP",
     "partner_id": "string (UUID)",
     "amount": 5000,
     "payment_method": "WAVE",
     "reference": "transaction_id from IPN",
     "timestamp": "ISO 8601 datetime"
   }
   ```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "transaction_id": "UUID",
  "partner_id": "UUID",
  "credits_added": 5000,
  "new_balance": 25000
}
```

**Error Responses:**

- **401 Unauthorized** (invalid signature):
  ```json
  {
    "error": "VERIFICATION_FAILED",
    "message": "Invalid HMAC signature"
  }
  ```

- **400 Bad Request** (malformed body):
  ```json
  {
    "error": "INVALID_PAYLOAD",
    "message": "Missing required field: transaction_id"
  }
  ```

- **404 Not Found** (transaction not in system):
  ```json
  {
    "error": "TRANSACTION_NOT_FOUND",
    "message": "No pending transaction with this ID"
  }
  ```

- **500 Internal Server Error** (DB failure):
  ```json
  {
    "error": "DATABASE_ERROR",
    "message": "Failed to update transaction"
  }
  ```

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

