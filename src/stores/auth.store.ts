/**
 * Authentication store
 * Manages Supabase auth session and user profile
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/services/supabase'
import type { User } from '@supabase/supabase-js'
import { useAdminDashboardStore } from '@/stores/admin-dashboard.store'
import { useCustomerDashboardStore } from '@/stores/customer-dashboard.store'
import { useActivityLogStore } from '@/stores/activity-log.store'

// Mock users for testing (when VITE_MOCK_AUTH=true)
const MOCK_USERS = {
  'admin@test.example.com': {
    id: 'mock-admin-id',
    email: 'admin@test.example.com',
    password: 'test123456',
    user_metadata: {
      user_role: 'ADMIN',
      first_name: 'Admin',
      last_name: 'User',
    },
  },
  'customer@test.example.com': {
    id: 'mock-customer-id',
    email: 'customer@test.example.com',
    password: 'test123456',
    user_metadata: {
      user_role: 'CUSTOMER',
      first_name: 'Customer',
      last_name: 'User',
    },
  },
  'reseller@test.example.com': {
    id: 'mock-reseller-id',
    email: 'reseller@test.example.com',
    password: 'test123456',
    user_metadata: {
      user_role: 'RESELLER',
      first_name: 'Reseller',
      last_name: 'User',
    },
  },
  'sales@test.example.com': {
    id: 'mock-sales-id',
    email: 'sales@test.example.com',
    password: 'test123456',
    user_metadata: {
      user_role: 'SALES',
      first_name: 'Sales',
      last_name: 'User',
    },
  },
  'support@test.example.com': {
    id: 'mock-support-id',
    email: 'support@test.example.com',
    password: 'test123456',
    user_metadata: {
      user_role: 'SUPPORT',
      first_name: 'Support',
      last_name: 'User',
    },
  },
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const profile = ref<{ user_role: string; firstname: string; lastname: string | null; company_id: number } | null>(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)

  // Computed
  const isAuthenticated = computed(() => !!user.value)
  const userRole = computed(() => profile.value?.user_role ?? user.value?.user_metadata?.user_role)

  // Initialize auth state
  async function initialize() {
    try {
      isLoading.value = true

      // Check for mock mode (for testing without Supabase)
      if (import.meta.env.VITE_MOCK_AUTH === 'true') {
        console.log('📍 Running in MOCK mode — using dummy auth data')
        user.value = {
          id: 'mock-user-id',
          email: 'test@example.com',
          user_metadata: {
            user_role: 'CUSTOMER',
            first_name: 'Test',
            last_name: 'User',
          },
        } as unknown as User
        return
      }

      // Add timeout to prevent infinite waiting if Supabase is unreachable
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth initialization timeout (5s)')), 5000)
      )

      const { data, error } = await Promise.race([
        supabase.auth.getSession(),
        timeout,
      ])

      if (error) throw error
      user.value = data.session?.user || null
      if (user.value) await fetchProfile(user.value.id)
    } catch (error) {
      // Auth failed (timeout, network error, etc.) — allow app to proceed
      console.warn('Auth initialization failed:', error instanceof Error ? error.message : error)
      user.value = null
    } finally {
      isLoading.value = false
      isInitialized.value = true
    }
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .schema('xayma_app')
      .from('users')
      .select('user_role, firstname, lastname, company_id')
      .eq('id', userId)
      .single()
    profile.value = (data as typeof profile.value) ?? null
  }

  // Sign in with email/password
  async function signIn(email: string, password: string) {
    try {
      isLoading.value = true

      // Handle mock mode
      if (import.meta.env.VITE_MOCK_AUTH === 'true') {
        const mockUser = MOCK_USERS[email as keyof typeof MOCK_USERS]
        if (mockUser && mockUser.password === password) {
          user.value = mockUser as unknown as User
          console.log(`✅ Logged in as ${mockUser.user_metadata.user_role}: ${email}`)
          return
        } else {
          throw new Error('Invalid email or password')
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      user.value = data.user
      await fetchProfile(data.user.id)
    } finally {
      isLoading.value = false
    }
  }

  // Sign up
  async function signUp(email: string, password: string) {
    try {
      isLoading.value = true
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
    } finally {
      isLoading.value = false
    }
  }

  // Sign out
  async function signOut() {
    try {
      isLoading.value = true
      await supabase.auth.signOut()
      user.value = null
      profile.value = null
      useAdminDashboardStore().$reset()
      useCustomerDashboardStore().$reset()
      useActivityLogStore().$reset()
    } finally {
      isLoading.value = false
    }
  }

  // Setup real-time auth listener
  function setupAuthListener() {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
    return data.subscription
  }

  return {
    user,
    profile,
    isInitialized,
    isLoading,
    isAuthenticated,
    userRole,
    initialize,
    signIn,
    signUp,
    signOut,
    setupAuthListener,
  }
})
