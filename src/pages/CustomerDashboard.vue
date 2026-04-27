<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <AppPageHeader
      :title="partnerProfile?.name ?? t('dashboard.customer_title')"
      :description="t('dashboard.partner_overview_subtitle')"
      icon="pi-home"
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
            <p class="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              {{ t('dashboard.credit_balance_title') }}
            </p>
            <p class="text-3xl font-bold text-on-surface font-mono">
              {{ credits?.remainingCredits ?? 0 }} <span class="text-base font-normal">Credits</span>
            </p>
            <div class="text-sm text-on-surface-variant space-y-1">
              <div class="flex justify-between">
                <span>{{ t('dashboard.monthly_usage') }}</span>
                <span class="font-mono font-medium text-on-surface">{{ monthlyUsageCredits }} Credits</span>
              </div>
              <div class="flex justify-between">
                <span>{{ t('dashboard.total_cost_this_month') }}</span>
                <span class="font-mono font-medium text-on-surface">{{ formatCurrency(totalCostThisMonthFCFA) }}</span>
              </div>
            </div>
            <ProgressBar
              :value="creditProgressValue"
              :severity="creditProgressSeverity"
              class="h-2"
            />
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
          <div v-else class="space-y-3">
            <p class="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              {{ t('dashboard.infrastructure_title') }}
            </p>
            <p class="text-3xl font-bold text-on-surface font-mono">
              {{ activeDeployments.length }} <span class="text-base font-normal">{{ t('dashboard.active_instances') }}</span>
            </p>
            <div class="text-sm space-y-1">
              <div class="flex items-center gap-2 text-red-500">
                <span>•</span>
                <span>{{ stoppedSuspendedCount }} {{ t('dashboard.stopped_suspended') }}</span>
              </div>
              <div class="flex items-center gap-2 text-on-surface-variant">
                <span>•</span>
                <span>{{ archivedCount }} {{ t('dashboard.archived_instances') }}</span>
              </div>
            </div>
            <Button
              :label="'+ ' + t('dashboard.new_deployment_btn')"
              icon="pi pi-plus"
              class="w-full"
              severity="secondary"
              @click="router.push('/deployments/new')"
            />
          </div>
        </template>
      </Card>

      <!-- Customer Profile Card -->
      <Card>
        <template #content>
          <div v-if="isLoading" class="space-y-3">
            <Skeleton height="1.25rem" width="60%" />
            <Skeleton height="1rem" />
            <Skeleton height="1rem" />
            <Skeleton height="1.5rem" width="40%" />
            <Skeleton height="1rem" />
          </div>
          <div v-else class="space-y-3">
            <p class="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              {{ t('dashboard.customer_profile_title') }}
            </p>
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
              <div class="flex justify-between">
                <span class="text-on-surface-variant">{{ t('dashboard.account_manager_label') }}</span>
                <span class="font-medium text-on-surface">—</span>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Row 2: Recent Activity Log -->
    <Card>
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
            <i :class="[activityIcon(entry.action), 'text-on-surface-variant text-lg flex-shrink-0']" />
            <div class="flex-1 min-w-0">
              <p class="text-sm text-on-surface truncate">{{ entry.description ?? entry.table_name ?? '—' }}</p>
            </div>
            <span class="text-xs text-on-surface-variant flex-shrink-0">{{ formatRelativeTime(entry.created) }}</span>
            <Tag
              v-if="entry.action"
              :value="entry.action"
              severity="secondary"
              class="text-xs flex-shrink-0"
            />
          </li>
        </ul>
      </template>
    </Card>

    <!-- Row 3: Credit Usage Over Time -->
    <Card>
      <template #header>
        <div class="p-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-on-surface">{{ t('dashboard.credit_usage_over_time') }}</h3>
          <div class="flex gap-2">
            <button
              v-for="period in (['HOUR', 'DAY', 'WEEK', 'MONTH'] as const)"
              :key="period"
              @click="activePeriod = period"
              :class="[
                'px-3 py-1 text-xs font-medium rounded',
                activePeriod === period
                  ? 'bg-primary text-white'
                  : 'text-on-surface-variant hover:text-on-surface'
              ]"
            >
              {{ period }}
            </button>
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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import Skeleton from 'primevue/skeleton'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import LineChart from '@/components/charts/LineChart.vue'
import { usePartnerCredits } from '@/composables/usePartnerCredits'
import { useCustomerDashboard } from '@/composables/useCustomerDashboard'
import { useActivityLog } from '@/composables/useActivityLog'
import { useAuthStore } from '@/stores/auth.store'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const partnerId = computed(() => String(authStore.profile?.company_id ?? ''))

const { credits } = usePartnerCredits(partnerId.value)

const {
  activeDeployments,
  monthlyConsumption,
  stoppedSuspendedCount,
  archivedCount,
  monthlyUsageCredits,
  totalCostThisMonthFCFA,
  partnerProfile,
  isLoading,
} = useCustomerDashboard()

const { auditEntries, isLoading: activityLoading } = useActivityLog(partnerId.value, 5)

const activePeriod = ref<'HOUR' | 'DAY' | 'WEEK' | 'MONTH'>('MONTH')

function tierLabel(partnerType: string | null): string {
  const map: Record<string, string> = {
    customer: 'Customer',
    affiliate: 'Affiliate',
    reseller: 'Reseller',
    pro_reseller: 'Pro Reseller',
  }
  return map[partnerType ?? ''] ?? '—'
}

function partnerStatusSeverity(status: string | null): string {
  const map: Record<string, string> = {
    active: 'success',
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

const creditProgressSeverity = computed(() => {
  const v = creditProgressValue.value
  if (v < 25) return 'danger'
  if (v < 50) return 'warn'
  return undefined
})

function activityIcon(action: string | null): string {
  if (action === 'INSERT') return 'pi pi-plus-circle'
  if (action === 'UPDATE') return 'pi pi-pencil'
  if (action === 'DELETE') return 'pi pi-trash'
  return 'pi pi-info-circle'
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
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
</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
}
</style>
