/**
 * Deployments composable
 * Handles deployment operations, credit validation, and state management
 */

import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/services/supabase'
import * as deploymentService from '@/services/deployments.service'
import * as n8nService from '@/services/n8n'
import { useNotificationStore } from '@/stores/notifications.store'

export interface DeploymentFormData {
  serviceId: number | null
  servicePlanId: number | null
  label: string
  domainNames: string[]
  serviceVersion?: string
  deploymentPlan?: string
}

export function useDeployments() {
  const { t } = useI18n()
  const notificationStore = useNotificationStore()

  const deployments = ref<any[]>([])
  const isLoading = ref(false)
  const partnerCredits = ref(0)
  const selectedDeployment = ref<any>(null)
  let realtimeChannel: any = null

  /**
   * Load deployments for current user/partner
   */
  async function loadDeployments(partnerId: number) {
    isLoading.value = true
    try {
      const result = await deploymentService.listDeployments({
        partner_id: partnerId,
        pageSize: 100,
      })
      deployments.value = result.data
    } catch (error) {
      console.error('Error loading deployments:', error)
      notificationStore.addError(t('errors.fetch_failed'))
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load a single deployment by ID
   */
  async function loadDeployment(id: number) {
    isLoading.value = true
    try {
      selectedDeployment.value = await deploymentService.getDeployment(id)
    } catch (error) {
      console.error('Error loading deployment:', error)
      notificationStore.addError(t('errors.fetch_failed'))
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check if partner has sufficient credits for a plan
   * Returns { hasSufficient: boolean, remainingAfter: number, shortfall: number }
   */
  async function validateCredits(
    partnerId: number,
    monthlyCreditConsumption: number
  ): Promise<{ hasSufficient: boolean; remainingAfter: number; shortfall: number }> {
    try {
      const hasSufficient = await deploymentService.hasPartnerSufficientCredits(
        partnerId,
        monthlyCreditConsumption
      )

      const remainingAfter = Math.max(0, partnerCredits.value - monthlyCreditConsumption)
      const shortfall = Math.max(0, monthlyCreditConsumption - partnerCredits.value)

      return {
        hasSufficient,
        remainingAfter,
        shortfall,
      }
    } catch (error) {
      console.error('Error validating credits:', error)
      notificationStore.addError(t('errors.fetch_failed'))
      return { hasSufficient: false, remainingAfter: 0, shortfall: 0 }
    }
  }

  /**
   * Create a new deployment
   * 1. Validate credits
   * 2. Create deployment record in Supabase
   * 3. Call n8n webhook to trigger AWX deployment
   */
  async function createDeployment(
    formData: DeploymentFormData,
    partnerId: number,
    monthlyCreditConsumption: number,
    controlNodeId?: number
  ) {
    // Step 1: Validate credits
    const creditValidation = await validateCredits(partnerId, monthlyCreditConsumption)

    if (!creditValidation.hasSufficient) {
      notificationStore.addError(t('deployments.errors.insufficient_credits'))
      return null
    }

    isLoading.value = true
    try {
      // Step 2: Create deployment record
      const newDeployment = await deploymentService.createDeployment({
        label: formData.label,
        domainNames: formData.domainNames,
        slug: generateSlug(formData.label),
        service_id: formData.serviceId!,
        serviceplan_id: formData.servicePlanId!,
        serviceVersion: formData.serviceVersion || '15.0',
        deploymentPlan: formData.deploymentPlan,
        partner_id: partnerId,
        status: 'pending_deployment',
      } as any)

      if (!newDeployment) {
        notificationStore.addError(t('errors.webhook_failed'))
        return null
      }

      // Step 3: Call n8n webhook to trigger deployment
      try {
        await n8nService.createDeployment({
          deploymentId: newDeployment.id,
          partnerId,
          serviceId: formData.serviceId!,
          servicePlanId: formData.servicePlanId!,
          serviceVersion: formData.serviceVersion || '15.0',
          domainNames: formData.domainNames,
          label: formData.label,
          controlNodeId,
          deploymentPlan: formData.deploymentPlan,
        })

        notificationStore.addSuccess(t('deployments.create_success'))
        return newDeployment
      } catch (webhookError) {
        // Webhook failed, but deployment record was created
        // Status will be updated when n8n eventually processes or times out
        console.error('n8n webhook error:', webhookError)
        notificationStore.addError(t('deployments.webhook_pending'))
        return newDeployment
      }
    } catch (error) {
      console.error('Error creating deployment:', error)
      notificationStore.addError(t('errors.webhook_failed'))
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update deployment status (stop, start, restart)
   */
  async function performDeploymentAction(
    deploymentId: number,
    action: 'stop' | 'start' | 'restart'
  ) {
    isLoading.value = true
    try {
      // Call n8n webhook
      await n8nService.performDeploymentAction({
        deploymentId,
        action,
      })

      // Update local state optimistically
      const deployment = deployments.value.find((d) => d.id === deploymentId)
      if (deployment) {
        deployment.status = action === 'stop' ? 'stopped' : 'deploying'
      }

      notificationStore.addSuccess(t(`deployments.action_${action}_success`))
    } catch (error) {
      console.error(`Error performing ${action} action:`, error)
      notificationStore.addError(t('errors.webhook_failed'))
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Terminate a deployment
   */
  async function terminateDeployment(deploymentId: number) {
    isLoading.value = true
    try {
      // Call n8n webhook
      await n8nService.terminateDeployment({ deploymentId })

      // Update local state optimistically
      const deployment = deployments.value.find((d) => d.id === deploymentId)
      if (deployment) {
        deployment.status = 'pending_deletion'
      }

      notificationStore.addSuccess(t('deployments.terminate_success'))
    } catch (error) {
      console.error('Error terminating deployment:', error)
      notificationStore.addError(t('errors.webhook_failed'))
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete deployment (admin only, immediate deletion)
   */
  async function deleteDeployment(deploymentId: number) {
    isLoading.value = true
    try {
      await deploymentService.deleteDeployment(deploymentId)
      deployments.value = deployments.value.filter((d) => d.id !== deploymentId)
      notificationStore.addSuccess(t('deployments.delete_success'))
    } catch (error) {
      console.error('Error deleting deployment:', error)
      notificationStore.addError(t('errors.webhook_failed'))
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Subscribe to Realtime updates for deployments
   * Updates local state when deployment status changes
   */
  function subscribeToDeploymentUpdates(partnerId: number) {
    // Clean up any existing subscription
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
    }

    realtimeChannel = supabase
      .channel(`deployments-partner-${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'xayma_app',
          table: 'deployments',
          filter: `partner_id=eq.${partnerId}`,
        },
        (payload) => {
          // Update deployment in local array
          const index = deployments.value.findIndex((d) => d.id === payload.new.id)
          if (index !== -1) {
            deployments.value[index] = { ...deployments.value[index], ...payload.new }
          }

          // Update selected deployment if it matches
          if (selectedDeployment.value?.id === payload.new.id) {
            selectedDeployment.value = { ...selectedDeployment.value, ...payload.new }
          }
        }
      )
      .subscribe()

    // Clean up on unmount
    onUnmounted(() => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
    })
  }

  /**
   * Generate slug from label (for URL-friendly deployment identifiers)
   */
  function generateSlug(label: string): string {
    return label
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/-+/g, '-')
      .slice(0, 50)
  }

  return {
    deployments: computed(() => deployments.value),
    isLoading: computed(() => isLoading.value),
    partnerCredits: computed(() => partnerCredits.value),
    selectedDeployment: computed(() => selectedDeployment.value),
    loadDeployments,
    loadDeployment,
    validateCredits,
    createDeployment,
    performDeploymentAction,
    terminateDeployment,
    deleteDeployment,
    subscribeToDeploymentUpdates,
  }
}
