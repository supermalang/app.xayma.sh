<template>
  <Tag :value="label" :severity="severity" class="type-badge" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'

interface Props {
  type: 'customer' | 'reseller'
}

const props = defineProps<Props>()
const { t } = useI18n()

const label = computed(() => {
  const typeMap: Record<string, string> = {
    customer: t('partners.type.customer'),
    reseller: t('partners.type.reseller'),
  }
  return typeMap[props.type] || props.type
})

const severity = computed(() => {
  const severityMap: Record<string, string> = {
    customer: 'info',
    reseller: 'success',
  }
  return severityMap[props.type] || 'secondary'
})
</script>

<style scoped>
.type-badge {
  transition: var(--transition-smooth);
  font-weight: 600;
}

/* Partner type color coding
 * Reseller: success green (revenue-driving accounts)
 * Customer: info blue (end-user accounts)
 */
:deep(.type-badge.p-tag-success) {
  background: #00b341 !important;
  border-color: #00b341 !important;
  color: #ffffff !important;
}

:deep(.type-badge.p-tag-info) {
  background: #1e40af !important;
  border-color: #1e40af !important;
  color: #ffffff !important;
}
</style>
