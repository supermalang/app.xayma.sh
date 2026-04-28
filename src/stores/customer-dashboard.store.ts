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

    const profile = authStore.profile
    if (!profile?.company_id) {
      isLoading.value = false
      return
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const companyId = profile.company_id

    const [
      deploymentsResult, txResult, stoppedSuspendedResult,
      archivedResult, monthlyTxResult, partnerResult,
    ] = await Promise.all([
      supabaseFrom('deployments').select('id, label, domainNames, status, serviceplanId').eq('status', 'active').eq('partner_id', companyId),
      supabaseFrom('credit_transactions').select('amountPaid, creditsUsed, created').eq('status', 'completed').eq('partner_id', companyId),
      supabaseFrom('deployments').select('id', { count: 'exact', head: true }).in('status', ['stopped', 'suspended']).eq('partner_id', companyId),
      supabaseFrom('deployments').select('id', { count: 'exact', head: true }).eq('status', 'archived').eq('partner_id', companyId),
      supabaseFrom('credit_transactions').select('amountPaid').eq('status', 'completed').eq('partner_id', companyId).gte('created', startOfMonth.toISOString()),
      supabaseFrom('partners').select('name, partner_type, status, remainingCredits, creditDebtThreshold').eq('id', companyId).single(),
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
