<template>
  <Form @submit="onSubmit" :validation-schema="validationSchema" :initial-values="initialValues">
    <div class="space-y-6">
      <!-- Name -->
      <div>
        <label :for="`name-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('partners.form.name') }}
          <span class="text-error">*</span>
        </label>
        <Field
          :id="`name-${uid}`"
          v-slot="{ field, meta }"
          name="name"
          as="div"
        >
          <InputText
            v-bind="field"
            type="text"
            class="w-full"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
            @blur="handleNameChange"
          />
          <ErrorMessage name="name" class="block text-sm text-error mt-1" />
        </Field>
      </div>

      <!-- Slug (auto-generated) -->
      <div>
        <label :for="`slug-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('partners.form.slug') }}
          <span class="text-error">*</span>
        </label>
        <Field
          :id="`slug-${uid}`"
          v-slot="{ field, meta }"
          name="slug"
          as="div"
        >
          <InputText
            v-bind="field"
            type="text"
            class="w-full"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
          />
          <small class="text-on-surface-variant text-xs mt-1">Auto-generated from name. Must be unique.</small>
          <ErrorMessage name="slug" class="block text-sm text-error mt-1" />
        </Field>
      </div>

      <!-- Email -->
      <div>
        <label :for="`email-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('partners.form.email') }}
        </label>
        <Field
          :id="`email-${uid}`"
          v-slot="{ field, meta }"
          name="email"
          as="div"
        >
          <InputText
            v-bind="field"
            type="email"
            class="w-full"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
          />
          <ErrorMessage name="email" class="block text-sm text-error mt-1" />
        </Field>
      </div>

      <!-- Phone -->
      <div>
        <label :for="`phone-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('partners.form.phone') }}
        </label>
        <Field
          :id="`phone-${uid}`"
          v-slot="{ field, meta }"
          name="phone"
          as="div"
        >
          <InputMask
            v-bind="field"
            mask="(+999) 99 999 9999"
            placeholder="+236 70 123 4567"
            class="w-full"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
          />
          <ErrorMessage name="phone" class="block text-sm text-error mt-1" />
        </Field>
      </div>

      <!-- Type -->
      <div>
        <label :for="`partner_type-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('partners.form.type') }}
          <span class="text-error">*</span>
        </label>
        <Field
          :id="`partner_type-${uid}`"
          v-slot="{ field, meta }"
          name="partner_type"
          as="div"
        >
          <Dropdown
            v-bind="field"
            :options="partnerTypeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
          />
          <ErrorMessage name="partner_type" class="block text-sm text-error mt-1" />
        </Field>
      </div>

      <!-- Status -->
      <div>
        <label :for="`status-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('partners.form.status') }}
          <span class="text-error">*</span>
        </label>
        <Field
          :id="`status-${uid}`"
          v-slot="{ field, meta }"
          name="status"
          as="div"
        >
          <Dropdown
            v-bind="field"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
          />
          <ErrorMessage name="status" class="block text-sm text-error mt-1" />
        </Field>
      </div>

      <!-- Description -->
      <div>
        <label :for="`description-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('partners.form.description') }}
        </label>
        <Field
          :id="`description-${uid}`"
          v-slot="{ field, meta }"
          name="description"
          as="div"
        >
          <Textarea
            v-bind="field"
            class="w-full"
            rows="3"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
          />
          <ErrorMessage name="description" class="block text-sm text-error mt-1" />
        </Field>
      </div>

      <!-- Address -->
      <div>
        <label :for="`address-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('partners.form.address') }}
        </label>
        <Field
          :id="`address-${uid}`"
          v-slot="{ field, meta }"
          name="address"
          as="div"
        >
          <Textarea
            v-bind="field"
            class="w-full"
            rows="2"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
          />
          <ErrorMessage name="address" class="block text-sm text-error mt-1" />
        </Field>
      </div>

      <!-- Activity Area -->
      <div>
        <label :for="`activity_area-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('partners.form.activity_area') }}
        </label>
        <Field
          :id="`activity_area-${uid}`"
          v-slot="{ field, meta }"
          name="activity_area"
          as="div"
        >
          <MultiSelect
            v-bind="field"
            :options="activityAreaOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
            :placeholder="$t('common.select')"
            @change="field.value = $event.value"
          />
          <ErrorMessage name="activity_area" class="block text-sm text-error mt-1" />
        </Field>
      </div>

      <!-- Credit Debt Settings -->
      <fieldset class="border border-outline-variant/30 rounded-lg p-4 space-y-4">
        <legend class="text-sm font-medium text-on-surface px-2">
          {{ $t('partners.form.credit_settings') }}
        </legend>

        <!-- Allow Credit Debt -->
        <div class="flex items-center gap-3">
          <Field
            v-slot="{ field }"
            name="allowCreditDebt"
            type="checkbox"
          >
            <InputSwitch
              v-bind="field"
              :model-value="field.value"
              @update:model-value="field.value = $event"
            />
          </Field>
          <label class="text-sm font-medium text-on-surface">
            {{ $t('partners.form.allow_credit_debt') }}
          </label>
        </div>

        <!-- Credit Debt Threshold -->
        <div v-if="allowCreditDebt">
          <label :for="`creditDebtThreshold-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
            {{ $t('partners.form.credit_debt_threshold') }}
          </label>
          <Field
            :id="`creditDebtThreshold-${uid}`"
            v-slot="{ field, meta }"
            name="creditDebtThreshold"
            as="div"
          >
            <InputNumber
              v-bind="field"
              class="w-full"
              :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
              :use-grouping="false"
              @blur="field.value = Number(field.value) || 0"
            />
            <ErrorMessage name="creditDebtThreshold" class="block text-sm text-error mt-1" />
          </Field>
        </div>
      </fieldset>

      <!-- Form actions -->
      <div class="flex gap-3 justify-end pt-4">
        <Button
          type="button"
          :label="$t('common.cancel')"
          severity="secondary"
          @click="emit('cancel')"
        />
        <Button
          type="submit"
          :label="isEditMode ? $t('common.update') : $t('common.create')"
          :loading="isSubmitting"
        />
      </div>
    </div>
  </Form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import InputText from 'primevue/inputtext'
import InputMask from 'primevue/inputmask'
import InputNumber from 'primevue/inputnumber'
import InputSwitch from 'primevue/inputswitch'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'

interface Props {
  initialData?: any
  isLoading?: boolean
}

interface Emits {
  (e: 'submit', value: any): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
})

const emit = defineEmits<Emits>()

const { t } = useI18n()
const uid = Math.random().toString(36).substring(7)
const isSubmitting = ref(false)

// Form mode
const isEditMode = computed(() => !!props.initialData?.id)

// Options
const partnerTypeOptions = [
  { label: t('partners.type.customer'), value: 'customer' },
  { label: t('partners.type.reseller'), value: 'reseller' },
]

const statusOptions = [
  { label: t('partners.status.active'), value: 'active' },
  { label: t('partners.status.suspended'), value: 'suspended' },
  { label: t('partners.status.inactive'), value: 'inactive' },
]

const activityAreaOptions = [
  { label: 'Technology', value: 'technology' },
  { label: 'Retail', value: 'retail' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Education', value: 'education' },
  { label: 'Finance', value: 'finance' },
  { label: 'Manufacturing', value: 'manufacturing' },
  { label: 'Other', value: 'other' },
]

// Phone validation regex: West Africa format (70, 75, 76, 77, 78 + 7 digits)
const phoneRegex = /^(70|75|76|77|78)[0-9]{7}$/

// Slug generation from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Validation schema
const validationSchema = toTypedSchema(
  z.object({
    name: z.string().min(1, t('errors.required')).min(3, t('partners.errors.name_too_short')),
    slug: z.string().min(1, t('errors.required')),
    email: z.string().email(t('errors.invalid_email')).optional().or(z.literal('')),
    phone: z
      .string()
      .regex(phoneRegex, t('auth.phone_invalid'))
      .optional()
      .or(z.literal('')),
    partner_type: z.string().min(1, t('errors.required')),
    status: z.string().min(1, t('errors.required')),
    description: z.string().optional(),
    address: z.string().optional(),
    activity_area: z.array(z.string()).optional(),
    allowCreditDebt: z.boolean().optional(),
    creditDebtThreshold: z.number().min(0).optional(),
  })
)

// Initial values
const initialValues = {
  name: props.initialData?.name || '',
  slug: props.initialData?.slug || '',
  email: props.initialData?.email || '',
  phone: props.initialData?.phone || '',
  partner_type: props.initialData?.partner_type || 'customer',
  status: props.initialData?.status || 'active',
  description: props.initialData?.description || '',
  address: props.initialData?.address || '',
  activity_area: props.initialData?.activity_area || [],
  allowCreditDebt: props.initialData?.allowCreditDebt || false,
  creditDebtThreshold: props.initialData?.creditDebtThreshold || 0,
}

const allowCreditDebt = ref(initialValues.allowCreditDebt)

// Handle name change to auto-generate slug
const handleNameChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const slug = generateSlug(input.value)
  const slugInput = document.getElementById(`slug-${uid}`) as HTMLInputElement
  if (slugInput) {
    slugInput.value = slug
  }
}

// Form submission
const onSubmit = async (values: any) => {
  try {
    isSubmitting.value = true
    emit('submit', values)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
:deep(.p-inputtext),
:deep(.p-inputmask),
:deep(.p-inputnumber),
:deep(.p-inputtextarea),
:deep(.p-dropdown),
:deep(.p-multiselect) {
  width: 100%;
}

:deep(.ng-invalid.ng-touched) {
  border-color: var(--error);
}

:deep(.p-inputswitch) {
  margin-right: 0.5rem;
}
</style>
