<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-on-surface">
        {{ $t('services.title') }}
      </h1>
      <Button
        :label="$t('services.create')"
        icon="pi pi-plus"
        @click="showCreateDialog"
      />
    </div>
    <!-- TODO: Implement services list page -->
    <Message
      severity="info"
      text="Services page - Coming soon"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Message from 'primevue/message'

const { t } = useI18n()
const showCreateDialog = () => console.log('Create service')
</script>
