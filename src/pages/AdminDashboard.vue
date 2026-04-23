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
      />
      <StatCard
        :label="$t('dashboard.revenue_today')"
        :value="stats.revenueTodayFCFA"
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
    <div class="lg:col-span-2">
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
import { reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import StatCard from '@/components/charts/StatCard.vue'
import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import { supabaseSchema } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'

// supabaseSchema resolves to `never` when Database has no public schema — cast once here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseSchema as any

const { t, locale } = useI18n()

const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#00288e'
const notificationStore = useNotificationStore()

/**
 * Dashboard statistics (fetched from Supabase)
 */
const stats = reactive({
  totalPartners: 0,
  activeDeployments: 0,
  revenueTodayFCFA: 0,
  failedDeployments: 0,
})

/**
 * Kafka metrics — static placeholder (no Kafka metrics table in schema)
 */
const kafkaMetrics = reactive({
  consumerLag: 0,
  messagesProcessed: 0,
  failedEvents: 0,
})

/**
 * Chart data: Deployments trend (last 7 days)
 */
const deploymentsTrendData = ref<{ name: string; value: number }[]>([])

/**
 * Chart data: Credit deduction by plan (active deployments × monthly credits)
 */
const planCategories = ref<string[]>([])
const creditDeductionSeries = ref<{ name: string; data: number[]; color: string }[]>([])

/**
 * Chart data: Revenue by partner type
 */
const revenueByPartnerType = ref<{ name: string; value: number }[]>([])

/**
 * Format number with thousands separator
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Build a ISO date string for the start of today (UTC)
 */
function todayUTCStart(): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

/**
 * Return the ISO date string for N days ago (UTC midnight)
 */
function daysAgoUTC(n: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

/**
 * Load all dashboard data in parallel query groups
 */
async function loadDashboardData() {
  // Group 1: scalar counts and revenue (parallel)
  const [partnersResult, activeDeployResult, failedDeployResult, revenueResult] =
    await Promise.all([
      db.from('partners').select('id', { count: 'exact', head: true }),
      db.from('deployments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('deployments').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      db.from('credit_transactions')
        .select('amountPaid')
        .eq('status', 'completed')
        .eq('transactionType', 'credit')
        .gte('created', todayUTCStart()),
    ])

  if (partnersResult.error || activeDeployResult.error || failedDeployResult.error || revenueResult.error) {
    notificationStore.addError(t('errors.fetch_failed'))
    return
  }

  stats.totalPartners = partnersResult.count ?? 0
  stats.activeDeployments = activeDeployResult.count ?? 0
  stats.failedDeployments = failedDeployResult.count ?? 0
  stats.revenueTodayFCFA = (revenueResult.data ?? []).reduce(
    (sum: number, row: { amountPaid: number | null }) => sum + (row.amountPaid ?? 0),
    0
  )

  // Group 2: deployments created in last 7 days (for trend line)
  const sevenDaysAgo = daysAgoUTC(6)
  const deploymentsResult = await db.from('deployments').select('created').gte('created', sevenDaysAgo)

  if (!deploymentsResult.error && deploymentsResult.data) {
    const dayMap = new Map()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - i)
      dayMap.set(d.toLocaleDateString(locale.value, { weekday: 'short' }), 0)
    }
    for (const row of deploymentsResult.data) {
      const label = new Date(row.created).toLocaleDateString(locale.value, { weekday: 'short' })
      if (dayMap.has(label)) dayMap.set(label, dayMap.get(label) + 1)
    }
    deploymentsTrendData.value = Array.from(dayMap.entries()).map(([name, value]) => ({ name, value }))
  } else {
    notificationStore.addError(t('errors.fetch_failed'))
  }

  // Group 3: active deployments with plan for credit deduction chart
  const plansResult = await db
    .from('deployments')
    .select('deploymentPlan, serviceplans(label, monthlyCreditConsumption)')
    .eq('status', 'active')

  if (!plansResult.error && plansResult.data) {
    const planTotals = new Map()
    for (const row of plansResult.data) {
      const plan = row.serviceplans
      if (!plan) continue
      planTotals.set(plan.label, (planTotals.get(plan.label) ?? 0) + plan.monthlyCreditConsumption)
    }
    planCategories.value = Array.from(planTotals.keys())
    creditDeductionSeries.value = [
      { name: t('dashboard.monthly_credits_by_plan'), data: Array.from(planTotals.values()), color: primaryColor },
    ]
  } else {
    notificationStore.addError(t('errors.fetch_failed'))
  }

  // Group 4: revenue by partner type
  const revenueByTypeResult = await db
    .from('credit_transactions')
    .select('amountPaid, partners(partner_type)')
    .eq('status', 'completed')
    .eq('transactionType', 'credit')

  if (!revenueByTypeResult.error && revenueByTypeResult.data) {
    const typeMap = new Map()
    for (const row of revenueByTypeResult.data) {
      const ptype = row.partners?.partner_type ?? 'unknown'
      typeMap.set(ptype, (typeMap.get(ptype) ?? 0) + (row.amountPaid ?? 0))
    }
    revenueByPartnerType.value = Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }))
  } else {
    notificationStore.addError(t('errors.fetch_failed'))
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
}
</style>
