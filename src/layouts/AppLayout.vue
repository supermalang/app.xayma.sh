<template>
  <div>
    <AppSidebar :open="mobileNavOpen" @close="mobileNavOpen = false" />
    <AppHeader @toggle-nav="mobileNavOpen = !mobileNavOpen" />
    <main
      class="ml-0 md:ml-64 pt-16 min-h-screen bg-surface px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
    >
      <RouterView v-slot="{ Component, route: activeRoute }">
        <transition name="route" mode="out-in" appear>
          <component :is="Component" :key="activeRoute.fullPath" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/common/AppSidebar.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useCreditAlerts } from '@/composables/useCreditAlerts'

const authStore = useAuthStore()
const partnerId = computed(() => String(authStore.profile?.company_id ?? ''))
const userId = computed(() => authStore.user?.id ?? '')
const userRole = computed(() => authStore.user?.user_metadata?.role ?? '')

const mobileNavOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { mobileNavOpen.value = false })

// Activate credit alerts only for credit-bearing roles (CUSTOMER, RESELLER)
// Admin and Sales users have no partner_id, so alerts would be wasteful
if (userRole.value === 'CUSTOMER' || userRole.value === 'RESELLER') {
  useCreditAlerts(partnerId.value, userId.value)
}
</script>
