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
      plansResult,
      txResult,
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

      supabaseFrom('serviceplans').select('id, label'),

      supabaseFrom('credit_transactions')
        .select('creditsUsed, deployments(serviceplanId)')
        .eq('status', 'completed')
        .not('creditsUsed', 'is', null),

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
      plansResult.error ||
      txResult.error ||
      revenueByTypeResult.error
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

    // Deployments trend: 7-day chart
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

    // Credits by plan: aggregate creditsUsed per plan
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

    // Revenue by partner type
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
