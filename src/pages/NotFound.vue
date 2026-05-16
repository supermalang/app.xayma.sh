<template>
  <div class="p-md space-y-3 page-enter">
    <h1 class="text-page-title">{{ $t('errors.not_found_title') }}</h1>
    <p class="text-on-surface-variant">{{ $t('errors.not_found_description') }}</p>
    <RouterLink to="/" class="text-primary font-semibold hover:underline inline-flex items-center gap-1">
      <i class="pi pi-arrow-left text-xs" />
      {{ $t('errors.back_to_dashboard') }}
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
