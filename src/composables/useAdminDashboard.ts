import { ref, onMounted, watch } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'
import { useAuthStore } from '@/stores/auth.store'
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

interface CreditTransactionRow {
  creditsPurchased: number | null
  amountPaid: number | null
}

interface CreditUsedRow {
  creditsUsed: number | null
}

export function useAdminDashboard() {
  const { t } = useI18n()
  const notificationStore = useNotificationStore()
  const authStore = useAuthStore()

  const stats = ref<AdminStats>({
    totalPartners: 0,
    activeDeployments: 0,
    failedDeployments: 0,
    revenueTodayFCFA: 0,
  })
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
  const error = ref<string | null>(null)

  async function fetchAll() {
    isLoading.value = true
    error.value = null

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [
      partnersResult,
      activeDeploymentsResult,
      failedDeploymentsResult,
      revenueResult,
      deploymentsTrendResult,
      plansResult,
      txResult,
      revenueByTypeResult,
      archivedResult,
      suspendedResult,
      stoppedResult,
      monthlyIntakeResult,
      globalCreditsUsedResult,
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

      supabaseFrom('serviceplans').select('id, label, monthlyCreditConsumption'),

      supabaseFrom('deployments')
        .select('serviceplanId')
        .eq('status', 'active'),

      supabaseFrom('credit_transactions')
        .select('amountPaid, partner_id')
        .eq('status', 'completed')
        .gte('created', (() => {
          const d = new Date()
          d.setDate(d.getDate() - 30)
          d.setHours(0, 0, 0, 0)
          return d.toISOString()
        })()),

      supabaseFrom('deployments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'archived'),

      supabaseFrom('deployments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'suspended'),

      supabaseFrom('deployments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'stopped'),

      supabaseFrom('credit_transactions')
        .select('creditsPurchased, amountPaid')
        .eq('status', 'completed')
        .eq('transactionType', 'credit')
        .gte('created', startOfMonth.toISOString()),

      supabaseFrom('credit_transactions')
        .select('creditsUsed')
        .eq('status', 'completed'),
    ])

    if (
      partnersResult.error ||
      activeDeploymentsResult.error ||
      failedDeploymentsResult.error ||
      revenueResult.error ||
      deploymentsTrendResult.error ||
      plansResult.error ||
      txResult.error ||
      revenueByTypeResult.error ||
      archivedResult.error ||
      suspendedResult.error ||
      stoppedResult.error ||
      monthlyIntakeResult.error ||
      globalCreditsUsedResult.error
    ) {
      notificationStore.addError(t('errors.fetch_failed'))
      error.value = 'fetch_failed'
      isLoading.value = false
      return
    }

    // Stats
    stats.value = {
      totalPartners: partnersResult.count ?? 0,
      activeDeployments: activeDeploymentsResult.count ?? 0,
      failedDeployments: failedDeploymentsResult.count ?? 0,
      revenueTodayFCFA: (revenueResult.data ?? []).reduce(
        (sum, row) => sum + (row.amountPaid ?? 0),
        0,
      ),
    }

    // Deployment status breakdown
    archivedDeployments.value = archivedResult.count ?? 0
    suspendedDeployments.value = suspendedResult.count ?? 0
    stoppedDeployments.value = stoppedResult.count ?? 0

    // Monthly intake
    const intakeRows = (monthlyIntakeResult.data ?? []) as unknown as CreditTransactionRow[]
    monthlyIntakeCredits.value = intakeRows.reduce((sum, row) => sum + (row.creditsPurchased ?? 0), 0)
    monthlyIntakeFCFA.value = intakeRows.reduce((sum, row) => sum + (row.amountPaid ?? 0), 0)

    // Global credits used
    const usedRows = (globalCreditsUsedResult.data ?? []) as unknown as CreditUsedRow[]
    globalCreditsUsed.value = usedRows.reduce((sum, row) => sum + (row.creditsUsed ?? 0), 0)

    // Deployments trend: 7-day chart
    const dayCounts: Record<string, number> = {}
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
    deploymentsTrend.value = Object.entries(dayCounts)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([dateStr, count]) => {
        const d = new Date(dateStr)
        return {
          name: `${d.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`,
          value: count,
        }
      })

    // Credits by plan: active deployments × their plan's monthly credit consumption
    const planDetails: Record<number, { label: string; monthly: number }> = {}
    for (const plan of plansResult.data ?? []) {
      planDetails[plan.id] = { label: plan.label, monthly: (plan as any).monthlyCreditConsumption ?? 0 }
    }
    const planCounts: Record<string, number> = {}
    for (const d of txResult.data ?? []) {
      const planId = (d as any).serviceplanId
      const detail = planDetails[planId]
      if (detail) {
        planCounts[detail.label] = (planCounts[detail.label] ?? 0) + detail.monthly
      }
    }
    creditsByPlan.value = Object.entries(planCounts).map(([name, value]) => ({ name, value }))

    // Revenue by partner type: fetch partners to map types
    const { data: partnersData } = await supabaseFrom('partners').select('id, partner_type')
    const partnerToType: Record<number, string> = {}
    for (const p of partnersData ?? []) {
      partnerToType[p.id] = p.partner_type ?? 'unknown'
    }

    const typeMap: Record<string, number> = {}
    for (const row of revenueByTypeResult.data ?? []) {
      const partnerId = (row as any).partner_id
      const type = partnerToType[partnerId] ?? 'unknown'
      typeMap[type] = (typeMap[type] ?? 0) + (row.amountPaid ?? 0)
    }
    revenueByPartnerType.value = Object.entries(typeMap).map(([name, value]) => ({
      name,
      value,
    }))

    isLoading.value = false
  }

  onMounted(() => {
    // Wait for auth to be initialized before fetching
    if (authStore.isInitialized) {
      fetchAll()
    } else {
      watch(() => authStore.isInitialized, (initialized) => {
        if (initialized) {
          fetchAll()
        }
      }, { once: true })
    }
  })

  return {
    stats,
    deploymentsTrend,
    creditsByPlan,
    revenueByPartnerType,
    archivedDeployments,
    suspendedDeployments,
    stoppedDeployments,
    monthlyIntakeCredits,
    monthlyIntakeFCFA,
    globalCreditsUsed,
    isLoading,
    error,
  }
}
