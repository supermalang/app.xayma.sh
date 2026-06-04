<template>
  <div
    class="flex flex-col items-center justify-center text-center gap-4 py-16 px-6"
    role="alert"
  >
    <div
      class="w-14 h-14 rounded-full bg-error-container flex items-center justify-center"
      aria-hidden="true"
    >
      <i class="pi pi-exclamation-triangle text-2xl text-error" />
    </div>
    <div class="space-y-1 max-w-md">
      <h2 class="text-section-title text-on-surface">{{ title }}</h2>
      <p v-if="description" class="text-sm text-on-surface-variant">
        {{ description }}
      </p>
    </div>
    <div class="mt-2 flex flex-wrap items-center justify-center gap-2">
      <Button
        v-if="showRetry"
        :label="retryLabel ?? t('common.retry')"
        icon="pi pi-refresh"
        severity="secondary"
        @click="$emit('retry')"
      />
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'

const { t } = useI18n()

withDefaults(
  defineProps<{
    title: string
    description?: string
    showRetry?: boolean
    retryLabel?: string
  }>(),
  { showRetry: true },
)

defineEmits<{ (e: 'retry'): void }>()
</script>
