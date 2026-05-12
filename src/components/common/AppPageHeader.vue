<template>
  <div class="space-y-2">
    <div class="flex items-center gap-3">
      <i v-if="icon" :class="`pi ${icon} text-3xl text-primary`" />
      <h1 class="text-page-title">{{ title }}</h1>
    </div>
    <p v-if="description" class="text-on-surface-variant">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  icon?: string
}>()
</script>
