/**
 * Admin insights composable
 * Simple queries for breakdown charts: status distribution, top partners, services, revenue trends
 */

import { ref, onMounted } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'

export interface StatusDistribution {
  status: string
  count: number
}

export interface TopPartner {
  partner_id: number
  partner_name: string
  deployment_count: number
}

export interface ServiceStats {
  service_id: number
  service_name: string
  count: number
}

export interface MonthlyRevenue {
  month: string  // 'Apr 2026', 'May 2026', etc.
  revenue: number
}

export function useAdminInsights() {
  const notificationStore = useNotificationStore()

  const statusDistribution = ref<StatusDistribution[]>([])
  const topPartners = ref<TopPartner[]>([])
  const serviceStats = ref<ServiceStats[]>([])
  const monthlyRevenue = ref<MonthlyRevenue[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    isLoading.value = true
    error.value = null

    const [
      statusResult,
      partnersResult,
      servicesResult,
      revenueResult,
    ] = await Promise.all([
      fetchStatusDistribution(),
      fetchTopPartners(),
      fetchServiceStats(),
      fetchMonthlyRevenue(),
    ])

    if (statusResult.error || partnersResult.error || servicesResult.error || revenueResult.error) {
      notificationStore.addError('Failed to load insights')
      error.value = 'fetch_failed'
    }

    isLoading.value = false
  }

  async function fetchStatusDistribution() {
    const { data } = await supabaseFrom('deployments').select('status')

    if (!data) {
      return { data: null, error: null }
    }

    const grouped: Record<string, number> = {}
    for (const row of data) {
      grouped[row.status] = (grouped[row.status] ?? 0) + 1
    }

    statusDistribution.value = Object.entries(grouped).map(([status, count]) => ({
      status,
      count,
    }))

    return { data, error: null }
  }

  async function fetchTopPartners() {
    const { data: deploymentsByPartner } = await supabaseFrom('deployments')
      .select('partner_id')

    if (!deploymentsByPartner) {
      topPartners.value = []
      return { data: null, error: null }
    }

    const grouped: Record<number, number> = {}
    for (const d of deploymentsByPartner) {
      grouped[d.partner_id] = (grouped[d.partner_id] ?? 0) + 1
    }

    const { data: partners } = await supabaseFrom('partners').select('id, name')
    const partnerMap = new Map((partners ?? []).map(p => [p.id, p.name]))

    topPartners.value = Object.entries(grouped)
      .map(([pId, count]) => ({
        partner_id: Number(pId),
        partner_name: partnerMap.get(Number(pId)) ?? 'Unknown',
        deployment_count: count,
      }))
      .sort((a, b) => b.deployment_count - a.deployment_count)
      .slice(0, 5)

    return { data: topPartners.value, error: null }
  }

  async function fetchServiceStats() {
    const { data: deploymentsByService } = await supabaseFrom('deployments')
      .select('service_id')

    if (!deploymentsByService) {
      serviceStats.value = []
      return { data: null, error: null }
    }

    const grouped: Record<number, number> = {}
    for (const d of deploymentsByService) {
      grouped[d.service_id] = (grouped[d.service_id] ?? 0) + 1
    }

    const { data: services } = await supabaseFrom('services').select('id, name')
    const serviceMap = new Map((services ?? []).map(s => [s.id, s.name]))

    serviceStats.value = Object.entries(grouped)
      .map(([sId, count]) => ({
        service_id: Number(sId),
        service_name: serviceMap.get(Number(sId)) ?? 'Unknown',
        count,
      }))
      .sort((a, b) => b.count - a.count)

    return { data: serviceStats.value, error: null }
  }

  async function fetchMonthlyRevenue() {
    const { data } = await supabaseFrom('credit_transactions')
      .select('amountPaid, created')
      .eq('status', 'completed')

    if (!data) {
      monthlyRevenue.value = []
      return { data: null, error: null }
    }

    const grouped: Record<string, number> = {}
    for (const row of data) {
      const date = new Date(row.created)
      const monthKey = date.toLocaleString('en-US', { year: 'numeric', month: 'short' })
      grouped[monthKey] = (grouped[monthKey] ?? 0) + (row.amountPaid ?? 0)
    }

    monthlyRevenue.value = Object.entries(grouped)
      .sort(([monthA], [monthB]) => {
        const dateA = new Date(`${monthA} 1`)
        const dateB = new Date(`${monthB} 1`)
        return dateA.getTime() - dateB.getTime()
      })
      .map(([month, revenue]) => ({
        month,
        revenue,
      }))

    return { data: monthlyRevenue.value, error: null }
  }

  onMounted(fetchAll)

  return {
    statusDistribution,
    topPartners,
    serviceStats,
    monthlyRevenue,
    isLoading,
    error,
  }
}
