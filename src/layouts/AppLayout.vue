<template>
  <div>
    <AppSidebar />
    <AppHeader />
    <main class="ml-0 md:ml-64 pt-16 p-8 min-h-screen bg-surface">
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
const userRole = computed(() => authStore.user?.user_metadata?.role ?? '')

// Activate credit alerts only for credit-bearing roles (CUSTOMER, RESELLER)
// Admin and Sales users have no partner_id, so alerts would be wasteful
if (userRole.value === 'CUSTOMER' || userRole.value === 'RESELLER') {
  useCreditAlerts(partnerId.value, userId.value)
}
</script>
