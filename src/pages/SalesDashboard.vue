<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader
      :title="$t('dashboard.sales_title')"
      :description="$t('dashboard.sales_description')"
      icon="pi-chart-line"
    />

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        :label="$t('dashboard.portfolio_size')"
        :value="portfolioStats.portfolioSize"
        icon="pi pi-briefcase"
        color="primary"
        format="number"
      />
      <StatCard
        :label="$t('dashboard.new_customers_this_month')"
        :value="portfolioStats.newCustomersThisMonth"
        icon="pi pi-user-plus"
        color="tertiary"
        format="number"
        :trend="portfolioStats.customerGrowthTrend"
      />
      <StatCard
        :label="$t('dashboard.pending_commission')"
        :value="portfolioStats.pendingCommission"
        icon="pi pi-wallet"
        color="secondary"
        format="currency"
      />
      <StatCard
        :label="$t('dashboard.at_risk_count')"
        :value="portfolioStats.atRiskCount"
        icon="pi pi-alert-circle"
        color="error"
        format="number"
      />
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <router-link
        to="/portfolio"
        class="p-6 bg-primary text-white rounded-md hover:bg-primary-container transition-colors text-center"
      >
        <i class="pi pi-briefcase text-2xl mb-2 block" />
        <h3 class="font-semibold">{{ $t('dashboard.view_portfolio') }}</h3>
        <p class="text-sm opacity-90 mt-1">{{ portfolioStats.portfolioSize }} customers</p>
      </router-link>

      <router-link
        to="/commissions"
        class="p-6 bg-secondary text-white rounded-md hover:bg-secondary-container transition-colors text-center"
      >
        <i class="pi pi-money-bill text-2xl mb-2 block" />
        <h3 class="font-semibold">{{ $t('dashboard.view_commissions') }}</h3>
        <p class="text-sm opacity-90 mt-1">{{ formatCurrency(portfolioStats.totalEarnings) }}</p>
      </router-link>
    </div>

    <!-- At-Risk Customers Table -->
    <Card>
      <template #header>
        <div class="p-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-on-surface flex items-center gap-2">
            <i class="pi pi-alert-circle text-error" />
            {{ $t('dashboard.at_risk_customers') }}
          </h3>
          <span class="text-xs font-semibold px-2 py-1 bg-error-container text-error rounded-full">
            {{ atRiskCustomers.length }}
          </span>
        </div>
      </template>

      <DataTable v-if="atRiskCustomers.length > 0" :value="atRiskCustomers" striped-rows responsive-layout="stack" :paginator="atRiskCustomers.length > 5" :rows="5" class="text-sm">
        <Column field="partnerName" :header="$t('dashboard.customer_name')" />
        <Column field="plan" :header="$t('dashboard.plan')">
          <template #body="slotProps">
            <Tag :value="slotProps.data.plan" class="text-xs" />
          </template>
        </Column>
        <Column field="creditStatus" :header="$t('dashboard.credit_status')">
          <template #body="slotProps">
            <Tag
              :value="slotProps.data.creditStatus"
              :severity="slotProps.data.creditStatus === 'LOW' ? 'warning' : 'danger'"
              class="text-xs"
            />
          </template>
        </Column>
        <Column field="nextRenewal" :header="$t('dashboard.next_renewal')">
          <template #body="slotProps">
            <span class="font-mono text-xs">{{ formatDate(slotProps.data.nextRenewal) }}</span>
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

      <div v-else class="text-center py-8 text-on-surface-variant">
        <i class="pi pi-check-circle text-3xl mb-2 block opacity-75 text-tertiary" />
        <p class="text-sm">{{ $t('dashboard.no_at_risk_customers') }}</p>
      </div>
    </Card>

    <!-- Commission Breakdown Chart -->
    <DonutChart
      :title="$t('dashboard.commission_breakdown')"
      :data="commissionBreakdown"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import StatCard from '@/components/charts/StatCard.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import { supabaseSchema } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'

const { t } = useI18n()
const notificationStore = useNotificationStore()

/**
 * Partner row returned from Supabase
 */
interface PartnerRow {
  id: number
  name: string
  status: string | null
  remainingCredits: number
  created: string
}

/**
 * Credit transaction row returned from Supabase
 */
interface CreditTransactionRow {
  partner_id: number
  amountPaid: number | null
  status: string | null
  created: string
}

/**
 * At-risk customer display record
 */
interface AtRiskCustomer {
  partnerId: number
  partnerName: string
  plan: string
  creditStatus: 'LOW' | 'CRITICAL'
  nextRenewal: string
}

const AT_RISK_STATUSES = ['low_credit', 'no_credit', 'suspended', 'on_debt']

/**
 * Portfolio statistics
 */
const portfolioStats = ref({
  portfolioSize: 0,
  newCustomersThisMonth: 0,
  customerGrowthTrend: 0,
  pendingCommission: 0,
  totalEarnings: 0,
  atRiskCount: 0,
})

/**
 * At-risk customers
 */
const atRiskCustomers = ref<AtRiskCustomer[]>([])

/**
 * Commission breakdown for chart
 */
const commissionBreakdown = ref<{ name: string; value: number }[]>([])

/**
 * Determine credit status label for a partner status value
 */
function getCreditStatus(status: string | null): 'LOW' | 'CRITICAL' {
  if (status === 'low_credit' || status === 'on_debt') return 'LOW'
  return 'CRITICAL'
}

/**
 * Compute commission amounts from transactions
 * Acquisition: 10% of amountPaid in first 3 months after partner created
 * Renewal: 5% of amountPaid after first 3 months
 */
function computeCommissions(
  partners: PartnerRow[],
  transactions: CreditTransactionRow[]
): { acquisitionTotal: number; renewalTotal: number; pendingTotal: number } {
  let acquisitionTotal = 0
  let renewalTotal = 0
  const pendingTotal = 0

  for (const partner of partners) {
    const partnerCreated = new Date(partner.created).getTime()
    const threeMonthsMs = 3 * 30 * 24 * 60 * 60 * 1000
    const acquisitionCutoff = partnerCreated + threeMonthsMs

    const partnerTxs = transactions.filter(
      (tx) => tx.partner_id === partner.id && tx.status === 'completed' && (tx.amountPaid ?? 0) > 0
    )

    for (const tx of partnerTxs) {
      const txDate = new Date(tx.created).getTime()
      const paid = tx.amountPaid ?? 0
      if (txDate <= acquisitionCutoff) {
        acquisitionTotal += paid * 0.1
      } else {
        renewalTotal += paid * 0.05
      }
    }
  }

  return { acquisitionTotal, renewalTotal, pendingTotal }
}

/**
 * Load sales dashboard data from Supabase
 */
async function loadDashboardData(): Promise<void> {
  const { data: partners, error: partnersError } = await (supabaseSchema as any)
    .from('partners')
    .select('id, name, status, remainingCredits, created')

  if (partnersError) {
    notificationStore.addError(t('errors.fetch_failed'))
    return
  }

  const partnerRows = (partners ?? []) as PartnerRow[]
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const portfolioSize = partnerRows.length
  const newThisMonth = partnerRows.filter((p) => new Date(p.created) >= startOfMonth).length
  const newLastMonth = partnerRows.filter((p) => {
    const d = new Date(p.created)
    return d >= startOfLastMonth && d < startOfMonth
  }).length

  const growthTrend = newLastMonth > 0
    ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
    : newThisMonth > 0 ? 100 : 0

  const atRiskPartners = partnerRows.filter((p) => AT_RISK_STATUSES.includes(p.status ?? ''))

  // Fetch credit transactions for commission calculation
  const partnerIds = partnerRows.map((p) => p.id)
  let transactions: CreditTransactionRow[] = []

  if (partnerIds.length > 0) {
    const { data: txData, error: txError } = await (supabaseSchema as any)
      .from('credit_transactions')
      .select('partner_id, amountPaid, status, created')
      .in('partner_id', partnerIds)
      .eq('transactionType', 'credit')

    if (txError) {
      notificationStore.addError(t('errors.fetch_failed'))
      return
    }
    transactions = (txData ?? []) as CreditTransactionRow[]
  }

  const { acquisitionTotal, renewalTotal } = computeCommissions(partnerRows, transactions)
  const totalEarnings = acquisitionTotal + renewalTotal

  // Latest transaction per at-risk partner for nextRenewal estimate
  const atRiskList: AtRiskCustomer[] = atRiskPartners.map((p) => {
    const partnerTxs = transactions
      .filter((tx) => tx.partner_id === p.id && tx.status === 'completed')
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
    const lastPayment = partnerTxs[0]?.created ?? p.created
    const nextRenewal = new Date(new Date(lastPayment).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

    return {
      partnerId: p.id,
      partnerName: p.name,
      plan: p.status ?? '—',
      creditStatus: getCreditStatus(p.status),
      nextRenewal,
    }
  })

  portfolioStats.value = {
    portfolioSize,
    newCustomersThisMonth: newThisMonth,
    customerGrowthTrend: growthTrend,
    pendingCommission: 0,
    totalEarnings,
    atRiskCount: atRiskPartners.length,
  }

  atRiskCustomers.value = atRiskList

  commissionBreakdown.value = [
    { name: t('dashboard.commission_breakdown_acquisition'), value: acquisitionTotal },
    { name: t('dashboard.commission_breakdown_renewal'), value: renewalTotal },
  ]
}

/**
 * Format currency
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

onMounted(() => {
  loadDashboardData()
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
