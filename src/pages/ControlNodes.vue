<template>
  <div class="space-y-6">
    <!-- Page header with create button -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-on-surface">{{ $t('control_nodes.title') }}</h1>
      <Button
        :label="$t('common.create')"
        icon="pi pi-plus"
        @click="showCreateDialog"
      />
    </div>

    <!-- DataTable -->
    <AppDataTable
      :rows="controlNodes"
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
        <Tag
          :value="data.status"
          :severity="getStatusSeverity(data.status)"
        />
      </template>

      <!-- Actions column -->
      <template #actions="{ data }">
        <div class="flex gap-2">
          <Button
            icon="pi pi-pencil"
            class="p-button-rounded p-button-text p-button-sm"
            :title="$t('common.edit')"
            @click="editNode(data)"
          />
          <Button
            icon="pi pi-trash"
            class="p-button-rounded p-button-text p-button-sm p-button-danger"
            :title="$t('common.delete')"
            @click="deleteNode(data.id)"
          />
        </div>
      </template>
    </AppDataTable>

    <!-- Create/Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="isEditing ? $t('common.edit') : $t('common.create')"
      modal
      :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
      style="max-width: 500px"
    >
      <div class="space-y-4">
        <div>
          <label :for="`name-${dialogId}`" class="block text-sm font-medium mb-2">
            {{ $t('control_nodes.form.name') }}
          </label>
          <InputText
            :id="`name-${dialogId}`"
            v-model="form.name"
            type="text"
            class="w-full"
          />
        </div>

        <div>
          <label :for="`hostname-${dialogId}`" class="block text-sm font-medium mb-2">
            {{ $t('control_nodes.form.hostname') }}
          </label>
          <InputText
            :id="`hostname-${dialogId}`"
            v-model="form.hostname"
            type="text"
            class="w-full"
          />
        </div>

        <div>
          <label :for="`status-${dialogId}`" class="block text-sm font-medium mb-2">
            {{ $t('control_nodes.form.status') }}
          </label>
          <Dropdown
            :id="`status-${dialogId}`"
            v-model="form.status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button
          :label="$t('common.cancel')"
          icon="pi pi-times"
          class="p-button-text"
          @click="showDialog = false"
        />
        <Button
          :label="$t('common.save')"
          icon="pi pi-check"
          @click="saveNode"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'
import AppDataTable from '@/components/common/AppDataTable.vue'

const { t } = useI18n()

const controlNodes = ref([])
const isLoading = ref(false)
const totalRecords = ref(0)
const pageSize = ref(20)
const currentPage = ref(1)
const showDialog = ref(false)
const isEditing = ref(false)
const dialogId = ref(Math.random().toString(36).substr(2, 9))

const form = ref({
  name: '',
  hostname: '',
  status: 'active',
})

const tableColumns = computed(() => [
  { field: 'name', header: t('control_nodes.form.name') },
  { field: 'hostname', header: t('control_nodes.form.hostname') },
  { field: 'status', header: t('common.status') },
  { field: 'actions', header: t('common.actions') },
])

const statusOptions = [
  { label: t('control_nodes.status.active'), value: 'active' },
  { label: t('control_nodes.status.inactive'), value: 'inactive' },
  { label: t('control_nodes.status.maintenance'), value: 'maintenance' },
]

function getStatusSeverity(status: string) {
  const severityMap: Record<string, string> = {
    active: 'success',
    inactive: 'danger',
    maintenance: 'warning',
  }
  return severityMap[status] || 'info'
}

function showCreateDialog() {
  isEditing.value = false
  form.value = { name: '', hostname: '', status: 'active' }
  showDialog.value = true
  dialogId.value = Math.random().toString(36).substr(2, 9)
}

function editNode(node: any) {
  isEditing.value = true
  form.value = { ...node }
  showDialog.value = true
  dialogId.value = Math.random().toString(36).substr(2, 9)
}

async function saveNode() {
  // TODO: Implement service call
  console.log('Save node:', form.value)
  showDialog.value = false
}

async function deleteNode(id: any) {
  // TODO: Implement service call
  console.log('Delete node:', id)
}

function handlePageChange(event: any) {
  currentPage.value = event.page + 1
  pageSize.value = event.rows
  // TODO: Fetch nodes with pagination
}

function handleSearch(query: string) {
  // TODO: Implement search
  console.log('Search:', query)
}

onMounted(() => {
  // TODO: Load control nodes
})
</script>
