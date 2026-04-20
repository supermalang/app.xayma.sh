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

### Payment Gateway Integration Flow
```
1. Vue app calls payment gateway checkout endpoint
   POST https://paytech.sn/api/payment/request-payment
   Body: { item_name, item_price, currency, ref_command, ipn_url, success_url, cancel_url }

2. Payment Gateway returns payment_url → Vue redirects user

3. User completes payment on Payment Gateway

4. Payment Gateway POSTs IPN to workflow engine webhook:
   POST /webhook/payment/ipn
   Body: { ref_command, token, payment_method, ... }

5. workflow engine verifies token with Payment Gateway
6. workflow engine updates credit_transaction status → 'completed'
7. workflow engine updates partners.remainingCredits
8. workflow engine publishes credit.topup to Kafka
9. Kafka → workflow engine consumer → check if suspended deployments should resume
10. database service Realtime → Vue UI updates credit balance
```
