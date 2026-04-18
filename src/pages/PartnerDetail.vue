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
        <PartnerStatusBadge :status="partner?.status" />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-on-surface-variant">{{ $t('partners.form.type') }}:</span>
        <PartnerTypeBadge :type="partner?.partner_type" />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-on-surface-variant">{{ $t('partners.table.credits') }}:</span>
        <span class="text-lg font-bold text-primary">{{ partner?.remainingCredits }}</span>
      </div>
    </div>

    <!-- TabView -->
    <TabView v-if="partner" class="mt-6">
      <!-- Profile Tab -->
      <TabPanel :header="$t('partners.tabs.profile')">
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
      <TabPanel :header="$t('partners.tabs.deployments')">
        <div class="text-on-surface-variant text-sm p-4">
          {{ $t('partners.tabs.deployments_coming_soon') }}
        </div>
      </TabPanel>

      <!-- Credits Tab -->
      <TabPanel :header="$t('partners.tabs.credits')">
        <div class="space-y-4">
          <div class="bg-surface-container-low p-4 rounded-lg">
            <div class="text-sm text-on-surface-variant mb-1">{{ $t('credits.balance') }}</div>
            <div class="text-3xl font-bold text-primary">{{ partner.remainingCredits }}</div>
          </div>
          <div class="text-on-surface-variant text-sm p-4">
            {{ $t('partners.tabs.transactions_coming_soon') }}
          </div>
        </div>
      </TabPanel>

      <!-- Audit Tab -->
      <TabPanel :header="$t('partners.tabs.audit')">
        <div class="text-on-surface-variant text-sm p-4">
          {{ $t('partners.tabs.audit_coming_soon') }}
        </div>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePartnerStore } from '@/stores/partner.store'
import Button from 'primevue/button'
import SplitButton from 'primevue/splitbutton'
import Dialog from 'primevue/dialog'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import PartnerForm from '@/components/partners/PartnerForm.vue'
import PartnerStatusBadge from '@/components/partners/PartnerStatusBadge.vue'
import PartnerTypeBadge from '@/components/partners/PartnerTypeBadge.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const partnerStore = usePartnerStore()

// State
const isLoading = ref(false)
const isSubmitting = ref(false)
const showDialog = ref(false)

const partnerId = computed(() => parseInt(route.params.id as string))
const partner = computed(() => partnerStore.selectedPartner)

// Load partner
const loadPartner = async () => {
  try {
    isLoading.value = true
    await partnerStore.fetchPartner(partnerId.value)
    // Subscribe to credit updates
    partnerStore.subscribeToCredits(partnerId.value)
  } catch (error) {
    console.error('Failed to load partner:', error)
  } finally {
    isLoading.value = false
  }
}

// Dialog handlers
const showEditDialog = () => {
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
}

// Form submission
const handleFormSubmit = async (values: any) => {
  try {
    isSubmitting.value = true
    await partnerStore.updatePartner(partnerId.value, values)
    closeDialog()
  } catch (error) {
    console.error('Failed to update partner:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Change status
const changeStatus = async (status: string) => {
  try {
    await partnerStore.changeStatus(partnerId.value, status)
  } catch (error) {
    console.error('Failed to change status:', error)
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
</script>

<style scoped>
:deep(.p-tabview) {
  --p-tabview-header-border-color: var(--outline-variant);
}
</style>
