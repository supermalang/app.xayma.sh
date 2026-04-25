<template>
  <Tag
    :value="label"
    :severity="severity"
    class="status-badge"
    :class="{ 'status-suspended': props.status === 'suspended' }"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'

interface Props {
  status: 'active' | 'suspended' | 'inactive'
}

const props = defineProps<Props>()
const { t } = useI18n()

const label = computed(() => {
  const statusMap: Record<string, string> = {
    active: t('partners.status.active'),
    suspended: t('partners.status.suspended'),
    inactive: t('partners.status.inactive'),
  }
  return statusMap[props.status] || props.status
})

const severity = computed(() => {
  const severityMap: Record<string, string> = {
    active: 'success',
    suspended: 'warning',
    inactive: 'info',
  }
  return severityMap[props.status] || 'secondary'
})
</script>

<style scoped>
.status-badge {
  transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
  font-weight: 600;
}

/* Color-coded status badges
 * Active: green (operational)
 * Suspended: orange (warning, requires attention)
 * Inactive: neutral gray-blue
 */
:deep(.status-badge.p-tag-success) {
  background: #00b341 !important;
  border-color: #00b341 !important;
  color: #ffffff !important;
}

:deep(.status-badge.p-tag-warning) {
  background: #fd761a !important;
  border-color: #fd761a !important;
  color: #ffffff !important;
}

:deep(.status-badge.p-tag-info) {
  background: #1e40af !important;
  border-color: #1e40af !important;
  color: #ffffff !important;
}

.status-suspended {
  animation: status-badge-pulse 1.5s var(--easing-pulse) infinite;
}
</style>
