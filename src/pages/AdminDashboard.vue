<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader
      :title="t('dashboard.admin_title')"
      :description="t('dashboard.admin_description')"
      icon="pi-chart-bar"
    />

    <!-- Section 1: System Health Bar -->
    <div class="rounded-lg bg-surface-container p-4 flex flex-wrap items-center gap-6">
      <span class="text-sm font-semibold text-on-surface-variant uppercase tracking-wide me-4">
        {{ t('dashboard.system_health_title') }}
      </span>
      <div
        v-for="service in ['Workflow Engine', 'Deployment Engine', 'Control Database']"
        :key="service"
        class="flex items-center gap-2"
      >
        <Skeleton width="8rem" height="1.5rem" border-radius="1rem" />
      </div>
    </div>

    <!-- Section 2: Financial Ledger -->
    <div>
      <h3 class="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
        {{ t('dashboard.financial_ledger_title') }}
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Global Credits Used -->
        <Card>
          <template #content>
            <div v-if="isLoading" class="space-y-2">
              <Skeleton height="1rem" width="60%" />
              <Skeleton height="2.5rem" />
            </div>
            <div v-else>
              <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                {{ t('dashboard.global_credits_used') }}
              </p>
              <p class="text-3xl font-bold text-on-surface">{{ formatLargeNumber(globalCreditsUsed) }}</p>
              <p class="text-xs text-on-surface-variant mt-1">{{ t('dashboard.credits_unit') }}</p>
            </div>
          </template>
        </Card>

        <!-- Budget Today -->
        <Card>
          <template #content>
            <div v-if="isLoading" class="space-y-2">
              <Skeleton height="1rem" width="60%" />
              <Skeleton height="2.5rem" />
            </div>
            <div v-else>
              <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                {{ t('dashboard.budget_today_credits') }}
              </p>
              <p class="text-3xl font-bold text-on-surface">{{ formatLargeNumber(stats.revenueTodayFCFA) }}</p>
              <p class="text-xs text-on-surface-variant mt-1">{{ formatCurrency(stats.revenueTodayFCFA) }}</p>
            </div>
          </template>
        </Card>

        <!-- Monthly Intake -->
        <Card>
          <template #content>
            <div v-if="isLoading" class="space-y-2">
              <Skeleton height="1rem" width="60%" />
              <Skeleton height="2.5rem" />
            </div>
            <div v-else>
              <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                {{ t('dashboard.monthly_intake') }}
              </p>
              <p class="text-3xl font-bold text-on-surface">{{ formatLargeNumber(monthlyIntakeCredits) }}</p>
              <p class="text-xs text-on-surface-variant mt-1">{{ formatCurrency(monthlyIntakeFCFA) }}</p>
            </div>
          </template>
        </Card>

        <!-- Monthly Forecast (skeleton placeholder) -->
        <Card>
          <template #content>
            <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
              {{ t('dashboard.monthly_forecast') }}
            </p>
            <Skeleton height="4rem" />
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
              <p class="text-5xl font-bold text-on-surface mb-3">{{ stats.activeDeployments }}</p>
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
            <Skeleton height="4rem" />
          </div>
        </template>
      </Card>

      <!-- Right: Partners (1/3) -->
      <Card>
        <template #content>
          <div v-if="isLoading">
            <Skeleton height="3rem" class="mb-2" />
            <Skeleton height="1rem" width="60%" class="mb-4" />
            <Skeleton height="2rem" />
          </div>
          <div v-else>
            <p class="text-5xl font-bold text-on-surface mb-1">{{ stats.totalPartners }}</p>
            <p class="text-xs text-on-surface-variant mb-4">{{ t('dashboard.active_partners') }}</p>
            <Button
              :label="t('dashboard.view_partner_directory')"
              outlined
              class="w-full mb-6"
              @click="router.push('/partners')"
            />
          </div>

          <!-- Partner Distribution -->
          <div>
            <p class="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              {{ t('dashboard.partner_distribution_title') }}
            </p>
            <p class="text-sm text-on-surface-variant">
              {{ t('dashboard.partner_distribution_unavailable') }}
            </p>
          </div>
        </template>
      </Card>
    </div>

    <!-- Section 4: System Event Log -->
    <div>
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
          class="flex items-center gap-3 p-3 bg-surface-container-low rounded-md text-sm"
        >
          <i :class="activityIcon(entry.action)" class="text-on-surface-variant" />
          <span class="flex-1 text-on-surface">{{ entry.description ?? entry.table_name ?? '—' }}</span>
          <Tag :value="entry.action ?? '—'" severity="secondary" />
          <span class="text-xs text-on-surface-variant font-mono">{{ formatRelativeTime(entry.created) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
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
} = useAdminDashboard()

// Activity log — all companies (companyId = null), last 10 entries
const { auditEntries, isLoading: activityLoading } = useActivityLog(null, 10)

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

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
}
</style>
