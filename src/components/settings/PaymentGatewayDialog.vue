<template>
  <Dialog
    :visible="visible"
    modal
    :header="gateway ? t('settings.edit_gateway') : t('settings.add_gateway')"
    :style="{ width: '40rem' }"
    :draggable="false"
    @update:visible="(v: boolean) => emit('update:visible', v)"
  >
    <Form
      :validation-schema="validationSchema"
      :initial-values="initialValues"
      @submit="onSubmit"
    >
      <div class="space-y-6">
        <!-- Provider selector -->
        <div>
          <label class="block text-sm font-medium text-on-surface mb-2">
            {{ t('settings.gateway_provider') }} <span class="text-error">*</span>
          </label>
          <Field v-slot="{ value, handleChange }" name="provider" as="div">
            <Select
              :model-value="value"
              :options="providerOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              @update:model-value="(v: PaymentGatewayProvider) => { handleChange(v); selectedProvider = v }"
            />
            <ErrorMessage name="provider" class="block text-sm text-error mt-1" />
          </Field>
        </div>

        <Fieldset :legend="t('settings.gateway_section_auth')">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField name="apiKey" :label="t('settings.gateway_field_api_key')" required />
            <FormField name="secretKey" :label="t('settings.gateway_field_secret_key')" required type="password" />
            <FormField
              v-if="showPublicKey"
              name="publicKey"
              :label="t('settings.gateway_field_public_key')"
            />
            <FormField
              v-if="showWebhookSecret"
              name="webhookSecret"
              :label="t('settings.gateway_field_webhook_secret')"
              type="password"
            />
            <FormField
              v-if="showMerchantId"
              name="merchantId"
              :label="t('settings.gateway_field_merchant_id')"
            />
          </div>
        </Fieldset>

        <Fieldset :legend="t('settings.gateway_section_endpoints')">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField name="ipnUrl" :label="t('settings.gateway_field_ipn_url')" required />
            <FormField name="successUrl" :label="t('settings.gateway_field_success_url')" required />
            <FormField name="cancelUrl" :label="t('settings.gateway_field_cancel_url')" required />
            <FormField
              v-if="showErrorUrl"
              name="errorUrl"
              :label="t('settings.gateway_field_error_url')"
            />
          </div>
        </Fieldset>

        <Fieldset :legend="t('settings.gateway_section_environment')">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-on-surface mb-2">
                {{ t('settings.gateway_mode') }}
              </label>
              <Field v-slot="{ value, handleChange }" name="mode" as="div">
                <Select
                  :model-value="value"
                  :options="modeOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                  @update:model-value="handleChange"
                />
              </Field>
            </div>
            <FormField
              v-if="showBaseUrl"
              name="baseUrl"
              :label="t('settings.gateway_field_base_url')"
            />
          </div>
        </Fieldset>

        <Fieldset :legend="t('settings.gateway_section_transaction')">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-on-surface mb-2">
                {{ t('settings.gateway_field_currency') }}
              </label>
              <Field v-slot="{ value }" name="currency" as="div">
                <InputText :model-value="value" disabled class="w-full font-mono" />
              </Field>
            </div>
          </div>
        </Fieldset>

        <div class="flex justify-end gap-3 pt-2 border-t border-outline-variant/20">
          <Button
            type="button"
            :label="t('common.cancel')"
            severity="secondary"
            outlined
            @click="emit('update:visible', false)"
          />
          <Button
            type="submit"
            :label="t('common.save')"
            @click="(e: MouseEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).closest('form')?.requestSubmit() }"
          />
          <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true" />
        </div>
      </div>
    </Form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Fieldset from 'primevue/fieldset'
import FormField from './PaymentGatewayField.vue'
import type {
  PaymentGateway,
  PaymentGatewayMode,
  PaymentGatewayProvider,
} from '@/types'

const props = defineProps<{
  visible: boolean
  gateway: PaymentGateway | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [gateway: Omit<PaymentGateway, 'id'> & { id?: string }]
}>()

const { t } = useI18n()

const selectedProvider = ref<PaymentGatewayProvider>(props.gateway?.provider ?? 'wave')

watch(
  () => [props.visible, props.gateway],
  () => {
    if (props.visible) {
      selectedProvider.value = props.gateway?.provider ?? 'wave'
    }
  }
)

const providerOptions: Array<{ label: string; value: PaymentGatewayProvider }> = [
  { label: t('settings.gateway_provider_wave'), value: 'wave' },
  { label: t('settings.gateway_provider_orange_money'), value: 'orange_money' },
  { label: t('settings.gateway_provider_paytech'), value: 'paytech' },
]

const modeOptions: Array<{ label: string; value: PaymentGatewayMode }> = [
  { label: t('settings.gateway_mode_sandbox'), value: 'sandbox' },
  { label: t('settings.gateway_mode_live'), value: 'live' },
]

const showPublicKey = computed(() => selectedProvider.value === 'paytech')
const showWebhookSecret = computed(() =>
  selectedProvider.value === 'wave' || selectedProvider.value === 'paytech'
)
const showMerchantId = computed(() =>
  selectedProvider.value === 'orange_money' || selectedProvider.value === 'paytech'
)
const showErrorUrl = computed(() =>
  selectedProvider.value === 'orange_money' || selectedProvider.value === 'paytech'
)
const showBaseUrl = computed(() => selectedProvider.value === 'paytech')

const required = z.string().min(1, t('settings.gateway_required'))
const url = z.string().url(t('settings.gateway_url_invalid'))

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      provider: z.enum(['wave', 'orange_money', 'paytech']),
      mode: z.enum(['sandbox', 'live']),
      apiKey: required,
      secretKey: required,
      publicKey: z.string().optional(),
      webhookSecret: z.string().optional(),
      merchantId: z.string().optional(),
      ipnUrl: url,
      successUrl: url,
      cancelUrl: url,
      errorUrl: z.string().url(t('settings.gateway_url_invalid')).optional().or(z.literal('')),
      baseUrl: z.string().url(t('settings.gateway_url_invalid')).optional().or(z.literal('')),
      currency: z.string(),
    })
  )
)

const initialValues = computed(() => ({
  provider: props.gateway?.provider ?? 'wave',
  mode: props.gateway?.mode ?? 'sandbox',
  apiKey: props.gateway?.apiKey ?? '',
  secretKey: props.gateway?.secretKey ?? '',
  publicKey: props.gateway?.publicKey ?? '',
  webhookSecret: props.gateway?.webhookSecret ?? '',
  merchantId: props.gateway?.merchantId ?? '',
  ipnUrl: props.gateway?.ipnUrl ?? '',
  successUrl: props.gateway?.successUrl ?? '',
  cancelUrl: props.gateway?.cancelUrl ?? '',
  errorUrl: props.gateway?.errorUrl ?? '',
  baseUrl: props.gateway?.baseUrl ?? '',
  currency: props.gateway?.currency ?? 'XOF',
}))

function onSubmit(values: Record<string, unknown>): void {
  const v = values as {
    provider: PaymentGatewayProvider
    mode: PaymentGatewayMode
    apiKey: string
    secretKey: string
    publicKey?: string
    webhookSecret?: string
    merchantId?: string
    ipnUrl: string
    successUrl: string
    cancelUrl: string
    errorUrl?: string
    baseUrl?: string
    currency: string
  }
  emit('save', {
    id: props.gateway?.id,
    provider: v.provider,
    mode: v.mode,
    apiKey: v.apiKey,
    secretKey: v.secretKey,
    publicKey: v.publicKey || undefined,
    webhookSecret: v.webhookSecret || undefined,
    merchantId: v.merchantId || undefined,
    ipnUrl: v.ipnUrl,
    successUrl: v.successUrl,
    cancelUrl: v.cancelUrl,
    errorUrl: v.errorUrl || undefined,
    baseUrl: v.baseUrl || undefined,
    currency: v.currency,
  })
}
</script>
