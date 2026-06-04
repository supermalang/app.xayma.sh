<template>
  <AppPage>
    <!-- Header -->
    <AppPageHeader
      :title="$t('portfolio.title')"
      :description="$t('portfolio.description')"
      icon="pi-briefcase"
    />

    <!-- Portfolio Table -->
    <AppDataTable
      :title="$t('portfolio.customers')"
      :rows="filteredPortfolio"
      :columns="columns"
      :total-records="filteredPortfolio.length"
      :page-size="20"
      :first="first"
      row-clickable
      export-filename="portfolio"
      :empty-title="$t('portfolio.empty.title')"
      :empty-description="$t('portfolio.empty.description')"
      empty-icon="pi-briefcase"
      @page-change="onPage"
      @row-click="onRowClick"
    >
      <template #filter>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ $t('common.search') }}
          </label>
          <InputText
            v-model="searchQuery"
            type="text"
            :placeholder="$t('common.search')"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ $t('portfolio.filter_plan') }}
          </label>
          <Dropdown
            v-model="selectedPlan"
            :options="planOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('portfolio.filter_plan')"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ $t('portfolio.filter_status') }}
          </label>
          <Dropdown
            v-model="selectedStatus"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('portfolio.filter_status')"
            class="w-full"
          />
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-outline-variant/40">
          <Button
            :label="$t('portfolio.reset_filters')"
            icon="pi pi-refresh"
            severity="secondary"
            text
            size="small"
            @click="resetFilters"
          />
        </div>
      </template>

      <template #body-plan="{ data }">
        <Tag :value="(data as PortfolioCustomer).plan" class="text-xs" />
      </template>

      <template #body-creditStatus="{ data }">
        <Tag
          :value="(data as PortfolioCustomer).creditStatus"
          :severity="getCreditStatusSeverity((data as PortfolioCustomer).creditStatus)"
          class="text-xs"
        />
      </template>

      <template #body-lastPaymentDate="{ data }">
        <span class="font-mono text-xs">{{ formatDate((data as PortfolioCustomer).lastPaymentDate) }}</span>
      </template>

      <template #body-renewalDate="{ data }">
        <span class="font-mono text-xs">{{ formatDate((data as PortfolioCustomer).renewalDate) }}</span>
      </template>

      <template #rowActions="{ data }">
        <router-link
          :to="`/partners/${(data as PortfolioCustomer).partnerId}`"
          class="text-xs font-medium text-primary hover:text-primary-container"
          @click.stop
        >
          {{ $t('common.view') }}
        </router-link>
      </template>
    </AppDataTable>
  </AppPage>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Tag from 'primevue/tag'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import AppPage from '@/components/common/AppPage.vue'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import AppDataTable, { type AppTableColumn } from '@/components/common/AppDataTable.vue'

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

const router = useRouter()

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

const columns: AppTableColumn[] = [
  { field: 'partnerName', header: 'portfolio.customer_name' },
  { field: 'plan', header: 'portfolio.plan' },
  { field: 'creditStatus', header: 'portfolio.credit_status' },
  { field: 'lastPaymentDate', header: 'portfolio.last_payment' },
  { field: 'renewalDate', header: 'portfolio.renewal_date' },
]

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
function onPage(event: { first: number }): void {
  first.value = event.first
}

function onRowClick(row: unknown): void {
  const c = row as PortfolioCustomer
  if (c?.partnerId) router.push(`/partners/${c.partnerId}`)
}
</script>
