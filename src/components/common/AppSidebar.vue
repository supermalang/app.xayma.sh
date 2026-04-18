<template>
  <aside class="w-64 h-screen fixed left-0 top-0 bg-slate-50 border-r border-outline-variant/20 flex flex-col z-40">
    <!-- Org Identity -->
    <div class="px-4 py-8 border-b border-outline-variant/10">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 bg-surface-container-high rounded flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-primary">hub</span>
        </div>
        <div>
          <div class="text-sm font-bold text-on-surface leading-tight">{{ orgName }}</div>
          <div class="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">{{ orgTier }}</div>
        </div>
      </div>
    </div>

    <!-- Nav Items -->
    <nav class="flex-1 space-y-1 p-2 overflow-y-auto">
      <RouterLink
        v-for="item in visibleNavItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-all duration-200"
        :class="{
          'bg-blue-50 text-blue-700 border-r-4 border-blue-700': isActive(item.path),
          'text-slate-600 hover:bg-slate-200/50 hover:text-blue-600': !isActive(item.path)
        }"
      >
        <span class="material-symbols-outlined text-lg">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- Bottom Links -->
    <div class="border-t border-outline-variant/10 pt-4 pb-4 px-2 space-y-1">
      <!-- New Deployment CTA Button -->
      <RouterLink
        v-if="canCreateDeployment"
        to="/deployments/new"
        class="flex items-center justify-center gap-2 w-full bg-primary text-white py-2.5 rounded text-sm font-bold mb-4 hover:bg-primary-container transition-colors"
      >
        <span class="material-symbols-outlined text-lg">add</span>
        {{ $t('nav.new_deployment') }}
      </RouterLink>

      <!-- Support & Documentation Links -->
      <a href="#" class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-slate-200/50 hover:text-blue-600 rounded text-sm font-medium transition-all duration-200">
        <span class="material-symbols-outlined text-lg">help_outline</span>
        <span>{{ $t('nav.support') }}</span>
      </a>
      <a href="#" class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-slate-200/50 hover:text-blue-600 rounded text-sm font-medium transition-all duration-200">
        <span class="material-symbols-outlined text-lg">description</span>
        <span>{{ $t('nav.docs') }}</span>
      </a>
      <div class="px-4 py-2 text-[10px] font-mono text-slate-400 uppercase tracking-tighter">XAYMA_v2.1.0</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()
const { isAdmin, isCustomer, isReseller, isSales } = useAuth()

const canCreateDeployment = computed(() => isCustomer.value || isReseller.value)

// Mock org name/tier (would come from store in real app)
const orgName = 'Acme Corp'
const orgTier = 'Enterprise'

interface NavItem {
  path: string
  label: string
  icon: string
  roles: string[]
}

const allNavItems: NavItem[] = [
  { path: '/dashboard', label: t('nav.dashboard'), icon: 'dashboard', roles: ['ADMIN', 'CUSTOMER', 'RESELLER', 'SALES'] },
  { path: '/deployments', label: t('nav.deployments'), icon: 'rocket_launch', roles: ['ADMIN', 'CUSTOMER', 'RESELLER'] },
  { path: '/partners', label: t('nav.partners'), icon: 'group', roles: ['ADMIN', 'RESELLER', 'SALES'] },
  { path: '/credits', label: t('nav.credits'), icon: 'receipt_long', roles: ['ADMIN', 'CUSTOMER', 'RESELLER'] },
  { path: '/portfolio', label: t('nav.portfolio'), icon: 'briefcase', roles: ['SALES'] },
  { path: '/commissions', label: t('nav.commissions'), icon: 'trending_up', roles: ['SALES'] },
  { path: '/services', label: t('nav.services'), icon: 'settings_suggest', roles: ['ADMIN'] },
  { path: '/control-nodes', label: t('nav.control_nodes'), icon: 'dns', roles: ['ADMIN'] },
  { path: '/audit', label: t('nav.audit'), icon: 'history', roles: ['ADMIN'] },
  { path: '/settings', label: t('nav.settings'), icon: 'settings', roles: ['ADMIN', 'CUSTOMER', 'RESELLER', 'SALES'] },
]

const visibleNavItems = computed(() => {
  return allNavItems.filter(item => {
    if (isAdmin.value) return item.roles.includes('ADMIN')
    if (isCustomer.value) return item.roles.includes('CUSTOMER')
    if (isReseller.value) return item.roles.includes('RESELLER')
    if (isSales.value) return item.roles.includes('SALES')
    return false
  })
})

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<style scoped>
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* Active state filled icon */
a.active .material-symbols-outlined,
.bg-blue-50 .material-symbols-outlined {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
