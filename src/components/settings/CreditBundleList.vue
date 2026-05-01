<template>
  <div v-if="bundles.length === 0" class="text-[11px] italic text-on-surface-variant">
    {{ t('settings.no_bundles_yet') }}
  </div>
  <ul v-else class="divide-y divide-outline-variant/20">
    <li
      v-for="b in bundles"
      :key="b.id"
      class="flex items-center justify-between py-3 gap-3"
    >
      <div class="flex items-center gap-3 min-w-0">
        <span class="material-symbols-outlined text-secondary text-[18px]">card_giftcard</span>
        <div class="min-w-0">
          <div class="text-sm font-semibold truncate">{{ b.label }}</div>
          <div class="text-[10px] uppercase tracking-wider text-on-surface-variant font-mono">
            {{ formatNumber(b.creditsAmount) }} {{ t('settings.credits_unit_short') }} · {{ formatNumber(b.priceXOF) }} FCFA
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button
          icon="pi pi-pencil"
          severity="secondary"
          variant="text"
          size="small"
          :aria-label="t('settings.edit_bundle')"
          @click="emit('edit', b)"
        />
        <Button
          icon="pi pi-trash"
          severity="danger"
          variant="text"
          size="small"
          :aria-label="t('settings.bundle_delete_confirm')"
          @click="emit('delete', b.id)"
        />
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { formatNumber } from '@/lib/formatters'
import type { CreditBundle } from '@/types'

defineProps<{ bundles: CreditBundle[] }>()
const emit = defineEmits<{
  edit: [bundle: CreditBundle]
  delete: [id: string]
}>()

const { t } = useI18n()
</script>
