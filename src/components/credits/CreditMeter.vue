<template>
  <Card class="credit-meter">
    <template #content>
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-xs uppercase tracking-wider text-on-surface-variant font-semibold mb-1">
            {{ $t('credits.balance') }}
          </p>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold font-mono text-on-surface">
              {{ formatBalance(balance) }}
            </span>
            <span class="text-on-surface-variant">FCFA</span>
          </div>
        </div>
        <div class="text-right">
          <Tag
            v-if="expiryDate"
            :value="$t('credits.expires', { date: formatDate(expiryDate) })"
            severity="warning"
            class="text-xs"
          />
        </div>
      </div>

      <!-- Progress bar -->
      <div class="mb-4">
        <ProgressBar
          :value="percentageUsed"
          :class="['h-2', `meter-${colorClass}`]"
          :pt="{
            value: {
              style: { backgroundColor: colorValue },
            },
          }"
        />
      </div>

      <!-- Status and usage info -->
      <div class="flex items-center justify-between text-sm">
        <div>
          <p class="text-on-surface-variant mb-1">
            <span v-if="percentageRemaining > 30" class="text-tertiary font-semibold">
              ✓ {{ $t('credits.healthy') }}
            </span>
            <span v-else-if="percentageRemaining > 10" class="text-secondary-container font-semibold">
              ⚠ {{ $t('credits.low') }}
            </span>
            <span v-else class="text-error font-semibold">
              ✕ {{ $t('credits.critical') }}
            </span>
          </p>
          <p class="text-xs text-on-surface-variant">
            {{ Math.floor(percentageRemaining) }}% {{ $t("credits.remaining") }}
          </p>
        </div>
        <div v-if="daysRemaining >= 0" class="text-right">
          <p class="font-mono font-semibold text-on-surface">{{ daysRemaining }}</p>
          <p class="text-xs text-on-surface-variant">{{ $t('common.days') }} left</p>
        </div>
        <div v-else class="text-right">
          <p class="font-mono font-semibold text-error">EXPIRED</p>
          <p class="text-xs text-error">Credits lost</p>
        </div>
      </div>

      <!-- Deployment info (if provided) -->
      <div v-if="activeDeployments" class="mt-4 pt-4 border-t border-outline/20">
        <p class="text-xs text-on-surface-variant mb-2">
          {{ $t('credits.active_deployments', { count: activeDeployments }) }}
        </p>
        <p class="text-sm text-on-surface-variant">
          {{ $t('credits.monthly_consumption', { amount: Math.floor(monthlyConsumption) }) }} FCFA/month
        </p>
      </div>

      <!-- Action button -->
      <Button
        v-if="percentageRemaining < 50"
        :label="$t('credits.topup')"
        class="w-full p-button-primary mt-4"
        @click="$emit('topup')"
      />
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from 'primevue/card'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { useCurrency } from '@/composables/useCurrency'

interface Props {
  balance: number
  totalCreditsEarned?: number
  maxBalance?: number
  expiryDate?: string
  activeDeployments?: number
  monthlyConsumption?: number
}

const props = withDefaults(defineProps<Props>(), {
  totalCreditsEarned: 0,
  maxBalance: 100000, // Default max for percentage calculation
  activeDeployments: 0,
  monthlyConsumption: 0,
})

defineEmits<{
  topup: []
}>()

const { formatSymbol } = useCurrency()

// Calculate percentage remaining
const percentageRemaining = computed(() => {
  return Math.round((props.balance / props.maxBalance) * 100)
})

// Calculate percentage used
const percentageUsed = computed(() => {
  return 100 - percentageRemaining.value
})

// Determine color class based on percentage
const colorClass = computed(() => {
  if (percentageRemaining.value > 30) return 'healthy'
  if (percentageRemaining.value > 10) return 'warning'
  return 'critical'
})

// Get actual color value for progress bar
const colorValue = computed(() => {
  if (percentageRemaining.value > 30) return '#003d28' // tertiary (green)
  if (percentageRemaining.value > 10) return '#fd761a' // secondary-container (orange)
  return '#ba1a1a' // error (red)
})

// Calculate days remaining
const daysRemaining = computed(() => {
  if (!props.expiryDate) return -1
  const now = new Date()
  const expiry = new Date(props.expiryDate)
  const diff = expiry.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
})

// Format balance with thousand separator
function formatBalance(amount: number): string {
  return formatSymbol(amount, 'XOF')
}

// Format expiry date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-SN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<style scoped>
.credit-meter {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-lowest);
}

/* Progress bar colors */
:deep(.meter-healthy .p-progressbar-value) {
  background-color: var(--tertiary);
}

:deep(.meter-warning .p-progressbar-value) {
  background-color: var(--secondary-container);
}

:deep(.meter-critical .p-progressbar-value) {
  background-color: var(--error);
}

/* Monospace for numbers */
:deep(.font-mono) {
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
}
</style>
