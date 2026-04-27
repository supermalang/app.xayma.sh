import { onMounted } from 'vue'
import { useCustomerDashboardStore } from '@/stores/customer-dashboard.store'

export function useCustomerDashboard() {
  const store = useCustomerDashboardStore()
  onMounted(() => store.waitForAuthThenLoad())
  return {
    activeDeployments: store.activeDeployments,
    lastPaymentDate: store.lastPaymentDate,
    totalSpend: store.totalSpend,
    monthlyConsumption: store.monthlyConsumption,
    isLoading: store.isLoading,
    isRefreshing: store.isRefreshing,
    error: store.error,
    stoppedSuspendedCount: store.stoppedSuspendedCount,
    archivedCount: store.archivedCount,
    monthlyUsageCredits: store.monthlyUsageCredits,
    totalCostThisMonthFCFA: store.totalCostThisMonthFCFA,
    partnerProfile: store.partnerProfile,
  }
}
