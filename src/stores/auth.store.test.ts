/**
 * Authentication store tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
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

import { supabase } from '@/services/supabase'

describe('auth.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initialize', () => {
    it('fetches current session and sets user', async () => {
      const mockUser = { id: '123', email: 'test@example.com', user_metadata: { user_role: 'ADMIN' } }
      ;(supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      })

      const store = useAuthStore()
      await store.initialize()

      expect(store.user).toEqual(mockUser)
      expect(store.isInitialized).toBe(true)
    })

    it('handles no session gracefully', async () => {
      ;(supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const store = useAuthStore()
      await store.initialize()

      expect(store.user).toBeNull()
      expect(store.isInitialized).toBe(true)
    })

    it('marks as initialized even on error', async () => {
      ;(supabase.auth.getSession as any).mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      })

      const store = useAuthStore()
      try {
        await store.initialize()
      } catch (e) {
        // Error expected
      }

      expect(store.isInitialized).toBe(true)
    })
  })

  describe('signIn', () => {
    it('signs in user and initializes session', async () => {
      const mockUser = { id: '123', email: 'test@example.com', user_metadata: { user_role: 'CUSTOMER' } }
      ;(supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      ;(supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      })

      const store = useAuthStore()
      await store.signIn('test@example.com', 'password123')

      expect(store.user).toEqual(mockUser)
    })

    it('throws on sign-in failure', async () => {
      ;(supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: null,
        error: new Error('Invalid credentials'),
      })

      const store = useAuthStore()
      await expect(store.signIn('test@example.com', 'wrong')).rejects.toThrow()
    })
  })

  describe('signOut', () => {
    it('clears user on sign-out', async () => {
      const store = useAuthStore()
      store.user = { id: '123', email: 'test@example.com' } as any

      ;(supabase.auth.signOut as any).mockResolvedValue({ error: null })

      await store.signOut()

      expect(store.user).toBeNull()
    })
  })

  describe('computed properties', () => {
    it('isAuthenticated returns true when user exists', () => {
      const store = useAuthStore()
      store.user = { id: '123' } as any

      expect(store.isAuthenticated).toBe(true)
    })

    it('isAuthenticated returns false when user is null', () => {
      const store = useAuthStore()
      store.user = null

      expect(store.isAuthenticated).toBe(false)
    })

    it('userRole returns role from user metadata', () => {
      const store = useAuthStore()
      store.user = { id: '123', user_metadata: { user_role: 'RESELLER' } } as any

      expect(store.userRole).toBe('RESELLER')
    })
  })

  describe('setupAuthListener', () => {
    it('returns a subscription object', () => {
      ;(supabase.auth.onAuthStateChange as any).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      })

      const store = useAuthStore()
      const subscription = store.setupAuthListener()

      expect(subscription).toHaveProperty('unsubscribe')
    })
  })
})
