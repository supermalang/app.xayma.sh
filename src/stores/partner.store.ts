/**
 * Partner store
 * Manages partner list, selected partner, and credit balance with Realtime subscriptions
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, supabaseFrom } from '@/services/supabase'
import * as partnerService from '@/services/partners.service'
import type { Partner } from '@/services/partners.service'

export const usePartnerStore = defineStore('partner', () => {
  const partners = ref<Partner[]>([])
  const selectedPartner = ref<Partner | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let creditSubscription: ReturnType<typeof supabase.channel> | null = null

  // Computed
  const partnerCount = computed(() => partners.value.length)
  const selectedPartnerCredits = computed(() => selectedPartner.value?.remainingCredits ?? 0)

  /**
   * Fetch all partners
   */
  async function fetchPartners(options = {}) {
    try {
      isLoading.value = true
      error.value = null
      const result = await partnerService.listPartners(options)
      partners.value = result.data
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch partners'
      console.error('Error fetching partners:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch a single partner
   */
  async function fetchPartner(id: number) {
    try {
      isLoading.value = true
      error.value = null
      const partner = await partnerService.getPartner(id)
      selectedPartner.value = partner
      return partner
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch partner'
      console.error('Error fetching partner:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new partner
   */
  async function createPartner(data: any) {
    try {
      isLoading.value = true
      error.value = null
      const newPartner = await partnerService.createPartner(data)
      partners.value.unshift(newPartner)
      return newPartner
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create partner'
      console.error('Error creating partner:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update an existing partner
   */
  async function updatePartner(id: number, data: any) {
    try {
      isLoading.value = true
      error.value = null
      const updated = await partnerService.updatePartner(id, data)

      // Update in local list
      const index = partners.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        partners.value[index] = updated
      }

      // Update selected partner if it's the one being edited
      if (selectedPartner.value?.id === id) {
        selectedPartner.value = updated
      }

      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update partner'
      console.error('Error updating partner:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete a partner
   */
  async function deletePartner(id: number) {
    try {
      isLoading.value = true
      error.value = null
      await partnerService.deletePartner(id)

      // Remove from local list
      partners.value = partners.value.filter((p) => p.id !== id)

      // Clear selected if it was deleted
      if (selectedPartner.value?.id === id) {
        selectedPartner.value = null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete partner'
      console.error('Error deleting partner:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Change partner status
   */
  async function changeStatus(id: number, status: string) {
    return updatePartner(id, { status })
  }

  /**
   * Update credits for a partner
   */
  function updateCredits(partnerId: number, credits: number) {
    const partner = partners.value.find((p) => p.id === partnerId)
    if (partner) {
      partner.remainingCredits = credits
    }

    if (selectedPartner.value?.id === partnerId) {
      selectedPartner.value.remainingCredits = credits
    }
  }

  /**
   * Subscribe to credit balance changes via Realtime
   */
  function subscribeToCredits(partnerId: number) {
    // Unsubscribe from previous subscription
    if (creditSubscription) {
      supabase.removeChannel(creditSubscription)
    }

    // Subscribe to partner credit changes
    creditSubscription = supabase
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
          const newData = payload.new as Partner
          updateCredits(partnerId, newData.remainingCredits)
        }
      )
      .subscribe()
  }

  /**
   * Unsubscribe from Realtime updates
   */
  function unsubscribeFromCredits() {
    if (creditSubscription) {
      supabase.removeChannel(creditSubscription)
      creditSubscription = null
    }
  }

  /**
   * Clear store state
   */
  function reset() {
    partners.value = []
    selectedPartner.value = null
    error.value = null
    unsubscribeFromCredits()
  }

  return {
    // State
    partners,
    selectedPartner,
    isLoading,
    error,

    // Computed
    partnerCount,
    selectedPartnerCredits,

    // Methods
    fetchPartners,
    fetchPartner,
    createPartner,
    updatePartner,
    deletePartner,
    changeStatus,
    updateCredits,
    subscribeToCredits,
    unsubscribeFromCredits,
    reset,
  }
})
