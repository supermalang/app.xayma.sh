# Dashboard Real Data Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded placeholder values in the Admin, Customer, Reseller, and Sales dashboards with real Supabase queries via one composable per role.

**Architecture:** One composable per dashboard role (`useAdminDashboard`, `useCustomerDashboard`, `useResellerDashboard`, `useSalesDashboard`), each running queries in parallel via `Promise.all` in `onMounted`. A schema migration adds two FK columns (`managed_by_reseller_id`, `sales_agent_id`) required by the Reseller and Sales dashboards. All monetary values display in FCFA.

**Tech Stack:** Vue 3 Composition API, Supabase JS SDK (`supabaseFrom` helper from `src/services/supabase.ts`), TypeScript strict mode, vue-i18n v11, Pinia (auth store for current user context)

---

## File Map

| File | Action |
|---|---|
| `supabase/migrations/20260425000000_add_partner_hierarchy_fks.sql` | Create — schema migration |
| `src/types/supabase.ts` | Regenerate after migration (`npm run database:types`) |
| `src/composables/useAdminDashboard.ts` | Create |
| `src/composables/useCustomerDashboard.ts` | Create |
| `src/composables/useResellerDashboard.ts` | Create |
| `src/composables/useSalesDashboard.ts` | Create |
| `src/pages/AdminDashboard.vue` | Modify — wire composable, remove hardcoded data |
| `src/pages/CustomerDashboard.vue` | Modify — wire composable, remove hardcoded data |
| `src/pages/ResellerDashboard.vue` | Modify — wire composable, remove hardcoded data |
| `src/pages/SalesDashboard.vue` | Modify — wire composable, remove hardcoded data |
| `src/i18n/en.ts` | Modify — add `kafka_indicative` key |
| `src/i18n/fr.ts` | Modify — add `kafka_indicative` key |

---

## Task 1: Schema Migration

**Files:**
- Create: `supabase/migrations/20260425000000_add_partner_hierarchy_fks.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add reseller hierarchy and sales agent FK columns to partners table
-- managed_by_reseller_id: links a customer partner to their reseller partner
-- sales_agent_id: links a partner to the sales user (auth.users) who manages them

ALTER TABLE xayma_app.partners
  ADD COLUMN IF NOT EXISTS managed_by_reseller_id bigint
    REFERENCES xayma_app.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sales_agent_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS partners_managed_by_reseller_id_idx
  ON xayma_app.partners (managed_by_reseller_id);

CREATE INDEX IF NOT EXISTS partners_sales_agent_id_idx
  ON xayma_app.partners (sales_agent_id);

-- RLS: Reseller users can read partners they manage
CREATE POLICY "Resellers can read their managed partners"
  ON xayma_app.partners
  FOR SELECT
  USING (
    managed_by_reseller_id = (
      SELECT company_id FROM xayma_app.users WHERE id = auth.uid()
    )
  );

-- RLS: Sales users can read partners in their portfolio
CREATE POLICY "Sales agents can read their portfolio partners"
  ON xayma_app.partners
  FOR SELECT
  USING (sales_agent_id = auth.uid());
```

- [ ] **Step 2: Push migration to Supabase**

```bash
npm run database:push
```

Expected: migration applies without error.

- [ ] **Step 3: Regenerate TypeScript types**

```bash
npm run database:types
```

Expected: `src/types/supabase.ts` updated with `managed_by_reseller_id` and `sales_agent_id` columns on the `partners` row type.

- [ ] **Step 4: Verify types were updated**

```bash
grep -n "managed_by_reseller_id\|sales_agent_id" src/types/supabase.ts
```

Expected: at least 2 matches (Insert + Row types).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260425000000_add_partner_hierarchy_fks.sql src/types/supabase.ts
git commit -m "feat(schema): add managed_by_reseller_id and sales_agent_id FKs to partners"
```

---

## Task 2: i18n — Add kafka_indicative Key

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/fr.ts`

- [ ] **Step 1: Add key to en.ts**

In `src/i18n/en.ts`, inside the `dashboard:` block after `failed_events: 'Failed Events',` add:

```typescript
    kafka_indicative: 'Indicative (no live connection)',
```

- [ ] **Step 2: Add key to fr.ts**

In `src/i18n/fr.ts`, inside the `dashboard:` block after the equivalent `failed_events` line add:

```typescript
    kafka_indicative: 'Indicatif (aucune connexion en direct)',
```

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.ts src/i18n/fr.ts
git commit -m "feat(i18n): add kafka_indicative key to dashboard translations"
```

---

## Task 3: useAdminDashboard Composable

**Files:**
- Create: `src/composables/useAdminDashboard.ts`

- [ ] **Step 1: Create the composable**

```typescript
import { ref, onMounted } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'
import { useI18n } from 'vue-i18n'

interface AdminStats {
  totalPartners: number
  activeDeployments: number
  failedDeployments: number
  revenueTodayFCFA: number
}

interface TrendPoint {
  name: string
  value: number
}

interface PlanCredit {
  name: string
  value: number
}

interface PartnerTypeRevenue {
  name: string
  value: number
}

export function useAdminDashboard() {
  const { t } = useI18n()
  const notificationStore = useNotificationStore()

  const stats = ref<AdminStats>({
    totalPartners: 0,
    activeDeployments: 0,
    failedDeployments: 0,
    revenueTodayFCFA: 0,
  })
  const deploymentsTrend = ref<TrendPoint[]>([])
  const creditsByPlan = ref<PlanCredit[]>([])
  const revenueByPartnerType = ref<PartnerTypeRevenue[]>([])
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  async function fetchAll() {
    isLoading.value = true
    error.value = null

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const [
      partnersResult,
      activeDeploymentsResult,
      failedDeploymentsResult,
      revenueResult,
      deploymentsTrendResult,
      revenueByTypeResult,
    ] = await Promise.all([
      supabaseFrom('partners')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'archived'),

      supabaseFrom('deployments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),

      supabaseFrom('deployments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),

      supabaseFrom('credit_transactions')
        .select('amountPaid')
        .eq('status', 'completed')
        .gte('created', todayStart.toISOString()),

      supabaseFrom('deployments')
        .select('created')
        .eq('status', 'active')
        .gte('created', sevenDaysAgo.toISOString()),

      supabaseFrom('credit_transactions')
        .select('amountPaid, partners(partner_type)')
        .eq('status', 'completed'),
    ])

    if (
      partnersResult.error ||
      activeDeploymentsResult.error ||
      failedDeploymentsResult.error ||
      revenueResult.error ||
      deploymentsTrendResult.error ||
      revenueByTypeResult.error
    ) {
      notificationStore.addError(t('errors.fetch_failed'))
      error.value = 'fetch_failed'
      isLoading.value = false
      return
    }

    stats.value = {
      totalPartners: partnersResult.count ?? 0,
      activeDeployments: activeDeploymentsResult.count ?? 0,
      failedDeployments: failedDeploymentsResult.count ?? 0,
      revenueTodayFCFA: (revenueResult.data ?? []).reduce(
        (sum, row) => sum + (row.amountPaid ?? 0),
        0,
      ),
    }

    // Build 7-day trend: group created dates into day buckets
    const dayCounts: Record<string, number> = {}
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dayCounts[key] = 0
    }
    for (const row of deploymentsTrendResult.data ?? []) {
      const key = row.created.slice(0, 10)
      if (key in dayCounts) dayCounts[key]++
    }
    deploymentsTrend.value = Object.entries(dayCounts).map(([dateStr, count]) => ({
      name: days[new Date(dateStr).getDay()],
      value: count,
    }))

    // Group revenue by partner_type
    const typeMap: Record<string, number> = {}
    for (const row of revenueByTypeResult.data ?? []) {
      const type = (row.partners as any)?.partner_type ?? 'unknown'
      typeMap[type] = (typeMap[type] ?? 0) + (row.amountPaid ?? 0)
    }
    revenueByPartnerType.value = Object.entries(typeMap).map(([name, value]) => ({
      name,
      value,
    }))

    isLoading.value = false
  }

  onMounted(fetchAll)

  return { stats, deploymentsTrend, creditsByPlan, revenueByPartnerType, isLoading, error }
}
```

Note: `creditsByPlan` requires a join through `deployments → serviceplans` which is not directly available via the JS SDK's simple select. For now it returns an empty array and a follow-up task (Task 4) handles it via a separate query.

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useAdminDashboard.ts
git commit -m "feat: add useAdminDashboard composable with real Supabase queries"
```

---

## Task 4: useAdminDashboard — Credits by Plan Query

**Files:**
- Modify: `src/composables/useAdminDashboard.ts`

The credits-by-plan chart requires summing `creditsUsed` per service plan label. Since the SDK doesn't support multi-level joins cleanly, we fetch plans then deployments-with-credits separately and aggregate client-side.

- [ ] **Step 1: Add creditsByPlan fetch inside fetchAll in useAdminDashboard.ts**

Add this after the `Promise.all` resolves (before computing `deploymentsTrend`), inside the `fetchAll` function:

```typescript
    // Credits by plan: fetch all serviceplans and aggregate creditsUsed from credit_transactions
    const [plansResult, txResult] = await Promise.all([
      supabaseFrom('serviceplans').select('id, label'),
      supabaseFrom('credit_transactions')
        .select('creditsUsed, deployments(serviceplanId)')
        .eq('status', 'completed')
        .not('creditsUsed', 'is', null),
    ])

    if (!plansResult.error && !txResult.error) {
      const planLabels: Record<number, string> = {}
      for (const plan of plansResult.data ?? []) {
        planLabels[plan.id] = plan.label
      }
      const planTotals: Record<string, number> = {}
      for (const tx of txResult.data ?? []) {
        const planId = (tx.deployments as any)?.serviceplanId
        const label = planLabels[planId] ?? 'Unknown'
        planTotals[label] = (planTotals[label] ?? 0) + (tx.creditsUsed ?? 0)
      }
      creditsByPlan.value = Object.entries(planTotals).map(([name, value]) => ({
        name,
        value,
      }))
    }
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useAdminDashboard.ts
git commit -m "feat: add credits-by-plan aggregation to useAdminDashboard"
```

---

## Task 5: Wire AdminDashboard.vue

**Files:**
- Modify: `src/pages/AdminDashboard.vue`

- [ ] **Step 1: Replace script setup in AdminDashboard.vue**

Replace the entire `<script setup lang="ts">` block (lines 110–233) with:

```typescript
<script setup lang="ts">
import Card from 'primevue/card'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import StatCard from '@/components/charts/StatCard.vue'
import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import { useAdminDashboard } from '@/composables/useAdminDashboard'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { stats, deploymentsTrend, creditsByPlan, revenueByPartnerType, isLoading } = useAdminDashboard()

interface StatCardConfig {
  id: string
  labelKey: string
  valueKey: keyof typeof stats.value
  icon: string
  color: 'primary' | 'secondary' | 'tertiary' | 'error'
  format: 'number' | 'currency' | 'percent'
}

const statCards: StatCardConfig[] = [
  {
    id: 'total-partners',
    labelKey: 'dashboard.total_partners',
    valueKey: 'totalPartners',
    icon: 'pi pi-users',
    color: 'primary',
    format: 'number',
  },
  {
    id: 'active-deployments',
    labelKey: 'dashboard.active_deployments',
    valueKey: 'activeDeployments',
    icon: 'pi pi-server',
    color: 'tertiary',
    format: 'number',
  },
  {
    id: 'revenue-today',
    labelKey: 'dashboard.revenue_today',
    valueKey: 'revenueTodayFCFA',
    icon: 'pi pi-wallet',
    color: 'secondary',
    format: 'currency',
  },
  {
    id: 'failed-deployments',
    labelKey: 'dashboard.failed_deployments',
    valueKey: 'failedDeployments',
    icon: 'pi pi-times-circle',
    color: 'error',
    format: 'number',
  },
]

// Kafka metrics remain indicative — no live connection available from frontend
const kafkaMetrics = { consumerLag: '—', messagesProcessed: '—', failedEvents: '—' }

// BarChart expects { categories, series }
const planCategories = computed(() => creditsByPlan.value.map(p => p.name))
const creditDeductionSeries = computed(() => [
  {
    name: t('dashboard.credit_deduction_by_plan'),
    data: creditsByPlan.value.map(p => p.value),
    color: '#00288e',
  },
])
</script>
```

Also add `import { computed } from 'vue'` at the top of the script block.

- [ ] **Step 2: Update Kafka section label in template**

In the Kafka card header in the template, change the `<h3>` to include the indicative label:

```html
<h3 class="text-base font-semibold text-on-surface">
  {{ $t('dashboard.kafka_metrics') }}
  <span class="text-xs font-normal text-on-surface-variant ms-2">{{ $t('dashboard.kafka_indicative') }}</span>
</h3>
```

- [ ] **Step 3: Update template bindings for BarChart**

The BarChart is already bound to `planCategories` and `creditDeductionSeries` in the template — no change needed there.

- [ ] **Step 4: Update LineChart binding**

The LineChart `data` binding is already `:data="deploymentsTrendData"` — rename the ref in the template to match the composable output. Change:

```html
:data="deploymentsTrendData"
```
to:
```html
:data="deploymentsTrend"
```

- [ ] **Step 5: Update DonutChart binding**

`revenueByPartnerType` is the same name — no template change needed.

- [ ] **Step 6: Run type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add src/pages/AdminDashboard.vue
git commit -m "feat(dashboard): wire AdminDashboard to useAdminDashboard composable"
```

---

## Task 6: useCustomerDashboard Composable

**Files:**
- Create: `src/composables/useCustomerDashboard.ts`

- [ ] **Step 1: Create the composable**

```typescript
import { ref, onMounted } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'
import { useI18n } from 'vue-i18n'

interface ActiveDeployment {
  id: number
  label: string
  domain: string
  status: string
  serviceplanId: number | null
}

interface MonthlyPoint {
  name: string
  value: number
}

export function useCustomerDashboard() {
  const { t } = useI18n()
  const notificationStore = useNotificationStore()

  const activeDeployments = ref<ActiveDeployment[]>([])
  const lastPaymentDate = ref<string | null>(null)
  const totalSpend = ref(0)
  const monthlyConsumption = ref<MonthlyPoint[]>([])
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  async function fetchAll() {
    isLoading.value = true
    error.value = null

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const [deploymentsResult, txResult] = await Promise.all([
      supabaseFrom('deployments')
        .select('id, label, domainNames, status, serviceplanId')
        .eq('status', 'active'),

      supabaseFrom('credit_transactions')
        .select('amountPaid, creditsUsed, created')
        .eq('status', 'completed'),
    ])

    if (deploymentsResult.error || txResult.error) {
      notificationStore.addError(t('errors.fetch_failed'))
      error.value = 'fetch_failed'
      isLoading.value = false
      return
    }

    activeDeployments.value = (deploymentsResult.data ?? []).map(d => ({
      id: d.id,
      label: d.label,
      domain: d.domainNames?.[0] ?? '',
      status: d.status,
      serviceplanId: d.serviceplanId ?? null,
    }))

    const txData = txResult.data ?? []

    // Total spend (sum of all completed amountPaid)
    totalSpend.value = txData.reduce((sum, row) => sum + (row.amountPaid ?? 0), 0)

    // Last payment date
    const completed = txData.filter(r => r.amountPaid && r.amountPaid > 0)
    if (completed.length > 0) {
      const latest = completed.reduce((a, b) => (a.created > b.created ? a : b))
      lastPaymentDate.value = latest.created
    }

    // Monthly consumption: last 6 months, creditsUsed per month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthBuckets: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthBuckets[key] = 0
    }
    for (const row of txData) {
      const key = row.created.slice(0, 7)
      if (key in monthBuckets) {
        monthBuckets[key] += row.creditsUsed ?? 0
      }
    }
    monthlyConsumption.value = Object.entries(monthBuckets).map(([key, value]) => ({
      name: monthNames[parseInt(key.split('-')[1]) - 1],
      value,
    }))

    isLoading.value = false
  }

  onMounted(fetchAll)

  return { activeDeployments, lastPaymentDate, totalSpend, monthlyConsumption, isLoading, error }
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useCustomerDashboard.ts
git commit -m "feat: add useCustomerDashboard composable with real Supabase queries"
```

---

## Task 7: Wire CustomerDashboard.vue

**Files:**
- Modify: `src/pages/CustomerDashboard.vue`

- [ ] **Step 1: Replace the hardcoded data block in script setup**

In `src/pages/CustomerDashboard.vue`, replace from `const activeDeployments = [` (line 138) through `// In production, fetch from API` and the commented `onMounted` block (line 239) with:

```typescript
import { useCustomerDashboard } from '@/composables/useCustomerDashboard'
import { useCurrency } from '@/composables/useCurrency'

const { activeDeployments, lastPaymentDate, totalSpend, monthlyConsumption, isLoading } = useCustomerDashboard()
const { formatCurrency } = useCurrency()
```

Also remove the local `formatCurrency` function definition (lines 198–203) since `useCurrency` provides it.

- [ ] **Step 2: Update template binding for total spend**

In the template, change the hardcoded `formatCurrency(1250)` (line 31) to:

```html
{{ formatCurrency(totalSpend) }}
```

- [ ] **Step 3: Update template binding for lastPaymentDate**

`lastPaymentDate` is already used in the template via `formatDate(lastPaymentDate)` — no change needed, since the ref name matches.

- [ ] **Step 4: Update template binding for monthly consumption chart**

Change `:data="monthlyConsumptionData"` to:

```html
:data="monthlyConsumption"
```

- [ ] **Step 5: Update template binding for active deployments domain**

The active deployment cards reference `deployment.domain` — the composable maps `domainNames[0]` to `domain`, so no template change needed.

- [ ] **Step 6: Run type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add src/pages/CustomerDashboard.vue
git commit -m "feat(dashboard): wire CustomerDashboard to useCustomerDashboard composable"
```

---

## Task 8: useResellerDashboard Composable

**Files:**
- Create: `src/composables/useResellerDashboard.ts`

- [ ] **Step 1: Create the composable**

```typescript
import { ref, onMounted } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notifications.store'
import { useI18n } from 'vue-i18n'

interface ClientDeploymentRow {
  partnerId: number
  clientName: string
  deploymentCount: number
  monthlyConsumption: number
  status: string
}

interface AtRiskClient {
  partnerId: number
  clientName: string
  deploymentCount: number
  monthlyConsumption: number
}

export function useResellerDashboard() {
  const { t } = useI18n()
  const authStore = useAuthStore()
  const notificationStore = useNotificationStore()

  const activeClientsCount = ref(0)
  const monthlySpend = ref(0)
  const clientDeployments = ref<ClientDeploymentRow[]>([])
  const atRiskClients = ref<AtRiskClient[]>([])
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  async function fetchAll() {
    isLoading.value = true
    error.value = null

    const myPartnerId = authStore.profile?.company_id
    if (!myPartnerId) {
      isLoading.value = false
      return
    }

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [activeClientsResult, monthlySpendResult, clientPartnersResult, atRiskResult] =
      await Promise.all([
        supabaseFrom('partners')
          .select('id', { count: 'exact', head: true })
          .eq('managed_by_reseller_id', myPartnerId)
          .eq('status', 'active'),

        supabaseFrom('credit_transactions')
          .select('amountPaid')
          .eq('partner_id', myPartnerId)
          .eq('status', 'completed')
          .gte('created', monthStart.toISOString()),

        supabaseFrom('partners')
          .select('id, name, status, deployments(id, serviceplanId, serviceplans(monthlyCreditConsumption))')
          .eq('managed_by_reseller_id', myPartnerId),

        supabaseFrom('partners')
          .select('id, name, deployments(id, serviceplans(monthlyCreditConsumption))')
          .eq('managed_by_reseller_id', myPartnerId)
          .in('status', ['low_credit', 'no_credit', 'on_debt']),
      ])

    if (
      activeClientsResult.error ||
      monthlySpendResult.error ||
      clientPartnersResult.error ||
      atRiskResult.error
    ) {
      notificationStore.addError(t('errors.fetch_failed'))
      error.value = 'fetch_failed'
      isLoading.value = false
      return
    }

    activeClientsCount.value = activeClientsResult.count ?? 0

    monthlySpend.value = (monthlySpendResult.data ?? []).reduce(
      (sum, row) => sum + (row.amountPaid ?? 0),
      0,
    )

    clientDeployments.value = (clientPartnersResult.data ?? []).map(partner => {
      const deps = (partner.deployments as any[]) ?? []
      const monthlyTotal = deps.reduce(
        (sum: number, d: any) => sum + (d.serviceplans?.monthlyCreditConsumption ?? 0),
        0,
      )
      return {
        partnerId: partner.id,
        clientName: partner.name,
        deploymentCount: deps.length,
        monthlyConsumption: monthlyTotal,
        status: partner.status,
      }
    })

    atRiskClients.value = (atRiskResult.data ?? []).map(partner => {
      const deps = (partner.deployments as any[]) ?? []
      const monthlyTotal = deps.reduce(
        (sum: number, d: any) => sum + (d.serviceplans?.monthlyCreditConsumption ?? 0),
        0,
      )
      return {
        partnerId: partner.id,
        clientName: partner.name,
        deploymentCount: deps.length,
        monthlyConsumption: monthlyTotal,
      }
    })

    isLoading.value = false
  }

  onMounted(fetchAll)

  return { activeClientsCount, monthlySpend, clientDeployments, atRiskClients, isLoading, error }
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useResellerDashboard.ts
git commit -m "feat: add useResellerDashboard composable with real Supabase queries"
```

---

## Task 9: Wire ResellerDashboard.vue

**Files:**
- Modify: `src/pages/ResellerDashboard.vue`

- [ ] **Step 1: Import and use the composable**

In `src/pages/ResellerDashboard.vue`, add this import after the existing imports:

```typescript
import { useResellerDashboard } from '@/composables/useResellerDashboard'
```

- [ ] **Step 2: Replace hardcoded refs**

Remove these three hardcoded ref declarations (lines 304–368):

```typescript
const monthlySpend = ref(8400)
const activeClientsCount = ref(12)
const clientDeployments = ref([...])
const atRiskClients = ref([...])
```

Replace with:

```typescript
const {
  activeClientsCount,
  monthlySpend,
  clientDeployments,
  atRiskClients,
} = useResellerDashboard()
```

- [ ] **Step 3: Remove the commented onMounted fetch (lines 441–443)**

Remove:
```typescript
// In production, fetch from API
onMounted(() => {
  // await fetchResellerDashboardData()
})
```

- [ ] **Step 4: Update at-risk template key**

The at-risk clients template uses `client.partnerId` — the composable returns `partnerId: number` (was string in hardcoded data). Ensure template `:key` and `:to` use the same field name. No type issue since Vue handles string interpolation automatically.

- [ ] **Step 5: Run type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ResellerDashboard.vue
git commit -m "feat(dashboard): wire ResellerDashboard to useResellerDashboard composable"
```

---

## Task 10: useSalesDashboard Composable

**Files:**
- Create: `src/composables/useSalesDashboard.ts`

- [ ] **Step 1: Create the composable**

```typescript
import { ref, computed, onMounted } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notifications.store'
import { useI18n } from 'vue-i18n'
import { calculateAcquisitionBonus, calculateRenewalCommission } from '@/composables/useCommissions'

interface PortfolioStats {
  portfolioSize: number
  newCustomersThisMonth: number
  pendingCommission: number
  totalEarnings: number
  atRiskCount: number
  customerGrowthTrend: number
}

interface AtRiskCustomer {
  partnerId: number
  partnerName: string
  creditStatus: string
}

interface CommissionPoint {
  name: string
  value: number
}

export function useSalesDashboard() {
  const { t } = useI18n()
  const authStore = useAuthStore()
  const notificationStore = useNotificationStore()

  const portfolioStats = ref<PortfolioStats>({
    portfolioSize: 0,
    newCustomersThisMonth: 0,
    pendingCommission: 0,
    totalEarnings: 0,
    atRiskCount: 0,
    customerGrowthTrend: 0,
  })
  const atRiskCustomers = ref<AtRiskCustomer[]>([])
  const commissionBreakdown = ref<CommissionPoint[]>([])
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  async function fetchAll() {
    isLoading.value = true
    error.value = null

    const myUserId = authStore.user?.id
    if (!myUserId) {
      isLoading.value = false
      return
    }

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [portfolioResult, atRiskResult] = await Promise.all([
      supabaseFrom('partners')
        .select('id, name, status, created, deployments(serviceplanId, serviceplans(monthlyCreditConsumption))')
        .eq('sales_agent_id', myUserId),

      supabaseFrom('partners')
        .select('id, name, status')
        .eq('sales_agent_id', myUserId)
        .in('status', ['low_credit', 'no_credit', 'on_debt']),
    ])

    if (portfolioResult.error || atRiskResult.error) {
      notificationStore.addError(t('errors.fetch_failed'))
      error.value = 'fetch_failed'
      isLoading.value = false
      return
    }

    const allPartners = portfolioResult.data ?? []

    const newThisMonth = allPartners.filter(
      p => p.created >= monthStart.toISOString(),
    ).length

    // Commission calculation using existing useCommissions functions
    let acquisitionTotal = 0
    let renewalTotal = 0
    for (const partner of allPartners) {
      const deps = (partner.deployments as any[]) ?? []
      for (const dep of deps) {
        const planPrice = dep.serviceplans?.monthlyCreditConsumption ?? 0
        acquisitionTotal += calculateAcquisitionBonus(planPrice)
        renewalTotal += calculateRenewalCommission(planPrice)
      }
    }

    portfolioStats.value = {
      portfolioSize: allPartners.length,
      newCustomersThisMonth: newThisMonth,
      pendingCommission: renewalTotal,
      totalEarnings: acquisitionTotal + renewalTotal,
      atRiskCount: atRiskResult.data?.length ?? 0,
      customerGrowthTrend: newThisMonth > 0 ? Math.round((newThisMonth / Math.max(allPartners.length, 1)) * 100) : 0,
    }

    atRiskCustomers.value = (atRiskResult.data ?? []).map(p => ({
      partnerId: p.id,
      partnerName: p.name,
      creditStatus: p.status === 'no_credit' ? 'CRITICAL' : 'LOW',
    }))

    commissionBreakdown.value = [
      { name: 'Acquisition Bonus', value: acquisitionTotal },
      { name: 'Renewal Commissions', value: renewalTotal },
    ]

    isLoading.value = false
  }

  onMounted(fetchAll)

  return { portfolioStats, atRiskCustomers, commissionBreakdown, isLoading, error }
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useSalesDashboard.ts
git commit -m "feat: add useSalesDashboard composable with real Supabase queries"
```

---

## Task 11: Wire SalesDashboard.vue

**Files:**
- Modify: `src/pages/SalesDashboard.vue`

- [ ] **Step 1: Import composable and useCurrency**

Add at the top of `<script setup lang="ts">`:

```typescript
import { useI18n } from 'vue-i18n'
import { useSalesDashboard } from '@/composables/useSalesDashboard'
import { useCurrency } from '@/composables/useCurrency'

const { t } = useI18n()
const { portfolioStats, atRiskCustomers, commissionBreakdown, isLoading } = useSalesDashboard()
const { formatCurrency } = useCurrency()
```

- [ ] **Step 2: Remove hardcoded data**

Delete the three hardcoded `ref` declarations:

```typescript
const portfolioStats = ref({ portfolioSize: 24, ... })
const atRiskCustomers = ref([...])
const commissionBreakdown = [...]
```

- [ ] **Step 3: Remove local formatCurrency**

Delete the local `formatCurrency` function (uses USD) — replaced by `useCurrency`.

- [ ] **Step 4: Remove the commented onMounted block**

Delete:
```typescript
// In production, fetch from API
onMounted(() => {
  // await fetchSalesDashboardData()
})
```

- [ ] **Step 5: Run type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/pages/SalesDashboard.vue
git commit -m "feat(dashboard): wire SalesDashboard to useSalesDashboard composable"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test:run
```

Expected: all existing tests pass.

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: 0 errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: 0 warnings.

- [ ] **Step 4: Start dev server and verify Admin dashboard**

```bash
npm run dev
```

Log in as Admin. Verify:
- Stat cards show non-zero real values (or honest zeros)
- LineChart renders 7 data points (one per day)
- BarChart renders with real plan labels
- DonutChart renders with real partner type labels
- Kafka section shows dashes (`—`) and the indicative label

- [ ] **Step 5: Verify Customer dashboard**

Log in as Customer. Verify:
- Credit balance section still works (via `usePartnerCredits`)
- Active deployments list shows real deployments (or empty state)
- Total spend shows FCFA amount
- Monthly consumption chart has 6 months of data points

- [ ] **Step 6: Verify Reseller dashboard**

Log in as Reseller. Verify:
- Active Clients count reflects partners with `managed_by_reseller_id` set
- Monthly spend shows FCFA amount from `credit_transactions`
- Client deployments table renders real client rows (or empty)
- At-risk panel only shows when there are at-risk clients

- [ ] **Step 7: Verify Sales dashboard**

Log in as Sales. Verify:
- Portfolio Size stat card reflects partners with `sales_agent_id = current user`
- At-risk customers table shows real entries
- Commission breakdown donut renders acquisition + renewal slices

- [ ] **Step 8: Final commit if any cleanup needed**

```bash
git add -p
git commit -m "chore(dashboard): final cleanup after real data wiring"
```
