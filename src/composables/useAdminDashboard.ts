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
