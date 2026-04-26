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
          v-if="canCreateDeployment"
          :label="$t('deployments.create')"
          icon="pi pi-plus"
          @click="navigateToWizard"
        />
      </div>
    </div>

    <!-- Stats row — 4 cards, always visible -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stats-section">
      <StatCard
        :title="$t('deployments.stats.instances_active')"
        :value="String(activeCount).padStart(2, '0')"
      />
      <StatCard
        :title="$t('deployments.stats.monthly_cost')"
        :value="formatCurrency(monthlyCost)"
      />
      <StatCard
        :title="$t('deployments.stats.uptime')"
        value="99.98%"
      />
      <!-- Credits Remaining — dark card variant -->
      <div class="rounded-lg p-6 bg-primary text-on-primary flex items-start justify-between credits-card">
        <div class="space-y-2">
          <p class="text-xs font-bold uppercase tracking-widest" style="opacity: 0.75">
            {{ $t('deployments.stats.credits_remaining') }}
          </p>
          <p class="text-3xl font-bold">{{ formatCurrency(partnerCredits) }}</p>
        </div>
        <router-link to="/billing" class="opacity-60 hover:opacity-100 transition-opacity mt-1">
          <i class="pi pi-chevron-down" />
        </router-link>
      </div>
    </div>

    <!-- Tab-style filter -->
    <div class="flex items-center justify-between border-b border-outline-variant filter-section">
      <div class="flex">
        <button
          v-for="tab in filterTabs"
          :key="String(tab.value)"
          class="px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2"
          :class="activeTabFilter === tab.value
            ? 'border-primary text-primary'
            : 'border-transparent text-on-surface-variant hover:text-on-surface'"
          @click="setTabFilter(tab.value)"
        >
          {{ tab.label }}
          <span v-if="tab.count !== null" class="ms-1 text-xs opacity-70">{{ tab.count }}</span>
        </button>
      </div>
      <div class="flex gap-1 pb-2">
        <Button icon="pi pi-filter" text size="small" severity="secondary" aria-label="Filter" />
        <Button icon="pi pi-ellipsis-v" text size="small" severity="secondary" aria-label="More options" />
      </div>
    </div>

    <!-- DataTable -->
    <div class="table-section">
      <DataTable
        :value="filteredDeployments"
        :loading="isLoading"
        paginator
        :rows="pageSize"
        striped-rows
        :rows-per-page-options="[10, 20, 50]"
      >
        <!-- NAME column -->
        <Column :header="$t('deployments.table.name')">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold shrink-0"
                :style="{ backgroundColor: labelColor(data.label) }"
              >
                {{ data.label?.[0]?.toUpperCase() ?? '?' }}
              </div>
              <span class="font-medium text-on-surface">{{ data.label || '—' }}</span>
            </div>
          </template>
        </Column>

        <!-- DOMAIN column -->
        <Column :header="$t('deployments.table.domain')">
          <template #body="{ data }">
            <a
              v-if="firstDomain(data)"
              :href="`https://${firstDomain(data)}`"
              target="_blank"
              rel="noopener"
              class="font-mono text-sm text-primary hover:underline"
            >{{ firstDomain(data) }}</a>
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

        <!-- ACTIONS column -->
        <Column class="w-20">
          <template #header>{{ $t('common.actions') }}</template>
          <template #body="{ data }">
            <Button
              icon="pi pi-eye"
              text
              rounded
              size="small"
              :title="$t('common.view')"
              @click="navigateToDetail(data.id)"
            />
          </template>
        </Column>

        <template #empty>
          <div class="text-center text-on-surface-variant py-8">
            {{ $t('common.no_data') }}
          </div>
        </template>
      </DataTable>
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
          class="text-sm text-primary font-medium inline-flex items-center gap-1 hover:underline"
        >
          {{ $t('deployments.help.cta') }}
          <i class="pi pi-arrow-right text-xs" />
        </a>
      </div>
      <div class="bg-surface-container rounded-lg flex items-center justify-center min-h-36">
        <i class="pi pi-file text-5xl text-outline" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
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

const canCreateDeployment = computed(() => !isAdmin)

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

const filteredDeployments = computed(() => {
  if (!activeTabFilter.value) return deployments.value
  return deployments.value.filter((d: any) => d.status === activeTabFilter.value)
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

function navigateToDetail(id: number) {
  router.push(`/deployments/${id}`)
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
    const partnerId = isAdmin ? undefined : partnerStore.selectedPartner?.id
    if (!isAdmin && !partnerId) {
      notificationStore.addError(t('errors.fetch_failed'))
      return
    }
    await loadDeployments(partnerId as number)
  } catch {
    notificationStore.addError(t('errors.fetch_failed'))
  }
}

onMounted(async () => {
  if (isAdmin) {
    await loadDeploymentsList()
    subscribeToDeploymentUpdates()
  } else if (partnerStore.selectedPartner?.id) {
    await loadDeploymentsList()
    subscribeToDeploymentUpdates(partnerStore.selectedPartner.id)
  }
})
</script>

<style scoped>
.header-section {
  animation: header-enter var(--duration-standard) var(--easing-standard);
}

.stats-section {
  animation: fade-in var(--duration-standard) var(--easing-standard) 60ms backwards;
}

.filter-section {
  animation: fade-in var(--duration-standard) var(--easing-standard) 120ms backwards;
}

.table-section {
  animation: fade-in var(--duration-standard) var(--easing-standard) 180ms backwards;
}

.help-section {
  animation: fade-in var(--duration-standard) var(--easing-standard) 240ms backwards;
}

.credits-card {
  cursor: default;
}

:deep(.p-datatable-thead > tr > th) {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--on-surface-variant);
  background-color: var(--surface-container);
}
</style>
