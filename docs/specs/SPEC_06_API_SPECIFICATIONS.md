# SPEC 06 — API Specifications
> Xayma.sh · v2 · Last updated: March 2026

---

## Overview

Xayma.sh does **not** have a custom REST API backend. All data access goes through:
1. **Supabase JS SDK** — direct database queries with RLS enforcing authorization
2. **n8n webhooks** — for triggering async workflows (deploy, suspend, notify)
3. **Paytech REST API** — for payment initiation

There is no public API exposed to third parties or resellers.

---

## 1. Supabase Resource Groups

All queries use the `xayma_app` schema via `supabase.from('xayma_app.table')`.

### Authentication
```typescript
// Sign in
supabase.auth.signInWithPassword({ email, password })

// Sign out
supabase.auth.signOut()

// Get session
supabase.auth.getSession()

// Refresh session
supabase.auth.refreshSession()
```

### Users
```typescript
// Get current user profile
supabase.from('xayma_app.users').select('*').eq('id', userId).single()

// Admin: list all users
supabase.from('xayma_app.users').select('*, partners(name, partner_type)').order('created', { ascending: false })

// Create user (admin only)
supabase.from('xayma_app.users').insert({ firstname, lastname, email, company_id, user_role })

// Update user
supabase.from('xayma_app.users').update({ ... }).eq('id', userId)
```

### Partners
```typescript
// List partners (admin sees all; customer/reseller see own)
supabase.from('xayma_app.partners').select('*').order('created', { ascending: false })

// Get single partner
supabase.from('xayma_app.partners').select('*, deployments(*), credit_transactions(*)').eq('id', id)

// Create partner
supabase.from('xayma_app.partners').insert({ name, slug, email, phone, partner_type, remainingCredits: 0 })

// Update partner status
supabase.from('xayma_app.partners').update({ status }).eq('id', id)
```

### Services & Plans
```typescript
// List publicly available services
supabase.from('xayma_app.services').select('*, serviceplans(*)').eq('isPubliclyAvailable', true)

// Admin: all services
supabase.from('xayma_app.services').select('*, serviceplans(*), control_nodes(*)')

// Create service plan
supabase.from('xayma_app.serviceplans').insert({ label, slug, monthlyCreditConsumption, service_id, options })
```

### Deployments
```typescript
// List deployments (RLS filters by partner)
supabase.from('xayma_app.deployments')
  .select('*, services(label, thumbnail), serviceplans(label, monthlyCreditConsumption)')
  .order('created', { ascending: false })

// Create deployment
supabase.from('xayma_app.deployments').insert({
  label, domainNames, slug, service_id, serviceplan_id, serviceVersion, partner_id
})

// Update deployment status (admin/system only)
supabase.from('xayma_app.deployments').update({ status }).eq('id', deploymentId)
```

### Credit Transactions
```typescript
// List transactions for current partner
supabase.from('xayma_app.credit_transactions')
  .select('*')
  .eq('partner_id', partnerId)
  .order('created', { ascending: false })

// Create credit purchase (pending, confirmed by IPN)
supabase.from('xayma_app.credit_transactions').insert({
  creditsPurchased, amountPaid, transactionType: 'credit',
  partner_id, paymentMethod, status: 'pending'
})
```

### Settings
```typescript
// Load all settings (admin)
supabase.from('xayma_app.settings').select('*').eq('status', 'active')

// Get specific setting
supabase.from('xayma_app.settings').select('value').eq('key', 'LowCreditThreshold').single()
```

---

## 2. Authentication Mechanism

| Context | Mechanism |
|---------|-----------|
| Vue SPA (app.xayma.sh) | Supabase JWT stored in `localStorage`; passed as `Authorization: Bearer <token>` header automatically by SDK |
| Nuxt marketing (xayma.sh) | Server-side Supabase client with anon key for public content |
| n8n workflows | Supabase service role key (never exposed to browser) |
| GitHub Actions | DockerHub credentials in GitHub Secrets |

**Token refresh:** Supabase SDK handles token refresh automatically. App listens to `supabase.auth.onAuthStateChange` to update Pinia store.

---

## 3. n8n Webhook Endpoints

n8n exposes internal webhook URLs consumed only by the Vue app and Supabase triggers. These are not public APIs.

| Webhook | Method | Trigger | Purpose |
|---------|--------|---------|---------|
| `/webhook/deployment/create` | POST | Vue app on deployment insert | Trigger AWX job template |
| `/webhook/deployment/stop` | POST | Credit = 0 event | Trigger AWX stop |
| `/webhook/deployment/start` | POST | Credit topup event | Trigger AWX start |
| `/webhook/payment/ipn` | POST | Paytech IPN callback | Confirm payment, add credits |
| `/webhook/notification/send` | POST | Any notification event | Fan-out to all channels |

### Example payload — deployment create
```json
{
  "deployment_id": 42,
  "partner_id": 7,
  "service": "odoo-community",
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
| Docker container provisioning | 2–5 minutes | AWX job; status polled via Supabase Realtime |
| Payment confirmation | 30s–2 min | Paytech IPN → n8n webhook → Supabase update → Realtime |
| Credit batch deduction | 15 min cycle | Kafka cron → n8n → Supabase bulk update |
| Notification fan-out | <2 min | n8n async; Supabase in-app notification immediate |

All long-running operations update `deployments.status` or `partners.remainingCredits` via n8n, which is then surfaced to the UI via Supabase Realtime WebSocket subscriptions without polling.

---

## 5. Rate Limiting

| Resource | Limit | Enforcement |
|----------|-------|------------|
| Supabase queries | 500 req/s (Supabase free tier) | Supabase built-in |
| Paytech API | Per Paytech agreement | n8n retry with backoff |
| n8n webhooks | Internal; no external rate limit | n8n queue |
| WhatsApp API | Per Meta/Twilio agreement | n8n queue with delay |
| SMS (Africa's Talking) | Per account agreement | n8n queue |

---

## 6. API Versioning

No versioning strategy required at launch — the Supabase schema is the source of truth and the Vue app is the sole consumer. Breaking schema changes will be handled via:
1. Non-destructive migrations first (add columns, don't remove)
2. Deploy new app version before removing old columns
3. n8n webhook URLs are internal — can be changed with coordinated deploy

### Paytech Integration Flow
```
1. Vue app calls Paytech checkout endpoint
   POST https://paytech.sn/api/payment/request-payment
   Body: { item_name, item_price, currency, ref_command, ipn_url, success_url, cancel_url }

2. Paytech returns payment_url → Vue redirects user

3. User completes payment on Paytech

4. Paytech POSTs IPN to n8n webhook:
   POST /webhook/payment/ipn
   Body: { ref_command, token, payment_method, ... }

5. n8n verifies token with Paytech
6. n8n updates credit_transaction status → 'completed'
7. n8n updates partners.remainingCredits
8. n8n publishes credit.topup to Kafka
9. Kafka → n8n consumer → check if suspended deployments should resume
10. Supabase Realtime → Vue UI updates credit balance
```
