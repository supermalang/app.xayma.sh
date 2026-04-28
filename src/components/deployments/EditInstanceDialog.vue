<template>
  <Dialog
    :visible="visible"
    modal
    :header="$t('deployments.detail.edit.title')"
    :style="{ width: '32rem' }"
    :draggable="false"
    @update:visible="onVisibleChange"
  >
    <Form
      :validation-schema="validationSchema"
      :initial-values="initialValues"
      @submit="onSubmit"
    >
      <div class="space-y-6">
        <div>
          <label
            :for="`instance-name-${uid}`"
            class="block text-sm font-medium text-on-surface mb-2"
          >
            {{ $t('deployments.detail.edit.name') }}
            <span class="text-error">*</span>
          </label>
          <Field
            :id="`instance-name-${uid}`"
            v-slot="{ field, meta }"
            name="label"
            as="div"
          >
            <InputText
              v-bind="field"
              type="text"
              class="w-full"
              :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
            />
            <ErrorMessage name="label" class="block text-sm text-error mt-1" />
          </Field>
        </div>

        <div>
          <label
            :for="`instance-domain-${uid}`"
            class="block text-sm font-medium text-on-surface mb-2"
          >
            {{ $t('deployments.detail.edit.domain') }}
          </label>
          <Field
            :id="`instance-domain-${uid}`"
            v-slot="{ field, meta }"
            name="customDomain"
            as="div"
          >
            <InputText
              v-bind="field"
              type="text"
              class="w-full"
              :placeholder="$t('deployments.detail.edit.domain_placeholder')"
              :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
            />
            <ErrorMessage name="customDomain" class="block text-sm text-error mt-1" />
          </Field>
        </div>

        <div>
          <label
            :for="`instance-description-${uid}`"
            class="block text-sm font-medium text-on-surface mb-2"
          >
            {{ $t('deployments.detail.edit.description') }}
          </label>
          <Field
            :id="`instance-description-${uid}`"
            v-slot="{ field }"
            name="description"
            as="div"
          >
            <Textarea
              v-bind="field"
              rows="3"
              class="w-full"
              :placeholder="$t('deployments.detail.edit.description_placeholder')"
            />
          </Field>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            :label="$t('common.cancel')"
            severity="secondary"
            outlined
            @click="onVisibleChange(false)"
          />
          <Button
            type="submit"
            :label="$t('common.save')"
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
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import type { DeploymentWithRelations } from '@/services/deployments.service'

interface Props {
  visible: boolean
  deployment: DeploymentWithRelations | null
}

interface FormValues {
  label: string
  customDomain: string
  description: string
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', value: FormValues): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const uid = Math.random().toString(36).substring(7)

const validationSchema = toTypedSchema(
  z.object({
    label: z.string().min(1, t('errors.required')),
    customDomain: z.string().optional(),
    description: z.string().optional(),
  }),
)

const initialValues = computed<FormValues>(() => ({
  label: props.deployment?.label ?? '',
  customDomain: props.deployment?.domainNames?.[0] ?? '',
  description: '',
}))

function onVisibleChange(value: boolean) {
  emit('update:visible', value)
}

function onSubmit(values: Record<string, unknown>) {
  emit('save', values as unknown as FormValues)
}
</script>
