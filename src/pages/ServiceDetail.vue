<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold text-on-surface">
      {{ $t('services.title') }} Detail
    </h1>
    <!-- TODO: Implement service detail page with TabView for Plans and AWX Config -->
    <Message
      severity="info"
      text="Service detail page - Coming soon"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Message from 'primevue/message'

const { t } = useI18n()
</script>
