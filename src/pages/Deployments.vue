<template>
  <AppPage>
    <!-- Header -->
    <div class="header-section">
      <AppPageHeader
        :title="$t('deployments.title')"
        :description="$t('deployments.subtitle')"
      >
        <template #actions>
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
        </template>
      </AppPageHeader>
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

    <!-- DataTable wrapper -->
    <div class="table-section">
      <AppDataTable
        :rows="filteredDeployments"
        :columns="columns"
        :loading="isLoading"
        :total-records="filteredDeployments.length"
        :page-size="pageSize"
        :show-export="false"
        row-clickable
        :empty-title="$t('deployments.empty.title')"
        :empty-description="$t('deployments.empty.description')"
        empty-icon="pi-cloud"
        @row-click="onRowClick"
      >
        <template #filter>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              {{ $t('common.status') }}
            </label>
            <SelectButton
              v-model="activeTabFilter"
              :options="filterTabs"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
          <div v-if="isAdmin">
            <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              {{ $t('deployments.filter.partner') }}
            </label>
            <Select
              v-model="partnerFilter"
              :options="partnerFilterOptions"
              option-label="label"
              option-value="value"
              :placeholder="$t('deployments.filter.all_partners')"
              show-clear
              size="small"
              class="w-full"
            />
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t border-outline-variant/40">
            <Button
              :label="$t('common.reset')"
              severity="secondary"
              text
              size="small"
              @click="resetFilters"
            />
          </div>
        </template>

        <template #body-label="{ data }">
          <div class="flex items-center gap-3 name-cell">
            <div
              class="avatar-chip w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold shrink-0"
              :style="{ backgroundColor: labelColor((data as DeploymentRow).label) }"
            >
              {{ (data as DeploymentRow).label?.[0]?.toUpperCase() ?? '?' }}
            </div>
            <router-link
              v-if="(data as DeploymentRow).label"
              :to="`/deployments/${(data as DeploymentRow).id}`"
              class="font-medium text-on-surface hover:underline"
            >
              {{ (data as DeploymentRow).label }}
            </router-link>
            <span v-else class="font-medium text-on-surface">—</span>
          </div>
        </template>

        <template #body-domain="{ data }">
          <a
            v-if="firstDomain(data as DeploymentRow) && (data as DeploymentRow).status === 'active'"
            :href="`https://${firstDomain(data as DeploymentRow)}`"
            target="_blank"
            rel="noopener"
            class="font-mono text-sm text-primary hover:underline"
          >{{ firstDomain(data as DeploymentRow) }}</a>
          <span
            v-else-if="firstDomain(data as DeploymentRow)"
            class="font-mono text-sm text-on-surface-variant"
          >{{ firstDomain(data as DeploymentRow) }}</span>
          <span v-else class="text-on-surface-variant text-sm">—</span>
        </template>

        <template #body-status="{ data }">
          <DeploymentStatusBadge :status="(data as DeploymentRow).status" />
        </template>

        <template #body-created="{ data }">
          <span class="text-sm text-on-surface-variant font-mono">{{ formatDateTime((data as DeploymentRow).created) }}</span>
        </template>
      </AppDataTable>
    </div>

    <!-- Help section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 mt-2 border-t border-outline-variant help-section">
      <div class="p-6 bg-surface-container-low rounded-lg space-y-3">
        <h3 class="text-card-title">{{ $t('deployments.help.title') }}</h3>
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
  </AppPage>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import AppPage from '@/components/common/AppPage.vue'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import AppDataTable, { type AppTableColumn } from '@/components/common/AppDataTable.vue'
import DeploymentStatusBadge from '@/components/deployments/DeploymentStatusBadge.vue'
import StatCard from '@/components/common/StatCard.vue'
import { useAuth } from '@/composables/useAuth'
import { useDeployments } from '@/composables/useDeployments'
import { usePartnerStore } from '@/stores/partner.store'
import { useNotificationStore } from '@/stores/notifications.store'
import { formatCurrency } from '@/lib/formatters'

interface DeploymentRow {
  id: number
  label: string
  status: string
  partner_id?: number
  created: string
  domainNames?: string[]
  domain_names?: string[]
  serviceplan?: { monthlyCreditConsumption?: number }
}

const router = useRouter()
const { t } = useI18n()
const { isAdmin } = useAuth()
const { loadDeployments, deployments, isLoading, subscribeToDeploymentUpdates } = useDeployments()
const partnerStore = usePartnerStore()
const notificationStore = useNotificationStore()

const pageSize = ref(20)
const activeTabFilter = ref<string | null>(null)
const partnerFilter = ref<number | null>(null)

const columns: AppTableColumn[] = [
  { field: 'label', header: 'deployments.table.name' },
  { field: 'domain', header: 'deployments.table.domain' },
  { field: 'status', header: 'common.status' },
  { field: 'created', header: 'deployments.table.created' },
]

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
  { label: t('deployments.filter.all'), value: null },
  { label: `${t('deployments.status.active')} (${activeCount.value})`, value: 'active' },
  { label: `${t('deployments.status.suspended')} (${suspendedCount.value})`, value: 'suspended' },
])

const partnerFilterOptions = computed(() =>
  partnerStore.partners.map((p) => ({ label: p.name ?? `#${p.id}`, value: p.id }))
)

const filteredDeployments = computed(() => {
  let list = deployments.value as unknown as DeploymentRow[]
  if (activeTabFilter.value) {
    list = list.filter((d) => d.status === activeTabFilter.value)
  }
  if (isAdmin.value && partnerFilter.value != null) {
    list = list.filter((d) => d.partner_id === partnerFilter.value)
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

function firstDomain(data: DeploymentRow): string | null {
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

function resetFilters() {
  activeTabFilter.value = null
  partnerFilter.value = null
}

function onRowClick(row: unknown) {
  const d = row as DeploymentRow
  if (d?.id) router.push(`/deployments/${d.id}`)
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
  const csvRows = rows.map((d) => [
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
})
</script>

<style scoped>
.header-section {
  animation: header-enter var(--duration-standard) var(--easing-standard);
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

/* Row + avatar feedback */
.name-cell .avatar-chip {
  transition: transform var(--duration-micro) var(--easing-standard),
              box-shadow var(--duration-micro) var(--easing-standard);
}

/* Help CTA arrow nudge */
.help-cta .help-cta-arrow {
  display: inline-block;
  transition: transform var(--duration-micro) var(--easing-standard);
}
.help-cta:hover .help-cta-arrow {
  transform: translateX(4px);
}

/* Accessibility: respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  .header-section,
  .table-section,
  .help-section,
  .stat-stagger {
    animation: none;
  }
  .monthly-cost-card,
  .monthly-cost-card .wallet-icon,
  .name-cell .avatar-chip,
  .help-cta .help-cta-arrow {
    transition: none;
  }
  .monthly-cost-card:hover,
  .monthly-cost-card:hover .wallet-icon,
  .help-cta:hover .help-cta-arrow {
    transform: none;
  }
}
</style>
