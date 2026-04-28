import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAdminDashboardStore } from '@/stores/admin-dashboard.store'

export function useAdminDashboard() {
  const store = useAdminDashboardStore()
  const {
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
    isRefreshing,
    error,
  } = storeToRefs(store)
  onMounted(() => store.waitForAuthThenLoad())
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
    isRefreshing,
    error,
  }
}
