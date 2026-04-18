<template>
  <Card class="credit-bundle-card flex flex-col">
    <!-- Header with discount badge -->
    <template #header>
      <div class="relative h-32 bg-surface-container-high flex items-center justify-center overflow-hidden">
        <span class="material-symbols-outlined text-6xl text-primary/20">payments</span>
        <Badge
          v-if="bundle.discount_percent > 0"
          :value="`${bundle.discount_percent}% OFF`"
          severity="success"
          class="absolute top-3 right-3"
        />
      </div>
    </template>

    <template #content>
      <!-- Bundle details -->
      <div class="space-y-4">
        <!-- Credits amount -->
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-bold font-mono text-on-surface">
            {{ formatCreditAmount(bundle.credits_amount) }}
          </span>
          <span class="text-sm text-on-surface-variant">{{ $t('credits.credits') }}</span>
        </div>

        <!-- Validity -->
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-wider text-on-surface-variant font-medium">
            {{ $t('credits.validity') }}
          </p>
          <p class="text-sm font-semibold text-on-surface">
            {{ bundle.validity_days }} {{ $t('common.days') }}
          </p>
        </div>

        <!-- Monthly instances (if applicable) -->
        <div v-if="bundle.max_instances" class="space-y-1">
          <p class="text-xs uppercase tracking-wider text-on-surface-variant font-medium">
            {{ $t('credits.max_instances') }}
          </p>
          <p class="text-sm font-semibold text-on-surface">{{ bundle.max_instances }}</p>
        </div>

        <!-- Price section -->
        <div class="pt-4 border-t border-outline/20">
          <!-- Original price (if discount) -->
          <p v-if="bundle.discount_percent > 0" class="text-xs text-on-surface-variant line-through mb-2">
            <span class="font-mono">{{ formatPrice(originalPrice) }}</span>
          </p>

          <!-- Discounted/final price -->
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold font-mono text-on-surface">
              {{ formatPrice(bundle.price_xof) }}
            </span>
            <span class="text-xs text-on-surface-variant">{{ $t('credits.price_per_bundle') }}</span>
          </div>

          <!-- Savings amount -->
          <p v-if="bundle.discount_percent > 0" class="text-xs text-tertiary mt-1">
            {{ $t('credits.save') }} <span class="font-semibold font-mono">{{ formatPrice(savingsAmount) }}</span>
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <Button
        :label="$t('credits.select_bundle')"
        class="w-full p-button-primary"
        @click="selectBundle"
      />
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import { useCurrency } from '@/composables/useCurrency'

interface CreditBundle {
  id: string
  credits_amount: number
  price_xof: number
  price_usd?: number
  price_eur?: number
  discount_percent: number
  validity_days: number
  max_instances?: number
  description?: string
  status: 'ACTIVE' | 'INACTIVE'
}

interface Props {
  bundle: CreditBundle
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [bundleId: string]
}>()

const { t } = useI18n()
const { formatSymbol } = useCurrency()

// Calculate original price (before discount)
const originalPrice = computed(() => {
  if (props.bundle.discount_percent === 0) {
    return props.bundle.price_xof
  }
  return Math.round(props.bundle.price_xof / (1 - props.bundle.discount_percent / 100))
})

// Calculate savings amount
const savingsAmount = computed(() => {
  return originalPrice.value - props.bundle.price_xof
})

// Format credit amount (no decimals for credits)
function formatCreditAmount(amount: number): string {
  return formatSymbol(amount, 'XOF')
}

// Format price in FCFA
function formatPrice(amount: number): string {
  return formatSymbol(amount, 'XOF') + ' FCFA'
}

function selectBundle() {
  emit('select', props.bundle.id)
}
</script>

<style scoped>
.credit-bundle-card {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-lowest);
  transition: all 150ms linear;
}

.credit-bundle-card:hover {
  background: var(--surface-container-low);
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(0, 40, 142, 0.1);
}

/* Ensure monospace font for numbers */
:deep(.font-mono) {
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
}
</style>
