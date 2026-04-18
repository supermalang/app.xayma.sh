<template>
  <div class="p-lg space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-on-background mb-2">
          {{ $t('vouchers.management_title') }}
        </h1>
        <p class="text-on-surface-variant">
          {{ $t('vouchers.management_description') }}
        </p>
      </div>
      <Button
        :label="$t('vouchers.generate_vouchers')"
        icon="pi pi-plus"
        class="p-button-primary"
        @click="showGenerateDialog = true"
      />
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card class="stat-card">
        <template #content>
          <p class="text-xs uppercase tracking-wider text-on-surface-variant mb-1">
            {{ $t('vouchers.total_active') }}
          </p>
          <p class="text-2xl font-bold font-mono text-on-surface">{{ stats.activeCount }}</p>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <p class="text-xs uppercase tracking-wider text-on-surface-variant mb-1">
            {{ $t('vouchers.total_inactive') }}
          </p>
          <p class="text-2xl font-bold font-mono text-on-surface">{{ stats.inactiveCount }}</p>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <p class="text-xs uppercase tracking-wider text-on-surface-variant mb-1">
            {{ $t('vouchers.credits_distributed') }}
          </p>
          <p class="text-2xl font-bold font-mono text-tertiary">
            {{ formatNumber(stats.totalCreditsDistributed) }}
          </p>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <p class="text-xs uppercase tracking-wider text-on-surface-variant mb-1">
            {{ $t('vouchers.credits_redeemed') }}
          </p>
          <p class="text-2xl font-bold font-mono text-on-surface">
            {{ formatNumber(stats.totalCreditsRedeemed) }}
          </p>
        </template>
      </Card>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 items-end flex-wrap">
      <div>
        <label class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('vouchers.filter_status') }}
        </label>
        <Dropdown
          v-model="filters.status"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('common.select')"
          class="w-full md:w-48"
          @change="refreshVouchers"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('vouchers.filter_type') }}
        </label>
        <Dropdown
          v-model="filters.partnerType"
          :options="partnerTypeOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('common.select')"
          class="w-full md:w-48"
          @change="refreshVouchers"
        />
      </div>
      <div class="flex-1">
        <label class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('common.search') }}
        </label>
        <InputText
          v-model="filters.search"
          :placeholder="$t('vouchers.search_code')"
          class="w-full"
          @keyup="debouncedSearch"
        />
      </div>
      <Button
        icon="pi pi-refresh"
        class="p-button-secondary"
        @click="refreshVouchers"
      />
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Error state -->
    <Message v-if="error" severity="error" :text="error" closable @close="error = null" />

    <!-- Vouchers table -->
    <div v-if="!loading && vouchers.length > 0" class="overflow-hidden border border-outline/20 rounded">
      <DataTable
        :value="vouchers"
        :paginator="true"
        :rows="pageSize"
        :total-records="totalRecords"
        :loading="loading"
        lazy
        @page="onPageChange"
        :first="currentPage * pageSize"
      >
        <Column field="code" :header="$t('vouchers.code')" style="width: 15%">
          <template #body="{ data }">
            <span class="font-mono text-sm font-semibold">{{ data.code }}</span>
          </template>
        </Column>

        <Column field="credits_value" :header="$t('vouchers.credits')" style="width: 12%" align="right">
          <template #body="{ data }">
            <span class="font-mono">{{ formatNumber(data.credits_value) }}</span>
          </template>
        </Column>

        <Column field="expiry_date" :header="$t('vouchers.expiry')" style="width: 15%">
          <template #body="{ data }">
            <span class="text-sm">{{ formatDate(data.expiry_date) }}</span>
          </template>
        </Column>

        <Column field="uses_count" :header="$t('vouchers.usage')" style="width: 12%">
          <template #body="{ data }">
            <ProgressBar :value="(data.uses_count / data.max_uses) * 100" :show-value="false" />
            <span class="text-xs text-on-surface-variant">{{ data.uses_count }}/{{ data.max_uses }}</span>
          </template>
        </Column>

        <Column field="partner_type" :header="$t('vouchers.partner_type')" style="width: 12%">
          <template #body="{ data }">
            <Tag
              v-if="data.partner_type"
              :value="data.partner_type"
              :severity="data.partner_type === 'RESELLER' ? 'success' : 'info'"
            />
            <span v-else class="text-xs text-on-surface-variant">{{ $t('vouchers.all') }}</span>
          </template>
        </Column>

        <Column field="status" :header="$t('vouchers.status')" style="width: 15%">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>

        <Column :header="$t('common.actions')" style="width: 10%">
          <template #body="{ data }">
            <Button
              v-if="data.status === 'ACTIVE'"
              icon="pi pi-ban"
              class="p-button-rounded p-button-text p-button-danger"
              @click="deactivateVoucher(data.id)"
              v-tooltip="$t('vouchers.deactivate_tooltip')"
            />
            <span v-else class="text-xs text-on-surface-variant">—</span>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Empty state -->
    <div v-if="!loading && vouchers.length === 0" class="text-center py-12">
      <span class="material-symbols-outlined text-6xl text-on-surface-variant/30 block mb-4">
        card_giftcard
      </span>
      <p class="text-on-surface-variant">{{ $t('vouchers.no_vouchers') }}</p>
    </div>

    <!-- Generate vouchers dialog -->
    <GenerateVouchersDialog v-model:visible="showGenerateDialog" @created="onVouchersCreated" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { Tooltip as vTooltip } from 'primevue/tooltip'
import GenerateVouchersDialog from '@/components/vouchers/GenerateVouchersDialog.vue'
import { listVouchers, getVoucherStats, deactivateVoucher as callDeactivate } from '@/services/vouchers.service'

interface VoucherRow {
  id: string
  code: string
  credits_value: number
  max_uses: number
  uses_count: number
  expiry_date: string
  status: 'ACTIVE' | 'INACTIVE' | 'FULLY_REDEEMED'
  partner_type?: 'CUSTOMER' | 'RESELLER'
}

interface Stats {
  activeCount: number
  inactiveCount: number
  fullyRedeemedCount: number
  totalCreditsDistributed: number
  totalCreditsRedeemed: number
}

const { t } = useI18n()

const vouchers = ref<VoucherRow[]>([])
const stats = ref<Stats>({
  activeCount: 0,
  inactiveCount: 0,
  fullyRedeemedCount: 0,
  totalCreditsDistributed: 0,
  totalCreditsRedeemed: 0,
})

const loading = ref(true)
const error = ref<string | null>(null)
const showGenerateDialog = ref(false)

const filters = ref({
  status: null as string | null,
  partnerType: null as string | null,
  search: '',
})

const currentPage = ref(0)
const pageSize = 20
const totalRecords = ref(0)

const statusOptions = computed(() => [
  { label: t('vouchers.all_statuses'), value: null },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Fully Redeemed', value: 'FULLY_REDEEMED' },
])

const partnerTypeOptions = computed(() => [
  { label: t('vouchers.all'), value: null },
  { label: 'Customer', value: 'CUSTOMER' },
  { label: 'Reseller', value: 'RESELLER' },
])

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-SN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatNumber(num: number): string {
  return num.toLocaleString('fr-SN')
}

function getStatusSeverity(status: string): string {
  const severities: Record<string, string> = {
    ACTIVE: 'success',
    INACTIVE: 'warning',
    FULLY_REDEEMED: 'info',
  }
  return severities[status] || 'secondary'
}

async function loadVouchers() {
  try {
    loading.value = true
    error.value = null

    const result = await listVouchers({
      status: filters.value.status as any,
      partnerType: filters.value.partnerType as any,
      search: filters.value.search || undefined,
      page: currentPage.value + 1,
      pageSize,
      orderDirection: 'desc',
    })

    vouchers.value = result.data
    totalRecords.value = result.count

    // Load stats
    const statsData = await getVoucherStats()
    stats.value = statsData
  } catch (err) {
    console.error('Error loading vouchers:', err)
    error.value = t('errors.fetch_failed')
  } finally {
    loading.value = false
  }
}

async function refreshVouchers() {
  currentPage.value = 0
  loadVouchers()
}

function debouncedSearch() {
  // Debounce search to avoid excessive queries
  clearTimeout((window as any).__searchTimeout)
  ;(window as any).__searchTimeout = setTimeout(() => {
    refreshVouchers()
  }, 500)
}

function onPageChange(event: any) {
  currentPage.value = event.page
  loadVouchers()
}

async function deactivateVoucher(voucherId: string) {
  if (!confirm(t('vouchers.confirm_deactivate'))) {
    return
  }

  try {
    await callDeactivate(voucherId)
    await loadVouchers()
  } catch (err) {
    console.error('Error deactivating voucher:', err)
    error.value = t('errors.webhook_failed')
  }
}

function onVouchersCreated() {
  showGenerateDialog.value = false
  refreshVouchers()
}

onMounted(() => {
  loadVouchers()
})
</script>

<style scoped>
.stat-card {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-lowest);
}

:deep(.p-datatable) {
  font-size: 0.875rem;
}
</style>
