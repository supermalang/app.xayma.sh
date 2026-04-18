<template>
  <div class="space-y-6">
    <!-- Page header with create button -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-on-surface">{{ $t('partners.title') }}</h1>
      <Button
        :label="$t('common.create')"
        icon="pi pi-plus"
        @click="showCreateDialog"
      />
    </div>

    <!-- Filters -->
    <div class="flex gap-4 flex-wrap">
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

    <!-- DataTable -->
    <AppDataTable
      :rows="partners"
      :columns="tableColumns"
      :loading="isLoading"
      :total-records="totalRecords"
      :page-size="pageSize"
      paginator
      lazy
      @page-change="handlePageChange"
      @search="handleSearch"
    >
      <!-- Status column -->
      <template #body-status="{ data }">
        <PartnerStatusBadge :status="data.status" />
      </template>

      <!-- Type column -->
      <template #body-partner_type="{ data }">
        <PartnerTypeBadge :type="data.partner_type" />
      </template>

      <!-- Actions column -->
      <template #actions="{ data }">
        <div class="flex gap-2">
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

    <!-- Create/Edit Dialog -->
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
import * as partnerService from '@/services/partners.service'

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
</style>
