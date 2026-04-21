<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader
      :title="$t('dashboard.customer_title')"
      :description="$t('dashboard.customer_description')"
      icon="pi-home"
    />

    <!-- Credit Status Section -->
    <Card>
      <template #header>
        <div class="p-4">
          <h3 class="text-base font-semibold text-on-surface">{{ $t('dashboard.credit_status') }}</h3>
        </div>
      </template>

      <div class="space-y-6">
        <!-- Credit Meter -->
        <CreditMeter
          :balance="credits?.remainingCredits ?? 0"
          :total-credits-earned="credits?.totalCreditsEarned ?? 0"
          :expiry-date="credits?.creditExpiryDate"
          @topup="navigateToTopUp"
        />

        <!-- Quick Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-outline-variant">
          <div class="text-center">
            <p class="text-sm text-on-surface-variant mb-2">{{ $t('dashboard.total_spent') }}</p>
            <p class="text-2xl font-bold text-on-surface font-mono">{{ formatCurrency(1250) }}</p>
          </div>
          <div class="text-center">
            <p class="text-sm text-on-surface-variant mb-2">{{ $t('dashboard.last_payment') }}</p>
            <p class="text-sm font-mono text-on-surface">{{ formatDate(lastPaymentDate) }}</p>
          </div>
          <div class="text-center">
            <p class="text-sm text-on-surface-variant mb-2">{{ $t('dashboard.days_remaining') }}</p>
            <p class="text-2xl font-bold text-on-surface font-mono">{{ daysRemaining }}</p>
          </div>
        </div>
      </div>
    </Card>

    <!-- Active Deployments -->
    <Card>
      <template #header>
        <div class="p-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-on-surface">{{ $t('dashboard.active_deployments') }}</h3>
          <router-link
            to="/deployments"
            class="text-xs font-medium text-primary hover:text-primary-container"
          >
            {{ $t('common.view') }} →
          </router-link>
        </div>
      </template>

      <div v-if="activeDeployments.length === 0" class="text-center py-8 text-on-surface-variant">
        <i class="pi pi-inbox text-3xl mb-2 block opacity-50" />
        <p class="text-sm">{{ $t('dashboard.no_deployments') }}</p>
        <router-link
          to="/deployments/new"
          class="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-container transition-colors"
        >
          {{ $t('deployments.create') }}
        </router-link>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="deployment in activeDeployments.slice(0, 5)"
          :key="deployment.id"
          class="p-4 bg-surface-container-lowest rounded-md border border-outline-variant hover:border-primary transition-colors"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <p class="font-medium text-on-surface">{{ deployment.label }}</p>
              <p class="text-xs text-on-surface-variant font-mono">{{ deployment.domain }}</p>
            </div>
            <Tag
              :value="deployment.status"
              :severity="getStatusSeverity(deployment.status)"
              class="text-xs"
            />
          </div>
          <p class="text-xs text-on-surface-variant">
            {{ deployment.service }} • {{ deployment.plan }}
          </p>
          <p class="text-xs font-mono text-on-surface-variant mt-2">
            {{ deployment.monthlyConsumption }} FCFA/month
          </p>
        </div>

        <!-- View All Link -->
        <router-link
          v-if="activeDeployments.length > 5"
          to="/deployments"
          class="p-4 bg-surface-container-highest rounded-md border border-outline-variant flex items-center justify-center hover:bg-surface-container-high transition-colors"
        >
          <span class="text-sm font-medium text-primary">{{ $t('dashboard.view_all') }} →</span>
        </router-link>
      </div>
    </Card>

    <!-- Monthly Consumption Chart -->
    <LineChart
      :title="$t('dashboard.monthly_consumption')"
      :data="monthlyConsumptionData"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import CreditMeter from '@/components/credits/CreditMeter.vue'
import LineChart from '@/components/charts/LineChart.vue'
import { usePartnerCredits } from '@/composables/usePartnerCredits'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()
const partnerId = computed(() => String(authStore.profile?.company_id ?? ''))
const { credits, refresh } = usePartnerCredits(partnerId.value)

// Re-fetch when auth profile loads
watch(() => authStore.profile?.company_id, (id) => {
  if (id) refresh()
})

/**
 * Active deployments (would be fetched from API)
 */
const activeDeployments = [
  {
    id: '1',
    label: 'Production Odoo',
    domain: 'odoo.example.com',
    service: 'Odoo 16',
    plan: 'Pro',
    status: 'active',
    monthlyConsumption: 2400,
  },
  {
    id: '2',
    label: 'Staging',
    domain: 'staging.example.com',
    service: 'Odoo 16',
    plan: 'Starter',
    status: 'active',
    monthlyConsumption: 800,
  },
  {
    id: '3',
    label: 'Dev Env',
    domain: 'dev.example.com',
    service: 'Custom Docker',
    plan: 'Starter',
    status: 'active',
    monthlyConsumption: 600,
  },
]

/**
 * Last payment date
 */
const lastPaymentDate = new Date('2026-03-20').toISOString()

/**
 * Days remaining
 */
const daysRemaining = computed(() => {
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const daysLeft = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 3600 * 24))
  return daysLeft
})

/**
 * Monthly consumption data
 */
const monthlyConsumptionData = [
  { name: 'Jan', value: 7200 },
  { name: 'Feb', value: 7800 },
  { name: 'Mar', value: 8400 },
  { name: 'Apr', value: 9200 },
  { name: 'May', value: 8900 },
  { name: 'Jun', value: 9600 },
]

/**
 * Format currency
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
 * Get Tag severity for status
 */
function getStatusSeverity(status: string): string {
  const severities: Record<string, string> = {
    active: 'success',
    stopped: 'warning',
    suspended: 'danger',
    failed: 'danger',
    deploying: 'info',
  }
  return severities[status] || 'secondary'
}

/**
 * Navigate to top up page
 */
function navigateToTopUp() {
  router.push('/credits/buy')
}

// In production, fetch from API
onMounted(() => {
  // await fetchCustomerDashboardData()
})
</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
}
</style>
