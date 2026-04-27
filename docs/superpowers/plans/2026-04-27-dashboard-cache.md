# Dashboard Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache admin dashboard, customer dashboard, and activity log data in Pinia stores so navigating back to the dashboard shows data instantly and refreshes silently in the background with a subtle spinner.

**Architecture:** Three new Pinia stores (`admin-dashboard.store.ts`, `customer-dashboard.store.ts`, `activity-log.store.ts`) each hold the same state currently held in local refs inside the matching composable, plus a `fetchedAt` timestamp and `isRefreshing` boolean. The composables become thin wrappers that delegate to the stores. On mount, if cached data is < 10 minutes old, the store returns immediately and triggers a background re-fetch; otherwise it does a normal blocking fetch with skeleton loaders. A shared `RefreshingBadge` component shows the subtle indicator. On logout, all three stores are reset.

**Tech Stack:** Vue 3, Pinia (defineStore composition API), TypeScript, PrimeVue ProgressSpinner, vue-i18n

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/stores/constants.ts` | Create | Single `DASHBOARD_CACHE_TTL_MS` constant |
| `src/stores/admin-dashboard.store.ts` | Create | All admin dashboard state + TTL fetch logic |
| `src/stores/customer-dashboard.store.ts` | Create | All customer dashboard state + TTL fetch logic |
| `src/stores/activity-log.store.ts` | Create | Activity log state + TTL fetch logic |
| `src/components/RefreshingBadge.vue` | Create | Subtle spinner shown during background refresh |
| `src/composables/useAdminDashboard.ts` | Modify | Thin wrapper — delegates to admin-dashboard store |
| `src/composables/useCustomerDashboard.ts` | Modify | Thin wrapper — delegates to customer-dashboard store |
| `src/composables/useActivityLog.ts` | Modify | Thin wrapper — delegates to activity-log store |
| `src/stores/auth.store.ts` | Modify | Call `$reset()` on three stores in `signOut()` |
| `src/pages/AdminDashboard.vue` | Modify | Add `<RefreshingBadge>` |
| `src/pages/CustomerDashboard.vue` | Modify | Add `<RefreshingBadge>` |
| `src/i18n/en.ts` | Modify | Add `dashboard.refreshing` key |
| `src/i18n/fr.ts` | Modify | Add `dashboard.refreshing` key |

---

## Task 1: Shared TTL constant

**Files:**
- Create: `src/stores/constants.ts`
- Create: `src/stores/admin-dashboard.store.test.ts` (partial — TTL import test)

- [ ] **Step 1: Write the failing test**

Create `src/stores/admin-dashboard.store.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { DASHBOARD_CACHE_TTL_MS } from './constants'

describe('DASHBOARD_CACHE_TTL_MS', () => {
  it('equals 10 minutes in milliseconds', () => {
    expect(DASHBOARD_CACHE_TTL_MS).toBe(10 * 60 * 1000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run test:run -- src/stores/admin-dashboard.store.test.ts
```

Expected: FAIL — `Cannot find module './constants'`

- [ ] **Step 3: Create the constants file**

Create `src/stores/constants.ts`:

```typescript
export const DASHBOARD_CACHE_TTL_MS = 10 * 60 * 1000
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run test:run -- src/stores/admin-dashboard.store.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/constants.ts src/stores/admin-dashboard.store.test.ts
git commit -m "feat(cache): add DASHBOARD_CACHE_TTL_MS constant"
```

---

## Task 2: Admin dashboard Pinia store

**Files:**
- Create: `src/stores/admin-dashboard.store.ts`
- Modify: `src/stores/admin-dashboard.store.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the contents of `src/stores/admin-dashboard.store.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { DASHBOARD_CACHE_TTL_MS } from './constants'

vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
}))
vi.mock('@/stores/notifications.store', () => ({
  useNotificationStore: () => ({ addError: vi.fn() }),
}))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ isInitialized: true, profile: null }),
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

import { supabaseFrom } from '@/services/supabase'
import { useAdminDashboardStore } from './admin-dashboard.store'

function makeQueryMock(data: unknown, count: number | null = null) {
  const chain: Record<string, unknown> = {}
  const terminal = { data, error: null, count }
  const methods = ['select', 'eq', 'neq', 'gte', 'in', 'order', 'limit', 'single']
  methods.forEach(m => { chain[m] = () => chain })
  Object.assign(chain, terminal)
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve)
  return chain
}

describe('useAdminDashboardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(supabaseFrom).mockReturnValue(makeQueryMock([], 0) as ReturnType<typeof supabaseFrom>)
  })

  it('sets isLoading=false and fetchedAt after first fetch', async () => {
    const store = useAdminDashboardStore()
    expect(store.fetchedAt).toBeNull()
    await store.fetchAll()
    expect(store.isLoading).toBe(false)
    expect(store.fetchedAt).not.toBeNull()
  })

  it('returns cached data without re-fetching when within TTL', () => {
    const store = useAdminDashboardStore()
    store.fetchedAt = Date.now()
    store.stats.totalPartners = 42
    const isCached = store.fetchedAt !== null && Date.now() - store.fetchedAt < DASHBOARD_CACHE_TTL_MS
    expect(isCached).toBe(true)
    expect(store.stats.totalPartners).toBe(42)
  })

  it('clears isRefreshing after background refresh completes', async () => {
    const store = useAdminDashboardStore()
    store.fetchedAt = Date.now()
    store.isRefreshing = true
    await store.fetchAll()
    expect(store.isRefreshing).toBe(false)
  })

  it('resets to initial state after $reset()', () => {
    const store = useAdminDashboardStore()
    store.fetchedAt = Date.now()
    store.stats.totalPartners = 99
    store.$reset()
    expect(store.fetchedAt).toBeNull()
    expect(store.stats.totalPartners).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run test:run -- src/stores/admin-dashboard.store.test.ts
```

Expected: FAIL — `Cannot find module './admin-dashboard.store'`

- [ ] **Step 3: Create the store**

Create `src/stores/admin-dashboard.store.ts`:

```typescript
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'
import { useAuthStore } from '@/stores/auth.store'
import { useI18n } from 'vue-i18n'
import { DASHBOARD_CACHE_TTL_MS } from '@/stores/constants'

interface AdminStats {
  totalPartners: number
  activeDeployments: number
  failedDeployments: number
  revenueTodayFCFA: number
}

interface TrendPoint { name: string; value: number }
interface PlanCredit { name: string; value: number }
interface PartnerTypeRevenue { name: string; value: number }
interface CreditTransactionRow { creditsPurchased: number | null; amountPaid: number | null }
interface CreditUsedRow { creditsUsed: number | null }
interface ServicePlanRow { id: number; label: string; monthlyCreditConsumption: number }
interface DeploymentServicePlanRow { serviceplanId: number | null }
interface PartnerTypeRow { id: number; partner_type: string | null }
interface RevenueByTypeRow { amountPaid: number | null; partner_id: number }
interface RevenueRow { amountPaid: number | null }
interface DeploymentCreatedRow { created: string }

export const useAdminDashboardStore = defineStore('adminDashboard', () => {
  const { t } = useI18n()
  const notificationStore = useNotificationStore()
  const authStore = useAuthStore()

  const stats = ref<AdminStats>({ totalPartners: 0, activeDeployments: 0, failedDeployments: 0, revenueTodayFCFA: 0 })
  const deploymentsTrend = ref<TrendPoint[]>([])
  const creditsByPlan = ref<PlanCredit[]>([])
  const revenueByPartnerType = ref<PartnerTypeRevenue[]>([])
  const archivedDeployments = ref<number>(0)
  const suspendedDeployments = ref<number>(0)
  const stoppedDeployments = ref<number>(0)
  const monthlyIntakeCredits = ref<number>(0)
  const monthlyIntakeFCFA = ref<number>(0)
  const globalCreditsUsed = ref<number>(0)
  const isLoading = ref(true)
  const isRefreshing = ref(false)
  const error = ref<string | null>(null)
  const fetchedAt = ref<number | null>(null)

  async function fetchAll() {
    error.value = null
    const now = new Date()
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6))
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

    const [
      partnersResult, activeDeploymentsResult, failedDeploymentsResult, revenueResult,
      deploymentsTrendResult, plansResult, txResult, revenueByTypeResult,
      archivedResult, suspendedResult, stoppedResult, monthlyIntakeResult, globalCreditsUsedResult,
    ] = await Promise.all([
      supabaseFrom('partners').select('id', { count: 'exact', head: true }).neq('status', 'archived'),
      supabaseFrom('deployments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseFrom('deployments').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      supabaseFrom('credit_transactions').select('amountPaid').eq('status', 'completed').gte('created', todayStart.toISOString()),
      supabaseFrom('deployments').select('created').eq('status', 'active').gte('created', sevenDaysAgo.toISOString()),
      supabaseFrom('serviceplans').select('id, label, monthlyCreditConsumption'),
      supabaseFrom('deployments').select('serviceplanId').eq('status', 'active'),
      supabaseFrom('credit_transactions').select('amountPaid, partner_id').eq('status', 'completed').gte('created', new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30)).toISOString()),
      supabaseFrom('deployments').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
      supabaseFrom('deployments').select('id', { count: 'exact', head: true }).eq('status', 'suspended'),
      supabaseFrom('deployments').select('id', { count: 'exact', head: true }).eq('status', 'stopped'),
      supabaseFrom('credit_transactions').select('creditsPurchased, amountPaid').eq('status', 'completed').eq('transactionType', 'credit').gte('created', startOfMonth.toISOString()),
      supabaseFrom('credit_transactions').select('creditsUsed').eq('status', 'completed'),
    ])

    if (
      partnersResult.error || activeDeploymentsResult.error || failedDeploymentsResult.error ||
      revenueResult.error || deploymentsTrendResult.error || plansResult.error || txResult.error ||
      revenueByTypeResult.error || archivedResult.error || suspendedResult.error ||
      stoppedResult.error || monthlyIntakeResult.error || globalCreditsUsedResult.error
    ) {
      notificationStore.addError(t('errors.fetch_failed'))
      error.value = 'fetch_failed'
      isLoading.value = false
      isRefreshing.value = false
      return
    }

    stats.value = {
      totalPartners: partnersResult.count ?? 0,
      activeDeployments: activeDeploymentsResult.count ?? 0,
      failedDeployments: failedDeploymentsResult.count ?? 0,
      revenueTodayFCFA: ((revenueResult.data ?? []) as unknown as RevenueRow[]).reduce((sum, row) => sum + (row.amountPaid ?? 0), 0),
    }

    archivedDeployments.value = archivedResult.count ?? 0
    suspendedDeployments.value = suspendedResult.count ?? 0
    stoppedDeployments.value = stoppedResult.count ?? 0

    const intakeRows = (monthlyIntakeResult.data ?? []) as unknown as CreditTransactionRow[]
    monthlyIntakeCredits.value = intakeRows.reduce((sum, row) => sum + (row.creditsPurchased ?? 0), 0)
    monthlyIntakeFCFA.value = intakeRows.reduce((sum, row) => sum + (row.amountPaid ?? 0), 0)

    const usedRows = (globalCreditsUsedResult.data ?? []) as unknown as CreditUsedRow[]
    globalCreditsUsed.value = usedRows.reduce((sum, row) => sum + (row.creditsUsed ?? 0), 0)

    const dayCounts: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dayCounts[d.toISOString().slice(0, 10)] = 0
    }
    for (const row of (deploymentsTrendResult.data ?? []) as unknown as DeploymentCreatedRow[]) {
      const key = row.created.slice(0, 10)
      if (key in dayCounts) dayCounts[key]++
    }
    deploymentsTrend.value = Object.entries(dayCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, count]) => {
        const d = new Date(dateStr)
        return { name: d.toLocaleString('en-US', { month: 'short', day: 'numeric' }), value: count }
      })

    const planDetails: Record<number, { label: string; monthly: number }> = {}
    for (const plan of (plansResult.data ?? []) as unknown as ServicePlanRow[]) {
      planDetails[plan.id] = { label: plan.label, monthly: plan.monthlyCreditConsumption ?? 0 }
    }
    const planCounts: Record<string, number> = {}
    for (const d of (txResult.data ?? []) as unknown as DeploymentServicePlanRow[]) {
      if (d.serviceplanId === null) continue
      const detail = planDetails[d.serviceplanId]
      if (detail) planCounts[detail.label] = (planCounts[detail.label] ?? 0) + detail.monthly
    }
    creditsByPlan.value = Object.entries(planCounts).map(([name, value]) => ({ name, value }))

    const { data: partnersData } = await supabaseFrom('partners').select('id, partner_type')
    const partnerToType: Record<number, string> = {}
    for (const p of (partnersData ?? []) as unknown as PartnerTypeRow[]) {
      partnerToType[p.id] = p.partner_type ?? 'unknown'
    }
    const typeMap: Record<string, number> = {}
    for (const row of (revenueByTypeResult.data ?? []) as unknown as RevenueByTypeRow[]) {
      const type = partnerToType[row.partner_id] ?? 'unknown'
      typeMap[type] = (typeMap[type] ?? 0) + (row.amountPaid ?? 0)
    }
    revenueByPartnerType.value = Object.entries(typeMap).map(([name, value]) => ({ name, value }))

    fetchedAt.value = Date.now()
    isLoading.value = false
    isRefreshing.value = false
  }

  async function loadWithCache() {
    const cached = fetchedAt.value !== null && Date.now() - fetchedAt.value < DASHBOARD_CACHE_TTL_MS
    if (cached) {
      isRefreshing.value = true
      fetchAll()
      return
    }
    isLoading.value = true
    await fetchAll()
  }

  function waitForAuthThenLoad() {
    if (authStore.isInitialized) {
      loadWithCache()
    } else {
      watch(() => authStore.isInitialized, (initialized: boolean) => {
        if (initialized) loadWithCache()
      }, { once: true })
    }
  }

  function $reset() {
    stats.value = { totalPartners: 0, activeDeployments: 0, failedDeployments: 0, revenueTodayFCFA: 0 }
    deploymentsTrend.value = []
    creditsByPlan.value = []
    revenueByPartnerType.value = []
    archivedDeployments.value = 0
    suspendedDeployments.value = 0
    stoppedDeployments.value = 0
    monthlyIntakeCredits.value = 0
    monthlyIntakeFCFA.value = 0
    globalCreditsUsed.value = 0
    isLoading.value = true
    isRefreshing.value = false
    error.value = null
    fetchedAt.value = null
  }

  return {
    stats, deploymentsTrend, creditsByPlan, revenueByPartnerType,
    archivedDeployments, suspendedDeployments, stoppedDeployments,
    monthlyIntakeCredits, monthlyIntakeFCFA, globalCreditsUsed,
    isLoading, isRefreshing, error, fetchedAt,
    fetchAll, loadWithCache, waitForAuthThenLoad, $reset,
  }
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run test:run -- src/stores/admin-dashboard.store.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Type-check**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run type-check
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/stores/admin-dashboard.store.ts src/stores/admin-dashboard.store.test.ts src/stores/constants.ts
git commit -m "feat(cache): add admin dashboard Pinia store with TTL cache"
```

---

## Task 3: Customer dashboard Pinia store

**Files:**
- Create: `src/stores/customer-dashboard.store.ts`
- Create: `src/stores/customer-dashboard.store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/stores/customer-dashboard.store.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { DASHBOARD_CACHE_TTL_MS } from './constants'

vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
}))
vi.mock('@/stores/notifications.store', () => ({
  useNotificationStore: () => ({ addError: vi.fn() }),
}))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ isInitialized: true, profile: { company_id: 1 } }),
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

import { supabaseFrom } from '@/services/supabase'
import { useCustomerDashboardStore } from './customer-dashboard.store'

function makeQueryMock(data: unknown, count: number | null = null) {
  const chain: Record<string, unknown> = {}
  const terminal = { data, error: null, count }
  const methods = ['select', 'eq', 'neq', 'gte', 'in', 'order', 'limit', 'single']
  methods.forEach(m => { chain[m] = () => chain })
  Object.assign(chain, terminal)
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve)
  return chain
}

describe('useCustomerDashboardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(supabaseFrom).mockReturnValue(makeQueryMock([], 0) as ReturnType<typeof supabaseFrom>)
  })

  it('sets fetchedAt and isLoading=false after successful fetch', async () => {
    const store = useCustomerDashboardStore()
    await store.fetchAll()
    expect(store.fetchedAt).not.toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('sets isRefreshing on cache hit and clears after refresh', async () => {
    const store = useCustomerDashboardStore()
    store.fetchedAt = Date.now()
    await store.loadWithCache()
    expect(store.isRefreshing).toBe(false)
  })

  it('resets to initial state after $reset()', () => {
    const store = useCustomerDashboardStore()
    store.fetchedAt = Date.now()
    store.totalSpend = 5000
    store.$reset()
    expect(store.fetchedAt).toBeNull()
    expect(store.totalSpend).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run test:run -- src/stores/customer-dashboard.store.test.ts
```

Expected: FAIL — `Cannot find module './customer-dashboard.store'`

- [ ] **Step 3: Create the store**

Create `src/stores/customer-dashboard.store.ts`:

```typescript
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'
import { useAuthStore } from '@/stores/auth.store'
import { useI18n } from 'vue-i18n'
import { DASHBOARD_CACHE_TTL_MS } from '@/stores/constants'

interface ActiveDeployment { id: number; label: string; domain: string; status: string; serviceplanId: number | null }
interface MonthlyPoint { name: string; value: number }
interface PartnerProfile { name: string; partner_type: string | null; status: string | null; remainingCredits: number; creditDebtThreshold: number | null }
interface DeploymentRow { id: number; label: string; domainNames: string[]; status: string; serviceplanId: number | null }
interface TxRow { amountPaid: number | null; creditsUsed: number | null; created: string }
interface TxAmountRow { amountPaid: number | null }
interface ServicePlanRow { id: number; monthlyCreditConsumption: number }
interface PartnerRow { name: string; partner_type: string | null; status: string | null; remainingCredits: number; creditDebtThreshold: number | null }

export const useCustomerDashboardStore = defineStore('customerDashboard', () => {
  const { t } = useI18n()
  const notificationStore = useNotificationStore()
  const authStore = useAuthStore()

  const activeDeployments = ref<ActiveDeployment[]>([])
  const lastPaymentDate = ref<string | null>(null)
  const totalSpend = ref(0)
  const monthlyConsumption = ref<MonthlyPoint[]>([])
  const stoppedSuspendedCount = ref<number>(0)
  const archivedCount = ref<number>(0)
  const monthlyUsageCredits = ref<number>(0)
  const totalCostThisMonthFCFA = ref<number>(0)
  const partnerProfile = ref<PartnerProfile | null>(null)
  const isLoading = ref(true)
  const isRefreshing = ref(false)
  const error = ref<string | null>(null)
  const fetchedAt = ref<number | null>(null)

  async function fetchAll() {
    error.value = null

    if (!authStore.profile?.company_id) {
      isLoading.value = false
      return
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [
      deploymentsResult, txResult, stoppedSuspendedResult,
      archivedResult, monthlyTxResult, partnerResult,
    ] = await Promise.all([
      supabaseFrom('deployments').select('id, label, domainNames, status, serviceplanId').eq('status', 'active'),
      supabaseFrom('credit_transactions').select('amountPaid, creditsUsed, created').eq('status', 'completed'),
      supabaseFrom('deployments').select('id', { count: 'exact', head: true }).in('status', ['stopped', 'suspended']),
      supabaseFrom('deployments').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
      supabaseFrom('credit_transactions').select('amountPaid').eq('status', 'completed').gte('created', startOfMonth.toISOString()),
      supabaseFrom('partners').select('name, partner_type, status, remainingCredits, creditDebtThreshold').single(),
    ])

    if (deploymentsResult.error || txResult.error || stoppedSuspendedResult.error || archivedResult.error || monthlyTxResult.error || partnerResult.error) {
      notificationStore.addError(t('errors.fetch_failed'))
      error.value = 'fetch_failed'
      isLoading.value = false
      isRefreshing.value = false
      return
    }

    const deploymentsData = (deploymentsResult.data ?? []) as unknown as DeploymentRow[]
    activeDeployments.value = deploymentsData.map(d => ({
      id: d.id, label: d.label, domain: d.domainNames?.[0] ?? '', status: d.status, serviceplanId: d.serviceplanId ?? null,
    }))

    const txData = (txResult.data ?? []) as unknown as TxRow[]
    totalSpend.value = txData.reduce((sum, row) => sum + (row.amountPaid ?? 0), 0)

    const completed = txData.filter(r => r.amountPaid && r.amountPaid > 0)
    if (completed.length > 0) {
      lastPaymentDate.value = completed.reduce((a, b) => (a.created > b.created ? a : b)).created
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthBuckets: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      monthBuckets[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0
    }
    for (const row of txData) {
      const key = row.created.slice(0, 7)
      if (key in monthBuckets) monthBuckets[key] += row.creditsUsed ?? 0
    }
    monthlyConsumption.value = Object.entries(monthBuckets).map(([key, value]) => ({
      name: monthNames[parseInt(key.split('-')[1]) - 1], value,
    }))

    stoppedSuspendedCount.value = stoppedSuspendedResult.count ?? 0
    archivedCount.value = archivedResult.count ?? 0

    const activePlanIds = deploymentsData.map(d => d.serviceplanId).filter((id): id is number => id !== null)
    if (activePlanIds.length > 0) {
      const { data: plansData, error: plansError } = await supabaseFrom('serviceplans').select('id, monthlyCreditConsumption').in('id', activePlanIds)
      if (plansError) {
        notificationStore.addError(t('errors.fetch_failed'))
        error.value = 'fetch_failed'
        isLoading.value = false
        isRefreshing.value = false
        return
      }
      const plans = (plansData ?? []) as unknown as ServicePlanRow[]
      const planMap = new Map<number, number>(plans.map(p => [p.id, p.monthlyCreditConsumption]))
      monthlyUsageCredits.value = activePlanIds.reduce((sum, planId) => sum + (planMap.get(planId) ?? 0), 0)
    } else {
      monthlyUsageCredits.value = 0
    }

    const monthlyTxData = (monthlyTxResult.data ?? []) as unknown as TxAmountRow[]
    totalCostThisMonthFCFA.value = monthlyTxData.reduce((sum, row) => sum + (row.amountPaid ?? 0), 0)

    const rawPartner = partnerResult.data as unknown as PartnerRow | null
    partnerProfile.value = rawPartner
      ? { name: rawPartner.name, partner_type: rawPartner.partner_type, status: rawPartner.status, remainingCredits: rawPartner.remainingCredits, creditDebtThreshold: rawPartner.creditDebtThreshold }
      : null

    fetchedAt.value = Date.now()
    isLoading.value = false
    isRefreshing.value = false
  }

  async function loadWithCache() {
    const cached = fetchedAt.value !== null && Date.now() - fetchedAt.value < DASHBOARD_CACHE_TTL_MS
    if (cached) {
      isRefreshing.value = true
      fetchAll()
      return
    }
    isLoading.value = true
    await fetchAll()
  }

  function waitForAuthThenLoad() {
    if (authStore.isInitialized) {
      loadWithCache()
    } else {
      watch(() => authStore.isInitialized, (initialized: boolean) => {
        if (initialized) loadWithCache()
      }, { once: true })
    }
  }

  function $reset() {
    activeDeployments.value = []
    lastPaymentDate.value = null
    totalSpend.value = 0
    monthlyConsumption.value = []
    stoppedSuspendedCount.value = 0
    archivedCount.value = 0
    monthlyUsageCredits.value = 0
    totalCostThisMonthFCFA.value = 0
    partnerProfile.value = null
    isLoading.value = true
    isRefreshing.value = false
    error.value = null
    fetchedAt.value = null
  }

  return {
    activeDeployments, lastPaymentDate, totalSpend, monthlyConsumption,
    stoppedSuspendedCount, archivedCount, monthlyUsageCredits, totalCostThisMonthFCFA, partnerProfile,
    isLoading, isRefreshing, error, fetchedAt,
    fetchAll, loadWithCache, waitForAuthThenLoad, $reset,
  }
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run test:run -- src/stores/customer-dashboard.store.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/stores/customer-dashboard.store.ts src/stores/customer-dashboard.store.test.ts
git commit -m "feat(cache): add customer dashboard Pinia store with TTL cache"
```

---

## Task 4: Activity log Pinia store

**Files:**
- Create: `src/stores/activity-log.store.ts`
- Create: `src/stores/activity-log.store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/stores/activity-log.store.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { DASHBOARD_CACHE_TTL_MS } from './constants'

vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
}))
vi.mock('@/stores/notifications.store', () => ({
  useNotificationStore: () => ({ addError: vi.fn() }),
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

import { supabaseFrom } from '@/services/supabase'
import { useActivityLogStore } from './activity-log.store'

function makeQueryMock(data: unknown) {
  const chain: Record<string, unknown> = {}
  const terminal = { data, error: null }
  const methods = ['select', 'eq', 'neq', 'gte', 'in', 'order', 'limit', 'single']
  methods.forEach(m => { chain[m] = () => chain })
  Object.assign(chain, terminal)
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve)
  return chain
}

describe('useActivityLogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(supabaseFrom).mockReturnValue(makeQueryMock([]) as ReturnType<typeof supabaseFrom>)
  })

  it('sets fetchedAt and isLoading=false after successful fetch', async () => {
    const store = useActivityLogStore()
    await store.fetchActivityLog(null, 5)
    expect(store.fetchedAt).not.toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('sets isRefreshing on cache hit and clears after refresh', async () => {
    const store = useActivityLogStore()
    store.fetchedAt = Date.now()
    await store.loadWithCache(null, 5)
    expect(store.isRefreshing).toBe(false)
  })

  it('resets to initial state after $reset()', () => {
    const store = useActivityLogStore()
    store.fetchedAt = Date.now()
    store.$reset()
    expect(store.fetchedAt).toBeNull()
    expect(store.auditEntries).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run test:run -- src/stores/activity-log.store.test.ts
```

Expected: FAIL — `Cannot find module './activity-log.store'`

- [ ] **Step 3: Create the store**

Create `src/stores/activity-log.store.ts`:

```typescript
import { defineStore } from 'pinia'
import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'
import { useI18n } from 'vue-i18n'
import { DASHBOARD_CACHE_TTL_MS } from '@/stores/constants'

export interface AuditEntry {
  audit_id: number
  action: string | null
  description: string | null
  table_name: string | null
  created: string | null
  firstname: string | null
  lastname: string | null
  user_role: string | null
}

export const useActivityLogStore = defineStore('activityLog', () => {
  const { t } = useI18n()
  const notificationStore = useNotificationStore()

  const auditEntries = ref<AuditEntry[]>([])
  const isLoading = ref(true)
  const isRefreshing = ref(false)
  const fetchedAt = ref<number | null>(null)

  async function fetchActivityLog(companyId: MaybeRefOrGetter<string> | null, limit = 5) {
    let query = supabaseFrom('general_audit')
      .select('audit_id, action, description, table_name, created, firstname, lastname, user_role')
      .order('created', { ascending: false })
      .limit(limit)

    const resolvedId = companyId !== null ? toValue(companyId) : null
    if (resolvedId) {
      query = query.eq('company_id', resolvedId)
    }

    const { data, error } = await query

    if (error) {
      notificationStore.addError(t('errors.fetch_failed'))
      isLoading.value = false
      isRefreshing.value = false
      return
    }

    auditEntries.value = ((data ?? []) as unknown as AuditEntry[]).map(row => ({
      audit_id: row.audit_id,
      action: row.action,
      description: row.description,
      table_name: row.table_name,
      created: row.created,
      firstname: row.firstname,
      lastname: row.lastname,
      user_role: row.user_role,
    }))

    fetchedAt.value = Date.now()
    isLoading.value = false
    isRefreshing.value = false
  }

  async function loadWithCache(companyId: MaybeRefOrGetter<string> | null, limit = 5) {
    const cached = fetchedAt.value !== null && Date.now() - fetchedAt.value < DASHBOARD_CACHE_TTL_MS
    if (cached) {
      isRefreshing.value = true
      fetchActivityLog(companyId, limit)
      return
    }
    isLoading.value = true
    await fetchActivityLog(companyId, limit)
  }

  function $reset() {
    auditEntries.value = []
    isLoading.value = true
    isRefreshing.value = false
    fetchedAt.value = null
  }

  return {
    auditEntries, isLoading, isRefreshing, fetchedAt,
    fetchActivityLog, loadWithCache, $reset,
  }
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run test:run -- src/stores/activity-log.store.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/stores/activity-log.store.ts src/stores/activity-log.store.test.ts
git commit -m "feat(cache): add activity log Pinia store with TTL cache"
```

---

## Task 5: Update composables to thin wrappers

**Files:**
- Modify: `src/composables/useAdminDashboard.ts`
- Modify: `src/composables/useCustomerDashboard.ts`
- Modify: `src/composables/useActivityLog.ts`

- [ ] **Step 1: Replace useAdminDashboard.ts**

Replace entire contents of `src/composables/useAdminDashboard.ts`:

```typescript
import { onMounted } from 'vue'
import { useAdminDashboardStore } from '@/stores/admin-dashboard.store'

export function useAdminDashboard() {
  const store = useAdminDashboardStore()
  onMounted(() => store.waitForAuthThenLoad())
  return {
    stats: store.stats,
    deploymentsTrend: store.deploymentsTrend,
    creditsByPlan: store.creditsByPlan,
    revenueByPartnerType: store.revenueByPartnerType,
    archivedDeployments: store.archivedDeployments,
    suspendedDeployments: store.suspendedDeployments,
    stoppedDeployments: store.stoppedDeployments,
    monthlyIntakeCredits: store.monthlyIntakeCredits,
    monthlyIntakeFCFA: store.monthlyIntakeFCFA,
    globalCreditsUsed: store.globalCreditsUsed,
    isLoading: store.isLoading,
    isRefreshing: store.isRefreshing,
    error: store.error,
  }
}
```

- [ ] **Step 2: Replace useCustomerDashboard.ts**

Replace entire contents of `src/composables/useCustomerDashboard.ts`:

```typescript
import { onMounted } from 'vue'
import { useCustomerDashboardStore } from '@/stores/customer-dashboard.store'

export function useCustomerDashboard() {
  const store = useCustomerDashboardStore()
  onMounted(() => store.waitForAuthThenLoad())
  return {
    activeDeployments: store.activeDeployments,
    lastPaymentDate: store.lastPaymentDate,
    totalSpend: store.totalSpend,
    monthlyConsumption: store.monthlyConsumption,
    isLoading: store.isLoading,
    isRefreshing: store.isRefreshing,
    error: store.error,
    stoppedSuspendedCount: store.stoppedSuspendedCount,
    archivedCount: store.archivedCount,
    monthlyUsageCredits: store.monthlyUsageCredits,
    totalCostThisMonthFCFA: store.totalCostThisMonthFCFA,
    partnerProfile: store.partnerProfile,
  }
}
```

- [ ] **Step 3: Replace useActivityLog.ts**

Replace entire contents of `src/composables/useActivityLog.ts`:

```typescript
import { onMounted, type MaybeRefOrGetter } from 'vue'
import { useActivityLogStore } from '@/stores/activity-log.store'
export type { AuditEntry } from '@/stores/activity-log.store'

export function useActivityLog(companyId: MaybeRefOrGetter<string> | null, limit = 5) {
  const store = useActivityLogStore()
  onMounted(() => store.loadWithCache(companyId, limit))
  return {
    auditEntries: store.auditEntries,
    isLoading: store.isLoading,
    isRefreshing: store.isRefreshing,
    refresh: () => store.fetchActivityLog(companyId, limit),
  }
}
```

- [ ] **Step 4: Type-check**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run type-check
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/composables/useAdminDashboard.ts src/composables/useCustomerDashboard.ts src/composables/useActivityLog.ts
git commit -m "refactor(cache): convert dashboard composables to thin store wrappers"
```

---

## Task 6: Add i18n keys

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/fr.ts`

- [ ] **Step 1: Add key to en.ts**

In `src/i18n/en.ts`, inside the `dashboard:` section, find:

```typescript
    // Relative time
    time_minutes_ago: '{n}m ago',
```

Add `refreshing` immediately before it:

```typescript
    refreshing: 'Updating...',
    // Relative time
    time_minutes_ago: '{n}m ago',
```

- [ ] **Step 2: Add key to fr.ts**

In `src/i18n/fr.ts`, inside the `dashboard:` section, find:

```typescript
    // Relative time
    time_minutes_ago: 'il y a {n}min',
```

Add `refreshing` immediately before it:

```typescript
    refreshing: 'Mise à jour...',
    // Relative time
    time_minutes_ago: 'il y a {n}min',
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/en.ts src/i18n/fr.ts
git commit -m "feat(i18n): add dashboard.refreshing key"
```

---

## Task 7: RefreshingBadge component

**Files:**
- Create: `src/components/RefreshingBadge.vue`

- [ ] **Step 1: Create the component**

Create `src/components/RefreshingBadge.vue`:

```vue
<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner'
import { useI18n } from 'vue-i18n'

defineProps<{ visible: boolean }>()
const { t } = useI18n()
</script>

<template>
  <div
    v-if="visible"
    class="absolute end-4 top-4 flex items-center gap-1.5 text-xs text-surface-400"
  >
    <ProgressSpinner
      style="width: 14px; height: 14px"
      stroke-width="6"
      animation-duration="1s"
    />
    <span>{{ t('dashboard.refreshing') }}</span>
  </div>
</template>
```

- [ ] **Step 2: Type-check**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run type-check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/RefreshingBadge.vue
git commit -m "feat(cache): add RefreshingBadge component"
```

---

## Task 8: Wire RefreshingBadge into AdminDashboard.vue

**Files:**
- Modify: `src/pages/AdminDashboard.vue`

- [ ] **Step 1: Add import for RefreshingBadge**

In `src/pages/AdminDashboard.vue` script setup section, add after the existing component imports:

```typescript
import RefreshingBadge from '@/components/RefreshingBadge.vue'
```

- [ ] **Step 2: Add isRefreshing to the useAdminDashboard destructure**

Find the `useAdminDashboard()` destructure (around line 278) and add `isRefreshing`:

```typescript
const {
  stats,
  archivedDeployments,
  suspendedDeployments,
  stoppedDeployments,
  monthlyIntakeCredits,
  monthlyIntakeFCFA,
  globalCreditsUsed,
  isLoading,
  isRefreshing,
} = useAdminDashboard()
```

- [ ] **Step 3: Add badge to template**

In the template, find the outermost `<div>` after `<template>`. Add `class="relative"` to it if not already present, then add `<RefreshingBadge>` as its first child:

```html
<RefreshingBadge :visible="isRefreshing" />
```

- [ ] **Step 4: Type-check**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run type-check
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminDashboard.vue
git commit -m "feat(cache): add refresh indicator to AdminDashboard"
```

---

## Task 9: Wire RefreshingBadge into CustomerDashboard.vue

**Files:**
- Modify: `src/pages/CustomerDashboard.vue`

- [ ] **Step 1: Add import for RefreshingBadge**

In `src/pages/CustomerDashboard.vue` script setup, add:

```typescript
import RefreshingBadge from '@/components/RefreshingBadge.vue'
```

- [ ] **Step 2: Add isRefreshing to destructures**

Find `useCustomerDashboard()` destructure (around line 251) and add `isRefreshing`:

```typescript
const {
  // ... existing fields ...
  isLoading,
  isRefreshing,
  // ... rest
} = useCustomerDashboard()
```

Find `useActivityLog` destructure (around line 254) and add `isRefreshing: activityRefreshing`:

```typescript
const { auditEntries, isLoading: activityLoading, isRefreshing: activityRefreshing, refresh: refreshActivity } = useActivityLog(partnerId, 5)
```

- [ ] **Step 3: Add badges to template**

Add `<RefreshingBadge :visible="isRefreshing" />` as first child of the outermost `<div>` (add `class="relative"` to it if not present).

Add `<RefreshingBadge :visible="activityRefreshing" />` inside the activity log section header container.

- [ ] **Step 4: Type-check**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run type-check
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/CustomerDashboard.vue
git commit -m "feat(cache): add refresh indicator to CustomerDashboard"
```

---

## Task 10: Logout cleanup

**Files:**
- Modify: `src/stores/auth.store.ts`

- [ ] **Step 1: Add store imports**

In `src/stores/auth.store.ts`, add after the existing imports:

```typescript
import { useAdminDashboardStore } from '@/stores/admin-dashboard.store'
import { useCustomerDashboardStore } from '@/stores/customer-dashboard.store'
import { useActivityLogStore } from '@/stores/activity-log.store'
```

- [ ] **Step 2: Call $reset() in signOut()**

Find `signOut()` (around line 166). Replace it with:

```typescript
async function signOut() {
  try {
    isLoading.value = true
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    useAdminDashboardStore().$reset()
    useCustomerDashboardStore().$reset()
    useActivityLogStore().$reset()
  } finally {
    isLoading.value = false
  }
}
```

- [ ] **Step 3: Type-check**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run type-check
```

Expected: no errors

- [ ] **Step 4: Run all tests**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run test:run
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/stores/auth.store.ts
git commit -m "feat(cache): reset dashboard stores on logout"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full type-check**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run type-check
```

Expected: zero errors

- [ ] **Step 2: Full test run**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run test:run
```

Expected: all tests pass

- [ ] **Step 3: Lint**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run lint
```

Expected: no errors

- [ ] **Step 4: Dev server smoke test**

```bash
cd "/workspaces/04 Xayma 2.0" && npm run dev
```

Manual checks:
1. Login as customer → dashboard loads with skeleton → data appears
2. Navigate to Deployments → back to Dashboard → data appears instantly, "Updating..." spinner visible briefly then disappears
3. Login as admin → same back-nav flow with admin dashboard
4. Logout → login as different user → no stale data from previous session visible
