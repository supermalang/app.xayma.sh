<template>
  <div class="space-y-6">
    <!-- Header (permanent) -->
    <div class="header-section flex items-center justify-between">
      <h1 class="text-3xl font-bold text-on-surface">{{ $t('deployments.title') }}</h1>
      <Button
        v-if="canCreateDeployment"
        :label="$t('deployments.create')"
        icon="pi pi-plus"
        @click="navigateToWizard"
      />
    </div>

    <!-- Stats cards (if admin) -->
    <transition name="stats-group-fade">
      <div v-if="isAdmin" key="stats" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <transition-group
          name="stat-card-stagger"
          tag="div"
          class="contents"
        >
          <div
            v-for="(card, idx) in adminStatsCards"
            :key="card.id"
            :style="{ '--stagger-index': idx }"
          >
            <StatCard :title="card.title" :value="card.value" />
          </div>
        </transition-group>
      </div>
    </transition>

    <!-- Status filter -->
    <transition name="filter-fade">
      <div key="filter" class="flex gap-4 filter-section">
        <SelectButton
          v-model="selectedStatus"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          @change="applyFilters"
        />
      </div>
    </transition>

    <!-- DataTable -->
    <transition name="table-fade">
      <div key="table" class="table-container">
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
            <DeploymentStatusBadge
              :status="data.status"
              :class="{ 'status-badge-pulse': ['deploying', 'failed'].includes(data.status) }"
            />
          </template>

          <!-- Actions column -->
          <template #actions="{ data }">
            <div class="flex gap-2 action-buttons">
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
    </transition>
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

interface AdminStatsCard {
  id: string
  title: string
  value: string
}

const adminStatsCards = computed<AdminStatsCard[]>(() => [
  {
    id: 'total-deployments',
    title: 'Total Deployments',
    value: totalRecords.value.toString(),
  },
  {
    id: 'active-deployments',
    title: 'Active Deployments',
    value: activeCount.value.toString(),
  },
  {
    id: 'monthly-cost',
    title: 'Monthly Cost',
    value: `${monthlyCost.value} XOF`,
  },
])

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
    // Admins see all deployments; customers/resellers see only their own
    const partnerId = isAdmin ? undefined : partnerStore.selectedPartner?.id

    if (!isAdmin && !partnerId) {
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
  // Load initial deployments
  if (isAdmin) {
    // Admin: load all deployments
    await loadDeploymentsList()
    subscribeToDeploymentUpdates() // Subscribe to all changes
  } else if (partnerStore.selectedPartner?.id) {
    // Customer/Reseller: load only their own deployments
    await loadDeploymentsList()
    subscribeToDeploymentUpdates(partnerStore.selectedPartner.id)
  }
})
</script>

<style scoped>
.header-section {
  animation: header-enter var(--duration-standard) var(--easing-standard);
}

.stats-group-fade-enter-active {
  animation: fade-in var(--duration-standard) var(--easing-standard);
}

.stat-card-stagger-enter-active {
  animation: stat-card-fade var(--duration-standard) var(--easing-standard) backwards;
  animation-delay: calc(var(--stagger-index, 0) * 80ms);
}

.filter-section {
  animation: filter-bar-enter var(--duration-standard) var(--easing-standard) 100ms backwards;
}

.filter-fade-enter-active,
.filter-fade-leave-active {
  animation: filter-bar-enter var(--duration-micro) var(--easing-standard);
}

.filter-fade-leave-active {
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

:deep(.status-badge-pulse) {
  animation: status-badge-pulse 1.5s var(--easing-pulse) infinite;
}

:deep(.action-buttons button) {
  transition: var(--transition-smooth);
}

:deep(.action-buttons button:hover) {
  transform: scale(1.1);
}
</style>