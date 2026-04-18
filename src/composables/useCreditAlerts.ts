/**
 * useCreditAlerts composable
 * Monitors credit balance and triggers alerts at 20% and 10% thresholds
 * Publishes notification.send events to n8n for backend notification delivery
 */

import { watch, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePartnerCredits } from './usePartnerCredits'
import { callN8nWebhook } from '@/services/n8n'

interface AlertThreshold {
  percentage: number
  triggered: boolean
}

export function useCreditAlerts(partnerId: string, userId: string) {
  const { t } = useI18n()
  const { credits, percentageRemaining } = usePartnerCredits(partnerId)

  // Track which alerts have been triggered to avoid duplicates
  const alertsTriggered = ref({
    threshold20: false,
    threshold10: false,
  })

  /**
   * Send alert notification via n8n webhook
   * This triggers an n8n workflow that publishes to Kafka and sends notifications
   */
  async function sendAlert(type: 'LOW_BALANCE' | 'CRITICAL_BALANCE') {
    try {
      await callN8nWebhook('/webhook/send-notification', {
        userId,
        type,
        title:
          type === 'LOW_BALANCE'
            ? t('notifications.low_credit_title')
            : t('notifications.critical_credit_title'),
        message:
          type === 'LOW_BALANCE'
            ? t('notifications.low_credit_message', {
                remaining: credits.value?.remainingCredits || 0,
              })
            : t('notifications.critical_credit_message', {
                remaining: credits.value?.remainingCredits || 0,
              }),
        relatedEntityId: partnerId,
        relatedEntityType: 'partner',
      })
    } catch (err) {
      console.error('Error sending credit alert:', err)
    }
  }

  /**
   * Watch credit balance and trigger alerts at thresholds
   */
  watch(
    () => percentageRemaining.value,
    (newPercentage) => {
      // Alert at 20% threshold
      if (newPercentage <= 20 && newPercentage > 10 && !alertsTriggered.value.threshold20) {
        alertsTriggered.value.threshold20 = true
        sendAlert('LOW_BALANCE')
      }

      // Alert at 10% threshold
      if (newPercentage <= 10 && !alertsTriggered.value.threshold10) {
        alertsTriggered.value.threshold10 = true
        sendAlert('CRITICAL_BALANCE')
      }

      // Reset alerts when balance goes above thresholds
      if (newPercentage > 20) {
        alertsTriggered.value.threshold20 = false
        alertsTriggered.value.threshold10 = false
      } else if (newPercentage > 10) {
        alertsTriggered.value.threshold10 = false
      }
    }
  )

  return {
    alertsTriggered,
    sendAlert,
  }
}
