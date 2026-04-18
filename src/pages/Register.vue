<template>
  <div class="w-full max-w-md">
    <Card class="shadow-lg">
      <template #header>
        <div class="p-6 border-b border-outline-variant/20">
          <h1 class="text-2xl font-bold text-on-surface">{{ $t('auth.register') }}</h1>
        </div>
      </template>

      <template #content>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Firstname -->
          <div class="flex flex-col">
            <label class="text-sm font-medium text-on-surface mb-1">{{ $t('auth.firstname') }}</label>
            <InputText
              v-model="form.firstname"
              type="text"
              class="w-full"
              :class="{ 'ng-invalid ng-touched': touched.firstname && errors.firstname }"
              @blur="touched.firstname = true"
            />
            <small v-if="touched.firstname && errors.firstname" class="text-error mt-1">
              {{ errors.firstname }}
            </small>
          </div>

          <!-- Email -->
          <div class="flex flex-col">
            <label class="text-sm font-medium text-on-surface mb-1">{{ $t('auth.email') }}</label>
            <InputText
              v-model="form.email"
              type="email"
              class="w-full"
              :class="{ 'ng-invalid ng-touched': touched.email && errors.email }"
              @blur="touched.email = true"
            />
            <small v-if="touched.email && errors.email" class="text-error mt-1">
              {{ errors.email }}
            </small>
          </div>

          <!-- Phone -->
          <div class="flex flex-col">
            <label class="text-sm font-medium text-on-surface mb-1">{{ $t('auth.phone') }}</label>
            <InputText
              v-model="form.phone"
              type="tel"
              class="w-full"
              placeholder="70-78XXXXXX"
              :class="{ 'ng-invalid ng-touched': touched.phone && errors.phone }"
              @blur="touched.phone = true"
            />
            <small v-if="touched.phone && errors.phone" class="text-error mt-1">
              {{ errors.phone }}
            </small>
          </div>

          <!-- Company Name -->
          <div class="flex flex-col">
            <label class="text-sm font-medium text-on-surface mb-1">{{ $t('auth.company_name') }}</label>
            <InputText
              v-model="form.company_name"
              type="text"
              class="w-full"
              :class="{ 'ng-invalid ng-touched': touched.company_name && errors.company_name }"
              @blur="touched.company_name = true"
            />
            <small v-if="touched.company_name && errors.company_name" class="text-error mt-1">
              {{ errors.company_name }}
            </small>
          </div>

          <!-- Password -->
          <div class="flex flex-col">
            <label class="text-sm font-medium text-on-surface mb-1">{{ $t('auth.password') }}</label>
            <Password
              v-model="form.password"
              class="w-full"
              :class="{ 'ng-invalid ng-touched': touched.password && errors.password }"
              toggle-mask
              :feedback="false"
              @blur="touched.password = true"
            />
            <small v-if="touched.password && errors.password" class="text-error mt-1">
              {{ errors.password }}
            </small>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            class="w-full mt-6"
            :loading="isLoading"
            label="Create Account"
          />
        </form>

        <!-- Login Link -->
        <div class="text-center mt-4 text-sm text-on-surface-variant">
          {{ $t('auth.already_have_account') }}
          <RouterLink to="/auth/login" class="text-primary font-medium hover:underline">
            {{ $t('auth.login') }}
          </RouterLink>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import { z } from 'zod'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const form = reactive({
  firstname: '',
  email: '',
  phone: '',
  company_name: '',
  password: '',
})

const touched = reactive({
  firstname: false,
  email: false,
  phone: false,
  company_name: false,
  password: false,
})

const errors = reactive({
  firstname: '',
  email: '',
  phone: '',
  company_name: '',
  password: '',
})

const isLoading = ref(false)

// Validation schema
const phoneRegex = /^(70|75|76|77|78)[0-9]{7}$/
const schema = z.object({
  firstname: z.string().min(1, t('errors.required')),
  email: z.string().email(t('errors.invalid_email')),
  phone: z.string().regex(phoneRegex, t('auth.phone_invalid')),
  company_name: z.string().min(1, t('errors.required')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const validate = () => {
  const result = schema.safeParse(form)
  if (!result.success) {
    Object.entries(result.error.flatten().fieldErrors).forEach(([field, msgs]) => {
      ;(errors as any)[field] = msgs?.[0] || ''
    })
    return false
  }
  Object.keys(errors).forEach((key) => {
    ;(errors as any)[key] = ''
  })
  return true
}

const handleSubmit = async () => {
  if (!validate()) return

  isLoading.value = true
  try {
    await authStore.signUp(form.email, form.password)
    // TODO: Store firstname, company_name in user metadata or separate table
    await router.push('/auth/login')
  } catch (error) {
    errors.email = t('errors.webhook_failed')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
:deep(.ng-invalid.ng-touched) {
  border-color: var(--color-danger);
}

:deep(.p-password) {
  width: 100%;
}
</style>
