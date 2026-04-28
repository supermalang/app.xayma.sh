<template>
  <div class="bg-surface-container-lowest p-6 rounded-md border transition-colors duration-200" :class="borderClass">
    <div class="flex items-center justify-between mb-6">
      <span class="text-sm font-semibold text-primary">{{ title }}</span>
      <div class="flex items-center gap-3">
        <Button
          :label="t('settings.test_connection')"
          icon="pi pi-bolt"
          size="small"
          severity="secondary"
          variant="text"
          :disabled="testDisabled"
          :loading="status === 'testing'"
          @click="emit('test')"
        />
        <span class="material-symbols-outlined text-outline-variant">{{ icon }}</span>
      </div>
    </div>
    <div class="space-y-4">
      <div>
        <label class="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">
          {{ urlLabel }}
        </label>
        <InputText
          :model-value="url"
          type="url"
          class="w-full font-mono text-sm"
          @update:model-value="emit('update:url', String($event ?? ''))"
        />
      </div>
      <div>
        <label class="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">
          {{ secretLabel }}
        </label>
        <InputText
          :model-value="secret"
          type="password"
          class="w-full font-mono text-sm"
          @update:model-value="emit('update:secret', String($event ?? ''))"
        />
      </div>
      <div class="flex items-center gap-2 pt-1">
        <span class="material-symbols-outlined text-[14px]" :class="iconColorClass">{{ statusIcon }}</span>
        <span class="text-[11px] font-medium" :class="iconColorClass">{{ statusLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

type ConnectionStatus = 'idle' | 'testing' | 'ok' | 'fail'

const props = defineProps<{
  title: string
  icon: string
  urlLabel: string
  url: string
  secretLabel: string
  secret: string
  status: ConnectionStatus
  testDisabled?: boolean
}>()

const emit = defineEmits<{
  'update:url': [value: string]
  'update:secret': [value: string]
  test: []
}>()

const { t } = useI18n()

const borderClass = computed(() => {
  switch (props.status) {
    case 'ok': return 'border-tertiary/60'
    case 'fail': return 'border-error/60'
    case 'testing': return 'border-primary/40'
    default: return 'border-outline-variant/20'
  }
})

const iconColorClass = computed(() => {
  switch (props.status) {
    case 'ok': return 'text-tertiary'
    case 'fail': return 'text-error'
    case 'testing': return 'text-primary'
    default: return 'text-on-surface-variant'
  }
})

const statusIcon = computed(() => {
  switch (props.status) {
    case 'ok': return 'check_circle'
    case 'fail': return 'error'
    case 'testing': return 'sync'
    default: return 'radio_button_unchecked'
  }
})

const statusLabel = computed(() => {
  switch (props.status) {
    case 'ok': return t('settings.connection_ok')
    case 'fail': return t('settings.connection_failed')
    case 'testing': return t('settings.connection_testing')
    default: return t('settings.connection_idle')
  }
})
</script>
