<template>
  <Card class="border border-outline">
    <template #content>
      <div class="space-y-2">
        <p class="text-sm font-medium text-on-surface-variant">{{ title }}</p>
        <p class="text-3xl font-bold text-on-surface">{{ value }}</p>
        <p v-if="subtitle" class="text-xs text-on-surface-variant">{{ subtitle }}</p>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Card from 'primevue/card'

interface Props {
  title: string
  value: string
  subtitle?: string
}

defineProps<Props>()
</script>
