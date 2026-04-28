import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCustomerDashboardStore } from '@/stores/customer-dashboard.store'

export function useCustomerDashboard() {
  const store = useCustomerDashboardStore()
  const {
    activeDeployments,
    lastPaymentDate,
    totalSpend,
    monthlyConsumption,
    isLoading,
    isRefreshing,
    error,
    stoppedSuspendedCount,
    archivedCount,
    monthlyUsageCredits,
    totalCostThisMonthFCFA,
    partnerProfile,
  } = storeToRefs(store)
  onMounted(() => store.waitForAuthThenLoad())
  return {
    activeDeployments,
    lastPaymentDate,
    totalSpend,
    monthlyConsumption,
    isLoading,
    isRefreshing,
    error,
    stoppedSuspendedCount,
    archivedCount,
    monthlyUsageCredits,
    totalCostThisMonthFCFA,
    partnerProfile,
  }
}
