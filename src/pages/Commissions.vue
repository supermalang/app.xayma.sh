<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader
      :title="$t('commissions.title')"
      :description="$t('commissions.description')"
      icon="pi-money-bill"
    />

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="group" aria-label="Commission summary metrics">
      <StatCard
        :label="$t('commissions.total_earnings')"
        :value="totalEarnings"
        icon="pi pi-wallet"
        color="primary"
        format="currency"
      />
      <StatCard
        :label="$t('commissions.pending_commission')"
        :value="pendingCommission"
        icon="pi pi-clock"
        color="secondary"
        format="currency"
      />
      <StatCard
        :label="$t('commissions.acquisition_bonus_total')"
        :value="acquisitionBonusTotal"
        icon="pi pi-gift"
        color="tertiary"
        format="currency"
      />
      <StatCard
        :label="$t('commissions.renewal_income_total')"
        :value="renewalIncomeTotal"
        icon="pi pi-refresh"
        color="error"
        format="currency"
      />
    </div>

    <!-- Commission Trend Chart -->
    <LineChart
      :title="$t('commissions.trend_over_time')"
      :data="commissionTrendData"
    />

    <!-- Customer Commission Breakdown (Accordion) -->
    <Card role="region" aria-label="Commission breakdown by customer">
      <template #header>
        <div class="p-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-on-surface" id="commission-breakdown-title">
            {{ $t('commissions.breakdown_by_customer') }}
          </h3>
          <span class="text-xs font-semibold px-2 py-1 bg-primary-container text-primary rounded-full">
            {{ customers.length }}
          </span>
        </div>
      </template>

      <Accordion
        :value="activeAccordionTabs"
        @update:value="(value: any) => { activeAccordionTabs = Array.isArray(value) ? value : [] }"
        :multiple="true"
        aria-label="Commission breakdown by customer"
      >
        <AccordionTab v-for="customer in customers" :key="customer.id" :header="getAccordionHeader(customer)">
          <div class="space-y-4">
            <!-- Acquisition Bonus (if applicable) -->
            <div v-if="customer.acquisitionBonus.amount > 0" class="p-4 bg-surface-container-high rounded-md">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-on-surface">
                    {{ $t('commissions.acquisition_bonus') }}
                  </p>
                  <p class="text-xs text-on-surface-variant mt-1">
                    {{ customer.acquisitionBonus.percentage }}% × {{ formatCurrency(customer.planPrice) }} monthly
                  </p>
                </div>
                <p class="text-base font-semibold font-mono text-primary">
                  {{ formatCurrency(customer.acquisitionBonus.amount) }}
                </p>
              </div>
              <div v-if="!customer.acquisitionBonus.isPaid" class="mt-2">
                <Tag value="PENDING" severity="warning" class="text-xs" />
              </div>
              <div v-else class="mt-2">
                <Tag value="PAID" severity="success" class="text-xs" />
              </div>
            </div>

            <!-- Renewal Commission (ongoing) -->
            <div class="p-4 bg-surface-container-high rounded-md">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-on-surface">
                    {{ $t('commissions.renewal_commission') }}
                  </p>
                  <p class="text-xs text-on-surface-variant mt-1">
                    {{ customer.renewalCommission.percentage }}% × {{ formatCurrency(customer.planPrice) }} monthly (ongoing)
                  </p>
                </div>
                <p class="text-base font-semibold font-mono text-secondary">
                  {{ formatCurrency(customer.renewalCommission.monthlyAmount) }}/month
                </p>
              </div>
              <div class="mt-2 text-xs text-on-surface-variant">
                <p>{{ $t('commissions.ytd_renewal') }}: {{ formatCurrency(customer.renewalCommission.ytdTotal) }}</p>
              </div>
            </div>

            <!-- Customer Total -->
            <div class="p-4 bg-primary-container rounded-md flex items-center justify-between">
              <p class="text-sm font-semibold text-primary">
                {{ $t('commissions.customer_total') }}
              </p>
              <p class="text-lg font-semibold font-mono text-primary">
                {{ formatCurrency(customer.totalCommission) }}
              </p>
            </div>
          </div>
        </AccordionTab>
      </Accordion>
    </Card>

    <!-- Commission History Table -->
    <Card role="region" aria-label="Commission transaction history">
      <template #header>
        <div class="p-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-on-surface" id="commission-history-title">
            {{ $t('commissions.history') }}
          </h3>
        </div>
      </template>

      <DataTable
        :value="commissionHistory"
        striped-rows
        responsive-layout="stack"
        :paginator="true"
        :rows="10"
        class="text-sm"
        aria-labelledby="commission-history-title"
        role="grid"
      >
        <Column field="date" :header="$t('commissions.date')">
          <template #body="slotProps">
            <span class="font-mono text-xs">{{ formatDate(slotProps.data.date) }}</span>
          </template>
        </Column>
        <Column field="customerName" :header="$t('commissions.customer')" />
        <Column field="type" :header="$t('commissions.type')">
          <template #body="slotProps">
            <Tag
              :value="slotProps.data.type"
              :severity="slotProps.data.type === 'Acquisition' ? 'info' : 'success'"
              class="text-xs"
            />
          </template>
        </Column>
        <Column field="percentage" :header="$t('commissions.percentage')">
          <template #body="slotProps">
            <span class="text-xs">{{ slotProps.data.percentage }}%</span>
          </template>
        </Column>
        <Column field="amount" :header="$t('commissions.amount')">
          <template #body="slotProps">
            <span class="font-mono font-semibold text-sm">{{ formatCurrency(slotProps.data.amount) }}</span>
          </template>
        </Column>
        <Column field="status" :header="$t('commissions.status')">
          <template #body="slotProps">
            <Tag
              :value="slotProps.data.status"
              :severity="slotProps.data.status === 'Pending' ? 'warning' : 'success'"
              class="text-xs"
            />
          </template>
        </Column>
      </DataTable>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import StatCard from '@/components/charts/StatCard.vue'
import LineChart from '@/components/charts/LineChart.vue'

/**
 * Customer commission record
 */
interface CustomerCommission {
  id: string
  name: string
  plan: string
  planPrice: number
  signupDate: string
  acquisitionBonus: {
    percentage: number
    amount: number
    isPaid: boolean
  }
  renewalCommission: {
    percentage: number
    monthlyAmount: number
    ytdTotal: number
  }
  totalCommission: number
}

/**
 * Commission history entry
 */
interface CommissionHistoryEntry {
  date: string
  customerName: string
  type: 'Acquisition' | 'Renewal'
  percentage: number
  amount: number
  status: 'Pending' | 'Paid'
}

/**
 * Customers with commissions
 */
const customers = ref<CustomerCommission[]>([
  {
    id: '1',
    name: 'Logistics Plus',
    plan: 'Enterprise',
    planPrice: 500000,
    signupDate: new Date('2025-12-15').toISOString(),
    acquisitionBonus: {
      percentage: 10,
      amount: 50000,
      isPaid: true,
    },
    renewalCommission: {
      percentage: 5,
      monthlyAmount: 25000,
      ytdTotal: 75000,
    },
    totalCommission: 125000,
  },
  {
    id: '2',
    name: 'Fashion Hub',
    plan: 'Pro',
    planPrice: 250000,
    signupDate: new Date('2026-01-10').toISOString(),
    acquisitionBonus: {
      percentage: 10,
      amount: 25000,
      isPaid: false,
    },
    renewalCommission: {
      percentage: 5,
      monthlyAmount: 12500,
      ytdTotal: 37500,
    },
    totalCommission: 62500,
  },
  {
    id: '3',
    name: 'Tech Solutions',
    plan: 'Starter',
    planPrice: 100000,
    signupDate: new Date('2026-02-01').toISOString(),
    acquisitionBonus: {
      percentage: 10,
      amount: 10000,
      isPaid: false,
    },
    renewalCommission: {
      percentage: 5,
      monthlyAmount: 5000,
      ytdTotal: 10000,
    },
    totalCommission: 20000,
  },
  {
    id: '4',
    name: 'Retail Group',
    plan: 'Enterprise',
    planPrice: 500000,
    signupDate: new Date('2026-03-01').toISOString(),
    acquisitionBonus: {
      percentage: 10,
      amount: 0,
      isPaid: false,
    },
    renewalCommission: {
      percentage: 5,
      monthlyAmount: 25000,
      ytdTotal: 25000,
    },
    totalCommission: 25000,
  },
])

/**
 * Commission history (mock data)
 */
const commissionHistory = ref<CommissionHistoryEntry[]>([
  {
    date: new Date('2026-03-20').toISOString(),
    customerName: 'Logistics Plus',
    type: 'Renewal',
    percentage: 5,
    amount: 25000,
    status: 'Paid',
  },
  {
    date: new Date('2026-03-15').toISOString(),
    customerName: 'Fashion Hub',
    type: 'Acquisition',
    percentage: 10,
    amount: 25000,
    status: 'Pending',
  },
  {
    date: new Date('2026-03-10').toISOString(),
    customerName: 'Logistics Plus',
    type: 'Renewal',
    percentage: 5,
    amount: 25000,
    status: 'Paid',
  },
  {
    date: new Date('2026-03-05').toISOString(),
    customerName: 'Retail Group',
    type: 'Acquisition',
    percentage: 10,
    amount: 0,
    status: 'Pending',
  },
  {
    date: new Date('2026-02-20').toISOString(),
    customerName: 'Tech Solutions',
    type: 'Acquisition',
    percentage: 10,
    amount: 10000,
    status: 'Pending',
  },
])

/**
 * Accordion active tabs
 */
const activeAccordionTabs = ref<number[]>([])

/**
 * Commission trend data (for chart)
 */
const commissionTrendData = [
  { name: 'March', value: 85000 },
  { name: 'February', value: 62500 },
  { name: 'January', value: 45000 },
  { name: 'December', value: 50000 },
  { name: 'November', value: 35000 },
  { name: 'October', value: 28000 },
]

/**
 * Calculate totals
 */
const totalEarnings = computed(() => {
  return customers.value.reduce((sum, c) => sum + c.totalCommission, 0)
})

const pendingCommission = computed(() => {
  return customers.value.reduce((sum, c) => {
    const pendingAcquisition = c.acquisitionBonus.isPaid ? 0 : c.acquisitionBonus.amount
    return sum + pendingAcquisition
  }, 0)
})

const acquisitionBonusTotal = computed(() => {
  return customers.value.reduce((sum, c) => sum + c.acquisitionBonus.amount, 0)
})

const renewalIncomeTotal = computed(() => {
  return customers.value.reduce((sum, c) => sum + c.renewalCommission.ytdTotal, 0)
})

/**
 * Format currency
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

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
 * Get accordion header
 */
function getAccordionHeader(customer: CustomerCommission): string {
  return `${customer.name} (${customer.plan}) - ${formatCurrency(customer.totalCommission)}`
}
</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
}

:deep(.p-accordion .p-accordion-header-link) {
  padding: 1rem;
  background: var(--surface-container-high);
  border: 1px solid var(--outline-variant);
}

:deep(.p-accordion .p-accordion-header-link:hover) {
  background: var(--surface-container-highest);
}

:deep(.p-accordion .p-accordion-content) {
  padding: 1.5rem;
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
:deep(.p-accordion .p-accordion-header-link:focus) {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

:deep(.p-datatable a:focus) {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
</style>
