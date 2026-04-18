<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-lg bg-surface">
    <div class="text-center space-y-6">
      <!-- Cancel icon -->
      <div class="flex justify-center mb-4">
        <div class="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center">
          <span class="material-symbols-outlined text-4xl text-on-secondary-container">cancel</span>
        </div>
      </div>

      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold text-on-background mb-2">
          {{ $t('credits.payment_cancelled') }}
        </h1>
        <p class="text-on-surface-variant max-w-md mx-auto">
          {{ $t('credits.payment_cancelled_description') }}
        </p>
      </div>

      <!-- Info box -->
      <div class="bg-surface-container-low p-6 rounded border border-outline/20 max-w-md">
        <p class="text-sm text-on-surface-variant mb-2">
          {{ $t('credits.what_happens_next') }}
        </p>
        <ul class="text-sm text-on-surface space-y-2 text-left">
          <li class="flex gap-2">
            <span class="material-symbols-outlined text-sm text-tertiary flex-shrink-0">check_small</span>
            <span>{{ $t('credits.no_charges') }}</span>
          </li>
          <li class="flex gap-2">
            <span class="material-symbols-outlined text-sm text-tertiary flex-shrink-0">check_small</span>
            <span>{{ $t('credits.can_retry') }}</span>
          </li>
          <li class="flex gap-2">
            <span class="material-symbols-outlined text-sm text-tertiary flex-shrink-0">check_small</span>
            <span>{{ $t('credits.credits_not_added') }}</span>
          </li>
        </ul>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 flex-wrap justify-center">
        <Button
          :label="$t('credits.try_again')"
          class="p-button-primary"
          @click="goBack"
        />
        <Button
          :label="$t('common.back')"
          class="p-button-secondary"
          @click="goDashboard"
        />
      </div>

      <!-- Support link -->
      <p class="text-xs text-on-surface-variant">
        {{ $t('credits.need_help') }}
        <a
          href="#"
          class="text-primary font-semibold hover:underline"
        >
          {{ $t('nav.support') }}
        </a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'

const router = useRouter()
const { t } = useI18n()

function goBack() {
  router.back()
}

function goDashboard() {
  router.push({ name: 'credits-buy' })
}
</script>
