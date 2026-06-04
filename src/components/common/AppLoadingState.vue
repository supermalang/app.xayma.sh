<template>
  <div
    class="flex items-center justify-center py-20 px-6"
    role="status"
    :aria-label="label ?? t('common.loading')"
  >
    <div v-if="variant === 'spinner'" class="flex flex-col items-center gap-3">
      <ProgressSpinner
        :style="{ width: '40px', height: '40px' }"
        strokeWidth="3"
        animationDuration=".6s"
      />
      <span v-if="label !== ''" class="text-sm text-on-surface-variant">
        {{ label ?? t('common.loading') }}
      </span>
    </div>
    <div v-else-if="variant === 'skeleton-rows'" class="w-full space-y-3">
      <Skeleton v-for="n in rows" :key="n" height="2.5rem" />
    </div>
    <div
      v-else-if="variant === 'skeleton-cards'"
      class="grid w-full gap-4"
      :style="{ gridTemplateColumns: `repeat(auto-fit, minmax(${cardMin}, 1fr))` }"
    >
      <Skeleton v-for="n in cards" :key="n" height="8rem" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ProgressSpinner from 'primevue/progressspinner'
import Skeleton from 'primevue/skeleton'

const { t } = useI18n()

withDefaults(
  defineProps<{
    /** Default spinner; skeleton-rows for tables; skeleton-cards for grids. */
    variant?: 'spinner' | 'skeleton-rows' | 'skeleton-cards'
    rows?: number
    cards?: number
    /** Minimum card width for the auto-fit grid in skeleton-cards. */
    cardMin?: string
    /** Override the i18n loading label; pass `''` to hide it. */
    label?: string
  }>(),
  { variant: 'spinner', rows: 5, cards: 4, cardMin: '14rem' },
)
</script>
