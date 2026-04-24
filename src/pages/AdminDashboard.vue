<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader
      :title="$t('dashboard.admin_title')"
      :description="$t('dashboard.admin_description')"
      icon="pi-chart-bar"
    />

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        :label="$t('dashboard.total_partners')"
        :value="stats.totalPartners"
        icon="pi pi-users"
        color="primary"
        format="number"
      />
      <StatCard
        :label="$t('dashboard.active_deployments')"
        :value="stats.activeDeployments"
        icon="pi pi-server"
        color="tertiary"
        format="number"
        :trend="stats.deploymentsTrend"
      />
      <StatCard
        :label="$t('dashboard.revenue_today')"
        :value="stats.revenueTodayUSD"
        icon="pi pi-dollar"
        color="secondary"
        format="currency"
      />
      <StatCard
        :label="$t('dashboard.failed_deployments')"
        :value="stats.failedDeployments"
        icon="pi pi-times-circle"
        color="error"
        format="number"
      />
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Deployments Over Time -->
      <LineChart
        :title="$t('dashboard.deployments_trend')"
        :data="deploymentsTrendData"
      />

      <!-- Credit Deducted by Plan -->
      <BarChart
        :title="$t('dashboard.credit_deduction_by_plan')"
        :categories="planCategories"
        :series="creditDeductionSeries"
      />
    </div>

    <!-- Revenue by Partner Type -->
    <div>
      <DonutChart
        :title="$t('dashboard.revenue_by_partner_type')"
        :data="revenueByPartnerType"
      />
    </div>

    <!-- Kafka Metrics (Optional) -->
    <Card>
      <template #header>
        <div class="p-4">
          <h3 class="text-base font-semibold text-on-surface">{{ $t('dashboard.kafka_metrics') }}</h3>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="text-center p-4 bg-surface-container-lowest rounded-md">
          <p class="text-sm text-on-surface-variant mb-2">{{ $t('dashboard.consumer_lag') }}</p>
          <p class="text-3xl font-bold text-on-surface font-mono">{{ kafkaMetrics.consumerLag }}</p>
          <p class="text-xs text-on-surface-variant mt-2">ms</p>
        </div>
        <div class="text-center p-4 bg-surface-container-lowest rounded-md">
          <p class="text-sm text-on-surface-variant mb-2">{{ $t('dashboard.messages_processed') }}</p>
          <p class="text-3xl font-bold text-on-surface font-mono">{{ formatNumber(kafkaMetrics.messagesProcessed) }}</p>
        </div>
        <div class="text-center p-4 bg-surface-container-lowest rounded-md">
          <p class="text-sm text-on-surface-variant mb-2">{{ $t('dashboard.failed_events') }}</p>
          <p class="text-3xl font-bold text-error font-mono">{{ kafkaMetrics.failedEvents }}</p>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import Card from 'primevue/card'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import StatCard from '@/components/charts/StatCard.vue'
import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'

/**
 * Dashboard statistics (would be fetched from API)
 */
const stats = reactive({
  totalPartners: 42,
  activeDeployments: 156,
  revenueTodayUSD: 12400,
  failedDeployments: 3,
  deploymentsTrend: 8,
})

/**
 * Kafka metrics
 */
const kafkaMetrics = reactive({
  consumerLag: 245,
  messagesProcessed: 18750,
  failedEvents: 2,
})

/**
 * Chart data: Deployments trend
 */
const deploymentsTrendData = [
  { name: 'Mon', value: 140 },
  { name: 'Tue', value: 145 },
  { name: 'Wed', value: 150 },
  { name: 'Thu', value: 152 },
  { name: 'Fri', value: 155 },
  { name: 'Sat', value: 156 },
  { name: 'Sun', value: 156 },
]

/**
 * Chart data: Credit deduction by plan
 */
const planCategories = ['Starter', 'Pro', 'Enterprise', 'Reseller']
const creditDeductionSeries = [
  {
    name: 'Credits Deducted (24h)',
    data: [2400, 4800, 12000, 8600],
    color: '#00288e',
  },
]

/**
 * Chart data: Revenue by partner type
 */
const revenueByPartnerType = [
  { name: 'Customers', value: 58 },
  { name: 'Resellers', value: 32 },
  { name: 'Sales Partners', value: 10 },
]

/**
 * Format number with thousands separator
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

// In production, fetch from API
onMounted(() => {
  // await fetchAdminDashboardData()
})
</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
}
</style>
