<template>
  <Tag :value="label" :severity="severity" />
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
