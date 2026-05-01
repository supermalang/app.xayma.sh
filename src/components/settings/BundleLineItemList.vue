<template>
  <div v-if="items.length === 0" class="text-[11px] italic text-on-surface-variant">
    {{ t('settings.no_line_items_yet') }}
  </div>
  <ul v-else class="divide-y divide-outline-variant/20">
    <li
      v-for="item in sortedItems"
      :key="item.id"
      class="flex items-center justify-between py-3 gap-3"
    >
      <div class="flex items-center gap-3 min-w-0">
        <span class="material-symbols-outlined text-secondary text-[18px]">request_quote</span>
        <div class="min-w-0">
          <div class="text-sm font-semibold truncate">{{ item.title }}</div>
          <div class="text-[10px] uppercase tracking-wider text-on-surface-variant font-mono">
            {{ formatAmount(item) }}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span :class="modeBadgeClass(item.mode)" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border">
          {{ modeLabel(item.mode) }}
        </span>
        <Button
          icon="pi pi-pencil"
          severity="secondary"
          variant="text"
          size="small"
          :aria-label="t('settings.edit_line_item')"
          @click="emit('edit', item)"
        />
        <Button
          icon="pi pi-trash"
          severity="danger"
          variant="text"
          size="small"
          :aria-label="t('settings.line_item_delete_confirm')"
          @click="emit('delete', item.id)"
        />
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { formatNumber } from '@/lib/formatters'
import type { BundleLineItem, BundleLineItemMode } from '@/types'

const props = defineProps<{ items: BundleLineItem[] }>()
const emit = defineEmits<{
  edit: [item: BundleLineItem]
  delete: [id: string]
}>()

const { t } = useI18n()

const sortedItems = computed(() =>
  [...props.items].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
)

function formatAmount(item: BundleLineItem): string {
  return item.type === 'PERCENT'
    ? `${item.amount}%`
    : `${formatNumber(item.amount)} FCFA`
}

function modeLabel(m: BundleLineItemMode): string {
  return m === 'INCLUDED'
    ? t('settings.line_item_mode_included')
    : t('settings.line_item_mode_additional')
}

function modeBadgeClass(m: BundleLineItemMode): string {
  return m === 'INCLUDED'
    ? 'text-on-surface-variant border-outline-variant/40'
    : 'text-tertiary border-tertiary/20'
}
</script>
