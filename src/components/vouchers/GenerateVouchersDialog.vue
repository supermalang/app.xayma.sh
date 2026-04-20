<template>
  <Dialog
    :visible="visible"
    :header="$t('vouchers.generate_title')"
    :modal="true"
    :closable="!loading"
    @update:visible="$emit('update:visible', $event)"
    class="max-w-2xl"
  >
    <form @submit.prevent="handleGenerate" class="space-y-6">
      <!-- Credits amount -->
      <div class="space-y-2">
        <label class="block text-sm font-semibold text-on-surface">
          {{ $t('vouchers.form.credits_amount') }} <span class="text-error">*</span>
        </label>
        <InputNumber
          v-model="form.creditsAmount"
          :min="100"
          :step="100"
          :placeholder="$t('vouchers.form.credits_placeholder')"
          class="w-full"
          :disabled="loading"
        />
        <p class="text-xs text-on-surface-variant">{{ $t('vouchers.form.credits_help') }}</p>
      </div>

      <!-- Quantity -->
      <div class="space-y-2">
        <label class="block text-sm font-semibold text-on-surface">
          {{ $t('vouchers.form.quantity') }} <span class="text-error">*</span>
        </label>
        <InputNumber
          v-model="form.quantity"
          :min="1"
          :max="100"
          :placeholder="$t('vouchers.form.quantity_placeholder')"
          class="w-full"
          :disabled="loading"
        />
        <p class="text-xs text-on-surface-variant">
          {{ $t('vouchers.form.quantity_help', { max: 100 }) }}
        </p>
      </div>

      <!-- Expiry date -->
      <div class="space-y-2">
        <label class="block text-sm font-semibold text-on-surface">
          {{ $t('vouchers.form.expiry_date') }} <span class="text-error">*</span>
        </label>
        <Calendar
          v-model="form.expiryDate"
          date-format="dd/mm/yy"
          :show-icon="true"
          :min-date="minDate"
          class="w-full"
          :disabled="loading"
        />
        <p class="text-xs text-on-surface-variant">{{ $t('vouchers.form.expiry_help') }}</p>
      </div>

      <!-- Partner type restriction -->
      <div class="space-y-2">
        <label class="block text-sm font-semibold text-on-surface">
          {{ $t('vouchers.form.partner_restriction') }}
        </label>
        <MultiSelect
          v-model="form.partnerTypeRestriction"
          :options="partnerTypeOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('vouchers.form.no_restriction')"
          class="w-full"
          :disabled="loading"
        />
        <p class="text-xs text-on-surface-variant">
          {{ $t('vouchers.form.partner_help') }}
        </p>
      </div>

      <!-- Target partner (optional) -->
      <div class="space-y-2">
        <label class="block text-sm font-semibold text-on-surface">
          {{ $t('vouchers.form.target_partner') }}
        </label>
        <Dropdown
          v-model="form.targetPartnerId"
          :options="partners"
          option-label="name"
          option-value="id"
          :placeholder="$t('vouchers.form.select_partner')"
          filter
          class="w-full"
          :disabled="loading || loadingPartners"
        />
        <p class="text-xs text-on-surface-variant">
          {{ $t('vouchers.form.target_partner_help') }}
        </p>
      </div>

      <!-- Summary -->
      <Message severity="info" :closable="false" class="text-sm">
        <template #default>
          <div class="space-y-1">
            <p>
              {{ $t('vouchers.form.summary_line1', {
                quantity: form.quantity,
                credits: form.creditsAmount | 0,
              }) }}
            </p>
            <p>
              {{ $t('vouchers.form.summary_line2', {
                total: (form.quantity * form.creditsAmount) | 0,
              }) }}
            </p>
          </div>
        </template>
      </Message>

      <!-- Error message -->
      <Message v-if="error" severity="error" :text="error" closable @close="error = null" />

      <!-- Actions -->
      <div class="flex gap-3 justify-end pt-4">
        <Button
          :label="$t('common.cancel')"
          class="p-button-secondary"
          @click="$emit('update:visible', false)"
          :disabled="loading"
        />
        <Button
          :label="$t('vouchers.form.generate')"
          class="p-button-primary"
          type="submit"
          :loading="loading"
          @click="handleGenerate"
        />
        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true">{{ $t('vouchers.form.generate') }}</button>
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Calendar from 'primevue/calendar'
import MultiSelect from 'primevue/multiselect'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { supabaseFrom } from '@/services/supabase'
import { callN8nWebhook } from '@/services/n8n'

interface Props {
  visible: boolean
}

withDefaults(defineProps<Props>(), {
  visible: false,
})

const emit = defineEmits<{
  'update:visible': [boolean]
  created: []
}>()

const { t } = useI18n()

const form = ref({
  creditsAmount: 1000,
  quantity: 10,
  expiryDate: null as Date | null,
  partnerTypeRestriction: null as string[] | null,
  targetPartnerId: null as string | null,
})

const loading = ref(false)
const loadingPartners = ref(false)
const error = ref<string | null>(null)
const partners = ref<Array<{ id: string; name: string }>>([])

const minDate = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow
})

const partnerTypeOptions = computed(() => [
  { label: 'Customer', value: 'CUSTOMER' },
  { label: 'Reseller', value: 'RESELLER' },
])

async function loadPartners() {
  try {
    loadingPartners.value = true
    const { data } = await supabaseFrom('partners').select('id, name')
    partners.value = data || []
  } catch (err) {
    console.error('Error loading partners:', err)
  } finally {
    loadingPartners.value = false
  }
}

async function handleGenerate() {
  // Validation
  if (!form.value.creditsAmount || form.value.creditsAmount < 100) {
    error.value = t('vouchers.form.error_credits_min')
    return
  }

  if (!form.value.quantity || form.value.quantity < 1 || form.value.quantity > 100) {
    error.value = t('vouchers.form.error_quantity')
    return
  }

  if (!form.value.expiryDate) {
    error.value = t('vouchers.form.error_expiry')
    return
  }

  try {
    loading.value = true
    error.value = null

    // Call n8n webhook to generate vouchers
    await callN8nWebhook('/webhook/generate-vouchers', {
      creditsAmount: form.value.creditsAmount,
      quantity: form.value.quantity,
      expiryDate: form.value.expiryDate.toISOString(),
      partnerTypeRestriction: form.value.partnerTypeRestriction,
      targetPartnerId: form.value.targetPartnerId,
    })

    // Reset form
    form.value = {
      creditsAmount: 1000,
      quantity: 10,
      expiryDate: null,
      partnerTypeRestriction: null,
      targetPartnerId: null,
    }

    emit('created')
  } catch (err) {
    console.error('Error generating vouchers:', err)
    error.value = t('errors.webhook_failed')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPartners()
})
</script>
