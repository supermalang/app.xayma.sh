<template>
  <div class="relative space-y-6">
    <RefreshingBadge :visible="isRefreshing" />
    <!-- Header -->
    <AppPageHeader
      :title="t('dashboard.admin_title')"
      :description="t('dashboard.admin_description')"
    />

    <!-- Section 1: System Health Bar -->
    <div class="rounded-lg bg-surface-container p-4 flex flex-wrap items-center gap-3">
      <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide me-2">
        {{ t('dashboard.system_health_title') }}
      </span>
      <Tag
        v-for="service in healthServices"
        :key="service"
        severity="success"
        class="health-badge"
      >
        <template #default>
          <span class="inline-flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            {{ service }}
          </span>
        </template>
      </Tag>
    </div>

    <!-- Section 2: Financial Ledger -->
    <div>
      <h3 class="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
        {{ t('dashboard.financial_ledger_title') }}
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Global Credits Used -->
        <Card class="stat-card">
          <template #content>
            <div v-if="isLoading" class="space-y-2">
              <Skeleton height="1rem" width="60%" />
              <Skeleton height="2.5rem" />
            </div>
            <div v-else class="flex flex-col h-full">
              <div class="flex items-start justify-between mb-1">
                <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  {{ t('dashboard.global_credits_used') }}
                </p>
                <i class="pi pi-chart-pie text-primary text-base" />
              </div>
              <p class="text-3xl font-bold text-on-surface font-mono">{{ formatLargeNumber(globalCreditsUsed) }}</p>
              <p class="text-xs text-on-surface-variant mt-1">{{ t('dashboard.credits_unit') }}</p>
              <p class="flex-1 flex items-center text-xs text-on-surface-variant mt-1">70% of Recorded Annual Fee</p>
            </div>
          </template>
        </Card>

        <!-- Budget Today -->
        <Card class="stat-card">
          <template #content>
            <div v-if="isLoading" class="space-y-2">
              <Skeleton height="1rem" width="60%" />
              <Skeleton height="2.5rem" />
            </div>
            <div v-else class="flex flex-col h-full">
              <div class="flex items-start justify-between mb-1">
                <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  {{ t('dashboard.budget_today_credits') }}
                </p>
                <i class="pi pi-shopping-cart text-secondary-container text-base" />
              </div>
              <p class="text-3xl font-bold text-on-surface font-mono">{{ formatLargeNumber(stats.revenueTodayFCFA) }}</p>
              <p class="text-xs text-on-surface-variant mt-1">{{ formatCurrency(stats.revenueTodayFCFA) }}</p>
              <p class="flex-1 flex items-center text-xs text-tertiary mt-2 font-medium">→ +5% vs Yesterday</p>
            </div>
          </template>
        </Card>

        <!-- Monthly Intake -->
        <Card class="stat-card">
          <template #content>
            <div v-if="isLoading" class="space-y-2">
              <Skeleton height="1rem" width="60%" />
              <Skeleton height="2.5rem" />
            </div>
            <div v-else class="flex flex-col h-full">
              <div class="flex items-start justify-between mb-1">
                <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  {{ t('dashboard.monthly_intake') }}
                </p>
                <i class="pi pi-arrow-up-right text-tertiary-container text-base" />
              </div>
              <p class="text-3xl font-bold text-on-surface font-mono">{{ formatLargeNumber(monthlyIntakeCredits) }}</p>
              <p class="text-xs text-on-surface-variant mt-1">{{ formatCurrency(monthlyIntakeFCFA) }}</p>
              <p class="flex-1 flex items-center text-xs text-tertiary mt-2 font-medium">Added More +1000%</p>
            </div>
          </template>
        </Card>

        <!-- Monthly Forecast -->
        <Card class="forecast-card">
          <template #content>
            <p class="text-xs font-semibold text-inverse-on-surface/70 uppercase tracking-wide mb-3">
              {{ t('dashboard.monthly_forecast') }}
            </p>
            <p class="text-2xl font-bold text-inverse-on-surface font-mono">1.5M</p>
            <p class="text-xs text-inverse-on-surface/70 mt-0.5">3,000,000 FCFA</p>
            <div class="mt-3 h-8 flex items-end gap-0.5">
              <div
                v-for="h in [40, 55, 35, 70, 60, 80, 65]"
                :key="h"
                class="flex-1 bg-inverse-on-surface/30 rounded-none"
                :style="{ height: h + '%' }"
              />
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Section 3: Two-column row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left: Infrastructure Capacity (2/3) -->
      <Card class="lg:col-span-2">
        <template #content>
          <h3 class="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-4">
            {{ t('dashboard.infrastructure_capacity_title') }}
          </h3>

          <!-- Instance Saturation -->
          <div class="mb-6">
            <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              {{ t('dashboard.instance_saturation') }}
            </p>
            <div v-if="isLoading">
              <Skeleton height="3rem" class="mb-2" />
            </div>
            <div v-else>
              <p class="text-5xl font-bold text-on-surface mb-3 font-mono">
                {{ stats.activeDeployments }}<span class="text-2xl text-on-surface-variant font-normal">/550</span>
              </p>
              <p class="text-xs text-on-surface-variant mb-3">Active instances across all active nodes</p>
              <div class="flex flex-wrap gap-2">
                <Tag severity="secondary">
                  {{ t('dashboard.archived') }}: {{ archivedDeployments }}
                </Tag>
                <Tag severity="warn">
                  {{ t('dashboard.suspended') }}: {{ suspendedDeployments }}
                </Tag>
                <Tag severity="info">
                  {{ t('dashboard.stopped') }}: {{ stoppedDeployments }}
                </Tag>
              </div>
            </div>
          </div>

          <!-- Cluster Containers -->
          <div>
            <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              {{ t('dashboard.cluster_containers') }}
            </p>
            <p class="text-4xl font-bold text-on-surface font-mono mb-1">1,240</p>
            <p class="text-xs text-on-surface-variant mb-3">
              Utilised across all cluster containers currently in Automatic mode · 94%
            </p>
            <ProgressBar :value="94" severity="warn" class="h-2" />
          </div>
        </template>
      </Card>

      <!-- Right: Partners (1/3) -->
      <Card class="partners-card">
        <template #content>
          <div v-if="isLoading" class="flex flex-col h-full justify-between">
            <div>
              <Skeleton height="3rem" class="mb-2" />
              <Skeleton height="1rem" width="60%" class="mb-4" />
              <Skeleton height="2rem" />
            </div>
            <Skeleton height="5rem" />
          </div>
          <div v-else class="flex flex-col h-full justify-between">
            <div>
              <p class="text-5xl font-bold text-on-surface mb-1">{{ stats.totalPartners }}</p>
              <p class="text-xs text-on-surface-variant mb-4">{{ t('dashboard.active_partners') }}</p>
              <Button
                :label="t('dashboard.view_partner_directory')"
                outlined
                class="w-full"
                @click="router.push('/partners')"
              />
            </div>

            <!-- Partner Distribution -->
            <div>
              <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
                {{ t('dashboard.partner_distribution_title') }}
              </p>
              <div class="space-y-2">
                <div
                  v-for="row in partnerDistributionPlaceholder"
                  :key="row.country"
                  class="flex items-center justify-between text-sm"
                >
                  <span class="text-on-surface-variant">{{ row.country }}</span>
                  <span class="font-mono font-medium text-on-surface">{{ row.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Section 4: System Event Log -->
    <div class="relative">
      <RefreshingBadge :visible="activityRefreshing" />
      <h3 class="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
        {{ t('dashboard.system_event_log_title') }}
      </h3>

      <!-- Loading state -->
      <div v-if="activityLoading" class="space-y-2">
        <Skeleton v-for="i in 3" :key="i" height="2rem" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="auditEntries.length === 0"
        class="text-center py-6 text-on-surface-variant text-sm"
      >
        {{ t('dashboard.no_activity') }}
      </div>

      <!-- Entries -->
      <div v-else class="space-y-2">
        <div
          v-for="entry in auditEntries"
          :key="entry.audit_id"
          class="flex items-start gap-3 p-3 bg-surface-container-low rounded-sm text-sm"
        >
          <i :class="[activityIcon(entry.action), activityIconColor(entry.action), 'mt-0.5 flex-shrink-0']" />
          <div class="flex-1 min-w-0">
            <p class="text-on-surface text-sm leading-snug">{{ entry.description ?? entry.table_name ?? '—' }}</p>
            <p v-if="entry.table_name" class="text-xs text-on-surface-variant mt-0.5 font-mono">
              {{ entry.table_name.toUpperCase() }}
            </p>
          </div>
          <div class="flex flex-col items-end gap-1 flex-shrink-0">
            <Tag :value="entry.action ?? '—'" :severity="activityTagSeverity(entry.action)" class="text-xs" />
            <span class="text-xs text-on-surface-variant font-mono">{{ formatRelativeTime(entry.created) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import ProgressBar from 'primevue/progressbar'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import RefreshingBadge from '@/components/RefreshingBadge.vue'
import { useAdminDashboard } from '@/composables/useAdminDashboard'
import { useActivityLog } from '@/composables/useActivityLog'

const { t } = useI18n()
const router = useRouter()

const {
  stats,
  archivedDeployments,
  suspendedDeployments,
  stoppedDeployments,
  monthlyIntakeCredits,
  monthlyIntakeFCFA,
  globalCreditsUsed,
  isLoading,
  isRefreshing,
} = useAdminDashboard()

// Activity log — all companies (companyId = null), last 10 entries
const { auditEntries, isLoading: activityLoading, isRefreshing: activityRefreshing } = useActivityLog(null, 10)

const partnerDistributionPlaceholder = [
  { country: 'Senegal', count: 85 },
  { country: "Côte d'Ivoire", count: 34 },
  { country: 'Mali', count: 23 },
]

const healthServices = computed(() => [
  t('dashboard.health_workflow_engine'),
  t('dashboard.health_deploy_engine'),
  t('dashboard.health_control_db'),
])

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value)
}

function activityIcon(action: string | null): string {
  if (action === 'INSERT') return 'pi pi-plus-circle'
  if (action === 'UPDATE') return 'pi pi-pencil'
  if (action === 'DELETE') return 'pi pi-trash'
  return 'pi pi-info-circle'
}

function activityIconColor(action: string | null): string {
  if (action === 'INSERT') return 'text-tertiary-container'
  if (action === 'UPDATE') return 'text-primary'
  if (action === 'DELETE') return 'text-error'
  return 'text-on-surface-variant'
}

function activityTagSeverity(action: string | null): string {
  if (action === 'INSERT') return 'success'
  if (action === 'UPDATE') return 'info'
  if (action === 'DELETE') return 'danger'
  return 'secondary'
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return t('dashboard.time_minutes_ago', { n: minutes })
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return t('dashboard.time_hours_ago', { n: hours })
  return t('dashboard.time_days_ago', { n: Math.floor(hours / 24) })
}
</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
}

:deep(.stat-card),
:deep(.stat-card .p-card-body),
:deep(.stat-card .p-card-content) {
  height: 100%;
}

:deep(.stat-card .p-card-body) {
  display: flex;
  flex-direction: column;
}

:deep(.stat-card .p-card-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.forecast-card.p-card) {
  background: var(--inverse-surface);
  border-color: transparent;
}

:deep(.forecast-card .p-card-body),
:deep(.forecast-card .p-card-content) {
  background: transparent;
}

:deep(.partners-card),
:deep(.partners-card .p-card-body),
:deep(.partners-card .p-card-content) {
  height: 100%;
}

:deep(.partners-card .p-card-body) {
  display: flex;
  flex-direction: column;
}

:deep(.partners-card .p-card-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
