<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-on-surface">{{ $t('deployments.title') }}</h1>
      <Button
        v-if="canCreateDeployment"
        :label="$t('deployments.create')"
        icon="pi pi-plus"
        @click="navigateToWizard"
      />
    </div>

    <!-- Stats cards (if admin) -->
    <div v-if="isAdmin" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard title="Total Deployments" :value="totalRecords.toString()" />
      <StatCard title="Active Deployments" :value="activeCount.toString()" />
      <StatCard title="Monthly Cost" :value="`${monthlyCost} XOF`" />
    </div>

    <!-- Status filter -->
    <div class="flex gap-4">
      <SelectButton
        v-model="selectedStatus"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        @change="applyFilters"
      />
    </div>

    <!-- DataTable -->
    <AppDataTable
      :rows="deployments"
      :columns="tableColumns"
      :loading="isLoading"
      :total-records="totalRecords"
      :page-size="pageSize"
      paginator
      lazy
      @page-change="handlePageChange"
      @search="handleSearch"
    >
      <!-- Service name column -->
      <template #body-service_name="{ data }">
        <span>{{ data.service?.name || 'N/A' }}</span>
      </template>

      <!-- Domain column -->
      <template #body-domains="{ data }">
        <div class="text-sm">
          <div v-for="domain in (data.domainNames || [])" :key="domain" class="text-on-surface-variant">
            {{ domain }}
          </div>
        </div>
      </template>

      <!-- Status column -->
      <template #body-status="{ data }">
        <DeploymentStatusBadge :status="data.status" />
      </template>

      <!-- Actions column -->
      <template #actions="{ data }">
        <div class="flex gap-2">
          <Button
            icon="pi pi-eye"
            class="p-button-rounded p-button-text p-button-sm"
            :title="$t('common.view')"
            @click="navigateToDetail(data.id)"
          />
          <Button
            icon="pi pi-trash"
            class="p-button-rounded p-button-text p-button-sm p-button-danger"
            :title="$t('common.delete')"
            @click="deleteDeployment(data.id)"
          />
        </div>
      </template>
    </AppDataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import AppDataTable from '@/components/common/AppDataTable.vue'
import DeploymentStatusBadge from '@/components/deployments/DeploymentStatusBadge.vue'
import StatCard from '@/components/common/StatCard.vue'
import { useAuth } from '@/composables/useAuth'
import { useDeployments } from '@/composables/useDeployments'
import { usePartnerStore } from '@/stores/partner.store'
import { useNotificationStore } from '@/stores/notifications.store'

const router = useRouter()
const { t } = useI18n()
const { isAdmin } = useAuth()
const { loadDeployments, deployments, isLoading, subscribeToDeploymentUpdates } = useDeployments()
const partnerStore = usePartnerStore()
const notificationStore = useNotificationStore()

const totalRecords = ref(0)
const pageSize = ref(20)
const currentPage = ref(1)
const selectedStatus = ref(null)

const canCreateDeployment = computed(() => !isAdmin)

const activeCount = computed(() => {
  return deployments.value.filter((d: any) => d.status === 'active').length
})

const monthlyCost = computed(() => {
  return deployments.value.reduce((total: number, d: any) => {
    return total + (d.serviceplan?.monthlyCreditConsumption || 0)
  }, 0)
})

const tableColumns = computed(() => [
  { field: 'service_name', header: t('deployments.form.service') },
  { field: 'domains', header: t('deployments.form.domains') },
  { field: 'status', header: t('common.status') },
  { field: 'created', header: 'Created' },
  { field: 'actions', header: t('common.actions') },
])

const statusOptions = [
  { label: t('common.status'), value: null },
  { label: t('deployments.status.active'), value: 'active' },
  { label: t('deployments.status.pending_deployment'), value: 'pending_deployment' },
  { label: t('deployments.status.deploying'), value: 'deploying' },
  { label: t('deployments.status.stopped'), value: 'stopped' },
]

function navigateToWizard() {
  router.push('/deployments/new')
}

function navigateToDetail(id: number) {
  router.push(`/deployments/${id}`)
}

function applyFilters() {
  currentPage.value = 1
  loadDeploymentsList()
}

function handlePageChange(event: any) {
  currentPage.value = event.page + 1
  pageSize.value = event.rows
  loadDeploymentsList()
}

function handleSearch() {
  currentPage.value = 1
  loadDeploymentsList()
}

async function deleteDeployment(id: number) {
  const confirmed = window.confirm(t('common.confirm_delete'))
  if (!confirmed) return

  try {
    const { deleteDeployment: deleteDeploymentFn } = useDeployments()
    await deleteDeploymentFn(id)
  } catch (error) {
    notificationStore.addError(t('deployments.delete_error'))
  }
}

async function loadDeploymentsList() {
  try {
    const partnerId = partnerStore.selectedPartner?.id
    if (!partnerId) {
      notificationStore.addError(t('errors.fetch_failed'))
      return
    }

    await loadDeployments(partnerId)
    // Deployments are loaded via the composable, which updates the deployments ref
    totalRecords.value = deployments.value.length
  } catch (error) {
    notificationStore.addError(t('errors.fetch_failed'))
  }
}

onMounted(async () => {
  // Load initial deployments for current partner
  if (partnerStore.selectedPartner?.id) {
    await loadDeploymentsList()
    subscribeToDeploymentUpdates(partnerStore.selectedPartner.id)
  }
})
</script>
