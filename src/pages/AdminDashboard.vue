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

    <!-- Charts Grid -->
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
      />

      <!-- Credit Deducted by Plan -->
      <BarChart
        key="credit-deduction"
        :title="$t('dashboard.credit_deduction_by_plan')"
        :categories="planCategories"
        :series="creditDeductionSeries"
      />
    </transition-group>

    <!-- Revenue by Partner Type -->
    <transition name="chart-slide-up">
      <div key="revenue-chart">
        <DonutChart
          :title="$t('dashboard.revenue_by_partner_type')"
          :data="revenueByPartnerType"
        />
      </div>
    </transition>

    <!-- Deployment Status Distribution -->
    <transition name="chart-slide-up">
      <div key="status-distribution">
        <DonutChart
          :title="$t('dashboard.deployment_status_distribution')"
          :data="deploymentStatusData"
        />
      </div>
    </transition>

    <!-- Kafka Metrics (Optional) -->
    <transition name="fade-slide-up">
      <Card key="kafka-metrics">
        <template #header>
          <div class="p-4">
            <h3 class="text-base font-semibold text-on-surface">
              {{ $t('dashboard.kafka_metrics') }}
              <span class="text-xs font-normal text-on-surface-variant ms-2">{{ $t('dashboard.kafka_indicative') }}</span>
            </h3>
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <transition-group
            name="kafka-metric-fade"
            tag="div"
            class="contents"
          >
            <div
              key="consumer-lag"
              class="text-center p-4 bg-surface-container-lowest rounded-md kafka-metric"
            >
              <p class="text-sm text-on-surface-variant mb-2">{{ $t('dashboard.consumer_lag') }}</p>
              <p class="text-3xl font-bold text-on-surface font-mono">{{ kafkaMetrics.consumerLag }}</p>
              <p class="text-xs text-on-surface-variant mt-2">ms</p>
            </div>
            <div
              key="messages-processed"
              class="text-center p-4 bg-surface-container-lowest rounded-md kafka-metric"
            >
              <p class="text-sm text-on-surface-variant mb-2">{{ $t('dashboard.messages_processed') }}</p>
              <p class="text-3xl font-bold text-on-surface font-mono">{{ formatNumber(kafkaMetrics.messagesProcessed) }}</p>
            </div>
            <div
              key="failed-events"
              class="text-center p-4 bg-surface-container-lowest rounded-md kafka-metric"
            >
              <p class="text-sm text-on-surface-variant mb-2">{{ $t('dashboard.failed_events') }}</p>
              <p class="text-3xl font-bold text-error font-mono">{{ kafkaMetrics.failedEvents }}</p>
            </div>
          </transition-group>
        </div>
      </Card>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from 'primevue/card'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import StatCard from '@/components/charts/StatCard.vue'
import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import { useAdminDashboard } from '@/composables/useAdminDashboard'
import { useAdminInsights } from '@/composables/useAdminInsights'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { stats, deploymentsTrend, creditsByPlan, revenueByPartnerType } = useAdminDashboard()
const { statusDistribution } = useAdminInsights()

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

const kafkaMetrics = { consumerLag: '—', messagesProcessed: '—', failedEvents: '—' }

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

function formatNumber(value: string): string {
  return value
}
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

.fade-slide-up-enter-active {
  animation: fade-slide var(--duration-slow) var(--easing-standard);
}

.fade-slide-up-leave-active {
  animation: fade-slide var(--duration-slow) var(--easing-standard) reverse;
}

.kafka-metric-fade-enter-active {
  animation: kafka-metric-fade var(--duration-standard) var(--easing-standard) backwards;
}

.kafka-metric:nth-child(1) {
  animation-delay: 0ms;
}

.kafka-metric:nth-child(2) {
  animation-delay: 60ms;
}

.kafka-metric:nth-child(3) {
  animation-delay: 120ms;
}

:deep(.trend-positive) {
  animation: pulse-trend 2s var(--easing-pulse) infinite;
}
</style>
