<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <h1 class="text-3xl font-bold text-on-surface">{{ $t('profile.title') }}</h1>

    <div v-if="user" class="bg-surface-container-low p-6 rounded-lg">
      <Form @submit="onSubmit" :validation-schema="validationSchema" :initial-values="initialValues">
        <div class="space-y-6">
          <!-- First Name -->
          <div>
            <label :for="firstnameId" class="block text-sm font-medium text-on-surface mb-2">
              {{ $t('profile.firstname') }}
              <span class="text-error">*</span>
            </label>
            <Field
              :id="firstnameId"
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
            <label :for="lastnameId" class="block text-sm font-medium text-on-surface mb-2">
              {{ $t('profile.lastname') }}
            </label>
            <Field
              :id="lastnameId"
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

          <!-- Email (read-only) -->
          <div>
            <label :for="emailId" class="block text-sm font-medium text-on-surface mb-2">
              {{ $t('profile.email') }}
            </label>
            <InputText
              :id="emailId"
              :value="user.email"
              type="email"
              disabled
              class="w-full bg-surface-container"
            />
            <p class="text-xs text-on-surface-variant mt-1">{{ $t('profile.email_read_only') }}</p>
          </div>

          <!-- Language -->
          <div>
            <label :for="languageId" class="block text-sm font-medium text-on-surface mb-2">
              {{ $t('profile.language') }}
            </label>
            <Field
              :id="languageId"
              v-slot="{ field, meta }"
              name="language"
              as="div"
            >
              <Dropdown
                v-bind="field"
                :options="languageOptions"
                option-label="label"
                option-value="value"
                class="w-full"
                :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
              />
              <ErrorMessage name="language" class="block text-sm text-error mt-1" />
            </Field>
          </div>

          <!-- Currency -->
          <div>
            <label :for="currencyId" class="block text-sm font-medium text-on-surface mb-2">
              {{ $t('profile.currency') }}
            </label>
            <Field
              :id="currencyId"
              v-slot="{ field, meta }"
              name="currency"
              as="div"
            >
              <Dropdown
                v-bind="field"
                :options="currencyOptions"
                option-label="label"
                option-value="value"
                class="w-full"
                :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
              />
              <ErrorMessage name="currency" class="block text-sm text-error mt-1" />
            </Field>
          </div>

          <!-- Form actions -->
          <div class="flex gap-3 justify-end pt-4 border-t border-outline-variant">
            <Button
              type="button"
              :label="$t('common.cancel')"
              severity="secondary"
              @click="resetForm"
            />
            <Button
              type="submit"
              :label="$t('common.save')"
              :loading="isSubmitting"
              @click="(e: MouseEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).closest('form')?.requestSubmit() }"
            />
            <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
          </div>
        </div>
      </Form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import * as userService from '@/services/users.service'

const { t, locale } = useI18n()
const authStore = useAuthStore()

// State
const user = ref<any>(null)
const isSubmitting = ref(false)

const firstnameId = `firstname-${Math.random().toString(36).substring(7)}`
const lastnameId = `lastname-${Math.random().toString(36).substring(7)}`
const emailId = `email-${Math.random().toString(36).substring(7)}`
const languageId = `language-${Math.random().toString(36).substring(7)}`
const currencyId = `currency-${Math.random().toString(36).substring(7)}`

// Options
const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Français', value: 'fr' },
]

const currencyOptions = [
  { label: 'XOF (West African CFA Franc)', value: 'XOF' },
  { label: 'USD (US Dollar)', value: 'USD' },
  { label: 'EUR (Euro)', value: 'EUR' },
]

// Validation schema
const validationSchema = toTypedSchema(
  z.object({
    firstname: z.string().min(1, t('errors.required')).min(2, t('users.errors.firstname_too_short')),
    lastname: z.string().optional(),
    language: z.string().min(1, t('errors.required')),
    currency: z.string().min(1, t('errors.required')),
  })
)

// Initial values
const initialValues = computed(() => ({
  firstname: user.value?.firstname || '',
  lastname: user.value?.lastname || '',
  language: locale.value || 'en',
  currency: user.value?.currency || 'XOF',
}))

// Load current user
const loadUser = async () => {
  try {
    if (authStore.user?.id) {
      const userData = await userService.getUser(authStore.user.id)
      user.value = userData
    }
  } catch (error) {
    console.error('Failed to load user:', error)
  }
}

// Form submission
const onSubmit = async (values: any) => {
  try {
    isSubmitting.value = true
    if (authStore.user?.id) {
      await userService.updateUser(authStore.user.id, {
        firstname: values.firstname,
        lastname: values.lastname,
      })
      // Update language in localStorage
      locale.value = values.language
      localStorage.setItem('locale', values.language)
      // Reload user data
      await loadUser()
    }
  } catch (error) {
    console.error('Failed to update profile:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
const resetForm = () => {
  window.location.reload()
}

// Lifecycle
onMounted(() => {
  loadUser()
})
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
