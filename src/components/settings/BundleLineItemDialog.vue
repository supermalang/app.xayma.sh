<template>
  <Dialog
    :visible="visible"
    modal
    :header="lineItem ? t('settings.edit_line_item') : t('settings.add_line_item')"
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
        <!-- Title -->
        <div>
          <label class="block text-sm font-medium text-on-surface mb-2">
            {{ t('settings.line_item_title') }} <span class="text-error">*</span>
          </label>
          <Field v-slot="{ field }" name="title" as="div">
            <InputText v-bind="field" class="w-full" :placeholder="t('settings.line_item_title_placeholder')" />
            <ErrorMessage name="title" class="block text-sm text-error mt-1" />
          </Field>
        </div>

        <!-- Type + Amount -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('settings.line_item_type') }} <span class="text-error">*</span>
            </label>
            <Field v-slot="{ value, handleChange }" name="type" as="div">
              <Select
                :model-value="value"
                :options="typeOptions"
                option-label="label"
                option-value="value"
                class="w-full"
                @update:model-value="(v: BundleLineItemType) => { handleChange(v); selectedType = v }"
              />
            </Field>
          </div>

          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('settings.line_item_amount') }} <span class="text-error">*</span>
            </label>
            <Field v-slot="{ value, handleChange }" name="amount" as="div">
              <InputNumber
                :model-value="value as number"
                :min="0"
                :min-fraction-digits="0"
                :max-fraction-digits="2"
                :suffix="selectedType === 'PERCENT' ? ' %' : ' FCFA'"
                class="w-full"
                input-class="w-full font-mono"
                @update:model-value="handleChange"
              />
              <ErrorMessage name="amount" class="block text-sm text-error mt-1" />
            </Field>
          </div>
        </div>

        <!-- Mode + Display order -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('settings.line_item_mode') }} <span class="text-error">*</span>
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
            <p class="text-[10px] text-on-surface-variant italic mt-1">
              {{ t('settings.line_item_mode_hint') }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('settings.line_item_display_order') }}
            </label>
            <Field v-slot="{ value, handleChange }" name="displayOrder" as="div">
              <InputNumber
                :model-value="value as number"
                :min="0"
                :use-grouping="false"
                class="w-full"
                input-class="w-full font-mono"
                @update:model-value="handleChange"
              />
            </Field>
            <p class="text-[10px] text-on-surface-variant italic mt-1">
              {{ t('settings.line_item_display_order_hint') }}
            </p>
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
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Button from 'primevue/button'
import type { BundleLineItem, BundleLineItemMode, BundleLineItemType } from '@/types'

const props = defineProps<{
  visible: boolean
  lineItem: BundleLineItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [item: Omit<BundleLineItem, 'id'> & { id?: string }]
}>()

const { t } = useI18n()

const selectedType = ref<BundleLineItemType>(props.lineItem?.type ?? 'PERCENT')

watch(
  () => [props.visible, props.lineItem],
  () => {
    if (props.visible) selectedType.value = props.lineItem?.type ?? 'PERCENT'
  }
)

const typeOptions: Array<{ label: string; value: BundleLineItemType }> = [
  { label: t('settings.line_item_type_percent'), value: 'PERCENT' },
  { label: t('settings.line_item_type_fixed'), value: 'FIXED' },
]

const modeOptions: Array<{ label: string; value: BundleLineItemMode }> = [
  { label: t('settings.line_item_mode_additional'), value: 'ADDITIONAL' },
  { label: t('settings.line_item_mode_included'), value: 'INCLUDED' },
]

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      title: z.string().min(1, t('settings.line_item_required')),
      type: z.enum(['PERCENT', 'FIXED']),
      amount: z.number({ invalid_type_error: t('settings.line_item_required') }).nonnegative(),
      mode: z.enum(['ADDITIONAL', 'INCLUDED']),
      displayOrder: z.number().int().nonnegative().optional().nullable(),
    })
  )
)

const initialValues = computed(() => ({
  title: props.lineItem?.title ?? '',
  type: props.lineItem?.type ?? 'PERCENT',
  amount: props.lineItem?.amount ?? 0,
  mode: props.lineItem?.mode ?? 'ADDITIONAL',
  displayOrder: props.lineItem?.displayOrder ?? null,
}))

function onSubmit(values: Record<string, unknown>): void {
  const v = values as {
    title: string
    type: BundleLineItemType
    amount: number
    mode: BundleLineItemMode
    displayOrder?: number | null
  }
  emit('save', {
    id: props.lineItem?.id,
    title: v.title,
    type: v.type,
    amount: v.amount,
    mode: v.mode,
    displayOrder: v.displayOrder == null ? undefined : v.displayOrder,
  })
}
</script>
