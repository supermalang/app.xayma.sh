<template>
  <AppPage>
    <!-- Page header -->
    <AppPageHeader
      :title="t('credits.page_title')"
      :description="t('credits.page_description')"
    >
      <template #actions>
        <Button
          icon="pi pi-credit-card"
          :label="t('credits.top_up_credits')"
          @click="goToTopUp"
        />
      </template>
    </AppPageHeader>

    <!-- Summary cards -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Current balance -->
      <section
        class="bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-6 flex flex-col"
      >
        <div class="flex items-center gap-2 text-sm font-medium text-primary mb-3">
          <span class="material-symbols-outlined text-base">receipt_long</span>
          {{ t('credits.current_balance') }}
        </div>

        <div class="flex items-baseline gap-2">
          <span class="font-mono text-5xl font-bold text-on-surface tabular-nums">
            {{ formattedBalance }}
          </span>
          <span class="font-mono text-sm font-medium text-on-surface-variant">
            {{ t('credits.credits') }}
          </span>
        </div>

        <div class="mt-6 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
          <div
            class="h-full bg-primary rounded-full transition-all duration-300"
            :style="{ width: usagePercent + '%' }"
          />
        </div>

        <div class="mt-3 flex items-center justify-between text-sm">
          <span class="text-on-surface-variant">
            {{ t('credits.usage_this_month', { credits: formattedMonthlyUsage }) }}
          </span>
          <button
            type="button"
            class="font-semibold text-primary hover:underline"
            @click="goToTopUp"
          >
            {{ t('credits.top_up_credits') }}
          </button>
        </div>
      </section>

      <!-- Billing summary -->
      <section
        class="bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-6 flex flex-col"
      >
        <h2 class="text-card-title mb-1">
          {{ t('credits.billing_summary') }}
        </h2>
        <p class="text-sm text-on-surface-variant mb-4">
          {{ t('credits.billing_summary_description') }}
        </p>

        <div class="grid grid-cols-2 gap-3">
          <div class="bg-surface-container-low rounded p-3">
            <div class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              {{ t('credits.last_top_up') }}
            </div>
            <div class="font-mono text-sm font-semibold text-on-surface">
              {{ lastTopUpAmount }}
            </div>
          </div>
          <div class="bg-surface-container-low rounded p-3">
            <div class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              {{ t('credits.last_invoice') }}
            </div>
            <div class="font-mono text-sm font-semibold text-on-surface">
              {{ lastInvoiceRef }}
            </div>
          </div>
        </div>

        <Button
          :label="t('credits.download_last_invoice')"
          icon="pi pi-download"
          severity="secondary"
          outlined
          class="mt-4 w-full"
          :disabled="!lastTopUpTransaction"
          @click="downloadLastInvoice"
        />
      </section>
    </div>

    <!-- Transaction History -->
    <AppDataTable
      :title="t('credits.transaction_history')"
      :rows="transactions"
      :columns="columns"
      :loading="loading"
      :error="error"
      :total-records="totalRecords"
      :page-size="pageSize"
      :first="currentPage * pageSize"
      lazy
      row-clickable
      export-filename="transactions"
      :empty-title="t('credits.empty.title')"
      :empty-description="t('credits.empty.description')"
      empty-icon="pi-receipt"
      @page-change="onPageChange"
      @row-click="onRowClick"
      @retry="refreshTransactions"
    >
      <template #filter>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ t('credits.date_range') }}
          </label>
          <div class="flex gap-2">
            <Calendar
              v-model="startDate"
              :placeholder="t('credits.start_date')"
              class="flex-1"
              date-format="dd/mm/yy"
              show-icon
            />
            <Calendar
              v-model="endDate"
              :placeholder="t('credits.end_date')"
              class="flex-1"
              date-format="dd/mm/yy"
              show-icon
            />
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ t('credits.filter_type') }}
          </label>
          <Dropdown
            v-model="selectedType"
            :options="transactionTypes"
            option-label="label"
            option-value="value"
            :placeholder="t('common.select')"
            class="w-full"
          />
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-outline-variant/40">
          <Button
            :label="t('common.reset')"
            severity="secondary"
            text
            size="small"
            @click="resetFilters"
          />
          <Button
            :label="t('common.apply')"
            size="small"
            @click="applyFilters"
          />
        </div>
      </template>

      <template #body-created_at="{ data }">
        <span class="font-mono text-sm text-on-surface">{{ formatDateTime((data as Transaction).created_at, localeKey) }}</span>
      </template>

      <template #body-description="{ data }">
        <div class="flex items-center gap-3">
          <span
            class="w-8 h-8 rounded flex items-center justify-center shrink-0"
            :class="iconBgClass((data as Transaction).type)"
          >
            <span class="material-symbols-outlined text-base" :class="iconColorClass((data as Transaction).type)">
              {{ getReasonIcon((data as Transaction).type) }}
            </span>
          </span>
          <span class="text-on-surface text-sm">
            {{ formatReason((data as Transaction).type, (data as Transaction).reason, (data as Transaction).reference) }}
          </span>
        </div>
      </template>

      <template #body-amount="{ data }">
        <span :class="getAmountClass((data as Transaction).type)" class="font-mono font-semibold tabular-nums">
          {{ formatAmount((data as Transaction).type, (data as Transaction).amount) }}
        </span>
      </template>

      <template #body-balance="{ data }">
        <span class="font-mono font-semibold tabular-nums text-on-surface">
          {{ (data as Transaction).balanceAfter !== null ? formatCredits((data as Transaction).balanceAfter!) : '—' }}
        </span>
      </template>
    </AppDataTable>
  </AppPage>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { usePartnerCredits } from '@/composables/usePartnerCredits'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import AppPage from '@/components/common/AppPage.vue'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import AppDataTable, { type AppTableColumn } from '@/components/common/AppDataTable.vue'
import { listTransactions } from '@/services/credits.service'
import { formatNumber, formatDateTime } from '@/lib/formatters'
import { downloadCsv } from '@/lib/csv'

interface Transaction {
  id: number
  type: 'TOPUP' | 'DEBIT' | 'REFUND' | 'EXPIRY'
  amount: number
  balanceAfter: number | null
  reason?: string
  reference?: string
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  created_at: string
  payment_method?: string
}

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const partnerId = computed(() => String(authStore.profile?.company_id ?? ''))
const { credits: partnerCredits } = usePartnerCredits(partnerId)

const transactions = ref<Transaction[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const startDate = ref<Date | null>(null)
const endDate = ref<Date | null>(null)
const selectedType = ref<string | null>(null)
const currentPage = ref(0)
const pageSize = 20
const totalRecords = ref(0)

const columns: AppTableColumn[] = [
  { field: 'created_at', header: 'credits.date', width: '18%' },
  { field: 'description', header: 'credits.type_and_description', width: '47%' },
  { field: 'amount', header: 'credits.amount', width: '17%', align: 'right' },
  { field: 'balance', header: 'credits.column_balance', width: '18%', align: 'right' },
]

const transactionTypes = computed(() => [
  { label: t('credits.all_types'), value: null },
  { label: t('credits.type_topup'), value: 'TOPUP' },
  { label: t('credits.type_debit'), value: 'DEBIT' },
  { label: t('credits.type_refund'), value: 'REFUND' },
  { label: t('credits.type_expiry'), value: 'EXPIRY' },
])

const currentBalance = computed(() => partnerCredits.value?.remainingCredits ?? 0)
const localeKey = computed(() => (locale.value === 'fr' ? 'fr-SN' : 'en-US'))

const formattedBalance = computed(() => formatNumber(currentBalance.value, localeKey.value))

const monthlyUsage = computed(() => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return transactions.value
    .filter((tx) => tx.type === 'DEBIT' && new Date(tx.created_at) >= monthStart)
    .reduce((sum, tx) => sum + tx.amount, 0)
})

const formattedMonthlyUsage = computed(() => formatNumber(monthlyUsage.value, localeKey.value))

const usagePercent = computed(() => {
  const total = monthlyUsage.value + currentBalance.value
  if (total === 0) return 0
  return Math.min(100, Math.round((monthlyUsage.value / total) * 100))
})

const lastTopUpTransaction = computed(() =>
  transactions.value.find((tx) => tx.type === 'TOPUP' && tx.status === 'COMPLETED') ?? null
)

const lastTopUpAmount = computed(() => {
  const tx = lastTopUpTransaction.value
  if (!tx) return t('credits.no_top_up_yet')
  return formatCredits(tx.amount)
})

const lastInvoiceRef = computed(() => {
  const tx = lastTopUpTransaction.value
  if (!tx) return '—'
  return tx.reference ? `#${tx.reference}` : `#INV-${tx.id}`
})

function isInflow(type: Transaction['type']): boolean {
  return type === 'TOPUP' || type === 'REFUND'
}

function formatCredits(amount: number): string {
  return `${formatNumber(amount, localeKey.value)} ${t('credits.credits')}`
}

function formatAmount(type: Transaction['type'], amount: number): string {
  return `${isInflow(type) ? '+' : '-'}${formatCredits(amount)}`
}

function formatReason(type: string, reason?: string, reference?: string): string {
  if (reason) return reason
  if (reference) return `Ref: ${reference}`
  return t(`credits.type_${type.toLowerCase()}`)
}

function getReasonIcon(type: string): string {
  const icons: Record<string, string> = {
    TOPUP: 'add_circle',
    DEBIT: 'cloud',
    REFUND: 'undo',
    EXPIRY: 'schedule',
  }
  return icons[type] || 'help'
}

function iconBgClass(type: string): string {
  switch (type) {
    case 'TOPUP':
      return 'bg-tertiary-container/30'
    case 'REFUND':
      return 'bg-primary/10'
    case 'EXPIRY':
      return 'bg-error-container'
    default:
      return 'bg-surface-container-high'
  }
}

function iconColorClass(type: string): string {
  switch (type) {
    case 'TOPUP':
      return 'text-tertiary'
    case 'REFUND':
      return 'text-primary'
    case 'EXPIRY':
      return 'text-error'
    default:
      return 'text-on-surface-variant'
  }
}

function getAmountClass(type: Transaction['type']): string {
  return isInflow(type) ? 'text-tertiary' : 'text-error'
}

function applyFilters() {
  refreshTransactions()
}

function resetFilters() {
  startDate.value = null
  endDate.value = null
  selectedType.value = null
  refreshTransactions()
}

function goToTopUp() {
  router.push({ name: 'credits-buy' })
}

function downloadLastInvoice() {
  const tx = lastTopUpTransaction.value
  if (!tx) return
  const csv = [
    'invoice,date,amount,status,reference',
    `${lastInvoiceRef.value},${tx.created_at},${tx.amount},${tx.status},${tx.reference ?? ''}`,
  ].join('\n')
  downloadCsv(csv, `${lastInvoiceRef.value}.csv`)
}

async function loadTransactions() {
  try {
    loading.value = true
    error.value = null

    if (!authStore.profile?.company_id) {
      error.value = t('errors.unauthorized')
      return
    }

    const partnerIdValue = String(authStore.profile.company_id)

    const endDateObj = endDate.value ? new Date(endDate.value) : undefined
    if (endDateObj) endDateObj.setHours(23, 59, 59, 999)

    const result = await listTransactions({
      partnerId: partnerIdValue,
      type: selectedType.value as Transaction['type'] | undefined,
      startDate: startDate.value ? startDate.value.toISOString() : undefined,
      endDate: endDateObj ? endDateObj.toISOString() : undefined,
      page: currentPage.value + 1,
      pageSize,
      orderDirection: 'desc',
    })

    transactions.value = result.data as unknown as Transaction[]
    totalRecords.value = result.count
  } catch (err) {
    console.error('Error loading transactions:', err)
    error.value = t('errors.fetch_failed')
  } finally {
    loading.value = false
  }
}

function refreshTransactions() {
  currentPage.value = 0
  loadTransactions()
}

function onPageChange(event: { page: number }) {
  currentPage.value = event.page
  loadTransactions()
}

function onRowClick(row: unknown) {
  const tx = row as Transaction
  router.push({ name: 'credits-transaction-detail', params: { id: tx.id } })
}

onMounted(() => {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 3)
  endDate.value = end
  startDate.value = start
  loadTransactions()
})
</script>
