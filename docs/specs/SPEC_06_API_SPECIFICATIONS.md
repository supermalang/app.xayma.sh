# SPEC 06 — API Specifications
> Xayma.sh · v2 · Last updated: March 2026

---

## Overview

Xayma.sh does **not** have a custom REST API backend. All data access goes through:
1. **database service JS SDK** — direct database queries with RLS enforcing authorization
2. **workflow engine webhooks** — for triggering async workflows (deploy, suspend, notify)
3. **Payment Gateway REST API** — for payment initiation

There is no public API exposed to third parties or resellers.

---

## 1. database service Resource Groups

All queries use the `xayma_app` schema via `database service.from('xayma_app.table')`.

### Authentication
```typescript
// Sign in
database service.auth.signInWithPassword({ email, password })

// Sign out
database service.auth.signOut()

// Get session
database service.auth.getSession()

// Refresh session
database service.auth.refreshSession()
```

### Users
```typescript
// Get current user profile
database service.from('xayma_app.users').select('*').eq('id', userId).single()

// Admin: list all users
database service.from('xayma_app.users').select('*, partners(name, partner_type)').order('created', { ascending: false })

// Create user (admin only)
database service.from('xayma_app.users').insert({ firstname, lastname, email, company_id, user_role })

// Update user
database service.from('xayma_app.users').update({ ... }).eq('id', userId)
```

### Partners
```typescript
// List partners (admin sees all; customer/reseller see own)
database service.from('xayma_app.partners').select('*').order('created', { ascending: false })

// Get single partner
database service.from('xayma_app.partners').select('*, deployments(*), credit_transactions(*)').eq('id', id)

// Create partner
database service.from('xayma_app.partners').insert({ name, slug, email, phone, partner_type, remainingCredits: 0 })

// Update partner status
database service.from('xayma_app.partners').update({ status }).eq('id', id)
```

### Services & Plans
```typescript
// List publicly available services
database service.from('xayma_app.services').select('*, serviceplans(*)').eq('isPubliclyAvailable', true)

// Admin: all services
database service.from('xayma_app.services').select('*, serviceplans(*), control_nodes(*)')

// Create service plan
database service.from('xayma_app.serviceplans').insert({ label, slug, monthlyCreditConsumption, service_id, options })
```

### Deployments
```typescript
// List deployments (RLS filters by partner)
database service.from('xayma_app.deployments')
  .select('*, services(label, thumbnail), serviceplans(label, monthlyCreditConsumption)')
  .order('created', { ascending: false })

// Create deployment
database service.from('xayma_app.deployments').insert({
  label, domainNames, slug, service_id, serviceplan_id, serviceVersion, partner_id
})

// Update deployment status (admin/system only)
database service.from('xayma_app.deployments').update({ status }).eq('id', deploymentId)
```

### Credit Transactions
```typescript
// List transactions for current partner
database service.from('xayma_app.credit_transactions')
  .select('*')
  .eq('partner_id', partnerId)
  .order('created', { ascending: false })

// Create credit purchase (pending, confirmed by IPN)
database service.from('xayma_app.credit_transactions').insert({
  creditsPurchased, amountPaid, transactionType: 'credit',
  partner_id, paymentMethod, status: 'pending'
})
```

### Settings
```typescript
// Load all settings (admin)
database service.from('xayma_app.settings').select('*').eq('status', 'active')

// Get specific setting
database service.from('xayma_app.settings').select('value').eq('key', 'LowCreditThreshold').single()
```

---

## 2. Authentication Mechanism

| Context | Mechanism |
|---------|-----------|
| Vue SPA (app.xayma.sh) | database service JWT stored in `localStorage`; passed as `Authorization: Bearer <token>` header automatically by SDK |
| Nuxt marketing (xayma.sh) | Server-side database service client with anon key for public content |
| workflow engine workflows | database service service role key (never exposed to browser) |
| GitHub Actions | DockerHub credentials in GitHub Secrets |

**Token refresh:** database service SDK handles token refresh automatically. App listens to `database service.auth.onAuthStateChange` to update Pinia store.

---

## 3. workflow engine Webhook Endpoints

workflow engine exposes internal webhook URLs consumed only by the Vue app and database service triggers. These are not public APIs.

| Webhook | Method | Trigger | Purpose |
|---------|--------|---------|---------|
| `/webhook/deployment/create` | POST | Vue app on deployment insert | Trigger deployment engine job template |
| `/webhook/deployment/stop` | POST | Credit = 0 event | Trigger deployment engine stop |
| `/webhook/deployment/start` | POST | Credit topup event | Trigger deployment engine start |
| `/webhook/payment/ipn` | POST | Payment Gateway IPN callback | Confirm payment, add credits |
| `/webhook/notification/send` | POST | Any notification event | Fan-out to all channels |

### Example payload — deployment create
```json
{
  "deployment_id": 42,
  "partner_id": 7,
  "service": "web application-community",
  "version": "17.0",
  "plan": "starter",
  "domain": "mycompany.xayma.sh",
  "control_node_host": "10.0.0.2",
  "control_node_token": "***"
}
```

---

## 4. Long-Running Operations (Async)

| Operation | Duration | Handling |
|-----------|---------|---------|
| Docker container provisioning | 2–5 minutes | deployment engine job; status polled via database service Realtime |
| Payment confirmation | 30s–2 min | Payment Gateway IPN → workflow engine webhook → database service update → Realtime |
| Credit batch deduction | 15 min cycle | Kafka cron → workflow engine → database service bulk update |
| Notification fan-out | <2 min | workflow engine async; database service in-app notification immediate |

All long-running operations update `deployments.status` or `partners.remainingCredits` via workflow engine, which is then surfaced to the UI via database service Realtime WebSocket subscriptions without polling.

---

## 5. Rate Limiting

| Resource | Limit | Enforcement |
|----------|-------|------------|
| database service queries | 500 req/s (database service free tier) | database service built-in |
| Payment Gateway API | Per Payment Gateway agreement | workflow engine retry with backoff |
| workflow engine webhooks | Internal; no external rate limit | workflow engine queue |
| WhatsApp API | Per Meta/Twilio agreement | workflow engine queue with delay |
| SMS (Africa's Talking) | Per account agreement | workflow engine queue |

---

## 6. API Versioning

No versioning strategy required at launch — the database service schema is the source of truth and the Vue app is the sole consumer. Breaking schema changes will be handled via:
1. Non-destructive migrations first (add columns, don't remove)
2. Deploy new app version before removing old columns
3. workflow engine webhook URLs are internal — can be changed with coordinated deploy

### Payment Gateway Integration Flow (PayTech)

Source of truth for every field name and behavior in this section: the official
PayTech documentation at https://doc.intech.sn/doc_paytech.php and the Postman
collection at https://doc.intech.sn/PayTech%20x%20DOC.postman_collection.json.
Anything not present in those two sources is explicitly flagged below.

**1. Vue → workflow engine.** The Vue app POSTs `/webhook/initiate-checkout` on
the workflow engine with `{ bundleId, partnerId, paymentGatewayId }`. It does
not talk to PayTech directly.

**2. workflow engine → PayTech `request-payment`.** The workflow engine reads
the gateway config from `xayma_app.settings['PAYMENT_GATEWAYS']` and calls:

```
POST https://paytech.sn/api/payment/request-payment
Headers:
  API_KEY:    <gateway.apiKey>
  API_SECRET: <gateway.secretKey>
Body (JSON):
  {
    "item_name":     "<bundle.label>",
    "item_price":    <bundle.priceXOF>,           // integer FCFA, no decimals
    "ref_command":   "<orderRef>",                 // e.g. XAY-123-456 from Buy.vue
    "command_name":  "<bundle.label> credits topup",
    "currency":      "XOF",                        // XOF/EUR/USD/CAD/GBP/MAD
    "env":           "prod" | "test",              // mapped from gateway.mode
    "ipn_url":       "<gateway.ipnUrl>",
    "success_url":   "<gateway.successUrl>",
    "cancel_url":    "<gateway.cancelUrl>",
    "custom_field":  base64(JSON({ transactionId })),  // belt-and-suspenders correlation
    "target_payment": "Wave, Orange Money"         // optional CSV; omit to show all channels
  }
```

`gateway.mode === 'live'` → `env: "prod"`; `gateway.mode === 'sandbox'` → `env:
"test"` (PayTech debits a random 100–150 FCFA in test mode regardless of
`item_price`). Same base URL for both modes.

**3. PayTech response.** On success PayTech returns:

```
{ "success": 1, "token": "<paytech-token>", "redirect_url": "https://paytech.sn/payment/checkout/<token>" }
```

On failure: `{ "success": 0 | -1, "message": "<reason>" }`. The workflow engine
persists the PayTech `token` and our `ref_command` against the new
`credit_transactions` row (status `pending`) and returns
`{ paymentUrl: redirect_url, transactionId, reference: ref_command }` to Vue.

**4. Vue redirects** the browser to `redirect_url`; the user pays.

**5. PayTech → workflow engine IPN.** PayTech POSTs to `gateway.ipnUrl`
(typically `/webhook/payment-ipn`) with at minimum:

```
type_event:        "sale_complete" | "sale_canceled" | "refund_complete"
                   | "transfer_success" | "transfer_failed"
ref_command:       <our merchant reference>
token:             <PayTech payment token>
item_name, item_price, currency, command_name, env, payment_method,
client_phone, custom_field,
final_item_price, final_item_price_xof,
initial_item_price, initial_item_price_xof,
promo_enabled, promo_value_percent,

// auth fields — verify at least one of:
hmac_compute:      HMAC_SHA256(api_secret, "${final_item_price}|${ref_command}|${api_key}")  // hex
api_key_sha256:    SHA256(API_KEY)
api_secret_sha256: SHA256(API_SECRET)
```

**Verification (preferred):** recompute
`HMAC_SHA256(api_secret, "${final_item_price}|${ref_command}|${api_key}")` and
constant-time-compare against `hmac_compute`.
**Fallback:** equality-compare `api_key_sha256 === SHA256(API_KEY)` and
`api_secret_sha256 === SHA256(API_SECRET)`. Mismatch → reject.

**6. workflow engine update.** Idempotent UPDATE of `credit_transactions` keyed
by `ref_command`; on `sale_complete` increment `partners.remainingCredits`
atomically and emit the `credit.topup` event downstream (current Sprint 5
flow: workflow-engine webhook bridge to Kafka — see
`docs/workflow-engine/sprint4-contracts.md` for the contract). Reply HTTP 200
with the **plain-text body `OK`** (PayTech expects literal `OK`, not JSON).

**7. PayTech browser redirect.** PayTech then redirects the user to
`success_url` or `cancel_url`. The exact query parameters PayTech appends
**are not documented** in either source — `Success.vue` therefore relies on
the `transactionId` it stashed in `sessionStorage` in step 4 and on the
Supabase Realtime subscription on `credit_transactions` for status.

#### Status check / refund (Postman collection)

```
GET  https://paytech.sn/api/payment/get-status?token_payment=<token>
POST https://paytech.sn/api/payment/refund-payment   body: ref_command=<ref>
```

#### Not documented in PayTech sources

The following items are **not specified** by either of the two source
documents and must be treated as unknown until PayTech publishes more:

- Exact query parameters (or POST body) PayTech appends to `success_url` and
  `cancel_url`.
- IPN retry policy if the workflow engine returns a non-200.
- PayTech IP ranges (no whitelist published).
- Comprehensive error-code registry — only `success: 0|-1` with a free-text
  `message` is documented inline.
- HMAC encoding (hex vs base64) — implied as hex from JS examples but never
  stated explicitly in the docs.
