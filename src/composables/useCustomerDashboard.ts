import { ref, onMounted } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'
import { useAuthStore } from '@/stores/auth.store'
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

interface PartnerProfile {
  name: string
  partner_type: string | null
  status: string | null
  remainingCredits: number
  creditDebtThreshold: number | null
}

// Raw row shapes returned from Supabase queries (subset of generated types)
interface DeploymentRow {
  id: number
  label: string
  domainNames: string[]
  status: string
  serviceplanId: number | null
}

interface DeploymentPlanIdRow {
  serviceplanId: number | null
}

interface TxRow {
  amountPaid: number | null
  creditsUsed: number | null
  created: string
}

interface TxAmountRow {
  amountPaid: number | null
}

interface ServicePlanRow {
  id: number
  monthlyCreditConsumption: number
}

interface PartnerRow {
  name: string
  partner_type: string | null
  status: string | null
  remainingCredits: number
  creditDebtThreshold: number | null
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

  // New refs
  const stoppedSuspendedCount = ref<number>(0)
  const archivedCount = ref<number>(0)
  const monthlyUsageCredits = ref<number>(0)
  const totalCostThisMonthFCFA = ref<number>(0)
  const partnerProfile = ref<PartnerProfile | null>(null)

  async function fetchAll() {
    isLoading.value = true
    error.value = null

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const authStore = useAuthStore()

    const [
      deploymentsResult,
      txResult,
      stoppedSuspendedResult,
      archivedResult,
      activeDeploymentsForCreditsResult,
      monthlyTxResult,
      partnerResult,
    ] = await Promise.all([
      supabaseFrom('deployments')
        .select('id, label, domainNames, status, serviceplanId')
        .eq('status', 'active'),

      supabaseFrom('credit_transactions')
        .select('amountPaid, creditsUsed, created')
        .eq('status', 'completed'),

      supabaseFrom('deployments')
        .select('id', { count: 'exact', head: true })
        .in('status', ['stopped', 'suspended']),

      supabaseFrom('deployments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'archived'),

      supabaseFrom('deployments')
        .select('serviceplanId')
        .eq('status', 'active'),

      supabaseFrom('credit_transactions')
        .select('amountPaid')
        .eq('status', 'completed')
        .gte('created', startOfMonth.toISOString()),

      supabaseFrom('partners')
        .select('name, partner_type, status, remainingCredits, creditDebtThreshold')
        .eq('id', String(authStore.profile?.company_id ?? ''))
        .single(),
    ])

    if (
      deploymentsResult.error ||
      txResult.error ||
      stoppedSuspendedResult.error ||
      archivedResult.error ||
      activeDeploymentsForCreditsResult.error ||
      monthlyTxResult.error ||
      partnerResult.error
    ) {
      notificationStore.addError(t('errors.fetch_failed'))
      error.value = 'fetch_failed'
      isLoading.value = false
      return
    }

    // Existing: active deployments
    const deploymentsData = (deploymentsResult.data ?? []) as unknown as DeploymentRow[]
    activeDeployments.value = deploymentsData.map(d => ({
      id: d.id,
      label: d.label,
      domain: d.domainNames?.[0] ?? '',
      status: d.status,
      serviceplanId: d.serviceplanId ?? null,
    }))

    // Existing: total spend + last payment date
    const txData = (txResult.data ?? []) as unknown as TxRow[]

    totalSpend.value = txData.reduce((sum, row) => sum + (row.amountPaid ?? 0), 0)

    const completed = txData.filter(r => r.amountPaid && r.amountPaid > 0)
    if (completed.length > 0) {
      const latest = completed.reduce((a, b) => (a.created > b.created ? a : b))
      lastPaymentDate.value = latest.created
    }

    // Existing: monthly consumption chart
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

    // New: stopped/suspended count
    stoppedSuspendedCount.value = stoppedSuspendedResult.count ?? 0

    // New: archived count
    archivedCount.value = archivedResult.count ?? 0

    // New: monthly usage credits — sum monthlyCreditConsumption across active deployment plans
    const activeForCredits = (activeDeploymentsForCreditsResult.data ?? []) as unknown as DeploymentPlanIdRow[]
    const activePlanIds = activeForCredits
      .map(d => d.serviceplanId)
      .filter((id): id is number => id !== null && id !== undefined)

    if (activePlanIds.length > 0) {
      const { data: plansData, error: plansError } = await supabaseFrom('serviceplans')
        .select('id, monthlyCreditConsumption')
        .in('id', activePlanIds)

      if (plansError) {
        notificationStore.addError(t('errors.fetch_failed'))
        error.value = 'fetch_failed'
        isLoading.value = false
        return
      }

      const plans = (plansData ?? []) as unknown as ServicePlanRow[]
      const planMap = new Map<number, number>(plans.map(p => [p.id, p.monthlyCreditConsumption]))

      monthlyUsageCredits.value = activePlanIds.reduce(
        (sum, planId) => sum + (planMap.get(planId) ?? 0),
        0
      )
    } else {
      monthlyUsageCredits.value = 0
    }

    // New: total FCFA cost this month
    const monthlyTxData = (monthlyTxResult.data ?? []) as unknown as TxAmountRow[]
    totalCostThisMonthFCFA.value = monthlyTxData.reduce(
      (sum, row) => sum + (row.amountPaid ?? 0),
      0
    )

    // New: partner profile
    const rawPartner = partnerResult.data as unknown as PartnerRow | null
    partnerProfile.value = rawPartner
      ? {
          name: rawPartner.name,
          partner_type: rawPartner.partner_type,
          status: rawPartner.status,
          remainingCredits: rawPartner.remainingCredits,
          creditDebtThreshold: rawPartner.creditDebtThreshold,
        }
      : null

    isLoading.value = false
  }

  onMounted(fetchAll)

  return {
    activeDeployments,
    lastPaymentDate,
    totalSpend,
    monthlyConsumption,
    isLoading,
    error,
    stoppedSuspendedCount,
    archivedCount,
    monthlyUsageCredits,
    totalCostThisMonthFCFA,
    partnerProfile,
  }
}
