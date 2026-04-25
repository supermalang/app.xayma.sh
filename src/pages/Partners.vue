<template>
  <div class="space-y-6">
    <!-- Page header with create button -->
    <div class="header-section flex items-center justify-between">
      <h1 class="text-3xl font-bold text-on-surface">{{ $t('partners.title') }}</h1>
      <Button
        :label="$t('common.create')"
        icon="pi pi-plus"
        @click="showCreateDialog"
      />
    </div>

    <!-- Filters -->
    <transition name="filters-fade">
      <div key="filters" class="flex gap-4 flex-wrap filter-section">
        <Dropdown
          v-model="filters.status"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('partners.form.status')"
          class="w-40"
          show-clear
          @change="applyFilters"
        />
        <Dropdown
          v-model="filters.partner_type"
          :options="partnerTypeOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('partners.form.type')"
          class="w-40"
          show-clear
          @change="applyFilters"
        />
      </div>
    </transition>

    <!-- DataTable with lazy-load animation -->
    <transition name="table-fade">
      <div key="table" class="table-container">
        <AppDataTable
          :rows="partners"
          :columns="tableColumns"
          :loading="isLoading"
          :total-records="totalRecords"
          :page-size="pageSize"
          paginator
          lazy
          :row-class="getRowClass"
          @page-change="handlePageChange"
          @search="handleSearch"
        >
          <!-- Status column -->
          <template #body-status="{ data }">
            <PartnerStatusBadge
              :status="data.status"
              :class="{ 'status-badge-pulse': data.status === 'suspended' }"
            />
          </template>

          <!-- Type column -->
          <template #body-partner_type="{ data }">
            <PartnerTypeBadge
              :type="data.partner_type"
              :class="{ 'type-reseller-highlight': data.partner_type === 'reseller' }"
            />
          </template>

          <!-- Actions column -->
          <template #actions="{ data }">
            <div class="flex gap-2 action-buttons">
              <Button
                icon="pi pi-eye"
                class="p-button-rounded p-button-text p-button-sm"
                :title="$t('common.view')"
                @click="goToPartnerDetail(data.id)"
              />
              <Button
                icon="pi pi-pencil"
                class="p-button-rounded p-button-text p-button-sm"
                :title="$t('common.edit')"
                @click="editPartner(data)"
              />
              <Button
                icon="pi pi-trash"
                class="p-button-rounded p-button-text p-button-sm p-button-danger"
                :title="$t('common.delete')"
                @click="deletePartner(data.id)"
              />
            </div>
          </template>
        </AppDataTable>
      </div>
    </transition>

    <!-- Create/Edit Dialog -->
    <transition name="dialog-slide-up">
      <div v-if="showDialog" key="dialog" class="dialog-wrapper">
        <Dialog
          v-model:visible="showDialog"
          :header="isEditingPartner ? $t('common.edit') : $t('common.create')"
          modal
          :style="{ width: '90vw', maxWidth: '600px' }"
        >
          <PartnerForm
            :initial-data="editingPartner"
            :is-loading="isSubmitting"
            @submit="handleFormSubmit"
            @cancel="closeDialog"
          />
        </Dialog>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePartnerStore } from '@/stores/partner.store'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import AppDataTable from '@/components/common/AppDataTable.vue'
import PartnerForm from '@/components/partners/PartnerForm.vue'
import PartnerStatusBadge from '@/components/partners/PartnerStatusBadge.vue'
import PartnerTypeBadge from '@/components/partners/PartnerTypeBadge.vue'

const router = useRouter()
const { t } = useI18n()
const partnerStore = usePartnerStore()

// State
const isLoading = ref(false)
const isSubmitting = ref(false)
const showDialog = ref(false)
const editingPartner = ref<any>(null)
const pageSize = ref(20)
const totalRecords = ref(0)

const filters = ref({
  status: '',
  partner_type: '',
  search: '',
})

// Options
const statusOptions = [
  { label: t('partners.status.active'), value: 'active' },
  { label: t('partners.status.suspended'), value: 'suspended' },
  { label: t('partners.status.inactive'), value: 'inactive' },
]

const partnerTypeOptions = [
  { label: t('partners.type.customer'), value: 'customer' },
  { label: t('partners.type.reseller'), value: 'reseller' },
]

const tableColumns = [
  { field: 'name', header: 'partners.table.name' },
  { field: 'email', header: 'partners.table.email' },
  { field: 'phone', header: 'partners.table.phone' },
  { field: 'partner_type', header: 'partners.table.type' },
  { field: 'status', header: 'partners.table.status' },
  { field: 'remainingCredits', header: 'partners.table.credits' },
]

const partners = computed(() => partnerStore.partners)
const isEditingPartner = computed(() => !!editingPartner.value?.id)

// Get row animation class for lazy-load stagger
const getRowClass = (row: any, index: number) => {
  if (isLoading.value) return ''
  return `lazy-row` // Add data-index via CSS nth-child selector
}

// Load partners
const loadPartners = async (page = 1) => {
  try {
    isLoading.value = true
    const result = await partnerStore.fetchPartners({
      page,
      pageSize: pageSize.value,
      ...filters.value,
    })
    totalRecords.value = result.count
  } catch (error) {
    console.error('Failed to load partners:', error)
  } finally {
    isLoading.value = false
  }
}

// Handle page change
const handlePageChange = (event: any) => {
  const page = event.first / event.rows + 1
  loadPartners(page)
}

// Handle search
const handleSearch = (search: string) => {
  filters.value.search = search
  loadPartners(1)
}

// Apply filters
const applyFilters = () => {
  loadPartners(1)
}

// Dialog handlers
const showCreateDialog = () => {
  editingPartner.value = null
  showDialog.value = true
}

const editPartner = (partner: any) => {
  editingPartner.value = partner
  showDialog.value = true
}

const closeDialog = () => {
  editingPartner.value = null
  showDialog.value = false
}

// Form submission
const handleFormSubmit = async (values: any) => {
  try {
    isSubmitting.value = true
    if (isEditingPartner.value) {
      await partnerStore.updatePartner(editingPartner.value.id, values)
    } else {
      await partnerStore.createPartner(values)
    }
    closeDialog()
    loadPartners(1)
  } catch (error) {
    console.error('Failed to save partner:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Delete partner
const deletePartner = async (id: number) => {
  if (confirm(t('partners.confirm_delete'))) {
    try {
      await partnerStore.deletePartner(id)
      loadPartners(1)
    } catch (error) {
      console.error('Failed to delete partner:', error)
    }
  }
}

// Navigate to partner detail
const goToPartnerDetail = (id: number) => {
  router.push(`/partners/${id}`)
}

// Lifecycle
onMounted(() => {
  loadPartners()
})
</script>

<style scoped>
:deep(.p-datatable) {
  --p-datatable-border-color: var(--outline-variant);
}

.header-section {
  animation: header-enter var(--duration-standard) var(--easing-standard);
}

.filter-section {
  animation: filter-bar-enter var(--duration-standard) var(--easing-standard) 100ms backwards;
}

.filters-fade-enter-active,
.filters-fade-leave-active {
  animation: filter-bar-enter var(--duration-micro) var(--easing-standard);
}

.filters-fade-leave-active {
  animation-direction: reverse;
}

.table-container {
  animation: table-enter var(--duration-standard) var(--easing-standard) 200ms backwards;
}

.table-fade-enter-active {
  animation: table-enter var(--duration-standard) var(--easing-standard);
}

.table-fade-leave-active {
  animation: table-enter var(--duration-micro) var(--easing-standard) reverse;
}

.dialog-wrapper {
  animation: dialog-appear var(--duration-standard) var(--easing-standard);
}

.dialog-slide-up-enter-active {
  animation: dialog-appear var(--duration-standard) var(--easing-standard);
}

.dialog-slide-up-leave-active {
  animation: dialog-appear var(--duration-micro) var(--easing-standard) reverse;
}

:deep(.status-badge-pulse) {
  animation: status-badge-pulse 1.5s var(--easing-pulse) infinite;
}

:deep(.action-buttons button) {
  transition: var(--transition-smooth);
}

:deep(.action-buttons button:hover) {
  transform: scale(1.1);
}

:deep(.type-reseller-highlight .p-tag) {
  background-color: #e8f0ff !important;
  color: #00288e !important;
  border: 1px solid #1e40af;
}

:deep(.p-dropdown:focus) {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 0.2rem rgba(0, 40, 142, 0.1) !important;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background-color: #eff4ff !important;
  transition: background-color var(--duration-standard) var(--easing-standard);
}

:deep(.p-datatable .p-datatable-thead > tr) {
  background-color: #eaeef7 !important;
}

:deep(.p-tag-success) {
  background: #00b341 !important;
  color: #ffffff !important;
}

:deep(.p-tag-warning) {
  background: #fd761a !important;
  color: #ffffff !important;
}

:deep(.p-tag-info) {
  background: #1e40af !important;
  color: #ffffff !important;
}

/* Lazy-load row animations for DataTable
 * Rows fade in with staggered timing as pagination loads
 * 40ms per-row delay creates smooth reveal without overwhelming
 * Respects prefers-reduced-motion for accessibility
 */
:deep(.lazy-row) {
  animation: row-fade-in var(--duration-micro) var(--easing-standard) backwards;
}

:deep(.lazy-row:nth-child(1)) {
  animation-delay: 0ms;
}

:deep(.lazy-row:nth-child(2)) {
  animation-delay: 40ms;
}

:deep(.lazy-row:nth-child(3)) {
  animation-delay: 80ms;
}

:deep(.lazy-row:nth-child(4)) {
  animation-delay: 120ms;
}

:deep(.lazy-row:nth-child(5)) {
  animation-delay: 160ms;
}

:deep(.lazy-row:nth-child(6)) {
  animation-delay: 200ms;
}

:deep(.lazy-row:nth-child(7)) {
  animation-delay: 240ms;
}

:deep(.lazy-row:nth-child(8)) {
  animation-delay: 280ms;
}

:deep(.lazy-row:nth-child(9)) {
  animation-delay: 320ms;
}

:deep(.lazy-row:nth-child(10)) {
  animation-delay: 360ms;
}

:deep(.lazy-row:nth-child(n+11)) {
  animation-delay: 400ms;
}

@keyframes row-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Skeleton loading state (when isLoading = true)
 * Placeholder rows have subtle pulsing to indicate loading
 */
:deep(.p-datatable-tbody > tr.skeleton-row) {
  background: var(--surface-container-lowest) !important;
  opacity: 0.6;
  animation: skeleton-pulse 2s var(--easing-pulse) infinite;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.4;
  }
}

/* Row selection animation
 * When user checks a row checkbox, highlight animates in
 * Used for batch operations (select multiple partners)
 */
:deep(.p-datatable-tbody > tr.selected) {
  background-color: rgba(0, 40, 142, 0.05) !important;
  transition: background-color var(--duration-micro) var(--easing-standard);
}

/* Loading spinner state for table
 * When paginating to new page, table briefly fades to indicate refresh
 */
.table-fade-enter-active {
  animation: table-enter var(--duration-standard) var(--easing-standard);
}

.table-fade-leave-active {
  animation: table-enter var(--duration-micro) var(--easing-standard) reverse;
}

/* Accessibility: Respect prefers-reduced-motion
 * Disable staggered animations for users who find motion uncomfortable
 */
@media (prefers-reduced-motion: reduce) {
  :deep(.lazy-row),
  :deep(.lazy-row:nth-child(n)) {
    animation: none !important;
    opacity: 1 !important;
  }

  :deep(.p-datatable-tbody > tr.skeleton-row) {
    animation: none !important;
    opacity: 0.6 !important;
  }

  :deep(.p-datatable-tbody > tr.selected) {
    transition: none !important;
  }
}
</style>
