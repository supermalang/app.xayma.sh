/**
 * useAuth composable tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth.store'

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))

describe('useAuth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('role checks', () => {
    it('isAdmin returns true for ADMIN role', () => {
      const store = useAuthStore()
      store.user = { user_metadata: { user_role: 'ADMIN' } } as any

      const { isAdmin } = useAuth()
      expect(isAdmin.value).toBe(true)
    })

    it('isAdmin returns false for non-ADMIN role', () => {
      const store = useAuthStore()
      store.user = { user_metadata: { user_role: 'CUSTOMER' } } as any

      const { isAdmin } = useAuth()
      expect(isAdmin.value).toBe(false)
    })

    it('isCustomer returns true for CUSTOMER role', () => {
      const store = useAuthStore()
      store.user = { user_metadata: { user_role: 'CUSTOMER' } } as any

      const { isCustomer } = useAuth()
      expect(isCustomer.value).toBe(true)
    })

    it('isReseller returns true for RESELLER role', () => {
      const store = useAuthStore()
      store.user = { user_metadata: { user_role: 'RESELLER' } } as any

      const { isReseller } = useAuth()
      expect(isReseller.value).toBe(true)
    })

    it('isSales returns true for SALES role', () => {
      const store = useAuthStore()
      store.user = { user_metadata: { user_role: 'SALES' } } as any

      const { isSales } = useAuth()
      expect(isSales.value).toBe(true)
    })
  })

  describe('permission checks', () => {
    it('canManagePartners returns true for ADMIN', () => {
      const store = useAuthStore()
      store.user = { user_metadata: { user_role: 'ADMIN' } } as any

      const { canManagePartners } = useAuth()
      expect(canManagePartners.value).toBe(true)
    })

    it('canManagePartners returns true for SALES', () => {
      const store = useAuthStore()
      store.user = { user_metadata: { user_role: 'SALES' } } as any

      const { canManagePartners } = useAuth()
      expect(canManagePartners.value).toBe(true)
    })

    it('canManagePartners returns false for CUSTOMER', () => {
      const store = useAuthStore()
      store.user = { user_metadata: { user_role: 'CUSTOMER' } } as any

      const { canManagePartners } = useAuth()
      expect(canManagePartners.value).toBe(false)
    })

    it('canManageDeployments returns true for ADMIN, CUSTOMER, RESELLER', () => {
      const store = useAuthStore()
      const { canManageDeployments } = useAuth()

      store.user = { user_metadata: { user_role: 'ADMIN' } } as any
      expect(canManageDeployments.value).toBe(true)

      store.user = { user_metadata: { user_role: 'CUSTOMER' } } as any
      expect(canManageDeployments.value).toBe(true)

      store.user = { user_metadata: { user_role: 'RESELLER' } } as any
      expect(canManageDeployments.value).toBe(true)
    })

    it('canTopupCredits returns true for CUSTOMER and RESELLER', () => {
      const store = useAuthStore()
      const { canTopupCredits } = useAuth()

      store.user = { user_metadata: { user_role: 'CUSTOMER' } } as any
      expect(canTopupCredits.value).toBe(true)

      store.user = { user_metadata: { user_role: 'RESELLER' } } as any
      expect(canTopupCredits.value).toBe(true)

      store.user = { user_metadata: { user_role: 'ADMIN' } } as any
      expect(canTopupCredits.value).toBe(false)
    })
  })

  describe('user access', () => {
    it('user returns current user from store', () => {
      const store = useAuthStore()
      const mockUser = { id: '123', email: 'test@example.com' }
      store.user = mockUser as any

      const { user } = useAuth()
      expect(user.value).toEqual(mockUser)
    })

    it('isAuthenticated returns true when user exists', () => {
      const store = useAuthStore()
      store.user = { id: '123' } as any

      const { isAuthenticated } = useAuth()
      expect(isAuthenticated.value).toBe(true)
    })
  })
})
