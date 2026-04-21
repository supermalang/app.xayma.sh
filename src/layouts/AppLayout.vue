<template>
  <div>
    <AppSidebar />
    <AppHeader />
    <main class="ml-64 pt-16 p-8 min-h-screen bg-surface">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed } from 'vue'
import AppSidebar from '@/components/common/AppSidebar.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useCreditAlerts } from '@/composables/useCreditAlerts'

const authStore = useAuthStore()
const partnerId = computed(() => String(authStore.profile?.company_id ?? ''))
const userId = computed(() => authStore.user?.id ?? '')

// Activate credit alerts for credit-bearing roles
// The null guards in usePartnerCredits make this safe for all roles
useCreditAlerts(partnerId.value, userId.value)
</script>
