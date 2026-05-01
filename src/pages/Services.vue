<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-on-surface">{{ $t('services.title') }}</h1>
      <Button
        :label="$t('services.create')"
        icon="pi pi-plus"
        @click="router.push('/services/new')"
      />
    </div>

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
import ToggleButton from 'primevue/togglebutton'
import { listServices, toggleServicePublicAvailability } from '@/services/services.service'

const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const services = ref<any[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const currentPage = ref(0)

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

function navigateToDetail(id: number) {
  router.push(`/services/${id}`)
}

onMounted(() => {
  loadServices()
})
</script>
