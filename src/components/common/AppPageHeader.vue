<template>
  <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="flex items-start gap-3 min-w-0">
      <i
        v-if="icon"
        :class="`pi ${icon} text-2xl text-primary mt-1 shrink-0`"
        aria-hidden="true"
      />
      <div class="space-y-2 min-w-0">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-page-title">{{ title }}</h1>
          <slot name="badge" />
        </div>
        <p v-if="description" class="text-on-surface-variant text-sm max-w-2xl">
          {{ description }}
        </p>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  /** PrimeIcons class without the `pi` prefix (e.g. `pi-briefcase`) */
  icon?: string
}>()
</script>
