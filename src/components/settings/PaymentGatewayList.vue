<template>
  <div v-if="gateways.length === 0" class="text-[11px] italic text-on-surface-variant">
    {{ t('settings.no_gateways_yet') }}
  </div>
  <ul v-else class="divide-y divide-outline-variant/20">
    <li
      v-for="g in gateways"
      :key="g.id"
      class="flex items-center justify-between py-3"
    >
      <div class="flex items-center gap-3 min-w-0">
        <span class="material-symbols-outlined text-secondary text-[18px]">credit_card</span>
        <div class="min-w-0">
          <div class="text-sm font-semibold truncate">{{ providerLabel(g.provider) }}</div>
          <div class="text-[10px] uppercase tracking-wider text-on-surface-variant">
            {{ g.currency }}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span :class="modeBadgeClass(g.mode)" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border">
          {{ modeLabel(g.mode) }}
        </span>
        <Button
          icon="pi pi-pencil"
          severity="secondary"
          variant="text"
          size="small"
          :aria-label="t('settings.edit_gateway')"
          @click="emit('edit', g)"
        />
        <Button
          icon="pi pi-trash"
          severity="danger"
          variant="text"
          size="small"
          :aria-label="t('settings.gateway_delete_confirm')"
          @click="emit('delete', g.id)"
        />
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import type { PaymentGateway, PaymentGatewayMode, PaymentGatewayProvider } from '@/types'

defineProps<{ gateways: PaymentGateway[] }>()
const emit = defineEmits<{
  edit: [gateway: PaymentGateway]
  delete: [id: string]
}>()

const { t } = useI18n()

function providerLabel(p: PaymentGatewayProvider): string {
  return t(`settings.gateway_provider_${p}`)
}

function modeLabel(m: PaymentGatewayMode): string {
  return t(`settings.gateway_mode_${m}`)
}

function modeBadgeClass(m: PaymentGatewayMode): string {
  return m === 'live'
    ? 'text-tertiary border-tertiary/20'
    : 'text-on-surface-variant border-outline-variant/40'
}
</script>
