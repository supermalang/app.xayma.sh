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
      <transition-group
        name="stat-card-stagger"
        tag="div"
        class="contents"
      >
        <div
          v-for="(card, idx) in statCards"
          :key="card.id"
          :style="{ '--stagger-index': idx }"
        >
          <StatCard
            :label="$t(card.labelKey)"
            :value="stats[card.valueKey]"
            :icon="card.icon"
            :color="card.color"
            :format="card.format"
          />
        </div>
      </transition-group>
    </div>

    <!-- Section 1: Overview Charts -->
    <transition-group
      name="chart-slide-up"
      tag="div"
      class="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      <!-- Deployments Over Time -->
      <LineChart
        key="deployments-trend"
        :title="$t('dashboard.deployments_trend')"
        :data="deploymentsTrend"
        :is-loading="isLoading"
      />

      <!-- Credit Deducted by Plan -->
      <BarChart
        key="credit-deduction"
        :title="$t('dashboard.credit_deduction_by_plan')"
        :categories="planCategories"
        :series="creditDeductionSeries"
        :is-loading="isLoading"
      />
    </transition-group>

    <!-- Section 2: Breakdown Charts -->
    <transition-group
      name="chart-slide-up"
      tag="div"
      class="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      <!-- Deployment Status Distribution -->
      <DonutChart
        key="status-distribution"
        :title="$t('dashboard.deployment_status_distribution')"
        :data="deploymentStatusData"
        :is-loading="isLoadingInsights"
      />

      <!-- Top 5 Partners by Deployments -->
      <BarChart
        key="top-partners"
        :title="$t('dashboard.top_partners_deployments')"
        :categories="topPartnersCategories"
        :series="topPartnersSeries"
        :is-loading="isLoadingInsights"
      />

      <!-- Service Popularity -->
      <BarChart
        key="service-popularity"
        :title="$t('dashboard.service_popularity')"
        :categories="serviceCategories"
        :series="serviceSeries"
        :is-loading="isLoadingInsights"
      />
    </transition-group>

    <!-- Section 3: Revenue Analytics -->
    <transition name="chart-slide-up">
      <div key="revenue-section">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Monthly Revenue Trend -->
          <LineChart
            :title="$t('dashboard.monthly_revenue_trend')"
            :data="monthlyRevenueChartData"
            :is-loading="isLoadingInsights"
          />

          <!-- Revenue by Partner Type -->
          <DonutChart
            :title="$t('dashboard.revenue_by_partner_type')"
            :data="revenueByPartnerType"
            :is-loading="isLoading"
          />
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import StatCard from '@/components/charts/StatCard.vue'
import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import { useAdminDashboard } from '@/composables/useAdminDashboard'
import { useAdminInsights } from '@/composables/useAdminInsights'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { stats, deploymentsTrend, creditsByPlan, revenueByPartnerType, isLoading } = useAdminDashboard()
const { statusDistribution, topPartners, serviceStats, monthlyRevenue, isLoading: isLoadingInsights } = useAdminInsights()

interface StatCardConfig {
  id: string
  labelKey: string
  valueKey: keyof typeof stats.value
  icon: string
  color: 'primary' | 'secondary' | 'tertiary' | 'error'
  format: 'number' | 'currency' | 'percent'
}

const statCards: StatCardConfig[] = [
  {
    id: 'total-partners',
    labelKey: 'dashboard.total_partners',
    valueKey: 'totalPartners',
    icon: 'pi pi-users',
    color: 'primary',
    format: 'number',
  },
  {
    id: 'active-deployments',
    labelKey: 'dashboard.active_deployments',
    valueKey: 'activeDeployments',
    icon: 'pi pi-server',
    color: 'tertiary',
    format: 'number',
  },
  {
    id: 'revenue-today',
    labelKey: 'dashboard.revenue_today',
    valueKey: 'revenueTodayFCFA',
    icon: 'pi pi-wallet',
    color: 'secondary',
    format: 'currency',
  },
  {
    id: 'failed-deployments',
    labelKey: 'dashboard.failed_deployments',
    valueKey: 'failedDeployments',
    icon: 'pi pi-times-circle',
    color: 'error',
    format: 'number',
  },
]

const planCategories = computed(() => creditsByPlan.value.map(p => p.name))
const creditDeductionSeries = computed(() => [
  {
    name: t('dashboard.credit_deduction_by_plan'),
    data: creditsByPlan.value.map(p => p.value),
    color: '#00288e',
  },
])

const deploymentStatusData = computed(() =>
  statusDistribution.value.map(s => ({
    name: `${s.status} (${s.count})`,
    value: s.count,
  }))
)

const topPartnersCategories = computed(() =>
  topPartners.value.map(p => p.partner_name)
)

const topPartnersSeries = computed(() => [
  {
    name: t('dashboard.deployments'),
    data: topPartners.value.map(p => p.deployment_count),
    color: '#667eea',
  },
])

const serviceCategories = computed(() =>
  serviceStats.value.map(s => s.service_name)
)

const serviceSeries = computed(() => [
  {
    name: t('dashboard.deployments'),
    data: serviceStats.value.map(s => s.count),
    color: '#48bb78',
  },
])

const monthlyRevenueChartData = computed(() =>
  monthlyRevenue.value.map(m => ({
    name: m.month,
    value: m.revenue,
  }))
)

</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
}

/* Stat Card Stagger Animation
 * Sequentially fade in cards (left to right) with 80ms stagger
 * Creates scanning effect that guides visual flow
 */
.stat-card-stagger-enter-active {
  animation: stat-card-fade var(--duration-standard) var(--easing-standard) backwards;
  animation-delay: calc(var(--stagger-index, 0) * 80ms);
}

.chart-slide-up-enter-active {
  animation: chart-enter var(--duration-standard) var(--easing-standard);
}

.chart-slide-up-leave-active {
  animation: chart-enter var(--duration-standard) var(--easing-standard) reverse;
}


:deep(.trend-positive) {
  animation: pulse-trend 2s var(--easing-pulse) infinite;
}
</style>
