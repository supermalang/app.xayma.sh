<template>
  <Tag
    :value="label"
    :severity="severity"
    rounded
    :class="['partner-status-badge', { 'partner-status-badge--pulse': pulse }]"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'

type PartnerStatus = 'active' | 'suspended' | 'inactive'
type TagSeverity = 'success' | 'warn' | 'info' | 'secondary'

const props = defineProps<{ status: PartnerStatus }>()
const { t } = useI18n()

const LABEL_KEY: Record<PartnerStatus, string> = {
  active: 'partners.status.active',
  suspended: 'partners.status.suspended',
  inactive: 'partners.status.inactive',
}

const SEVERITY: Record<PartnerStatus, TagSeverity> = {
  active: 'success',
  suspended: 'warn',
  inactive: 'info',
}

const label = computed(() => {
  const key = LABEL_KEY[props.status]
  return key ? t(key) : props.status
})
const severity = computed<TagSeverity>(() => SEVERITY[props.status] ?? 'secondary')
const pulse = computed(() => props.status === 'suspended')
</script>

<style scoped>
.partner-status-badge {
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 0.6875rem;
  transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

.partner-status-badge--pulse {
  animation: status-badge-pulse 1.5s var(--easing-pulse, cubic-bezier(0.16, 1, 0.3, 1)) infinite;
}

@keyframes status-badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}
</style>
