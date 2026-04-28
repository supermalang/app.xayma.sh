import { onMounted, onUnmounted, ref, computed, toValue, type MaybeRefOrGetter } from 'vue'
import { supabase, supabaseFrom } from '@/services/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PartnerCredits {
  id: number
  remainingCredits: number
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
}

export function usePartnerCredits(partnerId: MaybeRefOrGetter<string>) {
  const credits = ref<PartnerCredits | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  let channel: RealtimeChannel | null = null

  async function fetchCredits() {
    const id = toValue(partnerId)
    if (!id) {
      loading.value = false
      return
    }

    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabaseFrom('partners')
        .select('id, remainingCredits, status')
        .eq('id', Number(id))
        .single()

      if (fetchError) throw fetchError

      credits.value = data as unknown as PartnerCredits
    } catch (err) {
      console.error('Error fetching partner credits:', err)
      error.value = 'Failed to load credits'
    } finally {
      loading.value = false
    }
  }

  function subscribeToCredits() {
    const id = toValue(partnerId)
    if (!id) return

    channel = supabase
      .channel(`partner-credits-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'xayma_app',
          table: 'partners',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (credits.value) {
            credits.value.remainingCredits = payload.new?.remainingCredits || 0
            credits.value.status = payload.new?.status
          }
        }
      )
      .subscribe()
  }

  function unsubscribe() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }

  async function refresh() {
    await fetchCredits()
  }

  const isLowBalance = computed(() => {
    if (!credits.value) return false
    return credits.value.remainingCredits <= 30 && credits.value.remainingCredits > 10
  })

  const isCriticalBalance = computed(() => {
    if (!credits.value) return false
    return credits.value.remainingCredits <= 10
  })

  const isHealthy = computed(() => {
    if (!credits.value) return false
    return credits.value.remainingCredits > 30
  })

  const isSuspended = computed(() => {
    return credits.value?.status === 'SUSPENDED'
  })

  onMounted(() => {
    fetchCredits()
    subscribeToCredits()
  })

  onUnmounted(() => {
    unsubscribe()
  })

  return {
    credits,
    loading,
    error,
    fetchCredits,
    refresh,
    unsubscribe,
    isLowBalance,
    isCriticalBalance,
    isHealthy,
    isSuspended,
  }
}
