<template>
  <div class="space-y-6">
    <!-- Header with back button and actions -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <Button
          icon="pi pi-arrow-left"
          class="p-button-text p-button-rounded"
          @click="goBack"
        />
        <div>
          <h1 class="text-3xl font-bold text-on-surface">{{ partner?.name }}</h1>
          <p class="text-sm text-on-surface-variant">{{ partner?.email }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <Button
          :label="$t('common.edit')"
          icon="pi pi-pencil"
          @click="showEditDialog"
        />
        <SplitButton
          :label="$t('partners.form.status')"
          :model="[
            { label: $t('partners.status.active'), value: 'active', command: () => changeStatus('active') },
            { label: $t('partners.status.suspended'), value: 'suspended', command: () => changeStatus('suspended') },
            { label: $t('partners.status.inactive'), value: 'inactive', command: () => changeStatus('inactive') },
          ]"
          class="p-button-sm"
        />
      </div>
    </div>

    <!-- Status and Type badges -->
    <div class="flex gap-4">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-on-surface-variant">{{ $t('partners.form.status') }}:</span>
        <PartnerStatusBadge :status="(partner?.status as 'active' | 'suspended' | 'inactive') ?? 'inactive'" />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-on-surface-variant">{{ $t('partners.form.type') }}:</span>
        <PartnerTypeBadge :type="(partner?.partner_type as 'customer' | 'reseller') ?? 'customer'" />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-on-surface-variant">{{ $t('partners.table.credits') }}:</span>
        <span class="text-lg font-bold text-primary">{{ partner?.remainingCredits }}</span>
      </div>
    </div>

    <!-- TabView -->
    <TabView v-if="partner" class="mt-6" @tab-change="onTabChange">
      <!-- Profile Tab -->
      <TabPanel value="profile" :header="$t('partners.tabs.profile')">
        <div class="grid grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-on-surface-variant mb-1">
              {{ $t('partners.form.name') }}
            </label>
            <p class="text-on-surface">{{ partner.name }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-on-surface-variant mb-1">
              {{ $t('partners.form.slug') }}
            </label>
            <p class="text-on-surface">{{ partner.slug }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-on-surface-variant mb-1">
              {{ $t('partners.form.email') }}
            </label>
            <p class="text-on-surface">{{ partner.email || '-' }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-on-surface-variant mb-1">
              {{ $t('partners.form.phone') }}
            </label>
            <p class="text-on-surface">{{ partner.phone || '-' }}</p>
          </div>
          <div class="col-span-2">
            <label class="block text-sm font-medium text-on-surface-variant mb-1">
              {{ $t('partners.form.address') }}
            </label>
            <p class="text-on-surface">{{ partner.address || '-' }}</p>
          </div>
          <div class="col-span-2">
            <label class="block text-sm font-medium text-on-surface-variant mb-1">
              {{ $t('partners.form.description') }}
            </label>
            <p class="text-on-surface">{{ partner.description || '-' }}</p>
          </div>
        </div>
      </TabPanel>

      <!-- Deployments Tab -->
      <TabPanel value="deployments" :header="$t('partners.tabs.deployments')">
        <div v-if="isLoadingDeployments" class="flex justify-center py-12">
          <ProgressSpinner />
        </div>
        <div v-else-if="deployments.length === 0" class="text-center py-12 text-on-surface-variant">
          {{ $t('partners.tabs.no_deployments') }}
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DeploymentCard
            v-for="deployment in deployments"
            :key="deployment.id"
            :deployment="deployment"
            @stop="() => {}"
            @start="() => {}"
            @restart="() => {}"
            @delete="() => {}"
          />
        </div>
      </TabPanel>

      <!-- Credits Tab -->
      <TabPanel value="credits" :header="$t('partners.tabs.credits')">
        <div class="space-y-4">
          <div class="bg-surface-container-low p-4 rounded-lg">
            <div class="text-sm text-on-surface-variant mb-1">{{ $t('credits.balance') }}</div>
            <div class="text-3xl font-bold text-primary">{{ partner.remainingCredits }}</div>
          </div>

          <div v-if="isLoadingTransactions" class="flex justify-center py-8">
            <ProgressSpinner />
          </div>
          <DataTable
            v-else
            :value="transactions"
            striped-rows
            responsive-layout="scroll"
            class="p-datatable-striped"
          >
            <Column field="created_at" :header="$t('credits.date')">
              <template #body="{ data }">
                {{ data.created_at ? formatDate(data.created_at as string) : '-' }}
              </template>
            </Column>
            <Column field="type" :header="$t('credits.type')">
              <template #body="{ data }">
                <Tag :value="data.type" :severity="getTransactionSeverity(data.type as string | null)" />
              </template>
            </Column>
            <Column field="amount" :header="$t('credits.amount')">
              <template #body="{ data }">
                <span :class="(data.type as string) === 'TOPUP' ? 'text-tertiary' : 'text-error'" class="font-mono font-semibold">
                  {{ formatTransactionAmount(data) }}
                </span>
              </template>
            </Column>
            <Column field="status" :header="$t('common.status')">
              <template #body="{ data }">
                <Tag :value="data.status" :severity="getStatusSeverity(data.status as string | null)" />
              </template>
            </Column>
            <template #empty>
              <div class="text-center text-on-surface-variant py-8">{{ $t('credits.no_transactions') }}</div>
            </template>
          </DataTable>
        </div>
      </TabPanel>

      <!-- Audit Tab -->
      <TabPanel value="audit" :header="$t('partners.tabs.audit')">
        <div v-if="isLoadingAudit" class="flex justify-center py-12">
          <ProgressSpinner />
        </div>
        <DataTable
          v-else
          :value="auditEntries"
          striped-rows
          responsive-layout="scroll"
          class="p-datatable-striped"
        >
          <Column field="created_at" :header="$t('audit.created')">
            <template #body="{ data }">
              {{ data.created_at ? formatDate(data.created_at as string) : '-' }}
            </template>
          </Column>
          <Column field="table_name" :header="$t('audit.table_name')" />
          <Column field="action" :header="$t('audit.action')">
            <template #body="{ data }">
              <Tag :value="data.action" :severity="getActionSeverity(data.action)" />
            </template>
          </Column>
          <Column field="email" :header="$t('audit.user')" />
          <Column field="description" :header="$t('audit.description')" />
          <template #empty>
            <div class="text-center text-on-surface-variant py-8">{{ $t('common.no_data') }}</div>
          </template>
        </DataTable>
      </TabPanel>
    </TabView>

    <!-- Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="$t('common.edit')"
      modal
      :style="{ width: '90vw', maxWidth: '600px' }"
    >
      <PartnerForm
        v-if="partner"
        :initial-data="partner"
        :is-loading="isSubmitting"
        @submit="handleFormSubmit"
        @cancel="closeDialog"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePartnerStore } from '@/stores/partner.store'
import { useNotificationStore } from '@/stores/notifications.store'
import { supabaseFrom } from '@/services/supabase'
import { getDeploymentsByPartnerId } from '@/services/deployments.service'
import { formatDate } from '@/lib/formatters'
import type { Deployment } from '@/types/index'
import Button from 'primevue/button'
import SplitButton from 'primevue/splitbutton'
import Dialog from 'primevue/dialog'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import PartnerForm from '@/components/partners/PartnerForm.vue'
import PartnerStatusBadge from '@/components/partners/PartnerStatusBadge.vue'
import PartnerTypeBadge from '@/components/partners/PartnerTypeBadge.vue'
import DeploymentCard from '@/components/deployments/DeploymentCard.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const partnerStore = usePartnerStore()
const notificationStore = useNotificationStore()

// State
const isSubmitting = ref(false)
const showDialog = ref(false)

// Lazy-load flags (prevent re-fetching on tab switch)
const deploymentsLoaded = ref(false)
const creditsLoaded = ref(false)
const auditLoaded = ref(false)

// Tab data
const deployments = ref<Deployment[]>([])
const isLoadingDeployments = ref(false)
const transactions = ref<unknown[]>([])
const isLoadingTransactions = ref(false)
const auditEntries = ref<unknown[]>([])
const isLoadingAudit = ref(false)

const partnerId = computed(() => parseInt(route.params.id as string))
const partner = computed(() => partnerStore.selectedPartner)

// Load partner
const loadPartner = async () => {
  try {
    await partnerStore.fetchPartner(partnerId.value)
    partnerStore.subscribeToCredits(partnerId.value)
  } catch {
    notificationStore.addError(t('errors.fetch_failed'))
  }
}

// Load deployments for this partner (lazy)
const loadDeployments = async () => {
  if (deploymentsLoaded.value) return
  try {
    isLoadingDeployments.value = true
    deployments.value = await getDeploymentsByPartnerId(partnerId.value)
    deploymentsLoaded.value = true
  } catch {
    notificationStore.addError(t('errors.fetch_failed'))
  } finally {
    isLoadingDeployments.value = false
  }
}

// Load credit transactions for this partner (lazy)
const loadTransactions = async () => {
  if (creditsLoaded.value) return
  try {
    isLoadingTransactions.value = true
    const { data, error } = await supabaseFrom('credit_transactions' as never)
      .select('*')
      .eq('partner_id', partnerId.value)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      notificationStore.addError(t('errors.fetch_failed'))
    } else {
      transactions.value = data || []
      creditsLoaded.value = true
    }
  } catch {
    notificationStore.addError(t('errors.fetch_failed'))
  } finally {
    isLoadingTransactions.value = false
  }
}

// Load audit entries for this partner (lazy)
const loadAuditEntries = async () => {
  if (auditLoaded.value) return
  try {
    isLoadingAudit.value = true
    const { data, error } = await supabaseFrom('general_audit' as never)
      .select('*')
      .eq('company_id', partnerId.value)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) {
      notificationStore.addError(t('errors.fetch_failed'))
    } else {
      auditEntries.value = data || []
      auditLoaded.value = true
    }
  } catch {
    notificationStore.addError(t('errors.fetch_failed'))
  } finally {
    isLoadingAudit.value = false
  }
}

// Tab change handler — lazy load per tab (0=Profile, 1=Deployments, 2=Credits, 3=Audit)
const onTabChange = (event: { index: number }) => {
  if (event.index === 1) loadDeployments()
  else if (event.index === 2) loadTransactions()
  else if (event.index === 3) loadAuditEntries()
}

// Formatting helpers
const getTransactionSeverity = (type: string | null) => {
  const map: Record<string, string> = {
    TOPUP: 'success',
    DEBIT: 'info',
    REFUND: 'warning',
    EXPIRY: 'danger',
  }
  return map[type ?? ''] || 'secondary'
}

const getStatusSeverity = (status: string | null) => {
  const map: Record<string, string> = {
    COMPLETED: 'success',
    PENDING: 'warning',
    FAILED: 'danger',
  }
  return map[status ?? ''] || 'secondary'
}

const formatTransactionAmount = (row: unknown): string => {
  const r = row as Record<string, unknown>
  const amount = r.amount ?? 0
  const sign = r.type === 'TOPUP' || r.type === 'REFUND' ? '+' : '−'
  return `${sign} ${Number(amount).toLocaleString('fr-SN')} FCFA`
}

const getActionSeverity = (action: string | null) => {
  const map: Record<string, string> = {
    INSERT: 'success',
    UPDATE: 'info',
    DELETE: 'danger',
  }
  return map[action ?? ''] || 'secondary'
}

// Dialog handlers
const showEditDialog = () => {
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
}

// Form submission
const handleFormSubmit = async (values: Record<string, unknown>) => {
  try {
    isSubmitting.value = true
    await partnerStore.updatePartner(partnerId.value, values)
    closeDialog()
  } catch {
    notificationStore.addError(t('errors.fetch_failed'))
  } finally {
    isSubmitting.value = false
  }
}

// Change status
const changeStatus = async (status: string) => {
  try {
    await partnerStore.changeStatus(partnerId.value, status)
  } catch {
    notificationStore.addError(t('errors.fetch_failed'))
  }
}

// Navigate back
const goBack = () => {
  router.back()
}

// Lifecycle
onMounted(() => {
  loadPartner()
})

onUnmounted(() => {
  partnerStore.unsubscribeFromCredits()
})
</script>

<style scoped>
:deep(.p-tabview) {
  --p-tabview-header-border-color: var(--outline-variant);
}
</style>
