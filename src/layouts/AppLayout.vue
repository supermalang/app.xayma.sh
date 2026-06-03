<template>
  <div>
    <a class="skip-link" href="#main-content">{{ t('a11y.skip_to_main') }}</a>
    <AppSidebar :open="mobileNavOpen" @close="mobileNavOpen = false" />
    <AppHeader @toggle-nav="mobileNavOpen = !mobileNavOpen" />
    <main
      id="main-content"
      tabindex="-1"
      class="ms-0 md:ms-64 pt-16 min-h-screen bg-surface px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
    >
      <RouterView v-slot="{ Component, route: activeRoute }">
        <transition name="route" mode="out-in" appear>
          <component :is="Component" :key="activeRoute.fullPath" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.skip-link {
  position: absolute;
  inset-inline-start: 0.5rem;
  top: 0.5rem;
  z-index: 1000;
  padding: 0.5rem 0.875rem;
  background: var(--primary);
  color: var(--on-primary);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transform: translateY(-200%);
  transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1);
}

.skip-link:focus {
  transform: translateY(0);
  outline: 2px solid var(--on-primary);
  outline-offset: 2px;
}
</style>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppSidebar from '@/components/common/AppSidebar.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useCreditAlerts } from '@/composables/useCreditAlerts'

const { t } = useI18n()

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
