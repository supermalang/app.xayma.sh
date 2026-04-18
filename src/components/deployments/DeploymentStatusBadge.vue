<template>
  <Tag
    :value="getLabel(status)"
    :severity="getSeverity(status)"
    class="whitespace-nowrap"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'

interface Props {
  status: string
}

defineProps<Props>()
const { t } = useI18n()

function getLabel(status: string): string {
  const labelMap: Record<string, string> = {
    pending_deployment: t('deployments.status.pending_deployment'),
    deploying: t('deployments.status.deploying'),
    active: t('deployments.status.active'),
    stopped: t('deployments.status.stopped'),
    suspended: t('deployments.status.suspended'),
    failed: t('deployments.status.failed'),
    archived: t('deployments.status.archived'),
    pending_deletion: t('deployments.status.pending_deletion'),
  }
  return labelMap[status] || status
}

function getSeverity(status: string): string {
  const severityMap: Record<string, string> = {
    pending_deployment: 'warning',
    deploying: 'info',
    active: 'success',
    stopped: 'secondary',
    suspended: 'warning',
    failed: 'danger',
    archived: 'secondary',
    pending_deletion: 'danger',
  }
  return severityMap[status] || 'info'
}
</script>
