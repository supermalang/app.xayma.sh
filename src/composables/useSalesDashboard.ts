import { ref, onMounted } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notifications.store'
import { useI18n } from 'vue-i18n'
import { calculateAcquisitionBonus, calculateRenewalCommission } from '@/composables/useCommissions'
import { findServicePlan } from '@/services/services.service'

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
        .select('id, name, status, created, deployments(plan_slug, service:services(plans))')
        .eq('sales_agent_id' as unknown as 'id', myUserId as unknown as number),

      supabaseFrom('partners')
        .select('id, name, status')
        .eq('sales_agent_id' as unknown as 'id', myUserId as unknown as number)
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

    let acquisitionTotal = 0
    let renewalTotal = 0
    for (const partner of allPartners) {
      const deps = (partner.deployments as any[]) ?? []
      for (const dep of deps) {
        const plan = findServicePlan(dep.service ?? null, dep.plan_slug ?? '')
        const planPrice = plan?.monthlyCreditConsumption ?? 0
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
      customerGrowthTrend: newThisMonth > 0
        ? Math.round((newThisMonth / Math.max(allPartners.length, 1)) * 100)
        : 0,
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
