<template>
  <Dialog
    :visible="visible"
    modal
    :header="bundle ? t('settings.edit_bundle') : t('settings.add_bundle')"
    :style="{ width: '32rem' }"
    :draggable="false"
    @update:visible="(v: boolean) => emit('update:visible', v)"
  >
    <Form
      :validation-schema="validationSchema"
      :initial-values="initialValues"
      @submit="onSubmit"
    >
      <div class="space-y-6">
        <!-- Label -->
        <div>
          <label class="block text-sm font-medium text-on-surface mb-2">
            {{ t('settings.bundle_label') }} <span class="text-error">*</span>
          </label>
          <Field v-slot="{ field }" name="label" as="div">
            <InputText v-bind="field" class="w-full" />
            <ErrorMessage name="label" class="block text-sm text-error mt-1" />
          </Field>
        </div>

        <!-- Numeric grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('settings.bundle_credits_amount') }} <span class="text-error">*</span>
            </label>
            <Field v-slot="{ value, handleChange }" name="creditsAmount" as="div">
              <InputNumber
                :model-value="value as number"
                :min="0"
                :use-grouping="false"
                class="w-full"
                input-class="w-full font-mono"
                @update:model-value="handleChange"
              />
              <ErrorMessage name="creditsAmount" class="block text-sm text-error mt-1" />
            </Field>
          </div>

          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('settings.bundle_price_xof') }} <span class="text-error">*</span>
            </label>
            <Field v-slot="{ value, handleChange }" name="priceXOF" as="div">
              <InputNumber
                :model-value="value as number"
                :min="0"
                :use-grouping="true"
                suffix=" FCFA"
                class="w-full"
                input-class="w-full font-mono"
                @update:model-value="handleChange"
              />
              <ErrorMessage name="priceXOF" class="block text-sm text-error mt-1" />
            </Field>
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('settings.bundle_validity_days') }} <span class="text-error">*</span>
            </label>
            <Field v-slot="{ value, handleChange }" name="validityDays" as="div">
              <InputNumber
                :model-value="value as number"
                :min="1"
                :use-grouping="false"
                class="w-full"
                input-class="w-full font-mono"
                @update:model-value="handleChange"
              />
              <ErrorMessage name="validityDays" class="block text-sm text-error mt-1" />
            </Field>
          </div>
        </div>

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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import type { CreditBundle } from '@/types'

const props = defineProps<{
  visible: boolean
  bundle: CreditBundle | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [bundle: Omit<CreditBundle, 'id'> & { id?: string }]
}>()

const { t } = useI18n()

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      label: z.string().min(1, t('settings.bundle_required')),
      creditsAmount: z.number({ invalid_type_error: t('settings.bundle_required') }).int().positive(),
      priceXOF: z.number({ invalid_type_error: t('settings.bundle_required') }).int().nonnegative(),
      validityDays: z.number({ invalid_type_error: t('settings.bundle_required') }).int().positive(),
    })
  )
)

const initialValues = computed(() => ({
  label: props.bundle?.label ?? '',
  creditsAmount: props.bundle?.creditsAmount ?? 0,
  priceXOF: props.bundle?.priceXOF ?? 0,
  validityDays: props.bundle?.validityDays ?? 365,
}))

function onSubmit(values: Record<string, unknown>): void {
  const v = values as {
    label: string
    creditsAmount: number
    priceXOF: number
    validityDays: number
  }
  emit('save', {
    id: props.bundle?.id,
    label: v.label,
    creditsAmount: v.creditsAmount,
    priceXOF: v.priceXOF,
    discountPercent: props.bundle?.discountPercent ?? 0,
    validityDays: v.validityDays,
  })
}
</script>
