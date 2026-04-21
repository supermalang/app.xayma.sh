<template>
  <div class="p-lg space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-on-background mb-2">
        {{ $t('credits.history_title') }}
      </h1>
      <p class="text-on-surface-variant">
        {{ $t('credits.history_description') }}
      </p>
    </div>

    <!-- Filters -->
    <div class="flex flex-col md:flex-row gap-4 items-end">
      <div class="flex-1">
        <label class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('credits.date_range') }}
        </label>
        <div class="flex gap-2">
          <Calendar
            v-model="startDate"
            :placeholder="$t('credits.start_date')"
            class="flex-1"
            date-format="dd/mm/yy"
            @date-select="refreshTransactions"
          />
          <Calendar
            v-model="endDate"
            :placeholder="$t('credits.end_date')"
            class="flex-1"
            date-format="dd/mm/yy"
            @date-select="refreshTransactions"
          />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('credits.filter_type') }}
        </label>
        <Dropdown
          v-model="selectedType"
          :options="transactionTypes"
          option-label="label"
          option-value="value"
          :placeholder="$t('common.select')"
          class="w-full md:w-48"
          @change="refreshTransactions"
        />
      </div>
      <Button
        icon="pi pi-refresh"
        class="p-button-secondary"
        @click="refreshTransactions"
      />
    </div>

    <!-- Error state -->
    <Message v-if="error" severity="error" :text="error" closable @close="error = null" />

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Transactions table -->
    <div v-if="!loading && transactions.length > 0" class="overflow-hidden border border-outline/20 rounded">
      <DataTable
        :value="transactions"
        :paginator="true"
        :rows="pageSize"
        :total-records="totalRecords"
        :loading="loading"
        lazy
        @page="onPageChange"
        :first="currentPage * pageSize"
      >
        <Column field="created_at" :header="$t('credits.date')" style="width: 15%">
          <template #body="{ data }">
            <span class="font-mono text-sm">{{ formatDate(data.created_at) }}</span>
          </template>
        </Column>

        <Column field="type" :header="$t('credits.type')" style="width: 15%">
          <template #body="{ data }">
            <Tag :value="data.type" :severity="getTypeSeverity(data.type)" />
          </template>
        </Column>

        <Column field="reason" :header="$t('credits.description')" style="width: 35%">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-lg" :class="getReasonIcon(data.type)">
                {{ getReasonIcon(data.type) }}
              </span>
              <span class="text-on-surface">
                {{ formatReason(data.type, data.reason, data.reference) }}
              </span>
            </div>
          </template>
        </Column>

        <Column field="amount" :header="$t('credits.amount')" style="width: 15%" align="right">
          <template #body="{ data }">
            <span :class="getAmountClass(data.type)" class="font-mono font-semibold">
              {{ formatAmount(data.type, data.amount) }}
            </span>
          </template>
        </Column>

        <Column field="status" :header="$t('credits.status')" style="width: 15%">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>
      </DataTable>

      <!-- Pagination summary -->
      <div class="bg-surface-container-low p-4 text-xs text-on-surface-variant">
        {{ $t('credits.showing', {
          from: currentPage * pageSize + 1,
          to: Math.min((currentPage + 1) * pageSize, totalRecords),
          total: totalRecords,
        }) }}
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!loading && transactions.length === 0" class="text-center py-12">
      <span class="material-symbols-outlined text-6xl text-on-surface-variant/30 block mb-4">
        receipt_long
      </span>
      <p class="text-on-surface-variant">{{ $t('credits.no_transactions') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { listTransactions } from '@/services/credits.service'

interface Transaction {
  id: string
  type: 'TOPUP' | 'DEBIT' | 'REFUND' | 'EXPIRY'
  amount: number
  reason?: string
  reference?: string
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  created_at: string
  payment_method?: string
}

const { t } = useI18n()

const transactions = ref<Transaction[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const startDate = ref<Date | null>(null)
const endDate = ref<Date | null>(null)
const selectedType = ref<string | null>(null)
const currentPage = ref(0)
const pageSize = 20
const totalRecords = ref(0)

// Transaction types for filter dropdown
const transactionTypes = computed(() => [
  { label: t('credits.all_types'), value: null },
  { label: 'Top-up', value: 'TOPUP' },
  { label: 'Debit', value: 'DEBIT' },
  { label: 'Refund', value: 'REFUND' },
  { label: 'Expiry', value: 'EXPIRY' },
])

// Format date to ISO 8601
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-SN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// Format amount with sign
function formatAmount(type: string, amount: number): string {
  const sign = type === 'TOPUP' || type === 'REFUND' ? '+' : '−'
  return `${sign} ${amount.toLocaleString('fr-SN')} FCFA`
}

// Format transaction reason/description
function formatReason(type: string, reason?: string, reference?: string): string {
  if (reason) return reason
  if (reference) return `Ref: ${reference}`
  return t(`credits.type_${type.toLowerCase()}`)
}

// Get icon based on transaction type
function getReasonIcon(type: string): string {
  const icons: Record<string, string> = {
    TOPUP: 'add_circle',
    DEBIT: 'remove_circle',
    REFUND: 'undo',
    EXPIRY: 'schedule',
  }
  return icons[type] || 'help'
}

// Get severity for transaction type badge
function getTypeSeverity(type: string): string {
  const severities: Record<string, string> = {
    TOPUP: 'success',
    DEBIT: 'info',
    REFUND: 'warning',
    EXPIRY: 'danger',
  }
  return severities[type] || 'secondary'
}

// Get severity for status badge
function getStatusSeverity(status: string): string {
  const severities: Record<string, string> = {
    COMPLETED: 'success',
    PENDING: 'warning',
    FAILED: 'danger',
  }
  return severities[status] || 'secondary'
}

// Get CSS class for amount display
function getAmountClass(type: string): string {
  if (type === 'TOPUP' || type === 'REFUND') {
    return 'text-tertiary'
  } else {
    return 'text-error'
  }
}

// Fetch transactions from API
async function loadTransactions() {
  try {
    loading.value = true
    error.value = null

    const authStore = useAuthStore()
    if (!authStore.profile?.company_id) {
      error.value = t('errors.unauthorized')
      return
    }

    const partnerId = String(authStore.profile.company_id)

    const result = await listTransactions({
      partnerId,
      type: selectedType.value as any,
      startDate: startDate.value ? startDate.value.toISOString() : undefined,
      endDate: endDate.value
        ? new Date(endDate.value).setHours(23, 59, 59, 999)
        : undefined,
      page: currentPage.value + 1,
      pageSize,
      orderDirection: 'desc',
    })

    transactions.value = result.data
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

function onPageChange(event: any) {
  currentPage.value = event.page
  loadTransactions()
}

onMounted(() => {
  // Set default date range (last 3 months)
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
  background: var(--surface-container-high);
  color: var(--on-surface);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
}

:deep(.p-datatable .p-datatable-tbody > tr) {
  border-bottom: 1px solid var(--outline-variant);
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background-color: var(--surface-container-low);
}
</style>
