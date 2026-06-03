<template>
  <Tag :value="label" :severity="severity" rounded class="partner-type-badge" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'

type PartnerTypeKind = 'customer' | 'reseller'
type TagSeverity = 'info' | 'success' | 'secondary'

const props = defineProps<{ type: PartnerTypeKind }>()
const { t } = useI18n()

const LABEL_KEY: Record<PartnerTypeKind, string> = {
  customer: 'partners.type.customer',
  reseller: 'partners.type.reseller',
}

const SEVERITY: Record<PartnerTypeKind, TagSeverity> = {
  customer: 'info',
  reseller: 'success',
}

const label = computed(() => {
  const key = LABEL_KEY[props.type]
  return key ? t(key) : props.type
})
const severity = computed<TagSeverity>(() => SEVERITY[props.type] ?? 'secondary')
</script>

<style scoped>
.partner-type-badge {
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 0.6875rem;
}
</style>
