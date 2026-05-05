<template>
  <div class="w-full max-w-[440px]">
    <div class="auth-card relative overflow-hidden bg-surface-container-lowest rounded-xl p-10 border border-outline-variant/20">
      <!-- Side accent stripe -->
      <span class="absolute top-0 left-0 w-1 h-full bg-primary" aria-hidden="true"></span>

      <!-- Heading -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold tracking-tight text-on-surface mb-1">
          {{ t('auth.authenticate_title') }}
        </h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('auth.authenticate_subtitle') }}
        </p>
      </div>

      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- Email / Username -->
        <div class="space-y-1.5">
          <label
            for="identity"
            class="text-[11px] font-bold uppercase tracking-widest text-outline"
          >
            {{ t('auth.email_or_username') }}
          </label>
          <div class="relative">
            <span
              class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none"
              aria-hidden="true"
            >
              person
            </span>
            <InputText
              id="identity"
              v-model="form.email"
              type="text"
              :placeholder="t('auth.email_placeholder')"
              autocomplete="username"
              class="auth-input w-full"
              :invalid="touched.email && !!errors.email"
              @blur="touched.email = true"
            />
          </div>
          <small v-if="touched.email && errors.email" class="block text-error mt-1">
            {{ errors.email }}
          </small>
        </div>

        <!-- Password -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center">
            <label
              for="password"
              class="text-[11px] font-bold uppercase tracking-widest text-outline"
            >
              {{ t('auth.password') }}
            </label>
            <a
              href="#"
              class="text-[11px] font-bold text-primary hover:underline uppercase tracking-wider"
            >
              {{ t('auth.forgot_password') }}
            </a>
          </div>
          <div class="relative">
            <span
              class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none z-10"
              aria-hidden="true"
            >
              lock
            </span>
            <Password
              v-model="form.password"
              :placeholder="t('auth.password_placeholder')"
              :feedback="false"
              toggle-mask
              :input-props="{ id: 'password', autocomplete: 'current-password' }"
              :pt="{ pcInputText: { root: { class: 'auth-input w-full' } } }"
              class="auth-password w-full block"
              :invalid="touched.password && !!errors.password"
              @blur="touched.password = true"
            />
          </div>
          <small v-if="touched.password && errors.password" class="block text-error mt-1">
            {{ errors.password }}
          </small>
        </div>

        <!-- Remember me -->
        <div class="flex items-center gap-3">
          <ToggleSwitch v-model="form.rememberMe" inputId="remember-me" />
          <label for="remember-me" class="text-sm font-medium text-on-surface-variant cursor-pointer">
            {{ t('auth.remember_me') }}
          </label>
        </div>

        <!-- Sign In -->
        <Button
          type="submit"
          class="auth-submit w-full group"
          :loading="isLoading"
          @click.prevent="handleSubmit"
        >
          <span class="font-bold">{{ t('auth.sign_in') }}</span>
          <span
            class="material-symbols-outlined !text-[18px] ms-2 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            arrow_forward
          </span>
        </Button>

        <!-- Hidden native submit (catches Enter-key implicit submission) -->
        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true">
          {{ t('auth.sign_in') }}
        </button>
      </form>

      <!-- Divider -->
      <div class="mt-8 flex items-center gap-4">
        <div class="h-px flex-grow bg-outline-variant/40"></div>
        <span class="text-[10px] font-bold uppercase tracking-widest text-outline">
          {{ t('auth.or_connect_with') }}
        </span>
        <div class="h-px flex-grow bg-outline-variant/40"></div>
      </div>

      <!-- Social -->
      <div class="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          :title="t('auth.social_coming_soon')"
          class="auth-social flex items-center justify-center gap-3 border border-outline-variant/40 py-3 rounded-lg"
        >
          <svg viewBox="0 0 24 24" class="w-5 h-5" aria-hidden="true">
            <path fill="#4285F4" d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2c-.27 1.45-1.08 2.68-2.3 3.5v2.9h3.72c2.18-2 3.44-4.97 3.44-8.59" />
            <path fill="#34A853" d="M12 23.5c3.1 0 5.7-1.03 7.62-2.78l-3.72-2.9c-1.03.69-2.34 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.7v2.99A11.5 11.5 0 0 0 12 23.5" />
            <path fill="#FBBC05" d="M5.55 14.17a6.9 6.9 0 0 1 0-4.34V6.84H1.7a11.5 11.5 0 0 0 0 10.32z" />
            <path fill="#EA4335" d="M12 4.92c1.7 0 3.22.58 4.42 1.73l3.3-3.3C17.7 1.5 15.1.5 12 .5A11.5 11.5 0 0 0 1.7 6.84l3.85 2.99C6.46 6.95 9 4.92 12 4.92" />
          </svg>
          <span class="text-sm font-medium">Google</span>
        </button>
        <button
          type="button"
          disabled
          :title="t('auth.social_coming_soon')"
          class="auth-social flex items-center justify-center gap-3 border border-outline-variant/40 py-3 rounded-lg"
        >
          <svg viewBox="0 0 24 24" class="w-5 h-5" aria-hidden="true">
            <path
              fill="currentColor"
              d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
            />
          </svg>
          <span class="text-sm font-medium">Apple</span>
        </button>
      </div>

      <!-- Register link -->
      <div class="mt-6 text-center text-sm text-on-surface-variant">
        {{ t('auth.no_account') }}
        <RouterLink to="/auth/register" class="text-primary font-medium hover:underline">
          {{ t('auth.signup') }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { z } from 'zod'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()
const toast = useToast()

const form = reactive({
  email: '',
  password: '',
  rememberMe: false,
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

const schema = z.object({
  email: z.string().min(1, t('errors.required')),
  password: z.string().min(1, t('errors.required')),
})

const validate = () => {
  const result = schema.safeParse(form)
  if (!result.success) {
    Object.entries(result.error.flatten().fieldErrors).forEach(([field, msgs]) => {
      ;(errors as Record<string, string>)[field] = msgs?.[0] || ''
    })
    return false
  }
  Object.keys(errors).forEach((key) => {
    ;(errors as Record<string, string>)[key] = ''
  })
  return true
}

const handleSubmit = async () => {
  touched.email = true
  touched.password = true
  if (!validate()) return

  isLoading.value = true
  try {
    await authStore.signIn(form.email, form.password)
    await router.push('/')
  } catch {
    toast.add({
      severity: 'error',
      summary: t('errors.error'),
      detail: t('errors.webhook_failed'),
      life: 3000,
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-card {
  box-shadow: none;
}

:deep(.auth-input) {
  background-color: var(--surface-container-low);
  border: none;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  width: 100%;
  transition: box-shadow 150ms ease-out, background-color 150ms ease-out;
}

:deep(.auth-input::placeholder) {
  color: color-mix(in srgb, var(--outline) 50%, transparent);
}

:deep(.auth-input:focus),
:deep(.auth-input:focus-visible) {
  outline: none;
  box-shadow: 0 0 0 2px var(--primary);
  background-color: var(--surface-container-low);
}

:deep(.auth-input.p-invalid),
:deep(.auth-input[aria-invalid='true']) {
  box-shadow: 0 0 0 2px var(--error);
}

.auth-password,
:deep(.auth-password .p-password-input) {
  width: 100%;
}

:deep(.auth-password .p-icon-field) {
  width: 100%;
}

:deep(.auth-password .p-password-toggle-mask-icon) {
  color: var(--outline);
  right: 0.875rem;
}

.auth-submit {
  background-color: var(--primary-container);
  color: var(--on-primary);
  border: none;
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  transition: background-color 200ms ease-out, transform 150ms ease-out;
}

.auth-submit:hover:not(:disabled) {
  background-color: var(--primary);
}

.auth-submit:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.auth-social {
  color: var(--on-surface);
  background-color: var(--surface-container-lowest);
  transition: background-color 150ms ease-out;
}

.auth-social:hover:not(:disabled) {
  background-color: var(--surface-container);
}

.auth-social:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.4);
}
</style>
