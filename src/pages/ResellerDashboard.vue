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
          field="deploymentLabel"
          :header="$t('dashboard.deployment_label')"
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
            <div class="flex items-center gap-2">
              <Button
                v-if="slotProps.data.status === 'active'"
                :label="$t('deployments.actions.stop')"
                severity="danger"
                size="small"
                text
                @click="handleStop(slotProps.data.deploymentId)"
              />
              <Button
                v-if="slotProps.data.status === 'stopped' || slotProps.data.status === 'suspended'"
                :label="$t('deployments.actions.start')"
                severity="success"
                size="small"
                text
                :disabled="(credits?.remainingCredits ?? 0) <= 0"
                @click="handleStart(slotProps.data.deploymentId)"
              />
              <router-link
                :to="`/partners/${slotProps.data.partnerId}`"
                class="text-xs font-medium text-primary hover:text-primary-container"
              >
                {{ $t('common.view') }}
              </router-link>
            </div>
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
import Button from 'primevue/button'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import CreditMeter from '@/components/credits/CreditMeter.vue'
import StatCard from '@/components/charts/StatCard.vue'
import { useAuthStore } from '@/stores/auth.store'
import { usePartnerCredits } from '@/composables/usePartnerCredits'
import { useDeployments } from '@/composables/useDeployments'
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
const { performDeploymentAction } = useDeployments()

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
  deploymentId: number
  deploymentLabel: string
  partnerId: string
  clientName: string
  monthlyConsumption: number
  status: string
}

/**
 * Client deployments — one row per deployment
 */
const clientDeployments = ref<ClientDeploymentRow[]>([])

/**
 * At-risk clients — partners with suspended deployments or low credits
 */
const atRiskClients = ref<(ClientDeploymentRow & { deploymentCount: number })[]>([])

/**
 * Fetch client deployments (one row per deployment) and derive at-risk list
 */
async function fetchDashboardData() {
  const result = await db
    .from('deployments')
    .select('id, label, status, partner_id, partner:partners(id, name, remainingCredits), serviceplan:serviceplans(monthlyCreditConsumption)')

  if (result.error) {
    notificationStore.addError(t('errors.fetch_failed'))
    return
  }

  const AT_RISK_CREDIT_THRESHOLD = 500

  const rows: ClientDeploymentRow[] = []
  const partnerRiskMap = new Map<string, { clientName: string; partnerId: string; remainingCredits: number; deploymentCount: number; hasRisk: boolean }>()

  for (const dep of result.data as Array<{
    id: number
    label: string
    status: string
    partner_id: number
    partner: { id: number; name: string; remainingCredits: number } | null
    serviceplan: { monthlyCreditConsumption: number } | null
  }>) {
    const pid = String(dep.partner_id)
    const consumption = dep.serviceplan?.monthlyCreditConsumption ?? 0
    const partnerCredits = dep.partner?.remainingCredits ?? 0

    rows.push({
      deploymentId: dep.id,
      deploymentLabel: dep.label ?? '',
      partnerId: pid,
      clientName: dep.partner?.name ?? '',
      monthlyConsumption: consumption,
      status: dep.status,
    })

    // Aggregate partner risk data separately for the at-risk panel
    if (!partnerRiskMap.has(pid)) {
      partnerRiskMap.set(pid, {
        clientName: dep.partner?.name ?? '',
        partnerId: pid,
        remainingCredits: partnerCredits,
        deploymentCount: 0,
        hasRisk: false,
      })
    }
    const risk = partnerRiskMap.get(pid)!
    risk.deploymentCount++
    if (dep.status === 'suspended') risk.hasRisk = true
  }

  clientDeployments.value = rows

  atRiskClients.value = Array.from(partnerRiskMap.values())
    .filter(p => p.hasRisk || p.remainingCredits < AT_RISK_CREDIT_THRESHOLD)
    .map(p => ({
      deploymentId: 0,
      deploymentLabel: '',
      partnerId: p.partnerId,
      clientName: p.clientName,
      monthlyConsumption: 0,
      status: 'at_risk',
      deploymentCount: p.deploymentCount,
    }))
}

/**
 * Stop a deployment via workflow engine
 */
async function handleStop(deploymentId: number) {
  await performDeploymentAction(deploymentId, 'stop')
  await fetchDashboardData()
}

/**
 * Start a deployment via workflow engine (credit check first)
 */
async function handleStart(deploymentId: number) {
  if ((credits.value?.remainingCredits ?? 0) <= 0) {
    notificationStore.addError(t('deployments.errors.insufficient_credits'))
    return
  }
  await performDeploymentAction(deploymentId, 'start')
  await fetchDashboardData()
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
