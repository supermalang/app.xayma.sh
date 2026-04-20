<template>
  <Form @submit="onSubmit" :validation-schema="validationSchema" :initial-values="initialValues">
    <div class="space-y-6">
      <!-- First Name -->
      <div>
        <label :for="`firstname-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('users.form.firstname') }}
          <span class="text-error">*</span>
        </label>
        <Field
          :id="`firstname-${uid}`"
          v-slot="{ field, meta }"
          name="firstname"
          as="div"
        >
          <InputText
            v-bind="field"
            type="text"
            class="w-full"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
          />
          <ErrorMessage name="firstname" class="block text-sm text-error mt-1" />
        </Field>
      </div>

      <!-- Last Name -->
      <div>
        <label :for="`lastname-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('auth.lastname') }}
        </label>
        <Field
          :id="`lastname-${uid}`"
          v-slot="{ field, meta }"
          name="lastname"
          as="div"
        >
          <InputText
            v-bind="field"
            type="text"
            class="w-full"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
          />
          <ErrorMessage name="lastname" class="block text-sm text-error mt-1" />
        </Field>
      </div>

      <!-- Email (read-only for display) -->
      <div>
        <label :for="`email-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('users.form.email') }}
        </label>
        <Field
          :id="`email-${uid}`"
          v-slot="{ field }"
          name="email"
          as="div"
        >
          <InputText
            v-bind="field"
            type="email"
            disabled
            class="w-full bg-surface-container-low"
          />
        </Field>
      </div>

      <!-- Role -->
      <div>
        <label :for="`user_role-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('users.form.role') }}
          <span class="text-error">*</span>
        </label>
        <Field
          :id="`user_role-${uid}`"
          v-slot="{ field, meta }"
          name="user_role"
          as="div"
        >
          <Dropdown
            v-bind="field"
            :options="roleOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
          />
          <ErrorMessage name="user_role" class="block text-sm text-error mt-1" />
        </Field>
      </div>

      <!-- Partner (Company) -->
      <div>
        <label :for="`company_id-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
          {{ $t('users.form.partner') }}
          <span class="text-error">*</span>
        </label>
        <Field
          :id="`company_id-${uid}`"
          v-slot="{ field, meta }"
          name="company_id"
          as="div"
        >
          <Dropdown
            v-bind="field"
            :options="partnerOptions"
            option-label="name"
            option-value="id"
            class="w-full"
            :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
            :placeholder="$t('common.select')"
          />
          <ErrorMessage name="company_id" class="block text-sm text-error mt-1" />
        </Field>
      </div>

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
          @click="(e: MouseEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).closest('form')?.requestSubmit() }"
        />
        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
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
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'

interface Props {
  initialData?: any
  partners?: any[]
  isLoading?: boolean
}

interface Emits {
  (e: 'submit', value: any): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  partners: () => [],
})

const emit = defineEmits<Emits>()

const { t } = useI18n()
const uid = Math.random().toString(36).substring(7)
const isSubmitting = ref(false)

// Form mode
const isEditMode = computed(() => !!props.initialData?.id)

// Options
const roleOptions = [
  { label: t('users.roles.ADMIN'), value: 'ADMIN' },
  { label: t('users.roles.CUSTOMER'), value: 'CUSTOMER' },
  { label: t('users.roles.RESELLER'), value: 'RESELLER' },
  { label: t('users.roles.SALES'), value: 'SALES' },
  { label: t('users.roles.SUPPORT'), value: 'SUPPORT' },
]

const partnerOptions = computed(() => props.partners)

// Validation schema
const validationSchema = toTypedSchema(
  z.object({
    firstname: z.string().min(1, t('errors.required')).min(2, t('users.errors.firstname_too_short')),
    lastname: z.string().optional(),
    email: z.string().email(t('errors.invalid_email')),
    user_role: z.string().min(1, t('errors.required')),
    company_id: z.number().min(1, t('errors.required')),
  })
)

// Initial values
const initialValues = {
  firstname: props.initialData?.firstname || '',
  lastname: props.initialData?.lastname || '',
  email: props.initialData?.email || '',
  user_role: props.initialData?.user_role || 'CUSTOMER',
  company_id: props.initialData?.company_id || '',
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
:deep(.p-dropdown) {
  width: 100%;
}

:deep(.ng-invalid.ng-touched) {
  border-color: var(--error);
}
</style>
