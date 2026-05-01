<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4 header-section">
      <AppPageHeader
        :title="$t('deployments.title')"
        :description="$t('deployments.subtitle')"
      />
      <div class="flex items-center gap-3 shrink-0 pt-1">
        <Button
          :label="$t('deployments.export_csv')"
          icon="pi pi-download"
          text
          severity="secondary"
          @click="exportDeployments"
        />
        <Button
          :label="$t('deployments.create')"
          icon="pi pi-plus"
          @click="navigateToWizard"
        />
      </div>
    </div>

    <!-- Stats row — 3 cards, always visible -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stats-section">
      <div class="stat-stagger" style="--stat-delay: 0ms">
        <StatCard
          :title="$t('deployments.stats.instances_active')"
          :value="String(activeCount).padStart(2, '0')"
        />
      </div>
      <div class="stat-stagger" style="--stat-delay: 60ms">
        <StatCard
          :title="$t('deployments.stats.credits_remaining')"
          :value="String(partnerCredits)"
        />
      </div>
      <!-- Monthly Cost — dark card variant -->
      <div
        class="stat-stagger rounded-lg p-6 bg-primary text-on-primary flex items-start justify-between monthly-cost-card"
        style="--stat-delay: 120ms"
      >
        <div class="space-y-2">
          <p class="text-xs font-bold uppercase tracking-widest" style="opacity: 0.75">
            {{ $t('deployments.stats.monthly_cost') }}
          </p>
          <p class="text-3xl font-bold">{{ formatCurrency(monthlyCost) }}</p>
        </div>
        <span class="wallet-icon opacity-75 mt-1" aria-hidden="true">
          <i class="pi pi-wallet" />
        </span>
      </div>
    </div>

    <!-- Tab-style filter -->
    <div class="flex items-center justify-between border-b border-outline-variant filter-section">
      <div ref="tabsContainerRef" class="flex relative">
        <button
          v-for="tab in filterTabs"
          :key="String(tab.value)"
          :ref="(el) => registerTabRef(el, tab.value)"
          class="tab-button px-4 py-2 text-sm font-medium -mb-px"
          :class="activeTabFilter === tab.value
            ? 'text-primary'
            : 'text-on-surface-variant hover:text-on-surface'"
          @click="setTabFilter(tab.value)"
        >
          {{ tab.label }}
          <span v-if="tab.count !== null" class="ms-1 text-xs opacity-70">{{ tab.count }}</span>
        </button>
        <span
          class="tab-indicator"
          :style="{
            transform: `translateX(${tabIndicator.left}px)`,
            width: `${tabIndicator.width}px`,
          }"
          aria-hidden="true"
        />
      </div>
      <div v-if="isAdmin" class="flex gap-2 pb-2">
        <Select
          v-model="partnerFilter"
          :options="partnerFilterOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('deployments.filter.all_partners')"
          show-clear
          size="small"
          class="partner-filter"
          :aria-label="$t('deployments.filter.partner')"
        />
      </div>
    </div>

    <!-- DataTable -->
    <div class="table-section">
      <Transition name="filter-swap" mode="out-in">
        <DataTable
          :key="String(activeTabFilter)"
          :value="filteredDeployments"
          :loading="isLoading"
          paginator
          :rows="pageSize"
          striped-rows
          row-hover
          :rows-per-page-options="[10, 20, 50]"
        >
          <!-- NAME column -->
          <Column :header="$t('deployments.table.name')">
            <template #body="{ data }">
              <div class="flex items-center gap-3 name-cell">
                <div
                  class="avatar-chip w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold shrink-0"
                  :style="{ backgroundColor: labelColor(data.label) }"
                >
                  {{ data.label?.[0]?.toUpperCase() ?? '?' }}
                </div>
                <router-link
                  v-if="data.label"
                  :to="`/deployments/${data.id}`"
                  class="font-medium text-on-surface hover:underline"
                >
                  {{ data.label }}
                </router-link>
                <span v-else class="font-medium text-on-surface">—</span>
              </div>
            </template>
          </Column>

          <!-- DOMAIN column -->
          <Column :header="$t('deployments.table.domain')">
            <template #body="{ data }">
              <a
                v-if="firstDomain(data) && data.status === 'active'"
                :href="`https://${firstDomain(data)}`"
                target="_blank"
                rel="noopener"
                class="font-mono text-sm text-primary hover:underline"
              >{{ firstDomain(data) }}</a>
              <span
                v-else-if="firstDomain(data)"
                class="font-mono text-sm text-on-surface-variant"
              >{{ firstDomain(data) }}</span>
              <span v-else class="text-on-surface-variant text-sm">—</span>
            </template>
          </Column>

          <!-- STATUS column -->
          <Column :header="$t('common.status')">
            <template #body="{ data }">
              <DeploymentStatusBadge :status="data.status" />
            </template>
          </Column>

          <!-- CREATED column -->
          <Column :header="$t('deployments.table.created')">
            <template #body="{ data }">
              <span class="text-sm text-on-surface-variant font-mono">{{ formatDateTime(data.created) }}</span>
            </template>
          </Column>

          <template #empty>
            <div class="text-center text-on-surface-variant py-8">
              {{ $t('common.no_data') }}
            </div>
          </template>
        </DataTable>
      </Transition>
    </div>

    <!-- Help section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 mt-2 border-t border-outline-variant help-section">
      <div class="p-6 bg-surface-container-low rounded-lg space-y-3">
        <h3 class="font-semibold text-on-surface text-base">{{ $t('deployments.help.title') }}</h3>
        <p class="text-sm text-on-surface-variant leading-relaxed" style="max-width: 65ch">
          {{ $t('deployments.help.description') }}
        </p>
        <a
          href="/docs/cluster"
          class="help-cta text-sm text-primary font-medium inline-flex items-center gap-1 hover:underline"
        >
          {{ $t('deployments.help.cta') }}
          <i class="pi pi-arrow-right text-xs help-cta-arrow" />
        </a>
      </div>
      <div class="bg-surface-container rounded-lg flex items-center justify-center min-h-36">
        <i class="pi pi-file text-5xl text-outline" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import DeploymentStatusBadge from '@/components/deployments/DeploymentStatusBadge.vue'
import StatCard from '@/components/common/StatCard.vue'
import { useAuth } from '@/composables/useAuth'
import { useDeployments } from '@/composables/useDeployments'
import { usePartnerStore } from '@/stores/partner.store'
import { useNotificationStore } from '@/stores/notifications.store'
import { formatCurrency } from '@/lib/formatters'

const router = useRouter()
const { t } = useI18n()
const { isAdmin } = useAuth()
const { loadDeployments, deployments, isLoading, subscribeToDeploymentUpdates } = useDeployments()
const partnerStore = usePartnerStore()
const notificationStore = useNotificationStore()

const pageSize = ref(20)
const activeTabFilter = ref<string | null>(null)
const partnerFilter = ref<number | null>(null)

// Tab underline indicator: slides between active tabs instead of redrawing
const tabsContainerRef = ref<HTMLElement | null>(null)
const tabRefs = new Map<string, HTMLElement>()
const tabIndicator = reactive({ left: 0, width: 0 })

function registerTabRef(el: unknown, value: string | null) {
  const key = String(value)
  if (el instanceof HTMLElement) {
    tabRefs.set(key, el)
  } else {
    tabRefs.delete(key)
  }
}

function updateTabIndicator() {
  const key = String(activeTabFilter.value)
  const el = tabRefs.get(key)
  const container = tabsContainerRef.value
  if (!el || !container) return
  const containerLeft = container.getBoundingClientRect().left
  const rect = el.getBoundingClientRect()
  tabIndicator.left = rect.left - containerLeft
  tabIndicator.width = rect.width
}

watch(activeTabFilter, () => nextTick(updateTabIndicator))

const activeCount = computed(() =>
  deployments.value.filter((d: any) => d.status === 'active').length
)

const suspendedCount = computed(() =>
  deployments.value.filter((d: any) => d.status === 'suspended').length
)

const monthlyCost = computed(() =>
  deployments.value.reduce((total: number, d: any) =>
    total + (d.serviceplan?.monthlyCreditConsumption || 0), 0)
)

const partnerCredits = computed(() =>
  partnerStore.selectedPartner?.remainingCredits ?? 0
)

const filterTabs = computed(() => [
  { label: t('deployments.filter.all'), value: null, count: null },
  { label: t('deployments.status.active'), value: 'active', count: activeCount.value },
  { label: t('deployments.status.suspended'), value: 'suspended', count: suspendedCount.value },
])

const partnerFilterOptions = computed(() =>
  partnerStore.partners.map((p) => ({ label: p.name ?? `#${p.id}`, value: p.id }))
)

const filteredDeployments = computed(() => {
  let list = deployments.value
  if (activeTabFilter.value) {
    list = list.filter((d: any) => d.status === activeTabFilter.value)
  }
  if (isAdmin.value && partnerFilter.value != null) {
    list = list.filter((d: any) => d.partner_id === partnerFilter.value)
  }
  return list
})

// Deterministic avatar color based on first character
const AVATAR_COLORS = [
  '#00288e', // primary
  '#1e40af', // primary-container
  '#003d28', // tertiary
  '#9d4300', // secondary
  '#0e5a8a', // tonal blue
  '#5c2d91', // tonal purple
]
function labelColor(label: string): string {
  if (!label) return AVATAR_COLORS[0]
  return AVATAR_COLORS[label.charCodeAt(0) % AVATAR_COLORS.length]
}

function firstDomain(data: any): string | null {
  const domains = data.domainNames ?? data.domain_names
  return Array.isArray(domains) && domains.length > 0 ? domains[0] : null
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yy}-${mm}-${dd} ${hh}:${min}`
}

function setTabFilter(value: string | null) {
  activeTabFilter.value = value
}

function navigateToWizard() {
  router.push('/deployments/new')
}

function exportDeployments() {
  if (!deployments.value.length) return
  const rows = filteredDeployments.value
  const headers = [
    t('deployments.table.name'),
    t('deployments.table.domain'),
    t('common.status'),
    t('deployments.table.created'),
  ]
  const csvRows = rows.map((d: any) => [
    `"${(d.label ?? '').replace(/"/g, '""')}"`,
    `"${(firstDomain(d) ?? '').replace(/"/g, '""')}"`,
    `"${(d.status ?? '').replace(/"/g, '""')}"`,
    `"${formatDateTime(d.created)}"`,
  ].join(','))
  const csv = [headers.map((h) => `"${h}"`).join(','), ...csvRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `deployments-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function loadDeploymentsList() {
  try {
    const partnerId = isAdmin.value ? undefined : partnerStore.selectedPartner?.id
    if (!isAdmin.value && !partnerId) {
      notificationStore.addError(t('errors.fetch_failed'))
      return
    }
    await loadDeployments(partnerId as number)
  } catch {
    notificationStore.addError(t('errors.fetch_failed'))
  }
}

onMounted(async () => {
  await nextTick()
  updateTabIndicator()
  window.addEventListener('resize', updateTabIndicator)

  if (isAdmin.value) {
    if (partnerStore.partners.length === 0) {
      try {
        await partnerStore.fetchPartners()
      } catch {
        // Surfacing errors is handled by the store; non-fatal for the page.
      }
    }
    await loadDeploymentsList()
    subscribeToDeploymentUpdates()
  } else if (partnerStore.selectedPartner?.id) {
    await loadDeploymentsList()
    subscribeToDeploymentUpdates(partnerStore.selectedPartner.id)
  }
  await nextTick()
  updateTabIndicator()
})
</script>

<style scoped>
.header-section {
  animation: header-enter var(--duration-standard) var(--easing-standard);
}

.filter-section {
  animation: fade-in var(--duration-standard) var(--easing-standard) 240ms backwards;
}

.table-section {
  animation: fade-in var(--duration-standard) var(--easing-standard) 300ms backwards;
}

.help-section {
  animation: fade-in var(--duration-standard) var(--easing-standard) 360ms backwards;
}

/* Stat cards: individual stagger so the row builds in sequence */
.stat-stagger {
  animation: stat-card-fade var(--duration-standard) var(--easing-standard) backwards;
  animation-delay: var(--stat-delay, 0ms);
}

.monthly-cost-card {
  transition: transform var(--duration-standard) var(--easing-standard),
              box-shadow var(--duration-standard) var(--easing-standard);
  will-change: transform;
}
.monthly-cost-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -12px rgba(0, 40, 142, 0.45);
}
.monthly-cost-card .wallet-icon {
  display: inline-block;
  transition: transform var(--duration-standard) var(--easing-standard);
}
.monthly-cost-card:hover .wallet-icon {
  transform: rotate(-8deg) scale(1.08);
}

/* Tab underline that slides between active tabs */
.tab-button {
  position: relative;
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: color var(--duration-micro) var(--easing-standard);
}
.tab-button:active {
  transform: scale(0.97);
}
.tab-indicator {
  position: absolute;
  left: 0;
  bottom: -1px;
  height: 2px;
  background-color: var(--primary);
  transform: translateX(0);
  transition:
    transform var(--duration-standard) var(--easing-standard),
    width var(--duration-standard) var(--easing-standard);
  pointer-events: none;
  border-radius: 2px;
}

.partner-filter {
  min-width: 12rem;
}

/* Filter swap: short crossfade when switching tabs */
.filter-swap-enter-active,
.filter-swap-leave-active {
  transition: opacity var(--duration-micro) var(--easing-standard);
}
.filter-swap-enter-from,
.filter-swap-leave-to {
  opacity: 0;
}

/* Row + avatar feedback */
.name-cell .avatar-chip {
  transition: transform var(--duration-micro) var(--easing-standard),
              box-shadow var(--duration-micro) var(--easing-standard);
}
:deep(.p-datatable-tbody > tr) {
  transition: background-color var(--duration-micro) var(--easing-standard);
}
:deep(.p-datatable-tbody > tr:hover) .avatar-chip {
  transform: scale(1.06);
  box-shadow: 0 2px 6px -2px rgba(0, 0, 0, 0.18);
}

/* Help CTA arrow nudge */
.help-cta .help-cta-arrow {
  display: inline-block;
  transition: transform var(--duration-micro) var(--easing-standard);
}
.help-cta:hover .help-cta-arrow {
  transform: translateX(4px);
}

:deep(.p-datatable-thead > tr > th) {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--on-surface-variant);
  background-color: var(--surface-container);
}

/* Accessibility: respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  .header-section,
  .filter-section,
  .table-section,
  .help-section,
  .stat-stagger {
    animation: none;
  }
  .monthly-cost-card,
  .monthly-cost-card .wallet-icon,
  .tab-button,
  .tab-indicator,
  .name-cell .avatar-chip,
  .help-cta .help-cta-arrow,
  :deep(.p-datatable-tbody > tr) {
    transition: none;
  }
  .monthly-cost-card:hover,
  .monthly-cost-card:hover .wallet-icon,
  :deep(.p-datatable-tbody > tr:hover) .avatar-chip,
  .help-cta:hover .help-cta-arrow {
    transform: none;
  }
}
</style>
