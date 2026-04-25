<template>
  <header class="sticky top-0 z-50 h-16 w-full bg-white border-b border-outline-variant/20 shadow-none flex items-center justify-between px-8">
    <!-- Left: Logo -->
    <div class="text-xl font-bold tracking-tighter text-primary">Xayma.sh</div>

    <!-- Right: Controls -->
    <div class="flex items-center gap-4">
      <!-- Credit Balance Pill -->
      <div class="flex items-center bg-surface-container-low px-3 py-1.5 rounded text-sm font-medium text-primary">
        <span class="material-symbols-outlined mr-2 text-lg">account_balance_wallet</span>
        <span class="font-mono text-sm">{{ creditDisplay }}</span>
      </div>

      <!-- Language Toggle -->
      <Button
        icon="pi pi-language"
        class="p-button-text p-button-sm"
        :label="locale.toUpperCase()"
        @click="toggleLanguage"
        severity="secondary"
        :aria-label="$t('aria.toggle_language')"
      />

      <!-- Notification Bell -->
      <NotificationBell />

      <!-- User Avatar with initials -->
      <button
        class="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold cursor-pointer"
        :title="user?.email"
        :aria-label="$t('aria.open_user_menu', { email: user?.email || 'User' })"
        @click="toggleUserMenu"
      >
        {{ userInitials }}
      </button>
      <Menu ref="userMenu" :model="userMenuItems" :popup="true" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useAuth } from '@/composables/useAuth'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import NotificationBell from '@/components/notifications/NotificationBell.vue'

const { locale, t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const { user } = useAuth()

const userMenu = ref()

const userInitials = computed(() => {
  const meta = user.value?.user_metadata
  if (meta?.first_name && meta?.last_name) {
    return `${meta.first_name[0]}${meta.last_name[0]}`.toUpperCase()
  }
  return user.value?.email?.slice(0, 2).toUpperCase() || 'XX'
})

const creditDisplay = computed(() => {
  // Placeholder until credit store is connected
  return '– FCFA'
})

const userMenuItems = computed(() => [
  {
    label: user.value?.email || 'User',
    class: 'p-menuitem-text-only',
  },
  {
    separator: true,
  },
  {
    label: t('nav.settings'),
    icon: 'pi pi-cog',
    command: () => router.push('/settings'),
  },
  {
    separator: true,
  },
  {
    label: t('nav.logout'),
    icon: 'pi pi-sign-out',
    command: handleLogout,
  },
])

const toggleLanguage = () => {
  locale.value = locale.value === 'en' ? 'fr' : 'en'
  localStorage.setItem('locale', locale.value)
}

const toggleUserMenu = (event: any) => {
  userMenu.value?.toggle(event)
}

const handleLogout = async () => {
  await authStore.signOut()
  router.push('/login')
}
</script>

<style scoped>
:deep(.p-button-sm) {
  padding: 0.5rem;
}

:deep(.p-button-text) {
  color: var(--on-surface-variant);
}

:deep(.p-button-text:hover) {
  background-color: var(--surface-container-low);
}
</style>
