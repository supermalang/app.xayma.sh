/**
 * useAuth composable
 * Access auth state and role checks
 */

import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types'

export function useAuth() {
  const authStore = useAuthStore()

  const user = computed(() => authStore.user)
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const userRole = computed(() => authStore.userRole as UserRole | null)

  // Role checks
  const isAdmin = computed(() => userRole.value === 'ADMIN')
  const isCustomer = computed(() => userRole.value === 'CUSTOMER')
  const isReseller = computed(() => userRole.value === 'RESELLER')
  const isSales = computed(() => userRole.value === 'SALES')

  const canManagePartners = computed(() => isAdmin.value || isSales.value)
  const canManageDeployments = computed(() => isAdmin.value || isCustomer.value || isReseller.value)
  const canTopupCredits = computed(() => isCustomer.value || isReseller.value)

  return {
    user,
    isAuthenticated,
    userRole,
    isAdmin,
    isCustomer,
    isReseller,
    isSales,
    canManagePartners,
    canManageDeployments,
    canTopupCredits,
  }
}
