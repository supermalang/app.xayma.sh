<template>
  <div :class="['app-page page-enter', `app-page--${width}`, $attrs.class]">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    /**
     * Content width. `narrow` for focused forms (max-w-3xl),
     * `wide` for dashboards and lists (max-w-7xl, default),
     * `full` for edge-to-edge surfaces.
     */
    width?: 'narrow' | 'wide' | 'full'
  }>(),
  { width: 'wide' },
)
</script>

<style scoped>
.app-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  margin-inline: auto;
}

.app-page--narrow {
  max-width: 48rem;
}

.app-page--wide {
  max-width: 80rem;
}

.app-page--full {
  max-width: 100%;
}
</style>
