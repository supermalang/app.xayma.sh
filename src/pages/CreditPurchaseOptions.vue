<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-on-surface">{{ $t('credits.purchase_options.title') }}</h1>
        <p class="text-sm text-on-surface-variant mt-1">{{ $t('credits.purchase_options.description') }}</p>
      </div>
      <Button
        :label="$t('common.create')"
        icon="pi pi-plus"
        @click="showCreateDialog"
      />
    </div>

    <!-- DataTable with inline edit -->
    <Card>
      <DataTable
        :value="purchaseOptions"
        striped-rows
        paginator
        :rows="10"
        :loading="isLoading"
        edit-mode="row"
        @row-edit-save="onRowEditSave"
        class="text-sm"
      >
        <Column field="partner_type" :header="$t('partners.form.type')" style="min-width: 150px">
          <template #body="{ data }">
            <PartnerTypeBadge :type="data.partner_type" />
          </template>
          <template #editor="{ data, field }">
            <Dropdown
              v-model="data[field]"
              :options="[
                { label: $t('partners.type.customer'), value: 'customer' },
                { label: $t('partners.type.reseller'), value: 'reseller' },
              ]"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </template>
        </Column>

        <Column field="threshold_type" :header="$t('credits.purchase_options.threshold_type')" style="min-width: 140px">
          <template #editor="{ data, field }">
            <Dropdown
              v-model="data[field]"
              :options="[
                { label: 'Instance Count', value: 'INSTANCE_COUNT' },
                { label: 'Credit Amount', value: 'CREDIT_AMOUNT' },
                { label: 'Monthly Volume', value: 'MONTHLY_VOLUME' },
              ]"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </template>
        </Column>

        <Column field="threshold_value" :header="$t('credits.purchase_options.threshold_value')" style="min-width: 120px">
          <template #editor="{ data, field }">
            <InputNumber
              v-model="data[field]"
              class="w-full"
              :use-grouping="false"
            />
          </template>
        </Column>

        <Column field="threshold_discount_percent" :header="$t('credits.purchase_options.discount_percent')" style="min-width: 120px">
          <template #body="{ data }">
            <span class="font-mono">{{ data.threshold_discount_percent }}%</span>
          </template>
          <template #editor="{ data, field }">
            <InputNumber
              v-model="data[field]"
              class="w-full"
              :use-grouping="false"
              :min="0"
              :max="100"
            />
          </template>
        </Column>

        <Column field="priority" :header="$t('common.priority')" style="min-width: 100px">
          <template #editor="{ data, field }">
            <InputNumber
              v-model="data[field]"
              class="w-full"
              :use-grouping="false"
            />
          </template>
        </Column>

        <Column field="is_active" :header="$t('common.status')" style="min-width: 100px">
          <template #body="{ data }">
            <Tag
              :value="data.is_active ? 'Active' : 'Inactive'"
              :severity="data.is_active ? 'success' : 'info'"
              class="text-xs"
            />
          </template>
          <template #editor="{ data, field }">
            <InputSwitch
              v-model="data[field]"
              class="ml-2"
            />
          </template>
        </Column>

        <Column :rowEditor="true" style="min-width: 120px">
          <template #roweditinit="{ data }">
            <Button
              icon="pi pi-pencil"
              class="p-button-rounded p-button-text"
            />
          </template>
          <template #roweditinit-actions="{ data }">
            <Button
              icon="pi pi-trash"
              class="p-button-rounded p-button-text p-button-danger"
              @click="deleteOption(data)"
            />
          </template>
        </Column>
      </DataTable>
    </Card>

    <!-- Create/Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="isEditing ? $t('common.edit') : $t('common.create')"
      modal
      :style="{ width: '90vw', maxWidth: '500px' }"
    >
      <div class="space-y-4">
        <!-- Partner Type -->
        <div>
          <label class="block text-sm font-medium text-on-surface mb-2">
            {{ $t('partners.form.type') }}
            <span class="text-error">*</span>
          </label>
          <Dropdown
            v-model="formData.partner_type"
            :options="[
              { label: $t('partners.type.customer'), value: 'customer' },
              { label: $t('partners.type.reseller'), value: 'reseller' },
            ]"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>

        <!-- Threshold Type -->
        <div>
          <label class="block text-sm font-medium text-on-surface mb-2">
            {{ $t('credits.purchase_options.threshold_type') }}
            <span class="text-error">*</span>
          </label>
          <Dropdown
            v-model="formData.threshold_type"
            :options="[
              { label: 'Instance Count', value: 'INSTANCE_COUNT' },
              { label: 'Credit Amount', value: 'CREDIT_AMOUNT' },
              { label: 'Monthly Volume', value: 'MONTHLY_VOLUME' },
            ]"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>

        <!-- Threshold Value -->
        <div>
          <label class="block text-sm font-medium text-on-surface mb-2">
            {{ $t('credits.purchase_options.threshold_value') }}
            <span class="text-error">*</span>
          </label>
          <InputNumber
            v-model="formData.threshold_value"
            class="w-full"
            :use-grouping="false"
            :min="0"
          />
        </div>

        <!-- Discount Percent -->
        <div>
          <label class="block text-sm font-medium text-on-surface mb-2">
            {{ $t('credits.purchase_options.discount_percent') }}
            <span class="text-error">*</span>
          </label>
          <InputNumber
            v-model="formData.threshold_discount_percent"
            class="w-full"
            :use-grouping="false"
            :min="0"
            :max="100"
          />
        </div>

        <!-- Priority -->
        <div>
          <label class="block text-sm font-medium text-on-surface mb-2">
            {{ $t('common.priority') }}
          </label>
          <InputNumber
            v-model="formData.priority"
            class="w-full"
            :use-grouping="false"
            :min="0"
          />
        </div>

        <!-- Active Status -->
        <div class="flex items-center gap-3">
          <InputSwitch
            v-model="formData.is_active"
          />
          <label class="text-sm font-medium text-on-surface">
            {{ $t('common.active') }}
          </label>
        </div>

        <!-- Dialog Actions -->
        <div class="flex gap-2 justify-end pt-4 border-t border-outline-variant">
          <Button
            :label="$t('common.cancel')"
            severity="secondary"
            @click="closeDialog"
          />
          <Button
            :label="isEditing ? $t('common.update') : $t('common.create')"
            :loading="isSubmitting"
            @click="submitForm"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import InputNumber from 'primevue/inputnumber'
import InputSwitch from 'primevue/inputswitch'
import Tag from 'primevue/tag'
import { supabaseFrom } from '@/services/supabase'
import PartnerTypeBadge from '@/components/partners/PartnerTypeBadge.vue'

const { t } = useI18n()

// State
const purchaseOptions = ref<any[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const showDialog = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)

// Form data
const defaultFormData = {
  partner_type: 'customer',
  threshold_type: 'INSTANCE_COUNT',
  threshold_value: 0,
  threshold_discount_percent: 0,
  priority: 0,
  is_active: true,
}

const formData = ref({ ...defaultFormData })

/**
 * Load credit purchase options
 */
const loadOptions = async () => {
  try {
    isLoading.value = true
    const { data, error } = await supabaseFrom('partner_credit_purchase_options')
      .select('*')
      .order('partner_type', { ascending: true })
      .order('threshold_value', { ascending: true })

    if (error) throw error
    purchaseOptions.value = data || []
  } catch (error) {
    console.error('Failed to load credit purchase options:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * Show create dialog
 */
const showCreateDialog = () => {
  isEditing.value = false
  editingId.value = null
  formData.value = { ...defaultFormData }
  showDialog.value = true
}

/**
 * Close dialog
 */
const closeDialog = () => {
  showDialog.value = false
  isEditing.value = false
  editingId.value = null
  formData.value = { ...defaultFormData }
}

/**
 * Submit form (create or update)
 */
const submitForm = async () => {
  try {
    isSubmitting.value = true

    if (isEditing.value && editingId.value) {
      // Update
      const { error } = await supabaseFrom('partner_credit_purchase_options')
        .update(formData.value)
        .eq('id', editingId.value)

      if (error) throw error
    } else {
      // Create
      const { error } = await supabaseFrom('partner_credit_purchase_options')
        .insert([formData.value])

      if (error) throw error
    }

    closeDialog()
    await loadOptions()
  } catch (error) {
    console.error('Failed to save credit purchase option:', error)
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Delete option
 */
const deleteOption = async (option: any) => {
  if (!confirm(t('common.confirm_delete'))) return

  try {
    const { error } = await supabaseFrom('partner_credit_purchase_options')
      .delete()
      .eq('id', option.id)

    if (error) throw error
    await loadOptions()
  } catch (error) {
    console.error('Failed to delete credit purchase option:', error)
  }
}

/**
 * Row edit save (inline edit)
 */
const onRowEditSave = async (event: any) => {
  try {
    const { data } = event
    const { error } = await supabaseFrom('partner_credit_purchase_options')
      .update(data)
      .eq('id', data.id)

    if (error) throw error
    await loadOptions()
  } catch (error) {
    console.error('Failed to update credit purchase option:', error)
  }
}

// Load on mount
onMounted(() => {
  loadOptions()
})
</script>

<style scoped>
:deep(.p-datatable) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
}
</style>
