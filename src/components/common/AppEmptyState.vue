<template>
  <div
    class="flex flex-col items-center justify-center text-center gap-4 py-16 px-6"
    role="status"
  >
    <div
      class="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center"
      aria-hidden="true"
    >
      <i :class="`pi ${icon} text-2xl text-on-surface-variant`" />
    </div>
    <div class="space-y-1 max-w-md">
      <h2 class="text-section-title text-on-surface">{{ title }}</h2>
      <p v-if="description" class="text-sm text-on-surface-variant">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.action" class="mt-2">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
    /** PrimeIcons class with the `pi-` prefix (e.g. `pi-inbox`). */
    icon?: string
  }>(),
  { icon: 'pi-inbox' },
)
</script>
