<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-lg bg-surface">
    <!-- Success state -->
    <div v-if="paymentStatus === 'completed'" class="text-center space-y-6">
      <div class="flex justify-center mb-4">
        <div class="w-16 h-16 rounded-full bg-tertiary-container flex items-center justify-center">
          <span class="material-symbols-outlined text-4xl text-tertiary">check_circle</span>
        </div>
      </div>

      <div>
        <h1 class="text-3xl font-bold text-on-background mb-2">
          {{ $t('credits.payment_successful') }}
        </h1>
        <p class="text-on-surface-variant max-w-md mx-auto">
          {{ $t('credits.credits_added') }}
        </p>
      </div>

      <div class="bg-surface-container-low p-6 rounded border border-outline/20 text-left max-w-md">
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-on-surface-variant">{{ $t('credits.transaction_id') }}</span>
            <span class="font-mono text-on-surface font-semibold">{{ transactionId }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-on-surface-variant">{{ $t('credits.amount') }}</span>
            <span class="font-mono text-on-surface font-semibold">{{ creditsAmount }} FCFA</span>
          </div>
          <div class="flex justify-between">
            <span class="text-on-surface-variant">{{ $t('credits.timestamp') }}</span>
            <span class="font-mono text-on-surface text-sm">{{ formattedDate }}</span>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <Button
          :label="$t('credits.view_history')"
          class="p-button-secondary"
          @click="goToHistory"
        />
        <Button
          :label="$t('credits.back_to_deployments')"
          class="p-button-primary"
          @click="goDashboard"
        />
      </div>
    </div>

    <!-- Processing state -->
    <div v-else-if="paymentStatus === 'pending'" class="text-center space-y-6">
      <ProgressSpinner />
      <div>
        <h1 class="text-2xl font-semibold text-on-background mb-2">
          {{ $t('credits.processing_payment') }}
        </h1>
        <p class="text-on-surface-variant max-w-md mx-auto">
          {{ $t('credits.processing_description') }}
        </p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="paymentStatus === 'failed'" class="text-center space-y-6">
      <div class="flex justify-center mb-4">
        <div class="w-16 h-16 rounded-full bg-error-container flex items-center justify-center">
          <span class="material-symbols-outlined text-4xl text-error">error</span>
        </div>
      </div>

      <div>
        <h1 class="text-3xl font-bold text-error mb-2">
          {{ $t('credits.payment_failed') }}
        </h1>
        <p class="text-on-surface-variant max-w-md mx-auto">
          {{ $t('credits.payment_error_description') }}
        </p>
      </div>

      <Message severity="error" :text="errorMessage" class="max-w-md mx-auto" />

      <div class="flex gap-3">
        <Button
          :label="$t('common.back')"
          class="p-button-secondary"
          @click="goBack"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import Message from 'primevue/message'
import { supabase } from '@/services/supabase'
import { getTransaction } from '@/services/credits.service'

type PaymentStatus = 'pending' | 'completed' | 'failed'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const paymentStatus = ref<PaymentStatus>('pending')
const transactionId = ref<string>('')
const creditsAmount = ref(0)
const formattedDate = ref('')
const errorMessage = ref<string | null>(null)

// Get transaction ID from route query
const transactionIdFromRoute = computed(() => (route.query.transactionId as string) || '')

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-SN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// Subscribe to transaction updates via Realtime
function subscribeToTransaction(txnId: string) {
  const channel = supabase
    .channel(`transaction-${txnId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'xayma_app',
        table: 'credit_transactions',
        filter: `id=eq.${txnId}`,
      },
      (payload) => {
        const status = payload.new?.status as string
        if (status === 'COMPLETED') {
          paymentStatus.value = 'completed'
          creditsAmount.value = payload.new?.amount || 0
          formattedDate.value = formatDate(payload.new?.created_at || '')
        } else if (status === 'FAILED') {
          paymentStatus.value = 'failed'
          errorMessage.value = t('credits.transaction_failed')
        }
      }
    )
    .subscribe()

  return channel
}

// Poll for transaction status (fallback if Realtime isn't available)
async function pollTransactionStatus(txnId: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const transaction = await getTransaction(Number(txnId))

      if (transaction.status === 'COMPLETED') {
        paymentStatus.value = 'completed'
        creditsAmount.value = transaction.amount
        formattedDate.value = formatDate(transaction.created_at)
        return
      } else if (transaction.status === 'FAILED') {
        paymentStatus.value = 'failed'
        errorMessage.value = t('credits.transaction_failed')
        return
      }

      // Wait 2 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (err) {
      console.error('Error polling transaction status:', err)
    }
  }

  // If we've polled max times without success, show timeout error
  if (paymentStatus.value === 'pending') {
    paymentStatus.value = 'failed'
    errorMessage.value = t('credits.payment_timeout')
  }
}

// Initialize on mount
onMounted(async () => {
  if (!transactionIdFromRoute.value) {
    errorMessage.value = t('errors.invalid_transaction')
    paymentStatus.value = 'failed'
    return
  }

  transactionId.value = transactionIdFromRoute.value

  // Start Realtime subscription
  const channel = subscribeToTransaction(transactionId.value)

  // Also start polling as fallback
  pollTransactionStatus(transactionId.value)

  // Cleanup on unmount
  return () => {
    supabase.removeChannel(channel)
  }
})

function goToHistory() {
  router.push({ name: 'credits-history' })
}

function goDashboard() {
  router.push({ name: 'dashboard' })
}

function goBack() {
  router.back()
}
</script>
