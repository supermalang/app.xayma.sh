# SPEC 05 — Database Design
> Xayma.sh · v2 · Last updated: March 2026
> Schema: `xayma_app` · Database: Supabase (PostgreSQL 15)

---

## 1. Core Entities

| Entity | Table | Purpose |
|--------|-------|---------|
| Users | `users` | Platform users linked to a partner/company |
| Partners | `partners` | Customer/reseller/affiliate organizations |
| Services | `services` | Deployable app definitions (Odoo Community, Docker) |
| Service Plans | `serviceplans` | Pricing tiers per service (Starter/Pro/Enterprise) |
| Deployments | `deployments` | Individual running instances per partner |
| Credit Transactions | `credit_transactions` | All credit purchases, deductions, and voucher redemptions |
| Vouchers | `vouchers` | Admin-generated credit voucher codes |
| Voucher Redemptions | `voucher_redemptions` | Tracks which partner redeemed which voucher |
| Control Nodes | `control_nodes` | AWX nodes managing infrastructure |
| Settings | `settings` | Platform-wide key/value configuration |
| Role Permissions | `role_permissions` | Permission definitions per role |
| Credit Purchase Options | `partner_credit_purchase_options` | Volume discount tiers per partner type |
| Audit Log | `general_audit` | Immutable audit trail for all mutations |

---

## 2. Entity Relationships

```
USERS ──── company_id ────► PARTNERS
USERS ──── createdby/modifiedby ────► (all tables)

CONTROL_NODES ◄──── controlnodeid ──── SERVICES
SERVICES ◄──── service_id ──── SERVICEPLANS
SERVICES ◄──── service_id ──── DEPLOYMENTS
SERVICEPLANS ◄──── serviceplan_id ──── DEPLOYMENTS
PARTNERS ◄──── partner_id ──── DEPLOYMENTS
PARTNERS ◄──── partner_id ──── CREDIT_TRANSACTIONS
VOUCHERS ◄──── voucher_id ──── VOUCHER_REDEMPTIONS
PARTNERS ◄──── partner_id ──── VOUCHER_REDEMPTIONS
CREDIT_TRANSACTIONS ◄──── credit_transaction_id ──── VOUCHER_REDEMPTIONS
```

---

## 3. Detailed Schema

### 3.1 ENUM Types

```sql
-- User roles
user_role: ANONYMOUS | CUSTOMER | SUPPORT | ADMIN

-- Partner types
partner_type: customer | affiliate | reseller | pro_reseller

-- Partner status
partner_status: active | disabled | low_credit | no_credit | on_debt | suspended | archived | pending_deletion

-- Deployment status
deployment_status: pending_deployment | deploying | failed | active | stopped | suspended | archived | pending_deletion

-- Credit transaction type
credit_transaction: credit | debit

-- Credit transaction status
credit_transaction_status: pending | completed | failed

-- Generic record status
record_status: active | inactive | archived

-- Credit threshold type
credit_purchase_threshold_type: minimal | middle | maximum

-- Voucher status
voucher_status: active | inactive | fully_redeemed | expired
```

### 3.2 Key Table Definitions

**vouchers** — admin-generated credit voucher codes
```
id                INTEGER PK IDENTITY
code              VARCHAR(50) NOT NULL UNIQUE    -- e.g. 'XAYMA-A3F9-K2LP' (uppercase, dash-separated)
credits           INTEGER NOT NULL               -- credits granted on redemption (e.g. 10 = 1 month Starter)
max_uses          INTEGER NOT NULL DEFAULT 1     -- 1 = single-use; >1 = broadcast code
uses_count        INTEGER NOT NULL DEFAULT 0     -- incremented atomically on each redemption
expires_at        TIMESTAMPTZ                    -- NULL = never expires
partner_type      partner_type[]                 -- NULL = any partner type; set to restrict
partner_id        INTEGER → partners.id          -- NULL = any partner; set for personal voucher
status            voucher_status DEFAULT 'active'
created           TIMESTAMPTZ NOT NULL
createdby         UUID → users.id
modified          TIMESTAMPTZ
modifiedby        UUID → users.id
```

**voucher_redemptions** — one row per successful redemption
```
id                    INTEGER PK IDENTITY
voucher_id            INTEGER NOT NULL → vouchers.id
partner_id            INTEGER NOT NULL → partners.id
credit_transaction_id INTEGER NOT NULL → credit_transactions.id   -- the resulting credit transaction
redeemed_at           TIMESTAMPTZ NOT NULL
redeemed_by           UUID → users.id                             -- user who triggered redemption
UNIQUE (voucher_id, partner_id)                                   -- one redemption per partner per voucher
```

**users** — linked to Supabase Auth via UUID
```
id            UUID PK (= auth.uid())
firstname     VARCHAR(50) NOT NULL
lastname      VARCHAR(50)
company_id    INTEGER NOT NULL → partners.id
user_role     user_role NOT NULL
email         VARCHAR(255) UNIQUE
created       TIMESTAMPTZ NOT NULL
modified      TIMESTAMPTZ
```

**partners** — core business entity
```
id                  INTEGER PK IDENTITY
name                VARCHAR(100) NOT NULL
slug                VARCHAR(150) NOT NULL UNIQUE
description         TEXT
email               VARCHAR(255)
phone               VARCHAR(15) CHECK (West Africa format: 70/75/76/77/78 + 7 digits)
address             TEXT
activity_area       VARCHAR(255)[]
allowCreditDebt     BOOLEAN DEFAULT false
creditDebtThreshold INTEGER DEFAULT 0
remainingCredits    INTEGER NOT NULL
partner_type        partner_type DEFAULT 'customer'
status              partner_status DEFAULT 'active'
created             TIMESTAMPTZ NOT NULL
createdby           UUID → users.id
modified            TIMESTAMPTZ
modifiedby          UUID → users.id
```

**deployments**
```
id              INTEGER PK IDENTITY
label           VARCHAR(255) NOT NULL
domainNames     VARCHAR(255)[] NOT NULL (min 1, validated regex)
slug            VARCHAR(255) NOT NULL UNIQUE
service_id      INTEGER → services.id
serviceplan_id  INTEGER → serviceplans.id
serviceVersion  VARCHAR(50)
deploymentPlan  VARCHAR(255)
partner_id      INTEGER → partners.id
status          deployment_status DEFAULT 'pending_deployment'
created         TIMESTAMPTZ NOT NULL
createdby       UUID → users.id
modified        TIMESTAMPTZ
modifiedby      UUID → users.id
```

**credit_transactions**
```
id                    INTEGER PK IDENTITY
creditsPurchased      INTEGER
amountPaid            MONEY
transactionType       credit_transaction
creditsUsed           SMALLINT
creditsRemaining      SMALLINT
customerPhone         VARCHAR(50)
paymentMethod         VARCHAR(50)
partner_id            INTEGER → partners.id
partner_current_status VARCHAR(15)
status                credit_transaction_status DEFAULT 'pending'
created               TIMESTAMPTZ NOT NULL
createdby             UUID → users.id
modified              TIMESTAMPTZ
modifiedby            UUID → users.id
```

**serviceplans**
```
id                      INTEGER PK IDENTITY
label                   VARCHAR(255) NOT NULL
slug                    VARCHAR(100) UNIQUE NOT NULL
description             TEXT
options                 TEXT[] NOT NULL
monthlyCreditConsumption INTEGER NOT NULL
service_id              INTEGER → services.id
created                 TIMESTAMPTZ NOT NULL
createdby               UUID → users.id
modified                TIMESTAMPTZ
modifiedby              UUID → users.id
```

**partner_credit_purchase_options** — volume discount tiers
```
id                        INTEGER PK IDENTITY
partner_type              partner_type
threshold_type            credit_purchase_threshold_type
threshold_value           INTEGER  (10 / 20 / 40 instances)
threshold_discount_percent DECIMAL (0.20 / 0.20 / 0.35)
max_credit_debt_allowed   INTEGER
created                   TIMESTAMPTZ
createdby                 UUID
modified                  TIMESTAMPTZ
modifiedby                UUID
```

**general_audit** — append-only
```
audit_id    SERIAL PK
table_name  VARCHAR(150)
record_id   VARCHAR(255)
action      VARCHAR(10) (INSERT/UPDATE/DELETE)
description TEXT
old_value   JSONB
new_value   JSONB
user_id     UUID → users.id
email       VARCHAR(255)
firstname   VARCHAR(50)
lastname    VARCHAR(50)
company_id  INTEGER
user_role   user_role
created     TIMESTAMPTZ
modified    TIMESTAMPTZ
```

---

## 4. Multi-Tenancy Model

**Row-level multi-tenancy** using Supabase RLS:
- All partner-scoped data filtered by `partner_id` or `company_id`
- Every user has a `company_id` pointing to their partner record
- RLS policies enforce that users can only SELECT/INSERT/UPDATE rows belonging to their partner

```sql
-- Pattern used across all partner-scoped tables
CREATE POLICY "partner_isolation" ON xayma_app.deployments
FOR ALL USING (
  partner_id = (
    SELECT company_id FROM xayma_app.users WHERE id = auth.uid()
  )
);

-- Admin bypass
CREATE POLICY "admin_full_access" ON xayma_app.deployments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM xayma_app.users
    WHERE id = auth.uid() AND user_role = 'ADMIN'
  )
);
```

---

## 5. Read vs Write Frequency

| Table | Read frequency | Write frequency | Notes |
|-------|---------------|----------------|-------|
| `deployments` | Very high | Medium | Real-time status polling via WebSocket |
| `partners` | High | Low | Cached in Pinia store |
| `credit_transactions` | High | Very high | Written every 15 min per deployment |
| `settings` | High | Very low | Loaded once on app init |
| `users` | High | Low | Cached in auth store |
| `general_audit` | Low | Very high | Append-only, never updated |
| `serviceplans` | High | Very low | Cached; rarely changes |
| `vouchers` | Low | Low | Admin-managed; read on redemption only |
| `voucher_redemptions` | Low | Low | Written once per redemption; never updated |

**Index recommendations:**
```sql
CREATE INDEX idx_deployments_partner_id ON xayma_app.deployments(partner_id);
CREATE INDEX idx_deployments_status ON xayma_app.deployments(status);
CREATE INDEX idx_credit_transactions_partner_id ON xayma_app.credit_transactions(partner_id);
CREATE INDEX idx_credit_transactions_created ON xayma_app.credit_transactions(created DESC);
CREATE INDEX idx_users_company_id ON xayma_app.users(company_id);
CREATE UNIQUE INDEX idx_vouchers_code ON xayma_app.vouchers(code);
CREATE UNIQUE INDEX idx_voucher_redemptions_unique ON xayma_app.voucher_redemptions(voucher_id, partner_id);
```

---

## 6. Sensitive Fields & Encryption

| Field | Table | Handling |
|-------|-------|---------|
| `authorizationToken` | `control_nodes` | Stored encrypted; never exposed to frontend |
| `paymentApiKey` | `settings` | Server-side only (n8n); never in client queries |
| `paymentSecretKey` | `settings` | Server-side only (n8n); never in client queries |
| `email` | `users` | Supabase Auth handles; GDPR-compliant |
| `phone` | `partners` | PII — access restricted by RLS |
| `amountPaid` | `credit_transactions` | MONEY type; audit-logged |

---

## 7. Data Retention & Audit Trail

- **Audit trail:** All INSERT/UPDATE/DELETE on core tables written to `general_audit` via PostgreSQL triggers
- **Soft deletes:** Records set to `status = 'archived'` before eventual `pending_deletion` then hard delete
- **Deployment retention:** Archived deployments kept for 90 days (configurable via `settings.MaxDaysToArchiveDepl`)
- **Partner retention:** Archived partners kept for 180 days (configurable via `settings.MaxDaysToArchiveOrgs`)
- **Credit transactions:** Never deleted — permanent financial record
- **Audit log:** Never deleted — permanent record

### Supabase Realtime Subscriptions

The following tables are subscribed to via Supabase Realtime WebSockets:
```javascript
// Real-time subscriptions used in the Vue app
supabase.channel('deployments')
  .on('postgres_changes', { event: '*', schema: 'xayma_app', table: 'deployments' }, handler)

supabase.channel('partners')
  .on('postgres_changes', { event: 'UPDATE', schema: 'xayma_app', table: 'partners',
    filter: `id=eq.${partnerId}` }, handler)  // credit balance updates

supabase.channel('notifications')
  .on('postgres_changes', { event: 'INSERT', schema: 'xayma_app', table: 'notifications' }, handler)
```
