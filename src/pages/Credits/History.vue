<template>
  <div class="p-lg w-full space-y-6">
    <!-- Page header -->
    <header class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="max-w-2xl">
        <h1 class="text-3xl font-extrabold tracking-tight text-on-background mb-2">
          {{ t('credits.page_title') }}
        </h1>
        <p class="text-on-surface-variant">
          {{ t('credits.page_description') }}
        </p>
      </div>
      <Button
        icon="pi pi-credit-card"
        :label="t('credits.top_up_credits')"
        @click="goToTopUp"
      />
    </header>

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
        <h2 class="text-base font-bold text-on-surface mb-1">
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
    <section
      class="bg-surface-container-lowest border border-outline-variant/40 rounded-lg overflow-hidden"
    >
      <header
        class="flex flex-col gap-3 p-6 pb-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <h2 class="text-lg font-bold text-on-surface">
          {{ t('credits.transaction_history') }}
        </h2>
        <div class="flex items-center gap-2">
          <Button
            :label="t('credits.filter')"
            icon="pi pi-filter"
            severity="secondary"
            outlined
            size="small"
            @click="toggleFilter"
          />
          <Button
            :label="t('credits.export_csv')"
            icon="pi pi-download"
            severity="secondary"
            outlined
            size="small"
            :disabled="transactions.length === 0"
            @click="exportCsv"
          />
        </div>
      </header>

      <Popover ref="filterPopover" class="w-80">
        <div class="space-y-4">
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
              :label="t('credits.reset_filters')"
              severity="secondary"
              text
              size="small"
              @click="resetFilters"
            />
            <Button
              :label="t('credits.apply_filters')"
              size="small"
              @click="applyFilters"
            />
          </div>
        </div>
      </Popover>

      <Message
        v-if="error"
        severity="error"
        :closable="true"
        class="mx-6 mb-4"
        @close="error = null"
      >
        {{ error }}
      </Message>

      <div v-if="loading" class="flex justify-center py-16">
        <ProgressSpinner />
      </div>

      <div v-else-if="transactions.length === 0" class="text-center py-16">
        <span class="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">
          receipt_long
        </span>
        <p class="text-on-surface-variant">{{ t('credits.no_transactions') }}</p>
      </div>

      <DataTable
        v-else
        :value="transactions"
        :paginator="true"
        :rows="pageSize"
        :total-records="totalRecords"
        :loading="loading"
        lazy
        :first="currentPage * pageSize"
        row-hover
        class="cursor-pointer"
        @page="onPageChange"
        @row-click="onRowClick"
      >
        <Column field="created_at" :header="t('credits.date')" style="width: 18%">
          <template #body="{ data }">
            <span class="font-mono text-sm text-on-surface">{{ formatDate(data.created_at) }}</span>
          </template>
        </Column>

        <Column :header="t('credits.type_and_description')" style="width: 47%">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <span
                class="w-8 h-8 rounded flex items-center justify-center shrink-0"
                :class="iconBgClass(data.type)"
              >
                <span class="material-symbols-outlined text-base" :class="iconColorClass(data.type)">
                  {{ getReasonIcon(data.type) }}
                </span>
              </span>
              <span class="text-on-surface text-sm">
                {{ formatReason(data.type, data.reason, data.reference) }}
              </span>
            </div>
          </template>
        </Column>

        <Column field="amount" :header="t('credits.amount')" style="width: 17%" align="right">
          <template #body="{ data }">
            <span :class="getAmountClass(data.type)" class="font-mono font-semibold tabular-nums">
              {{ formatAmount(data.type, data.amount) }}
            </span>
          </template>
        </Column>

        <Column :header="t('credits.column_balance')" style="width: 18%" align="right">
          <template #body="{ data }">
            <span class="font-mono font-semibold tabular-nums text-on-surface">
              {{ data.balanceAfter !== null ? formatBalance(data.balanceAfter) : '—' }}
            </span>
          </template>
        </Column>
      </DataTable>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { DataTableRowClickEvent } from 'primevue/datatable'
import { useAuthStore } from '@/stores/auth.store'
import { usePartnerCredits } from '@/composables/usePartnerCredits'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Popover from 'primevue/popover'
import ProgressSpinner from 'primevue/progressspinner'
import { listTransactions } from '@/services/credits.service'

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

const filterPopover = ref<InstanceType<typeof Popover>>()

const transactionTypes = computed(() => [
  { label: t('credits.all_types'), value: null },
  { label: t('credits.type_topup'), value: 'TOPUP' },
  { label: t('credits.type_debit'), value: 'DEBIT' },
  { label: t('credits.type_refund'), value: 'REFUND' },
  { label: t('credits.type_expiry'), value: 'EXPIRY' },
])

const currentBalance = computed(() => partnerCredits.value?.remainingCredits ?? 0)

const formattedBalance = computed(() =>
  currentBalance.value.toLocaleString(locale.value === 'fr' ? 'fr-SN' : 'en-US')
)

const monthlyUsage = computed(() => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return transactions.value
    .filter((tx) => tx.type === 'DEBIT' && new Date(tx.created_at) >= monthStart)
    .reduce((sum, tx) => sum + tx.amount, 0)
})

const formattedMonthlyUsage = computed(() =>
  monthlyUsage.value.toLocaleString(locale.value === 'fr' ? 'fr-SN' : 'en-US')
)

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
  return `${tx.amount.toLocaleString(locale.value === 'fr' ? 'fr-SN' : 'en-US')} ${t('credits.credits')}`
})

const lastInvoiceRef = computed(() => {
  const tx = lastTopUpTransaction.value
  if (!tx) return '—'
  return tx.reference ? `#${tx.reference}` : `#INV-${tx.id}`
})

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const fmt = locale.value === 'fr' ? 'fr-SN' : 'en-US'
  return `${date.toLocaleDateString(fmt, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })} ${date.toLocaleTimeString(fmt, { hour: '2-digit', minute: '2-digit' })}`
}

function formatAmount(type: string, amount: number): string {
  const sign = type === 'TOPUP' || type === 'REFUND' ? '+' : '-'
  return `${sign}${amount.toLocaleString(locale.value === 'fr' ? 'fr-SN' : 'en-US')} ${t('credits.credits')}`
}

function formatBalance(balance: number): string {
  return `${balance.toLocaleString(locale.value === 'fr' ? 'fr-SN' : 'en-US')} ${t('credits.credits')}`
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

function getAmountClass(type: string): string {
  return type === 'TOPUP' || type === 'REFUND' ? 'text-tertiary' : 'text-error'
}

function toggleFilter(event: Event) {
  filterPopover.value?.toggle(event)
}

function applyFilters() {
  filterPopover.value?.hide()
  refreshTransactions()
}

function resetFilters() {
  startDate.value = null
  endDate.value = null
  selectedType.value = null
  filterPopover.value?.hide()
  refreshTransactions()
}

function goToTopUp() {
  router.push({ name: 'credits-buy' })
}

function downloadLastInvoice() {
  const tx = lastTopUpTransaction.value
  if (!tx) return
  const lines = [
    'invoice,date,amount,status,reference',
    `${lastInvoiceRef.value},${tx.created_at},${tx.amount},${tx.status},${tx.reference ?? ''}`,
  ]
  triggerCsvDownload(lines.join('\n'), `${lastInvoiceRef.value}.csv`)
}

function exportCsv() {
  const header = ['date', 'type', 'description', 'amount', 'status']
  const rows = transactions.value.map((tx) => [
    tx.created_at,
    tx.type,
    formatReason(tx.type, tx.reason, tx.reference).replace(/,/g, ' '),
    String(tx.amount),
    tx.status,
  ])
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
  triggerCsvDownload(csv, `transactions-${new Date().toISOString().slice(0, 10)}.csv`)
}

function triggerCsvDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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

function onRowClick(event: DataTableRowClickEvent) {
  const row = event.data as Transaction
  router.push({ name: 'credits-transaction-detail', params: { id: row.id } })
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

<style scoped>
:deep(.p-datatable) {
  font-size: 0.875rem;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  background: var(--surface-container-low);
  color: var(--on-surface-variant);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
}

:deep(.p-datatable .p-datatable-tbody > tr) {
  border-bottom: 1px solid var(--outline-variant);
}

:deep(.p-datatable .p-datatable-tbody > tr:last-child) {
  border-bottom: none;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background-color: var(--surface-container-low);
}
</style>
