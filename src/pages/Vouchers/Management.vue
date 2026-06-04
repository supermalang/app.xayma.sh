<template>
  <AppPage>
    <!-- Header -->
    <AppPageHeader
      :title="$t('vouchers.management_title')"
      :description="$t('vouchers.management_description')"
    >
      <template #actions>
        <Button
          :label="$t('vouchers.generate_vouchers')"
          icon="pi pi-plus"
          class="p-button-primary"
          @click="showGenerateDialog = true"
        />
      </template>
    </AppPageHeader>

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

    <!-- Vouchers table -->
    <AppDataTable
      :rows="vouchers"
      :columns="columns"
      :loading="loading"
      :error="error"
      :total-records="totalRecords"
      :page-size="pageSize"
      :first="currentPage * pageSize"
      lazy
      export-filename="vouchers"
      :empty-title="$t('vouchers.empty.title')"
      :empty-description="$t('vouchers.empty.description')"
      empty-icon="pi-ticket"
      @page-change="onPageChange"
      @retry="refreshVouchers"
    >
      <template #filter>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ $t('vouchers.filter_status') }}
          </label>
          <Dropdown
            v-model="filterInputs.status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('common.select')"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ $t('vouchers.filter_type') }}
          </label>
          <Dropdown
            v-model="filterInputs.partnerType"
            :options="partnerTypeOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('common.select')"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ $t('common.search') }}
          </label>
          <InputText
            v-model="filterInputs.search"
            :placeholder="$t('vouchers.search_code')"
            class="w-full"
          />
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-outline-variant/40">
          <Button
            :label="$t('common.reset')"
            severity="secondary"
            text
            size="small"
            @click="resetFilters"
          />
          <Button
            :label="$t('common.apply')"
            size="small"
            @click="applyFilters"
          />
        </div>
      </template>

      <template #emptyAction>
        <Button
          :label="$t('vouchers.generate_vouchers')"
          icon="pi pi-plus"
          @click="showGenerateDialog = true"
        />
      </template>

      <template #body-code="{ data }">
        <span class="font-mono text-sm font-semibold">{{ (data as VoucherRow).code }}</span>
      </template>

      <template #body-credits_value="{ data }">
        <span class="font-mono">{{ formatNumber((data as VoucherRow).credits_value) }}</span>
      </template>

      <template #body-expiry_date="{ data }">
        <span class="text-sm">{{ formatDate((data as VoucherRow).expiry_date) }}</span>
      </template>

      <template #body-uses_count="{ data }">
        <ProgressBar :value="((data as VoucherRow).uses_count / (data as VoucherRow).max_uses) * 100" :show-value="false" />
        <span class="text-xs text-on-surface-variant">{{ (data as VoucherRow).uses_count }}/{{ (data as VoucherRow).max_uses }}</span>
      </template>

      <template #body-partner_type="{ data }">
        <Tag
          v-if="(data as VoucherRow).partner_type"
          :value="(data as VoucherRow).partner_type"
          :severity="(data as VoucherRow).partner_type === 'RESELLER' ? 'success' : 'info'"
        />
        <span v-else class="text-xs text-on-surface-variant">{{ $t('vouchers.all') }}</span>
      </template>

      <template #body-status="{ data }">
        <Tag :value="(data as VoucherRow).status" :severity="getStatusSeverity((data as VoucherRow).status)" />
      </template>

      <template #rowActions="{ data }">
        <Button
          v-if="(data as VoucherRow).status === 'ACTIVE'"
          v-tooltip="$t('vouchers.deactivate_tooltip')"
          icon="pi pi-ban"
          class="p-button-rounded p-button-text p-button-danger"
          @click="deactivateVoucher((data as VoucherRow).id)"
        />
        <span v-else class="text-xs text-on-surface-variant">—</span>
      </template>
    </AppDataTable>

    <!-- Generate vouchers dialog -->
    <GenerateVouchersDialog v-model:visible="showGenerateDialog" @created="onVouchersCreated" />
  </AppPage>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import vTooltip from 'primevue/tooltip'
import AppPage from '@/components/common/AppPage.vue'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import AppDataTable, { type AppTableColumn } from '@/components/common/AppDataTable.vue'
import GenerateVouchersDialog from '@/components/vouchers/GenerateVouchersDialog.vue'
import { listVouchers, getVoucherStats, deactivateVoucher as callDeactivate } from '@/services/vouchers.service'

interface VoucherRow {
  id: number
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

const filterInputs = ref({
  status: null as string | null,
  partnerType: null as string | null,
  search: '',
})

const currentPage = ref(0)
const pageSize = 20
const totalRecords = ref(0)

const columns: AppTableColumn[] = [
  { field: 'code', header: 'vouchers.code', width: '15%' },
  { field: 'credits_value', header: 'vouchers.credits', width: '12%', align: 'right' },
  { field: 'expiry_date', header: 'vouchers.expiry', width: '15%' },
  { field: 'uses_count', header: 'vouchers.usage', width: '12%' },
  { field: 'partner_type', header: 'vouchers.partner_type', width: '12%' },
  { field: 'status', header: 'vouchers.status', width: '15%' },
]

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

    vouchers.value = result.data as unknown as VoucherRow[]
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

function applyFilters() {
  filters.value = { ...filterInputs.value }
  refreshVouchers()
}

function resetFilters() {
  filterInputs.value = { status: null, partnerType: null, search: '' }
  filters.value = { status: null, partnerType: null, search: '' }
  refreshVouchers()
}

function onPageChange(event: { page: number }) {
  currentPage.value = event.page
  loadVouchers()
}

async function deactivateVoucher(voucherId: number) {
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
</style>
