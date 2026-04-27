<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner'
import { useI18n } from 'vue-i18n'

defineProps<{ visible: boolean }>()
const { t } = useI18n()
</script>

<template>
  <div
    v-if="visible"
    class="absolute end-4 top-4 flex items-center gap-1.5 text-xs text-surface-400"
  >
    <ProgressSpinner
      style="width: 14px; height: 14px"
      stroke-width="6"
      animation-duration="1s"
    />
    <span>{{ t('dashboard.refreshing') }}</span>
  </div>
</template>
