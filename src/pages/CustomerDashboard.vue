<template>
  <div class="relative space-y-6">
    <RefreshingBadge :visible="isRefreshing" />
    <!-- Page Header -->
    <AppPageHeader
      :title="partnerProfile?.name ?? t('dashboard.customer_title')"
      :description="t('dashboard.partner_overview_subtitle')"
    />

    <!-- Row 1: 3-column summary cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Credit Balance Card -->
      <Card>
        <template #content>
          <div v-if="isLoading" class="space-y-3">
            <Skeleton height="1.25rem" width="60%" />
            <Skeleton height="2.5rem" />
            <Skeleton height="1rem" />
            <Skeleton height="1rem" />
            <Skeleton height="0.75rem" />
            <Skeleton height="2.5rem" />
          </div>
          <div v-else class="space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                {{ t('dashboard.credit_balance_title') }}
              </p>
              <i class="pi pi-wallet text-primary text-base" />
            </div>
            <p class="text-3xl font-bold text-on-surface font-mono">
              {{ credits?.remainingCredits ?? 0 }} <span class="text-base font-normal">{{ t('dashboard.credits_unit') }}</span>
            </p>
            <div class="text-sm text-on-surface-variant space-y-1">
              <div class="flex justify-between">
                <span>{{ t('dashboard.monthly_usage') }}</span>
                <span class="font-mono font-medium text-on-surface">{{ monthlyUsageCredits }} {{ t('dashboard.credits_unit') }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ t('dashboard.total_cost_this_month') }}</span>
                <span class="font-mono font-medium text-on-surface">{{ formatCurrency(totalCostThisMonthFCFA) }}</span>
              </div>
            </div>
            <ProgressBar
              :value="creditProgressValue"
              :class="['h-2', creditProgressClass]"
            />
            <div class="flex justify-between text-xs font-mono text-on-surface-variant mt-1">
              <span>STATUS: {{ credits?.remainingCredits ?? 0 }}</span>
              <span>ALERT AT {{ partnerProfile?.creditDebtThreshold ?? 25 }}</span>
            </div>
            <Button
              :label="t('dashboard.top_up_credits')"
              icon="pi pi-wallet"
              class="w-full"
              @click="navigateToTopUp"
            />
          </div>
        </template>
      </Card>

      <!-- Infrastructure Card -->
      <Card>
        <template #content>
          <div v-if="isLoading" class="space-y-3">
            <Skeleton height="1.25rem" width="60%" />
            <Skeleton height="2.5rem" />
            <Skeleton height="1rem" />
            <Skeleton height="1rem" />
            <Skeleton height="2.5rem" />
          </div>
          <div v-else class="flex flex-col justify-between h-full">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  {{ t('dashboard.infrastructure_title') }}
                </p>
                <i class="pi pi-server text-secondary-container text-base" />
              </div>
              <p class="text-3xl font-bold text-on-surface font-mono">
                {{ activeDeployments.length }} <span class="text-base font-normal">{{ t('dashboard.active_instances') }}</span>
              </p>
              <div class="text-sm space-y-1">
                <div class="flex items-center gap-2 text-error">
                  <span class="text-xs leading-none">■</span>
                  <span>{{ stoppedSuspendedCount }} {{ t('dashboard.stopped_suspended') }}</span>
                </div>
                <div class="flex items-center gap-2 text-on-surface-variant">
                  <span class="text-xs leading-none">■</span>
                  <span>{{ archivedCount }} {{ t('dashboard.archived_instances') }}</span>
                </div>
              </div>
            </div>
            <Button
              :label="t('dashboard.new_deployment_btn')"
              icon="pi pi-plus"
              class="w-full mt-3"
              severity="secondary"
              @click="router.push('/deployments/new')"
            />
          </div>
        </template>
      </Card>

      <!-- Customer Profile Card -->
      <Card class="flex flex-col h-full">
        <template #content>
          <div v-if="isLoading" class="space-y-3">
            <Skeleton height="1.25rem" width="60%" />
            <Skeleton height="1rem" />
            <Skeleton height="1rem" />
            <Skeleton height="1.5rem" width="40%" />
            <Skeleton height="1rem" />
          </div>
          <div v-else class="flex flex-col justify-between h-full">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  {{ t('dashboard.customer_profile_title') }}
                </p>
                <i class="pi pi-building text-on-surface-variant text-base" />
              </div>
              <div class="text-sm space-y-2">
                <div class="flex justify-between">
                  <span class="text-on-surface-variant">{{ t('dashboard.partner_name_label') }}</span>
                  <span class="font-medium text-on-surface">{{ partnerProfile?.name ?? '—' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-on-surface-variant">{{ t('dashboard.tier_label') }}</span>
                  <span class="font-medium text-on-surface">{{ tierLabel(partnerProfile?.partner_type ?? null) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-on-surface-variant">{{ t('dashboard.status_label') }}</span>
                  <Tag
                    :value="partnerProfile?.status ?? '—'"
                    :severity="partnerStatusSeverity(partnerProfile?.status ?? null)"
                  />
                </div>
              </div>
            </div>
            <div class="flex justify-between items-center pt-3 mt-3 border-t border-outline-variant text-base">
              <span class="text-on-surface-variant">{{ t('dashboard.account_manager_label') }}</span>
              <div class="flex items-center gap-2 text-on-surface font-medium">
                <i class="pi pi-envelope text-on-surface-variant text-sm" />
                <span class="font-mono">m.diallo@xayma.sh</span>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Row 2: Recent Activity Log -->
    <Card class="relative">
      <RefreshingBadge :visible="activityRefreshing" />
      <template #header>
        <div class="p-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-on-surface">{{ t('dashboard.recent_activity_log') }}</h3>
          <router-link
            to="/audit"
            class="text-xs font-medium text-primary hover:underline"
          >
            {{ t('dashboard.view_full_audit_trail') }}
          </router-link>
        </div>
      </template>
      <template #content>
        <div v-if="activityLoading" class="space-y-3">
          <Skeleton v-for="n in 3" :key="n" height="2.5rem" />
        </div>
        <div
          v-else-if="auditEntries.length === 0"
          class="text-center py-8 text-on-surface-variant text-sm"
        >
          {{ t('dashboard.no_activity') }}
        </div>
        <ul v-else class="divide-y divide-outline-variant">
          <li
            v-for="entry in auditEntries"
            :key="entry.audit_id"
            class="flex items-center gap-3 py-3"
          >
            <i :class="[activityIcon(entry.action), activityIconColor(entry.action), 'text-lg flex-shrink-0']" />
            <div class="flex-1 min-w-0">
              <p class="text-sm text-on-surface truncate">{{ entry.description ?? entry.table_name ?? '—' }}</p>
              <p class="text-xs text-on-surface-variant font-mono mt-0.5">{{ formatAbsoluteTime(entry.created) }}</p>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <Tag
                v-if="entry.action"
                :value="entry.action"
                :severity="activityTagSeverity(entry.action)"
                class="text-xs"
              />
              <span class="text-xs text-on-surface-variant font-mono">{{ formatRelativeTime(entry.created) }}</span>
            </div>
          </li>
        </ul>
      </template>
    </Card>

    <!-- Row 3: Credit Usage Over Time -->
    <Card>
      <template #header>
        <div class="p-4 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-on-surface">{{ t('dashboard.credit_usage_over_time') }}</h3>
            <p class="text-xs text-on-surface-variant mt-0.5">Historical data of credit consumption across all instances.</p>
          </div>
          <div class="flex gap-2">
            <Button
              v-for="period in (['HOUR', 'DAY', 'WEEK', 'MONTH'] as const)"
              :key="period"
              :label="period"
              size="small"
              :severity="activePeriod === period ? undefined : 'secondary'"
              :text="activePeriod !== period"
              @click="activePeriod = period as 'HOUR' | 'DAY' | 'WEEK' | 'MONTH'"
            />
          </div>
        </div>
      </template>
      <template #content>
        <LineChart
          :title="''"
          :data="monthlyConsumption"
          :is-loading="isLoading"
        />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import Skeleton from 'primevue/skeleton'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import LineChart from '@/components/charts/LineChart.vue'
import RefreshingBadge from '@/components/RefreshingBadge.vue'
import { usePartnerCredits } from '@/composables/usePartnerCredits'
import { useCustomerDashboard } from '@/composables/useCustomerDashboard'
import { useActivityLog } from '@/composables/useActivityLog'
import { useAuthStore } from '@/stores/auth.store'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const partnerId = computed(() => String(authStore.profile?.company_id ?? ''))

const { credits, refresh: refreshCredits } = usePartnerCredits(partnerId)

const {
  activeDeployments,
  monthlyConsumption,
  stoppedSuspendedCount,
  archivedCount,
  monthlyUsageCredits,
  totalCostThisMonthFCFA,
  partnerProfile,
  isLoading,
  isRefreshing,
} = useCustomerDashboard()

const { auditEntries, isLoading: activityLoading, isRefreshing: activityRefreshing, refresh: refreshActivity } = useActivityLog(partnerId, 5)

watch(() => authStore.profile?.company_id, (id) => {
  if (id) {
    refreshCredits()
    refreshActivity()
  }
})

const activePeriod = ref<'HOUR' | 'DAY' | 'WEEK' | 'MONTH'>('MONTH')

function tierLabel(partnerType: string | null): string {
  const map: Record<string, string> = {
    customer: t('dashboard.tier_customer'),
    affiliate: t('dashboard.tier_affiliate'),
    reseller: t('dashboard.tier_reseller'),
    pro_reseller: t('dashboard.tier_pro_reseller'),
  }
  return map[partnerType ?? ''] ?? '—'
}

function partnerStatusSeverity(status: string | null): string {
  const map: Record<string, string> = {
    active: 'success',
    verified: 'success',
    disabled: 'danger',
    low_credit: 'warn',
    no_credit: 'danger',
    on_debt: 'danger',
    suspended: 'danger',
    archived: 'secondary',
    pending_deletion: 'warn',
  }
  return map[status ?? ''] ?? 'secondary'
}

const creditProgressValue = computed(() => {
  const remaining = credits.value?.remainingCredits ?? 0
  const threshold = partnerProfile.value?.creditDebtThreshold ?? 1000
  return Math.min(100, Math.round((remaining / threshold) * 100))
})

const creditProgressClass = computed(() => {
  const v = creditProgressValue.value
  if (v >= 80) return 'meter-healthy'
  if (v >= 20) return 'meter-warning'
  return 'meter-critical'
})

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value)
}

function navigateToTopUp() {
  router.push('/credits/buy')
}

function formatAbsoluteTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toISOString().slice(0, 16).replace('T', ' ')
}
</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
}

/* Summary row cards: stretch body/content so inner flex layouts reach full height */
.grid :deep(.p-card-body),
.grid :deep(.p-card-content) {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
}

/* Customer Profile card: stretch the card itself */
.flex.flex-col.h-full {
  height: 100%;
}

/* Credit balance traffic-light progress bar */
:deep(.meter-healthy .p-progressbar-value) {
  background-color: var(--tertiary);
}
:deep(.meter-warning .p-progressbar-value) {
  background-color: var(--secondary-container);
}
:deep(.meter-critical .p-progressbar-value) {
  background-color: var(--error);
}
</style>
