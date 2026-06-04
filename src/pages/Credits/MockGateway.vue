<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-lg bg-surface">
    <div class="w-full max-w-md space-y-6">
      <div class="bg-tertiary-container text-tertiary text-xs font-semibold uppercase tracking-wider px-3 py-2 text-center">
        {{ t('mock_gateway.dev_banner') }}
      </div>

      <div class="bg-surface-container-low p-6 border border-outline/20 space-y-4">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-primary">credit_card</span>
          <h1 class="text-section-title">{{ t('mock_gateway.title') }}</h1>
        </div>

        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-on-surface-variant">{{ t('mock_gateway.bundle') }}</span>
            <span class="font-mono">{{ bundleLabel }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-on-surface-variant">{{ t('mock_gateway.amount') }}</span>
            <span class="font-mono font-semibold">{{ formatAmount(amount) }} FCFA</span>
          </div>
          <div class="flex justify-between">
            <span class="text-on-surface-variant">{{ t('mock_gateway.transaction_id') }}</span>
            <span class="font-mono">{{ transactionId }}</span>
          </div>
        </div>

        <p class="text-xs text-on-surface-variant text-center" v-if="autoApproveCountdown > 0 && !processing">
          {{ t('mock_gateway.auto_approve', { seconds: autoApproveCountdown }) }}
        </p>

        <div class="flex gap-3 pt-2">
          <Button
            :label="t('mock_gateway.reject')"
            severity="secondary"
            class="flex-1"
            :loading="processing"
            :disabled="processing"
            @click="reject"
          />
          <Button
            :label="t('mock_gateway.approve')"
            class="flex-1"
            :loading="processing"
            :disabled="processing"
            @click="approve"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { callWorkflowEngineWebhook } from '@/services/workflow-engine'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const transactionId = computed(() => String(route.query.transactionId ?? ''))
const amount = computed(() => Number(route.query.amount ?? 0))
const bundleLabel = computed(() => String(route.query.bundleLabel ?? '—'))

const processing = ref(false)
const autoApproveCountdown = ref(5)
let intervalId: number | null = null

function formatAmount(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n)
}

async function approve() {
  if (processing.value) return
  processing.value = true
  if (intervalId !== null) {
    window.clearInterval(intervalId)
    intervalId = null
  }
  try {
    await callWorkflowEngineWebhook('paymentCallback', {
      transactionId: transactionId.value,
      status: 'sale_complete',
    })
  } catch (err) {
    console.error('[MockGateway] approve error:', err)
  }
  await router.push({ name: 'credits-success', query: { transactionId: transactionId.value } })
}

async function reject() {
  if (processing.value) return
  processing.value = true
  if (intervalId !== null) {
    window.clearInterval(intervalId)
    intervalId = null
  }
  try {
    await callWorkflowEngineWebhook('paymentCallback', {
      transactionId: transactionId.value,
      status: 'sale_canceled',
    })
  } catch (err) {
    console.error('[MockGateway] reject error:', err)
  }
  await router.push({ name: 'credits-cancel', query: { transactionId: transactionId.value } })
}

onMounted(() => {
  intervalId = window.setInterval(() => {
    autoApproveCountdown.value -= 1
    if (autoApproveCountdown.value <= 0 && !processing.value) {
      if (intervalId !== null) {
        window.clearInterval(intervalId)
        intervalId = null
      }
      void approve()
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (intervalId !== null) {
    window.clearInterval(intervalId)
    intervalId = null
  }
})
</script>
