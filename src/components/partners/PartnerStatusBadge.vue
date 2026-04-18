<template>
  <Tag :value="label" :severity="severity" />
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
