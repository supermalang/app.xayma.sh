<template>
  <Card class="stat-card">
    <template #header>
      <div class="flex items-center justify-between p-4">
        <div class="flex items-center gap-3">
          <div
            class="flex items-center justify-center w-12 h-12 rounded-md"
            :style="{ backgroundColor: backgroundColor }"
          >
            <i :class="icon" class="text-xl text-white" />
          </div>
          <div>
            <p class="text-sm text-on-surface-variant">{{ label }}</p>
            <p class="text-2xl font-bold text-on-surface font-mono">{{ formattedValue }}</p>
          </div>
        </div>

        <!-- Trend Indicator -->
        <div
          v-if="trend !== undefined"
          class="flex items-center gap-1"
          :class="trend > 0 ? 'text-tertiary' : 'text-error'"
        >
          <i :class="trend > 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" />
          <span class="text-sm font-medium">{{ Math.abs(trend) }}%</span>
        </div>
      </div>
    </template>

    <!-- Footer: Optional description -->
    <p v-if="description" class="text-xs text-on-surface-variant pt-2">
      {{ description }}
    </p>

    <!-- Slot: Additional content -->
    <slot />
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from 'primevue/card'

interface Props {
  label: string
  value: number | string
  icon: string
  trend?: number
  description?: string
  format?: 'number' | 'currency' | 'percent'
  color?: 'primary' | 'secondary' | 'tertiary' | 'error'
}

const props = withDefaults(defineProps<Props>(), {
  format: 'number',
  color: 'primary',
})

/**
 * Computed: background color for icon
 */
const backgroundColor = computed(() => {
  const colors: Record<string, string> = {
    primary: '#00288e',
    secondary: '#9d4300',
    tertiary: '#003d28',
    error: '#ba1a1a',
  }
  return colors[props.color] || colors.primary
})

/**
 * Computed: formatted value based on format type
 */
const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value

  switch (props.format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(props.value)

    case 'percent':
      return `${props.value}%`

    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(props.value)
  }
})
</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
  box-shadow: none;
}

:deep(.p-card-header) {
  border: none;
  padding: 0;
}

:deep(.p-card-body) {
  padding: 1rem;
}

.stat-card {
  transition: all 0.2s ease;
}

.stat-card:hover :deep(.p-card) {
  background-color: var(--surface-container-high);
}
</style>
