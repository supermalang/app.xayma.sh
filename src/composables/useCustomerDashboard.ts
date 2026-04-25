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

    totalSpend.value = txData.reduce((sum, row) => sum + (row.amountPaid ?? 0), 0)

    const completed = txData.filter(r => r.amountPaid && r.amountPaid > 0)
    if (completed.length > 0) {
      const latest = completed.reduce((a, b) => (a.created > b.created ? a : b))
      lastPaymentDate.value = latest.created
    }

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
