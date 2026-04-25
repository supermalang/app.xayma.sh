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
