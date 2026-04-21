/**
 * usePartnerCredits composable
 * Manages partner credit balance state with Supabase Realtime updates
 * Automatically subscribes to balance changes and keeps UI in sync
 */

import { onMounted, onUnmounted, ref, computed } from 'vue'
import { supabase, supabaseFrom } from '@/services/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PartnerCredits {
  id: string
  remainingCredits: number
  totalCreditsEarned: number
  creditExpiryDate?: string
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
}

export function usePartnerCredits(partnerId: string) {
  const credits = ref<PartnerCredits | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  let channel: RealtimeChannel | null = null

  /**
   * Fetch partner credits from database
   */
  async function fetchCredits() {
    if (!partnerId) {
      loading.value = false
      return
    }

    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabaseFrom('partners')
        .select('id, remainingCredits, totalCreditsEarned, creditExpiryDate, status')
        .eq('id', partnerId)
        .single()

      if (fetchError) throw fetchError

      credits.value = data as PartnerCredits
    } catch (err) {
      console.error('Error fetching partner credits:', err)
      error.value = 'Failed to load credits'
    } finally {
      loading.value = false
    }
  }

  /**
   * Subscribe to realtime updates on partner credits
   * Automatically updates local state when database changes
   */
  function subscribeToCredits() {
    if (!partnerId) return

    channel = supabase
      .channel(`partner-credits-${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'xayma_app',
          table: 'partners',
          filter: `id=eq.${partnerId}`,
        },
        (payload) => {
          if (credits.value) {
            // Update with new values from database
            credits.value.remainingCredits = payload.new?.remainingCredits || 0
            credits.value.totalCreditsEarned = payload.new?.totalCreditsEarned || 0
            credits.value.creditExpiryDate = payload.new?.creditExpiryDate
            credits.value.status = payload.new?.status
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime subscription active for partner ${partnerId}`)
        } else if (status === 'CLOSED') {
          console.log(`Realtime subscription closed for partner ${partnerId}`)
        }
      })
  }

  /**
   * Cleanup realtime subscription
   * Must be called in onUnmounted hook
   */
  function unsubscribe() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }

  /**
   * Manually refresh credits from server
   */
  async function refresh() {
    await fetchCredits()
  }

  // Computed properties
  const percentageRemaining = computed(() => {
    if (!credits.value) return 0
    // Assume max balance is 100,000 FCFA for percentage calculation
    return Math.round((credits.value.remainingCredits / 100000) * 100)
  })

  const isLowBalance = computed(() => {
    return percentageRemaining.value <= 30 && percentageRemaining.value > 10
  })

  const isCriticalBalance = computed(() => {
    return percentageRemaining.value <= 10
  })

  const isHealthy = computed(() => {
    return percentageRemaining.value > 30
  })

  const daysUntilExpiry = computed(() => {
    if (!credits.value?.creditExpiryDate) return -1
    const now = new Date()
    const expiry = new Date(credits.value.creditExpiryDate)
    const diff = expiry.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  })

  const isExpired = computed(() => {
    return daysUntilExpiry.value < 0
  })

  const isSuspended = computed(() => {
    return credits.value?.status === 'SUSPENDED'
  })

  // Initialize on mount
  onMounted(() => {
    fetchCredits()
    subscribeToCredits()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe()
  })

  return {
    // State
    credits,
    loading,
    error,

    // Methods
    fetchCredits,
    refresh,
    unsubscribe,

    // Computed
    percentageRemaining,
    isLowBalance,
    isCriticalBalance,
    isHealthy,
    daysUntilExpiry,
    isExpired,
    isSuspended,
  }
}
