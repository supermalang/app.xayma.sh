<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader
      :title="$t('portfolio.title')"
      :description="$t('portfolio.description')"
      icon="pi-briefcase"
    />

    <!-- Filters -->
    <Card role="region" aria-label="Portfolio filters">
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="group" aria-label="Search and filter controls">
          <!-- Search -->
          <span class="p-input-icon-left w-full">
            <i class="pi pi-search" />
            <InputText
              v-model="searchQuery"
              type="text"
              :placeholder="$t('common.search')"
              class="w-full"
            />
          </span>

          <!-- Plan Filter -->
          <Dropdown
            v-model="selectedPlan"
            :options="planOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('portfolio.filter_plan')"
            class="w-full"
          />

          <!-- Status Filter -->
          <Dropdown
            v-model="selectedStatus"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('portfolio.filter_status')"
            class="w-full"
          />

          <!-- Reset Button -->
          <Button
            :label="$t('portfolio.reset_filters')"
            icon="pi pi-refresh"
            severity="secondary"
            @click="resetFilters"
            class="w-full"
            aria-label="Reset all filters to default values"
          />
        </div>
      </template>
    </Card>

    <!-- Portfolio Table -->
    <Card role="region" aria-label="Customer portfolio">
      <template #header>
        <div class="p-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-on-surface" id="portfolio-table-title">
            {{ $t('portfolio.customers') }}
          </h3>
          <span class="text-xs font-semibold px-2 py-1 bg-primary-container text-primary rounded-full">
            {{ filteredPortfolio.length }}
          </span>
        </div>
      </template>

      <DataTable
        v-if="filteredPortfolio.length > 0"
        :value="paginatedPortfolio"
        striped-rows
        responsive-layout="stack"
        :paginator="filteredPortfolio.length > 20"
        :rows="20"
        :totalRecords="filteredPortfolio.length"
        :first="first"
        @page="onPage"
        class="text-sm"
        aria-labelledby="portfolio-table-title"
        role="grid"
      >
        <Column field="partnerName" :header="$t('portfolio.customer_name')" />
        <Column field="plan" :header="$t('portfolio.plan')">
          <template #body="slotProps">
            <Tag :value="slotProps.data.plan" class="text-xs" />
          </template>
        </Column>
        <Column field="creditStatus" :header="$t('portfolio.credit_status')">
          <template #body="slotProps">
            <Tag
              :value="slotProps.data.creditStatus"
              :severity="getCreditStatusSeverity(slotProps.data.creditStatus)"
              class="text-xs"
            />
          </template>
        </Column>
        <Column field="lastPaymentDate" :header="$t('portfolio.last_payment')">
          <template #body="slotProps">
            <span class="font-mono text-xs">{{ formatDate(slotProps.data.lastPaymentDate) }}</span>
          </template>
        </Column>
        <Column field="renewalDate" :header="$t('portfolio.renewal_date')">
          <template #body="slotProps">
            <span class="font-mono text-xs">{{ formatDate(slotProps.data.renewalDate) }}</span>
          </template>
        </Column>
        <Column :header="$t('common.actions')" style="width: 100px">
          <template #body="slotProps">
            <router-link
              :to="`/partners/${slotProps.data.partnerId}`"
              class="text-xs font-medium text-primary hover:text-primary-container"
            >
              {{ $t('common.view') }}
            </router-link>
          </template>
        </Column>
      </DataTable>

      <div v-else class="text-center py-8 text-on-surface-variant">
        <i class="pi pi-inbox text-3xl mb-2 block opacity-75" />
        <p class="text-sm">{{ $t('portfolio.no_customers') }}</p>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import AppPageHeader from '@/components/common/AppPageHeader.vue'

/**
 * Portfolio customer record
 */
interface PortfolioCustomer {
  partnerId: string
  partnerName: string
  plan: string
  creditStatus: 'HEALTHY' | 'LOW' | 'CRITICAL'
  lastPaymentDate: string
  renewalDate: string
}

/**
 * Sales person's portfolio (mock data - in production, fetch from API)
 */
const portfolio = ref<PortfolioCustomer[]>([
  {
    partnerId: '1',
    partnerName: 'Logistics Plus',
    plan: 'Enterprise',
    creditStatus: 'HEALTHY',
    lastPaymentDate: new Date('2026-03-15').toISOString(),
    renewalDate: new Date('2026-04-15').toISOString(),
  },
  {
    partnerId: '2',
    partnerName: 'Fashion Hub',
    plan: 'Pro',
    creditStatus: 'LOW',
    lastPaymentDate: new Date('2026-02-28').toISOString(),
    renewalDate: new Date('2026-04-20').toISOString(),
  },
  {
    partnerId: '3',
    partnerName: 'Tech Solutions',
    plan: 'Starter',
    creditStatus: 'CRITICAL',
    lastPaymentDate: new Date('2026-01-20').toISOString(),
    renewalDate: new Date('2026-04-10').toISOString(),
  },
  {
    partnerId: '4',
    partnerName: 'Retail Group',
    plan: 'Enterprise',
    creditStatus: 'HEALTHY',
    lastPaymentDate: new Date('2026-03-20').toISOString(),
    renewalDate: new Date('2026-04-25').toISOString(),
  },
  {
    partnerId: '5',
    partnerName: 'Food Delivery',
    plan: 'Pro',
    creditStatus: 'HEALTHY',
    lastPaymentDate: new Date('2026-03-18').toISOString(),
    renewalDate: new Date('2026-04-18').toISOString(),
  },
])

/**
 * Filter options
 */
const planOptions = [
  { label: 'All Plans', value: null },
  { label: 'Starter', value: 'Starter' },
  { label: 'Pro', value: 'Pro' },
  { label: 'Enterprise', value: 'Enterprise' },
  { label: 'Reseller', value: 'Reseller' },
]

const statusOptions = [
  { label: 'All Status', value: null },
  { label: 'Healthy', value: 'HEALTHY' },
  { label: 'Low Balance', value: 'LOW' },
  { label: 'Critical', value: 'CRITICAL' },
]

/**
 * Reactive filters
 */
const searchQuery = ref('')
const selectedPlan = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const first = ref(0)

/**
 * Filtered portfolio
 */
const filteredPortfolio = computed(() => {
  return portfolio.value.filter((customer) => {
    const matchesSearch =
      customer.partnerName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      customer.plan.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesPlan = !selectedPlan.value || customer.plan === selectedPlan.value
    const matchesStatus = !selectedStatus.value || customer.creditStatus === selectedStatus.value

    return matchesSearch && matchesPlan && matchesStatus
  })
})

/**
 * Paginated results
 */
const paginatedPortfolio = computed(() => {
  const start = first.value
  const end = start + 20
  return filteredPortfolio.value.slice(start, end)
})

/**
 * Format date
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get credit status severity for Tag
 */
function getCreditStatusSeverity(status: string): string {
  const severityMap: Record<string, string> = {
    HEALTHY: 'success',
    LOW: 'warning',
    CRITICAL: 'danger',
  }
  return severityMap[status] || 'info'
}

/**
 * Reset all filters
 */
function resetFilters(): void {
  searchQuery.value = ''
  selectedPlan.value = null
  selectedStatus.value = null
  first.value = 0
}

/**
 * Handle pagination
 */
function onPage(event: any): void {
  first.value = event.first
}
</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
}

:deep(.p-datatable) {
  border: none;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  background: var(--surface-container-high);
  border-color: var(--outline-variant);
  color: var(--on-surface);
  font-weight: 600;
  font-size: 0.875rem;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  border-color: var(--outline-variant);
  color: var(--on-surface);
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background: var(--surface-container-highest);
}

/* Accessibility: Focus rings for keyboard navigation */
:deep(.p-inputtext:focus),
:deep(.p-dropdown:focus),
:deep(.p-button:focus) {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

:deep(a:focus) {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 2px;
}
</style>
