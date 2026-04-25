# Dashboard Real Data Wiring — Design Spec

**Date:** 2026-04-25  
**Status:** Approved

---

## Context

All four role-specific dashboards (Admin, Customer, Reseller, Sales) display entirely hardcoded placeholder values. The `fetchAdminDashboardData()` call in `AdminDashboard.vue` is commented out; the other dashboards use inline `reactive({})` literals. This spec defines how to replace every hardcoded value with real Supabase queries, using one composable per role. Two schema FK columns are also missing and must be added via migration before the Reseller and Sales hierarchy queries can work.

---

## Architecture

**Pattern:** One composable per role dashboard (`useAdminDashboard`, `useCustomerDashboard`, `useResellerDashboard`, `useSalesDashboard`), each running its queries in parallel via `Promise.all` in `onMounted`. Follows the existing pattern established by `usePartnerCredits` and `useDeployments`.

**Current user context:** Available via `useAuthStore().profile.company_id` (partner ID) and `useAuthStore().user.id` (user ID). RLS automatically scopes most queries; explicit `eq` filters are added where needed for cross-partner queries.

**Currency:** All monetary values displayed in FCFA using the existing `useCurrency` composable. The USD label on the Admin "Revenue Today" card is replaced with FCFA.

---

## Schema Migration

**File:** `supabase/migrations/YYYYMMDD_add_partner_hierarchy_fks.sql`

Add two nullable FK columns to `xayma_app.partners`:

```sql
ALTER TABLE xayma_app.partners
  ADD COLUMN managed_by_reseller_id bigint REFERENCES xayma_app.partners(id) ON DELETE SET NULL,
  ADD COLUMN sales_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX ON xayma_app.partners (managed_by_reseller_id);
CREATE INDEX ON xayma_app.partners (sales_agent_id);
```

RLS policies needed:
- Reseller users can read partners where `managed_by_reseller_id = auth.uid()` company partner
- Sales users can read partners where `sales_agent_id = auth.uid()`

After migration: regenerate `src/types/supabase.ts` via `npm run database:types`.

---

## Admin Dashboard (`AdminDashboard.vue`)

**Composable:** `src/composables/useAdminDashboard.ts`

Runs these 6 queries in parallel:

| Widget | Query |
|---|---|
| Total Partners stat card | `SELECT count(*) FROM xayma_app.partners WHERE status != 'archived'` |
| Active Deployments stat card | `SELECT count(*) FROM xayma_app.deployments WHERE status = 'active'` |
| Failed Deployments stat card | `SELECT count(*) FROM xayma_app.deployments WHERE status = 'failed'` |
| Revenue Today stat card | `SELECT sum(amountPaid) FROM xayma_app.credit_transactions WHERE status = 'completed' AND created >= today` |
| LineChart — Deployments trend | Active deployment count per day for the last 7 days (`GROUP BY date(created)`) |
| BarChart — Credits by plan | `SUM(creditsUsed)` grouped by `serviceplans.label`, joining `credit_transactions → deployments → serviceplans` |
| DonutChart — Revenue by partner type | `SUM(amountPaid)` grouped by `partners.partner_type`, joining `credit_transactions → partners` |

**Returns:** `{ stats, deploymentsTrend, creditsByPlan, revenueByPartnerType, isLoading, error }`

**Kafka section:** Remains hardcoded — Kafka consumer metrics are not accessible from the Vue frontend. Cards are visually labeled as "Indicative" until a backend metrics endpoint is available.

**Revenue label:** Updated from "Revenue Today (USD)" to "Revenue Today (FCFA)" formatted via `useCurrency`.

---

## Customer Dashboard (`CustomerDashboard.vue`)

**Composable:** `src/composables/useCustomerDashboard.ts`

| Widget | Query / Source |
|---|---|
| Credit balance, status, expiry | Already wired via `usePartnerCredits` — no change |
| Active deployments list | `SELECT * FROM xayma_app.deployments WHERE status = 'active'` — RLS scopes to partner |
| Last payment date | `SELECT max(created) FROM xayma_app.credit_transactions WHERE status = 'completed'` — RLS scopes |
| Total spend | `SELECT sum(amountPaid) FROM xayma_app.credit_transactions WHERE status = 'completed'` — formatted FCFA |
| LineChart — Monthly consumption | `SUM(creditsUsed)` per month for the last 6 months from `credit_transactions` |

**Returns:** `{ activeDeployments, lastPaymentDate, totalSpend, monthlyConsumption, isLoading, error }`

---

## Reseller Dashboard (`ResellerDashboard.vue`)

**Composable:** `src/composables/useResellerDashboard.ts`

Requires `managed_by_reseller_id` column from migration above. The reseller's own `partner.id` is sourced from `authStore.profile.company_id`.

| Widget | Query |
|---|---|
| Active clients count | `SELECT count(*) FROM xayma_app.partners WHERE managed_by_reseller_id = :myPartnerId AND status = 'active'` |
| Monthly spend | `SELECT sum(amountPaid) FROM xayma_app.credit_transactions WHERE partner_id = :myPartnerId AND created >= month_start AND status = 'completed'` |
| Client deployments list | `SELECT d.* FROM xayma_app.deployments d JOIN xayma_app.partners p ON p.id = d.partner_id WHERE p.managed_by_reseller_id = :myPartnerId` |
| At-risk clients | `SELECT * FROM xayma_app.partners WHERE managed_by_reseller_id = :myPartnerId AND status IN ('low_credit','no_credit','on_debt')` |

**Returns:** `{ activeClientsCount, monthlySpend, clientDeployments, atRiskClients, isLoading, error }`

---

## Sales Dashboard (`SalesDashboard.vue`)

**Composable:** `src/composables/useSalesDashboard.ts`

Requires `sales_agent_id` column from migration above. The sales user's own `user.id` is sourced from `authStore.user.id`.

| Widget | Query / Source |
|---|---|
| Total portfolio partners | `SELECT count(*) FROM xayma_app.partners WHERE sales_agent_id = :myUserId` |
| Total portfolio credits | `SELECT sum(remainingCredits) FROM xayma_app.partners WHERE sales_agent_id = :myUserId` |
| At-risk customers | `SELECT * FROM xayma_app.partners WHERE sales_agent_id = :myUserId AND status IN ('low_credit','no_credit','on_debt')` |
| Commission breakdown DonutChart | Client-side calculation via existing `useCommissions` composable using partners list |
| Total commission | `useCommissions` computed total — no additional query |

**Returns:** `{ portfolioStats, atRiskCustomers, commissionBreakdown, totalCommission, isLoading, error }`

---

## Error Handling

All composables follow the existing pattern from `usePartnerCredits`:
- Errors are surfaced via the notification store (`notificationStore.addError(t('errors.fetch_failed'))`)
- No `console.log` — errors go through the store
- Loading state shown via `isLoading` ref wired to skeleton placeholders on the page

---

## i18n

New keys required in both `src/i18n/en.ts` and `src/i18n/fr.ts`:
- `dashboard.admin.revenue_today_fcfa` 
- `dashboard.admin.kafka_indicative`
- Any new stat card labels that currently use hardcoded strings

---

## Files Modified

| File | Change |
|---|---|
| `supabase/migrations/YYYYMMDD_add_partner_hierarchy_fks.sql` | New — schema migration |
| `src/types/supabase.ts` | Regenerated after migration |
| `src/composables/useAdminDashboard.ts` | New |
| `src/composables/useCustomerDashboard.ts` | New |
| `src/composables/useResellerDashboard.ts` | New |
| `src/composables/useSalesDashboard.ts` | New |
| `src/pages/AdminDashboard.vue` | Replace hardcoded data with composable |
| `src/pages/CustomerDashboard.vue` | Replace hardcoded data with composable |
| `src/pages/ResellerDashboard.vue` | Replace hardcoded data with composable |
| `src/pages/SalesDashboard.vue` | Replace hardcoded data with composable |
| `src/i18n/en.ts` | New dashboard i18n keys |
| `src/i18n/fr.ts` | New dashboard i18n keys |

---

## Verification

1. Run `npm run dev` and log in as each role (Admin, Customer, Reseller, Sales)
2. Confirm stat cards show non-zero real values (or correct zeros if no data)
3. Confirm charts render with real data points, not hardcoded arrays
4. Confirm Revenue Today on Admin dashboard displays in FCFA
5. Confirm Reseller "Active Clients" reflects partners with `managed_by_reseller_id` set
6. Confirm Sales "Portfolio" reflects partners with `sales_agent_id` set
7. Run `npm run type-check` — zero errors
8. Run `npm run lint` — zero warnings
9. Run `npm run test:run` — all existing tests pass
