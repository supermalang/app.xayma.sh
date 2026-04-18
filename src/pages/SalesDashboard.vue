<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader
      :title="$t('dashboard.sales_title')"
      :description="$t('dashboard.sales_description')"
      icon="pi-chart-line"
    />

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        :label="$t('dashboard.portfolio_size')"
        :value="portfolioStats.portfolioSize"
        icon="pi pi-briefcase"
        color="primary"
        format="number"
      />
      <StatCard
        :label="$t('dashboard.new_customers_this_month')"
        :value="portfolioStats.newCustomersThisMonth"
        icon="pi pi-user-plus"
        color="tertiary"
        format="number"
        :trend="portfolioStats.customerGrowthTrend"
      />
      <StatCard
        :label="$t('dashboard.pending_commission')"
        :value="portfolioStats.pendingCommission"
        icon="pi pi-wallet"
        color="secondary"
        format="currency"
      />
      <StatCard
        :label="$t('dashboard.at_risk_count')"
        :value="portfolioStats.atRiskCount"
        icon="pi pi-alert-circle"
        color="error"
        format="number"
      />
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <router-link
        to="/portfolio"
        class="p-6 bg-primary text-white rounded-md hover:bg-primary-container transition-colors text-center"
      >
        <i class="pi pi-briefcase text-2xl mb-2 block" />
        <h3 class="font-semibold">{{ $t('dashboard.view_portfolio') }}</h3>
        <p class="text-sm opacity-90 mt-1">{{ portfolioStats.portfolioSize }} customers</p>
      </router-link>

      <router-link
        to="/commissions"
        class="p-6 bg-secondary text-white rounded-md hover:bg-secondary-container transition-colors text-center"
      >
        <i class="pi pi-money-bill text-2xl mb-2 block" />
        <h3 class="font-semibold">{{ $t('dashboard.view_commissions') }}</h3>
        <p class="text-sm opacity-90 mt-1">{{ formatCurrency(portfolioStats.totalEarnings) }}</p>
      </router-link>
    </div>

    <!-- At-Risk Customers Table -->
    <Card>
      <template #header>
        <div class="p-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-on-surface flex items-center gap-2">
            <i class="pi pi-alert-circle text-error" />
            {{ $t('dashboard.at_risk_customers') }}
          </h3>
          <span class="text-xs font-semibold px-2 py-1 bg-error-container text-error rounded-full">
            {{ atRiskCustomers.length }}
          </span>
        </div>
      </template>

      <DataTable v-if="atRiskCustomers.length > 0" :value="atRiskCustomers" striped-rows responsive-layout="stack" :paginator="atRiskCustomers.length > 5" :rows="5" class="text-sm">
        <Column field="partnerName" :header="$t('dashboard.customer_name')" />
        <Column field="plan" :header="$t('dashboard.plan')">
          <template #body="slotProps">
            <Tag :value="slotProps.data.plan" class="text-xs" />
          </template>
        </Column>
        <Column field="creditStatus" :header="$t('dashboard.credit_status')">
          <template #body="slotProps">
            <Tag
              :value="slotProps.data.creditStatus"
              :severity="slotProps.data.creditStatus === 'LOW' ? 'warning' : 'danger'"
              class="text-xs"
            />
          </template>
        </Column>
        <Column field="nextRenewal" :header="$t('dashboard.next_renewal')">
          <template #body="slotProps">
            <span class="font-mono text-xs">{{ formatDate(slotProps.data.nextRenewal) }}</span>
          </template>
        </Column>
        <Column :header="$t('common.actions')">
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
        <i class="pi pi-check-circle text-3xl mb-2 block opacity-75 text-tertiary" />
        <p class="text-sm">{{ $t('dashboard.no_at_risk_customers') }}</p>
      </div>
    </Card>

    <!-- Commission Breakdown Chart -->
    <DonutChart
      :title="$t('dashboard.commission_breakdown')"
      :data="commissionBreakdown"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import StatCard from '@/components/charts/StatCard.vue'
import DonutChart from '@/components/charts/DonutChart.vue'

/**
 * Portfolio statistics
 */
const portfolioStats = ref({
  portfolioSize: 24,
  newCustomersThisMonth: 3,
  customerGrowthTrend: 12,
  pendingCommission: 8400,
  totalEarnings: 45600,
  atRiskCount: 2,
})

/**
 * At-risk customers
 */
const atRiskCustomers = ref([
  {
    partnerId: '1',
    partnerName: 'Logistics Plus',
    plan: 'Enterprise',
    creditStatus: 'CRITICAL',
    nextRenewal: new Date('2026-04-15').toISOString(),
  },
  {
    partnerId: '2',
    partnerName: 'Fashion Hub',
    plan: 'Pro',
    creditStatus: 'LOW',
    nextRenewal: new Date('2026-04-20').toISOString(),
  },
])

/**
 * Commission breakdown
 */
const commissionBreakdown = [
  { name: 'Acquisition Bonus', value: 12800 },
  { name: 'Renewal Commissions', value: 24600 },
  { name: 'Pending (This Month)', value: 8400 },
]

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

// In production, fetch from API
onMounted(() => {
  // await fetchSalesDashboardData()
})
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
</style>
