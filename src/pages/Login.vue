<template>
  <div class="w-full max-w-md">
    <Card class="bg-surface-container-low">
      <template #header>
        <div class="p-6 border-b border-outline-variant/20">
          <h1 class="text-2xl font-bold text-on-surface">{{ $t('auth.login') }}</h1>
        </div>
      </template>

      <template #content>
        <form @submit.prevent="handleSubmit" class="space-y-4">
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
            label="Login"
          />
        </form>

        <!-- Register Link -->
        <div class="text-center mt-4 text-sm text-on-surface-variant">
          Don't have an account?
          <RouterLink to="/auth/register" class="text-primary font-medium hover:underline">
            {{ $t('auth.signup') }}
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
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import { z } from 'zod'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()
const toast = useToast()

const form = reactive({
  email: '',
  password: '',
})

const touched = reactive({
  email: false,
  password: false,
})

const errors = reactive({
  email: '',
  password: '',
})

const isLoading = ref(false)

// Validation schema
const schema = z.object({
  email: z.string().email(t('errors.invalid_email')),
  password: z.string().min(1, t('errors.required')),
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
    await authStore.signIn(form.email, form.password)
    await router.push('/')
  } catch (error) {
    toast.add({ severity: 'error', summary: t('errors.error'), detail: t('errors.webhook_failed'), life: 3000 })
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
