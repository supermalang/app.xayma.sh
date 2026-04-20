# SPEC 02 — User Personas & Flows
> Xayma.sh · v2 · Last updated: March 2026

---

## 1. User Roles & Permissions

| Role | Access Scope | Key Permissions |
|------|-------------|----------------|
| **ADMIN** | Full platform | All CRUD on all entities, settings, control nodes, audit logs |
| **CUSTOMER** | Own partner account | View/manage own deployments, buy credits, view transactions |
| **RESELLER** | Own partner account + sub-deployments | Same as customer + manage sub-customer deployments under their account |
| **SALES** | Read-only partner data + own portfolio | View customers in their portfolio, view commissions, cannot modify platform data |
| **SUPPORT** | Read-all | View all entities, cannot create/delete, can update deployment status |

Role is stored on the `users.user_role` field and enforced via Supabase RLS policies.

---

## 2. Persona Details

### 2.1 Admin — "Mamadou" (Platform Operator)
- **Goal:** Manage the entire platform — onboard customers, monitor deployments, configure services, handle credits, review audit logs
- **Frustrations:** Manual interventions when deployments fail, no visibility into credit burn rates, no automated alerts
- **Needs:** Dashboard with real-time stats, deployment status monitoring, credit management, AWX integration, Kafka event monitoring

### 2.2 Customer — "Fatou" (SME Owner)
- **Goal:** Deploy Odoo for her clothing business, keep it running, top up credits before expiry
- **Frustrations:** Current solutions require IT knowledge she doesn't have, pricing is opaque, payments in EUR are impossible
- **Needs:** Simple dashboard showing her instance status, easy credit top-up via Wave/Orange Money, WhatsApp alerts before credits expire

### 2.3 Reseller — "Ibrahima" (IT Integrator)
- **Goal:** Deploy and manage Odoo instances for 10+ clients under one account, benefit from volume discounts
- **Frustrations:** Managing each client's infrastructure separately, no consolidated view, margins eaten by manual work
- **Needs:** Multi-deployment dashboard, bulk credit purchase with discount, ability to manage client instances independently

### 2.4 Sales Consultant — "Aissatou" (Sales Rep)
- **Goal:** Track her customer portfolio, monitor her commission earnings, follow up on renewals
- **Frustrations:** No visibility into which customers are at risk (low credits), manual commission calculation
- **Needs:** Portfolio view, commission tracker, low-credit alerts for her customers

---

## 3. Critical User Journeys

### 3.1 New Customer Self-Registration & First Deployment

```
1. Customer lands on marketing site (xayma.sh) →
2. Clicks "Get Started" → redirected to app.xayma.sh/register →
3. Fills registration form (name, email, company, phone) →
4. Email verification sent →
5. Logs into dashboard (CUSTOMER view) →
6. Sees empty deployments list + credit balance = 0 →
7. Clicks "Buy Credits" →
8. Selects credit bundle (10 credits = 10,000 FCFA) →
9. Pays via Wave/Orange Money/Card (Payment Gateway) →
10. Credits added to account (Kafka event → n8n → Supabase update) →
11. Clicks "New Deployment" →
12. Selects service (Odoo Community), version, plan (Starter/Pro/Enterprise) →
13. Enters deployment label and domain →
14. System checks credit balance (must cover ≥1 day of plan consumption) →
15. AWX job triggered → Docker containers provisioned on CX52 node →
16. Traefik route created → domain goes live →
17. Customer receives WhatsApp + email notification with URL →
18. Dashboard shows deployment as "active" with credit burn meter
```

### 3.2 Credit Depletion & Suspension Flow

```
1. n8n cron runs every 15 minutes →
2. Kafka event published: credit.debit for each active deployment →
3. n8n consumer updates partner.remainingCredits in Supabase →
4. Supabase Realtime pushes update to customer dashboard →
5. At 20% credits remaining → WhatsApp + email + SMS warning sent →
6. At 10% → second warning sent →
7. At 0% credits → Kafka event: deployment.suspend →
8. n8n triggers AWX to stop containers →
9. Deployment status → "suspended" →
10. Customer receives suspension notification →
11. Grace period starts (5 or 10 days depending on partner type) →
12. Customer tops up credits → Kafka event: credit.topup →
13. n8n triggers AWX to restart containers →
14. Deployment status → "active" again
```

### 3.3 Reseller Bulk Credit Purchase

```
1. Reseller logs in → sees consolidated dashboard →
2. Clicks "Buy Credits" → selects bundle (10/20/40 instances) →
3. System applies volume discount automatically →
4. Pays upfront via Payment Gateway →
5. Credits added with expiry timer (30/45/60 days per bundle) →
6. Reseller deploys instances for each client from their dashboard →
7. Each deployment debits from reseller credit pool →
8. Reseller receives consolidated credit usage report weekly
```

### 3.4 Admin — Service Configuration

```
1. Admin logs in → navigates to Services →
2. Creates new service (Odoo 17) →
3. Links to control node (AWX instance on CX32) →
4. Configures job template name, deploy/stop/start/restart tags →
5. Adds service plans (Starter: 10 credits/30d, Pro: 20, Enterprise: 50) →
6. Sets isPubliclyAvailable = true →
7. Service appears in customer deployment wizard
```

---

## 4. Multi-Role Interactions

| Interaction | Roles Involved | Flow |
|-------------|---------------|------|
| Sales assigns customer | SALES + ADMIN | Sales creates customer account, ADMIN approves |
| Reseller deploys for client | RESELLER + system | Reseller creates deployment, system bills their credit pool |
| Admin suspends partner | ADMIN + CUSTOMER | Admin sets partner status → system suspends all deployments |
| Credit expiry | System + CUSTOMER | Automated via Kafka/n8n, customer receives notifications |

---

## 5. Abandonment Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Registration too complex | Keep form to 4 fields max; email verification non-blocking |
| Credits expire without warning | Multi-channel alerts at 20% and 10% remaining |
| Deployment takes too long | Show real-time AWX progress in deployment status card |
| Payment fails | Clear error message + retry + alternative payment method |
| Reseller can't see client status | Consolidated multi-deployment dashboard with filters |
