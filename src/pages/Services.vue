<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-on-surface">{{ $t('services.title') }}</h1>
      <Button
        :label="$t('services.create')"
        icon="pi pi-plus"
        @click="showCreateDialog = true"
      />
    </div>

    <!-- Services table -->
    <DataTable
      :value="services"
      :loading="loading"
      data-key="id"
      paginator
      :rows="20"
      :total-records="totalRecords"
      :lazy="true"
      @page="onPageChange"
    >
      <template #empty>
        <span class="text-on-surface-variant">{{ $t('services.empty') }}</span>
      </template>

      <Column field="name" :header="$t('services.columns.name')" />

      <Column field="status" :header="$t('services.columns.status')">
        <template #body="{ data }">
          <Tag
            :value="$t(`services.status.${data.status}`)"
            :severity="getStatusSeverity(data.status)"
          />
        </template>
      </Column>

      <Column field="isPubliclyAvailable" :header="$t('services.columns.isPubliclyAvailable')">
        <template #body="{ data }">
          <ToggleButton
            v-model="data.isPubliclyAvailable"
            on-icon="pi pi-check"
            off-icon="pi pi-times"
            @change="togglePublicAvailability(data.id, data.isPubliclyAvailable)"
          />
        </template>
      </Column>

      <Column style="width: 100px" body-style="text-align: right">
        <template #body="{ data }">
          <Button
            icon="pi pi-arrow-right"
            text
            severity="info"
            size="small"
            @click="navigateToDetail(data.id)"
          />
        </template>
      </Column>
    </DataTable>

    <!-- Create service dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      :header="$t('services.create_dialog.title')"
      modal
      :style="{ width: '50vw' }"
    >
      <form @submit.prevent="handleCreateService" class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-on-surface mb-1">
            {{ $t('services.form.name') }}
          </label>
          <InputText
            id="name"
            v-model="createForm.name"
            class="w-full"
            required
          />
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-on-surface mb-1">
            {{ $t('services.form.description') }}
          </label>
          <InputText
            id="description"
            v-model="createForm.description"
            class="w-full"
          />
        </div>

        <div>
          <label for="status" class="block text-sm font-medium text-on-surface mb-1">
            {{ $t('services.form.status') }}
          </label>
          <Dropdown
            id="status"
            v-model="createForm.status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>

        <div class="flex gap-2 justify-end pt-4">
          <Button
            type="button"
            :label="$t('common.cancel')"
            severity="secondary"
            @click="showCreateDialog = false"
          />
          <Button
            type="submit"
            :label="$t('common.create')"
            :loading="creatingService"
            @click="handleCreateService"
          />
          <!-- Hidden native submit button: catches Enter-key implicit submission
               (PrimeVue 4 Button always renders type="button") -->
          <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true">{{ $t('common.create') }}</button>
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'
import ToggleButton from 'primevue/togglebutton'
import { listServices, createService, toggleServicePublicAvailability } from '@/services/services.service'

const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const services = ref<any[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const currentPage = ref(0)
const showCreateDialog = ref(false)
const creatingService = ref(false)

const createForm = ref({
  name: '',
  description: '',
  status: 'active',
})

const statusOptions = [
  { label: t('services.status.active'), value: 'active' },
  { label: t('services.status.inactive'), value: 'inactive' },
  { label: t('services.status.archived'), value: 'archived' },
]

function getStatusSeverity(status: string): 'success' | 'warn' | 'secondary' {
  return status === 'active' ? 'success' : status === 'inactive' ? 'warn' : 'secondary'
}

async function loadServices() {
  loading.value = true
  try {
    const result = await listServices({ page: currentPage.value + 1, pageSize: 20 })
    services.value = result.data
    totalRecords.value = result.count
  } catch {
    toast.add({ severity: 'error', summary: t('common.error'), detail: t('errors.fetch_failed'), life: 4000 })
  } finally {
    loading.value = false
  }
}

function onPageChange(event: any) {
  currentPage.value = event.page
  loadServices()
}

async function togglePublicAvailability(id: number, isPublic: boolean) {
  try {
    await toggleServicePublicAvailability(id, isPublic)
    toast.add({ severity: 'success', summary: t('common.success'), life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: t('common.error'), detail: t('errors.fetch_failed'), life: 4000 })
    await loadServices()
  }
}

async function handleCreateService() {
  creatingService.value = true
  try {
    await createService({
      name: createForm.value.name,
      description: createForm.value.description,
      status: createForm.value.status,
    })
    toast.add({ severity: 'success', summary: t('common.success'), life: 3000 })
    showCreateDialog.value = false
    createForm.value = { name: '', description: '', status: 'active' }
    currentPage.value = 0
    await loadServices()
  } catch {
    toast.add({ severity: 'error', summary: t('common.error'), detail: t('errors.fetch_failed'), life: 4000 })
  } finally {
    creatingService.value = false
  }
}

function navigateToDetail(id: number) {
  router.push(`/services/${id}`)
}

onMounted(() => {
  loadServices()
})
</script>
