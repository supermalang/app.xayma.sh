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
