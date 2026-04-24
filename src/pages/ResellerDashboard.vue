<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader
      :title="$t('dashboard.reseller_title')"
      :description="$t('dashboard.reseller_description')"
      icon="pi-briefcase"
    />

    <!-- Credit Pool Section -->
    <Card>
      <template #header>
        <div class="p-4">
          <h3 class="text-base font-semibold text-on-surface">
            {{ $t('dashboard.credit_pool') }}
          </h3>
        </div>
      </template>

      <CreditMeter
        :balance="credits?.remainingCredits ?? 0"
        :expiry-date="credits?.creditExpiryDate"
        @topup="navigateToTopUp"
      />
    </Card>

    <!-- This Month's Spend -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatCard
        :label="$t('dashboard.this_month_spend')"
        :value="monthlySpend"
        icon="pi pi-shopping-cart"
        color="secondary"
        format="currency"
        :trend="-12"
      />
      <StatCard
        :label="$t('dashboard.active_clients')"
        :value="activeClientsCount"
        icon="pi pi-users"
        color="primary"
        format="number"
      />
    </div>

    <!-- Client Deployments Table -->
    <Card>
      <template #header>
        <div class="p-4">
          <h3 class="text-base font-semibold text-on-surface">
            {{ $t('dashboard.client_deployments') }}
          </h3>
        </div>
      </template>

      <DataTable
        :value="clientDeployments"
        striped-rows
        responsive-layout="stack"
        breakpoint="768px"
        paginator
        :rows="10"
        class="text-sm"
      >
        <Column
          field="clientName"
          :header="$t('dashboard.client_name')"
        />
        <Column
          field="deploymentCount"
          :header="$t('dashboard.deployments')"
        />
        <Column
          field="monthlyConsumption"
          :header="$t('dashboard.monthly_consumption')"
        >
          <template #body="slotProps">
            <span class="font-mono">{{ slotProps.data.monthlyConsumption }} FCFA</span>
          </template>
        </Column>
        <Column
          field="status"
          :header="$t('common.status')"
        >
          <template #body="slotProps">
            <Tag
              :value="slotProps.data.status"
              :severity="slotProps.data.status === 'active' ? 'success' : 'warning'"
              class="text-xs"
            />
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
    </Card>

    <!-- At-Risk Clients Panel -->
    <Card v-if="atRiskClients.length > 0">
      <template #header>
        <div class="p-4">
          <h3 class="text-base font-semibold text-error flex items-center gap-2">
            <i class="pi pi-alert-circle" />
            {{ $t('dashboard.at_risk_clients') }}
          </h3>
        </div>
      </template>

      <div class="space-y-3">
        <div
          v-for="client in atRiskClients"
          :key="client.partnerId"
          class="p-3 bg-error-container rounded-md border border-error"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="font-medium text-on-surface">
                {{ client.clientName }}
              </p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ client.deploymentCount }} deployment(s) • {{ client.monthlyConsumption }} FCFA/month
              </p>
            </div>
            <Tag
              value="LOW BALANCE"
              severity="danger"
              class="text-xs"
            />
          </div>
          <router-link
            :to="`/partners/${client.partnerId}`"
            class="mt-2 inline-block text-xs font-medium text-error hover:underline"
          >
            {{ $t('dashboard.view_details') }} →
          </router-link>
        </div>
      </div>
    </Card>

    <!-- Empty At-Risk State -->
    <Card
      v-else
      class="bg-surface-container-highest border border-tertiary"
    >
      <div class="text-center py-8">
        <i class="pi pi-check-circle text-3xl text-tertiary mb-2 block opacity-75" />
        <p class="text-sm text-on-surface-variant">
          {{ $t('dashboard.no_at_risk_clients') }}
        </p>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import CreditMeter from '@/components/credits/CreditMeter.vue'
import StatCard from '@/components/charts/StatCard.vue'
import { useAuthStore } from '@/stores/auth.store'
import { usePartnerCredits } from '@/composables/usePartnerCredits'

const router = useRouter()
const authStore = useAuthStore()
const partnerId = computed(() => String(authStore.profile?.company_id ?? ''))
const { credits, refresh } = usePartnerCredits(partnerId.value)

// Re-fetch when auth profile loads
watch(() => authStore.profile?.company_id, (id) => {
  if (id) refresh()
})

/**
 * Monthly spend
 */
const monthlySpend = ref(8400)

/**
 * Active clients count
 */
const activeClientsCount = ref(12)

/**
 * Client deployments
 */
const clientDeployments = ref([
  {
    partnerId: '1',
    clientName: 'TechCorp Nigeria',
    deploymentCount: 2,
    monthlyConsumption: 3200,
    status: 'active',
  },
  {
    partnerId: '2',
    clientName: 'Fashion Hub',
    deploymentCount: 1,
    monthlyConsumption: 1200,
    status: 'active',
  },
  {
    partnerId: '3',
    clientName: 'Logistics Plus',
    deploymentCount: 3,
    monthlyConsumption: 2800,
    status: 'at_risk',
  },
  {
    partnerId: '4',
    clientName: 'Health Clinic Group',
    deploymentCount: 1,
    monthlyConsumption: 800,
    status: 'active',
  },
  {
    partnerId: '5',
    clientName: 'Trading Company',
    deploymentCount: 2,
    monthlyConsumption: 1600,
    status: 'at_risk',
  },
])

/**
 * At-risk clients (low balance)
 */
const atRiskClients = ref([
  {
    partnerId: '3',
    clientName: 'Logistics Plus',
    deploymentCount: 3,
    monthlyConsumption: 2800,
  },
  {
    partnerId: '5',
    clientName: 'Trading Company',
    deploymentCount: 2,
    monthlyConsumption: 1600,
  },
])

/**
 * Navigate to top up page
 */
function navigateToTopUp() {
  router.push('/credits/buy')
}

// In production, fetch from API
onMounted(() => {
  // await fetchResellerDashboardData()
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
