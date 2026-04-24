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
              :value="$t('dashboard.low_balance')"
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
import { useI18n } from 'vue-i18n'
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
import { supabaseSchema } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'

// supabaseSchema resolves to `never` when Database has no public schema — cast once here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseSchema as any

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const partnerId = computed(() => String(authStore.profile?.company_id ?? ''))
const { credits, refresh } = usePartnerCredits(partnerId.value)

// Re-fetch when auth profile loads
watch(() => authStore.profile?.company_id, (id) => {
  if (id) {
    refresh()
    fetchDashboardData()
  }
})

/**
 * Monthly spend
 */
const monthlySpend = ref(8400)

/**
 * Active clients count
 */
const activeClientsCount = ref(12)

interface ClientDeploymentRow {
  partnerId: string
  clientName: string
  deploymentCount: number
  monthlyConsumption: number
  status: string
}

/**
 * Client deployments — grouped by partner
 */
const clientDeployments = ref<ClientDeploymentRow[]>([])

/**
 * At-risk clients — suspended or low remaining credits
 */
const atRiskClients = ref<ClientDeploymentRow[]>([])

/**
 * Fetch client deployments and derive at-risk list from Supabase
 */
async function fetchDashboardData() {
  const result = await db
    .from('deployments')
    .select('id, status, partner_id, partner:partners(id, name, remainingCredits), serviceplan:serviceplans(monthlyCreditConsumption)')

  if (result.error) {
    notificationStore.addError(t('errors.fetch_failed'))
    return
  }

  // Credits threshold below which a partner is considered at-risk
  const AT_RISK_CREDIT_THRESHOLD = 500

  // Aggregate rows by partner
  const partnerMap = new Map<string, ClientDeploymentRow & { remainingCredits: number }>()

  for (const dep of result.data as Array<{
    id: number
    status: string
    partner_id: number
    partner: { id: number; name: string; remainingCredits: number } | null
    serviceplan: { monthlyCreditConsumption: number } | null
  }>) {
    const pid = String(dep.partner_id)
    const partnerCredits = dep.partner?.remainingCredits ?? 0
    const consumption = dep.serviceplan?.monthlyCreditConsumption ?? 0

    if (!partnerMap.has(pid)) {
      partnerMap.set(pid, {
        partnerId: pid,
        clientName: dep.partner?.name ?? '',
        deploymentCount: 0,
        monthlyConsumption: 0,
        status: 'active',
        remainingCredits: partnerCredits,
      })
    }

    const row = partnerMap.get(pid)!
    row.deploymentCount++
    row.monthlyConsumption += consumption
    if (dep.status === 'suspended') {
      row.status = 'at_risk'
    }
  }

  const rows = Array.from(partnerMap.values())

  clientDeployments.value = rows.map(({ remainingCredits: _rc, ...rest }) => rest)

  atRiskClients.value = rows
    .filter(row => row.status === 'at_risk' || row.remainingCredits < AT_RISK_CREDIT_THRESHOLD)
    .map(({ remainingCredits: _rc, ...rest }) => rest)
}

/**
 * Navigate to top up page
 */
function navigateToTopUp() {
  router.push('/credits/buy')
}

onMounted(() => {
  fetchDashboardData()
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
