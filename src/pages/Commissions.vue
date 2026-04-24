<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader
      :title="$t('commissions.title')"
      :description="$t('commissions.description')"
      icon="pi-money-bill"
    />

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="group" aria-label="Commission summary metrics">
      <StatCard
        :label="$t('commissions.total_earnings')"
        :value="totalEarnings"
        icon="pi pi-wallet"
        color="primary"
        format="currency"
      />
      <StatCard
        :label="$t('commissions.pending_commission')"
        :value="pendingCommission"
        icon="pi pi-clock"
        color="secondary"
        format="currency"
      />
      <StatCard
        :label="$t('commissions.acquisition_bonus_total')"
        :value="acquisitionBonusTotal"
        icon="pi pi-gift"
        color="tertiary"
        format="currency"
      />
      <StatCard
        :label="$t('commissions.renewal_income_total')"
        :value="renewalIncomeTotal"
        icon="pi pi-refresh"
        color="error"
        format="currency"
      />
    </div>

    <!-- Commission Trend Chart -->
    <LineChart
      :title="$t('commissions.trend_over_time')"
      :data="commissionTrendData"
    />

    <!-- Customer Commission Breakdown (Accordion) -->
    <Card role="region" aria-label="Commission breakdown by customer">
      <template #header>
        <div class="p-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-on-surface" id="commission-breakdown-title">
            {{ $t('commissions.breakdown_by_customer') }}
          </h3>
          <span class="text-xs font-semibold px-2 py-1 bg-primary-container text-primary rounded-full">
            {{ customers.length }}
          </span>
        </div>
      </template>

      <Accordion
        :value="activeAccordionTabs"
        @update:value="(value: unknown) => { activeAccordionTabs = Array.isArray(value) ? (value as number[]) : [] }"
        :multiple="true"
        aria-label="Commission breakdown by customer"
      >
        <AccordionTab v-for="customer in customers" :key="customer.id" :header="getAccordionHeader(customer)">
          <div class="space-y-4">
            <!-- Acquisition Bonus (if applicable) -->
            <div v-if="customer.acquisitionBonus.amount > 0" class="p-4 bg-surface-container-high rounded-md">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-on-surface">
                    {{ $t('commissions.acquisition_bonus') }}
                  </p>
                  <p class="text-xs text-on-surface-variant mt-1">
                    {{ customer.acquisitionBonus.percentage }}% × {{ formatCurrency(customer.planPrice) }} monthly
                  </p>
                </div>
                <p class="text-base font-semibold font-mono text-primary">
                  {{ formatCurrency(customer.acquisitionBonus.amount) }}
                </p>
              </div>
              <div v-if="!customer.acquisitionBonus.isPaid" class="mt-2">
                <Tag value="PENDING" severity="warning" class="text-xs" />
              </div>
              <div v-else class="mt-2">
                <Tag value="PAID" severity="success" class="text-xs" />
              </div>
            </div>

            <!-- Renewal Commission (ongoing) -->
            <div class="p-4 bg-surface-container-high rounded-md">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-on-surface">
                    {{ $t('commissions.renewal_commission') }}
                  </p>
                  <p class="text-xs text-on-surface-variant mt-1">
                    {{ customer.renewalCommission.percentage }}% × {{ formatCurrency(customer.planPrice) }} monthly (ongoing)
                  </p>
                </div>
                <p class="text-base font-semibold font-mono text-secondary">
                  {{ formatCurrency(customer.renewalCommission.monthlyAmount) }}/month
                </p>
              </div>
              <div class="mt-2 text-xs text-on-surface-variant">
                <p>{{ $t('commissions.ytd_renewal') }}: {{ formatCurrency(customer.renewalCommission.ytdTotal) }}</p>
              </div>
            </div>

            <!-- Customer Total -->
            <div class="p-4 bg-primary-container rounded-md flex items-center justify-between">
              <p class="text-sm font-semibold text-primary">
                {{ $t('commissions.customer_total') }}
              </p>
              <p class="text-lg font-semibold font-mono text-primary">
                {{ formatCurrency(customer.totalCommission) }}
              </p>
            </div>
          </div>
        </AccordionTab>
      </Accordion>
    </Card>

    <!-- Commission History Table -->
    <Card role="region" aria-label="Commission transaction history">
      <template #header>
        <div class="p-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-on-surface" id="commission-history-title">
            {{ $t('commissions.history') }}
          </h3>
        </div>
      </template>

      <DataTable
        :value="commissionHistory"
        striped-rows
        responsive-layout="stack"
        :paginator="true"
        :rows="10"
        class="text-sm"
        aria-labelledby="commission-history-title"
        role="grid"
      >
        <Column field="date" :header="$t('commissions.date')">
          <template #body="slotProps">
            <span class="font-mono text-xs">{{ formatDate(slotProps.data.date) }}</span>
          </template>
        </Column>
        <Column field="customerName" :header="$t('commissions.customer')" />
        <Column field="type" :header="$t('commissions.type')">
          <template #body="slotProps">
            <Tag
              :value="slotProps.data.type"
              :severity="slotProps.data.type === 'Acquisition' ? 'info' : 'success'"
              class="text-xs"
            />
          </template>
        </Column>
        <Column field="percentage" :header="$t('commissions.percentage')">
          <template #body="slotProps">
            <span class="text-xs">{{ slotProps.data.percentage }}%</span>
          </template>
        </Column>
        <Column field="amount" :header="$t('commissions.amount')">
          <template #body="slotProps">
            <span class="font-mono font-semibold text-sm">{{ formatCurrency(slotProps.data.amount) }}</span>
          </template>
        </Column>
        <Column field="status" :header="$t('commissions.status')">
          <template #body="slotProps">
            <Tag
              :value="slotProps.data.status"
              :severity="slotProps.data.status === 'Pending' ? 'warning' : 'success'"
              class="text-xs"
            />
          </template>
        </Column>
      </DataTable>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import StatCard from '@/components/charts/StatCard.vue'
import LineChart from '@/components/charts/LineChart.vue'
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
  created: string
}

/**
 * Credit transaction row returned from Supabase
 */
interface CreditTransactionRow {
  id: number
  partner_id: number
  amountPaid: number | null
  status: string | null
  created: string
}

/**
 * Customer commission record
 */
interface CustomerCommission {
  id: string
  name: string
  plan: string
  planPrice: number
  signupDate: string
  acquisitionBonus: {
    percentage: number
    amount: number
    isPaid: boolean
  }
  renewalCommission: {
    percentage: number
    monthlyAmount: number
    ytdTotal: number
  }
  totalCommission: number
}

/**
 * Commission history entry
 */
interface CommissionHistoryEntry {
  date: string
  customerName: string
  type: 'Acquisition' | 'Renewal'
  percentage: number
  amount: number
  status: 'Pending' | 'Paid'
}

const ACQUISITION_RATE = 0.1
const RENEWAL_RATE = 0.05
const ACQUISITION_MONTHS = 3
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Customers with commissions
 */
const customers = ref<CustomerCommission[]>([])

/**
 * Commission history
 */
const commissionHistory = ref<CommissionHistoryEntry[]>([])

/**
 * Commission trend data (for chart) — monthly totals
 */
const commissionTrendData = ref<{ name: string; value: number }[]>([])

/**
 * Accordion active tabs
 */
const activeAccordionTabs = ref<number[]>([])

/**
 * Calculate totals
 */
const totalEarnings = computed(() => {
  return customers.value.reduce((sum, c) => sum + c.totalCommission, 0)
})

const pendingCommission = computed(() => {
  return customers.value.reduce((sum, c) => {
    const pendingAcquisition = c.acquisitionBonus.isPaid ? 0 : c.acquisitionBonus.amount
    return sum + pendingAcquisition
  }, 0)
})

const acquisitionBonusTotal = computed(() => {
  return customers.value.reduce((sum, c) => sum + c.acquisitionBonus.amount, 0)
})

const renewalIncomeTotal = computed(() => {
  return customers.value.reduce((sum, c) => sum + c.renewalCommission.ytdTotal, 0)
})

/**
 * Build CustomerCommission and CommissionHistoryEntry records from raw DB rows
 */
function buildCommissionData(
  partners: PartnerRow[],
  transactions: CreditTransactionRow[]
): void {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const historyEntries: CommissionHistoryEntry[] = []
  const monthTotals = new Map<string, number>()

  const customerList: CustomerCommission[] = partners.map((partner) => {
    const partnerCreated = new Date(partner.created)
    const acquisitionCutoff = new Date(partnerCreated.getTime() + ACQUISITION_MONTHS * MONTH_MS)

    const partnerTxs = transactions
      .filter((tx) => tx.partner_id === partner.id && tx.status === 'completed' && (tx.amountPaid ?? 0) > 0)
      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())

    let acquisitionAmount = 0
    let renewalYtdTotal = 0
    let lastRenewalMonthlyAmount = 0
    let totalPlanPrice = 0
    let txCount = 0

    for (const tx of partnerTxs) {
      const txDate = new Date(tx.created)
      const paid = tx.amountPaid ?? 0
      const isAcquisition = txDate <= acquisitionCutoff
      const rate = isAcquisition ? ACQUISITION_RATE : RENEWAL_RATE
      const commissionAmount = paid * rate
      const txType: 'Acquisition' | 'Renewal' = isAcquisition ? 'Acquisition' : 'Renewal'

      if (isAcquisition) {
        acquisitionAmount += commissionAmount
      } else {
        if (txDate >= startOfYear) {
          renewalYtdTotal += commissionAmount
        }
        lastRenewalMonthlyAmount = commissionAmount
      }

      totalPlanPrice += paid
      txCount++

      historyEntries.push({
        date: tx.created,
        customerName: partner.name,
        type: txType,
        percentage: isAcquisition ? 10 : 5,
        amount: commissionAmount,
        status: 'Paid',
      })

      // Aggregate for trend chart by month label
      const monthLabel = txDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      monthTotals.set(monthLabel, (monthTotals.get(monthLabel) ?? 0) + commissionAmount)
    }

    const avgPlanPrice = txCount > 0 ? totalPlanPrice / txCount : 0
    const totalCommission = acquisitionAmount + renewalYtdTotal

    return {
      id: String(partner.id),
      name: partner.name,
      plan: '—',
      planPrice: avgPlanPrice,
      signupDate: partner.created,
      acquisitionBonus: {
        percentage: 10,
        amount: acquisitionAmount,
        isPaid: acquisitionAmount > 0,
      },
      renewalCommission: {
        percentage: 5,
        monthlyAmount: lastRenewalMonthlyAmount,
        ytdTotal: renewalYtdTotal,
      },
      totalCommission,
    }
  })

  customers.value = customerList.filter((c) => c.totalCommission > 0 || c.acquisitionBonus.amount > 0)

  commissionHistory.value = historyEntries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Build trend data sorted newest-first → last 6 months
  const sortedMonths = Array.from(monthTotals.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .slice(0, 6)

  commissionTrendData.value = sortedMonths.map(([name, value]) => ({ name, value }))
}

/**
 * Load commissions data from Supabase
 */
async function loadCommissions(): Promise<void> {
  const { data: partners, error: partnersError } = await (supabaseSchema as any)
    .from('partners')
    .select('id, name, created')

  if (partnersError) {
    notificationStore.addError(t('errors.fetch_failed'))
    return
  }

  const partnerRows = (partners ?? []) as PartnerRow[]

  if (partnerRows.length === 0) {
    customers.value = []
    commissionHistory.value = []
    commissionTrendData.value = []
    return
  }

  const partnerIds = partnerRows.map((p) => p.id)

  const { data: txData, error: txError } = await (supabaseSchema as any)
    .from('credit_transactions')
    .select('id, partner_id, amountPaid, status, created')
    .in('partner_id', partnerIds)
    .eq('transactionType', 'credit')
    .order('created', { ascending: false })

  if (txError) {
    notificationStore.addError(t('errors.fetch_failed'))
    return
  }

  const txRows = (txData ?? []) as CreditTransactionRow[]
  buildCommissionData(partnerRows, txRows)
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

/**
 * Get accordion header
 */
function getAccordionHeader(customer: CustomerCommission): string {
  return `${customer.name} (${customer.plan}) - ${formatCurrency(customer.totalCommission)}`
}

onMounted(() => {
  loadCommissions()
})
</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
}

:deep(.p-accordion .p-accordion-header-link) {
  padding: 1rem;
  background: var(--surface-container-high);
  border: 1px solid var(--outline-variant);
}

:deep(.p-accordion .p-accordion-header-link:hover) {
  background: var(--surface-container-highest);
}

:deep(.p-accordion .p-accordion-content) {
  padding: 1.5rem;
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

/* Accessibility: Focus rings for keyboard navigation */
:deep(.p-accordion .p-accordion-header-link:focus) {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

:deep(.p-datatable a:focus) {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
</style>
