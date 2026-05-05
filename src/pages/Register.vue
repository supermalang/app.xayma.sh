<template>
  <div class="register-shell min-h-screen flex items-stretch bg-surface text-on-surface">
    <!-- Left: brand + benefits -->
    <aside
      class="hidden lg:flex flex-col justify-between w-1/3 bg-surface-container-low p-12 border-e border-outline-variant/20"
    >
      <div class="space-y-12">
        <RouterLink to="/" class="flex items-center gap-3">
          <span
            class="w-8 h-8 bg-primary-container flex items-center justify-center rounded-lg"
            aria-hidden="true"
          >
            <span class="material-symbols-outlined !text-[18px] text-on-primary">rocket_launch</span>
          </span>
          <span class="text-xl font-bold tracking-tighter text-on-primary-fixed">Xayma.sh</span>
        </RouterLink>

        <div class="space-y-8">
          <h1 class="text-4xl font-bold tracking-tight text-on-surface leading-tight">
            {{ t('auth.register_brand_headline') }}
          </h1>

          <div class="space-y-6">
            <div class="flex gap-4">
              <span
                class="material-symbols-outlined text-primary mt-1"
                style="font-variation-settings: 'wght' 300"
                aria-hidden="true"
              >
                speed
              </span>
              <div class="space-y-1">
                <h3 class="font-bold text-sm tracking-wide uppercase text-on-surface">
                  {{ t('auth.register_benefit_deploy_title') }}
                </h3>
                <p class="text-on-surface-variant text-sm leading-relaxed">
                  {{ t('auth.register_benefit_deploy_body') }}
                </p>
              </div>
            </div>

            <div class="flex gap-4">
              <span
                class="material-symbols-outlined text-primary mt-1"
                style="font-variation-settings: 'wght' 300"
                aria-hidden="true"
              >
                account_balance_wallet
              </span>
              <div class="space-y-1">
                <h3 class="font-bold text-sm tracking-wide uppercase text-on-surface">
                  {{ t('auth.register_benefit_credits_title') }}
                </h3>
                <p class="text-on-surface-variant text-sm leading-relaxed">
                  {{ t('auth.register_benefit_credits_body') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-outline">
        <span>{{ t('auth.enterprise_infrastructure') }}</span>
        <span class="h-px flex-grow bg-outline-variant/40"></span>
        <span>v{{ appVersion }}</span>
      </div>
    </aside>

    <!-- Right: form -->
    <main class="flex-1 flex flex-col justify-center items-center px-6 md:px-12 py-12">
      <div class="w-full max-w-2xl space-y-10">
        <!-- Mobile brand -->
        <RouterLink to="/" class="lg:hidden flex items-center gap-3 justify-center">
          <span
            class="w-8 h-8 bg-primary-container flex items-center justify-center rounded-lg"
            aria-hidden="true"
          >
            <span class="material-symbols-outlined !text-[18px] text-on-primary">rocket_launch</span>
          </span>
          <span class="text-xl font-bold tracking-tighter text-on-primary-fixed">Xayma.sh</span>
        </RouterLink>

        <div class="space-y-2 text-center lg:text-left">
          <h2 class="text-2xl font-bold tracking-tight text-on-surface">
            {{ t('auth.register_title') }}
          </h2>
          <p class="text-on-surface-variant text-sm">
            {{ t('auth.register_subtitle') }}
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Name + Org -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="firstname" class="register-label">
                {{ t('auth.full_name') }}
              </label>
              <InputText
                id="firstname"
                v-model="form.firstname"
                type="text"
                :placeholder="t('auth.full_name_placeholder')"
                autocomplete="name"
                class="register-input w-full"
                :invalid="touched.firstname && !!errors.firstname"
                @blur="touched.firstname = true"
              />
              <small v-if="touched.firstname && errors.firstname" class="register-error">
                {{ errors.firstname }}
              </small>
            </div>

            <div class="space-y-1.5">
              <label for="company" class="register-label">
                {{ t('auth.organization') }}
              </label>
              <InputText
                id="company"
                v-model="form.company_name"
                type="text"
                :placeholder="t('auth.organization_placeholder')"
                autocomplete="organization"
                class="register-input w-full"
                :invalid="touched.company_name && !!errors.company_name"
                @blur="touched.company_name = true"
              />
              <small v-if="touched.company_name && errors.company_name" class="register-error">
                {{ errors.company_name }}
              </small>
            </div>
          </div>

          <!-- Email + Phone -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="email" class="register-label">
                {{ t('auth.professional_email') }}
              </label>
              <InputText
                id="email"
                v-model="form.email"
                type="email"
                placeholder="name@company.com"
                autocomplete="email"
                class="register-input w-full"
                :invalid="touched.email && !!errors.email"
                @blur="touched.email = true"
              />
              <small v-if="touched.email && errors.email" class="register-error">
                {{ errors.email }}
              </small>
            </div>

            <div class="space-y-1.5">
              <label for="phone" class="register-label">
                {{ t('auth.phone') }}
              </label>
              <div class="flex gap-2">
                <Select
                  v-model="form.country_code"
                  :options="ECOWAS_COUNTRIES"
                  option-label="dial"
                  option-value="dial"
                  :aria-label="t('auth.country')"
                  class="register-input register-country shrink-0"
                  :pt="{ root: { class: 'register-input register-country' } }"
                >
                  <template #value="slotProps">
                    <span v-if="slotProps.value" class="flex items-center gap-1.5">
                      <span aria-hidden="true">{{ selectedCountry.flag }}</span>
                      <span class="font-mono text-xs">{{ slotProps.value }}</span>
                    </span>
                  </template>
                  <template #option="slotProps">
                    <span class="flex items-center gap-2">
                      <span aria-hidden="true">{{ slotProps.option.flag }}</span>
                      <span class="font-mono text-xs w-12">{{ slotProps.option.dial }}</span>
                      <span class="text-sm">{{ countryName(slotProps.option) }}</span>
                    </span>
                  </template>
                </Select>
                <InputText
                  id="phone"
                  v-model="form.phone"
                  type="tel"
                  inputmode="numeric"
                  :placeholder="t('auth.phone_placeholder')"
                  autocomplete="tel-national"
                  class="register-input register-input-mono flex-1 min-w-0"
                  :invalid="touched.phone && !!errors.phone"
                  @blur="touched.phone = true"
                />
              </div>
              <small v-if="touched.phone && errors.phone" class="register-error">
                {{ errors.phone }}
              </small>
            </div>
          </div>

          <!-- Passwords -->
          <div class="space-y-1.5">
            <label for="password" class="register-label">{{ t('auth.password') }}</label>
            <Password
              v-model="form.password"
              :placeholder="t('auth.password_placeholder')"
              :feedback="false"
              toggle-mask
              :input-props="{ id: 'password', autocomplete: 'new-password' }"
              :pt="{ pcInputText: { root: { class: 'register-input w-full' } } }"
              class="register-password w-full block"
              :invalid="touched.password && !!errors.password"
              @blur="touched.password = true"
            />
            <small
              v-if="touched.password && errors.password"
              class="register-error"
            >
              {{ errors.password }}
            </small>
            <small v-else class="block text-xs text-on-surface-variant ms-1">
              {{ t('auth.password_requirements') }}
            </small>
          </div>

          <div class="space-y-1.5">
            <label for="confirm_password" class="register-label">
              {{ t('auth.confirm_password') }}
            </label>
            <Password
              v-model="form.confirm_password"
              :placeholder="t('auth.password_placeholder')"
              :feedback="false"
              toggle-mask
              :input-props="{ id: 'confirm_password', autocomplete: 'new-password' }"
              :pt="{ pcInputText: { root: { class: 'register-input w-full' } } }"
              class="register-password w-full block"
              :invalid="touched.confirm_password && !!errors.confirm_password"
              @blur="touched.confirm_password = true"
            />
            <small v-if="touched.confirm_password && errors.confirm_password" class="register-error">
              {{ errors.confirm_password }}
            </small>
          </div>

          <!-- TOS -->
          <div class="flex items-start gap-3 py-2">
            <Checkbox
              v-model="form.tos_accepted"
              input-id="tos"
              :binary="true"
              :invalid="touched.tos_accepted && !!errors.tos_accepted"
              @change="touched.tos_accepted = true"
            />
            <label
              for="tos"
              class="text-xs text-on-surface-variant leading-relaxed select-none cursor-pointer"
            >
              {{ t('auth.tos_acknowledge') }}
              <a class="text-primary font-semibold hover:underline" href="#">
                {{ t('auth.terms_of_service') }}
              </a>
              {{ t('auth.and') }}
              <a class="text-primary font-semibold hover:underline" href="#">
                {{ t('auth.privacy_policy') }}
              </a>.
            </label>
          </div>
          <small v-if="touched.tos_accepted && errors.tos_accepted" class="register-error -mt-4">
            {{ errors.tos_accepted }}
          </small>

          <!-- Submit -->
          <Button
            type="submit"
            class="register-submit w-full group"
            :loading="isLoading"
            @click.prevent="handleSubmit"
          >
            <span class="font-bold">{{ t('auth.register_cta') }}</span>
            <span
              class="material-symbols-outlined !text-[18px] ms-2 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </Button>

          <!-- Hidden submit for Enter key -->
          <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true">
            {{ t('auth.register_cta') }}
          </button>
        </form>

        <!-- Divider -->
        <div class="flex items-center gap-4">
          <div class="h-px flex-grow bg-outline-variant/40"></div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-outline">
            {{ t('auth.or_connect_with') }}
          </span>
          <div class="h-px flex-grow bg-outline-variant/40"></div>
        </div>

        <!-- Social -->
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled
            :title="t('auth.social_coming_soon')"
            class="register-social flex items-center justify-center gap-3 border border-outline-variant/40 py-3 rounded-lg"
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
            class="register-social flex items-center justify-center gap-3 border border-outline-variant/40 py-3 rounded-lg"
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

        <!-- Login link -->
        <div class="pt-6 border-t border-outline-variant/20 text-center">
          <p class="text-sm text-on-surface-variant">
            {{ t('auth.already_have_account') }}
            <RouterLink
              to="/auth/login"
              class="text-primary font-bold tracking-tight ms-1 hover:underline"
            >
              {{ t('auth.log_in') }}
            </RouterLink>
          </p>
        </div>
      </div>
    </main>

    <!-- Mobile bottom accent -->
    <div class="lg:hidden fixed bottom-0 left-0 w-full h-1 bg-primary-container z-50"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Select from 'primevue/select'
import { z } from 'zod'
import pkg from '../../package.json'

const router = useRouter()
const authStore = useAuthStore()
const { t, locale } = useI18n()
const toast = useToast()
const appVersion = pkg.version

interface EcowasCountry {
  code: string
  name_en: string
  name_fr: string
  dial: string
  length: number
  flag: string
}

// ECOWAS member states (15 as of 2026). `length` is the expected national
// number length excluding the dial code. Senegal is the default since this
// platform's primary market is Dakar.
const ECOWAS_COUNTRIES: EcowasCountry[] = [
  { code: 'SN', name_en: 'Senegal',       name_fr: 'Sénégal',        dial: '+221', length: 9,  flag: '🇸🇳' },
  { code: 'CI', name_en: "Côte d'Ivoire", name_fr: "Côte d'Ivoire",  dial: '+225', length: 10, flag: '🇨🇮' },
  { code: 'NG', name_en: 'Nigeria',       name_fr: 'Nigéria',        dial: '+234', length: 10, flag: '🇳🇬' },
  { code: 'GH', name_en: 'Ghana',         name_fr: 'Ghana',          dial: '+233', length: 9,  flag: '🇬🇭' },
  { code: 'BF', name_en: 'Burkina Faso',  name_fr: 'Burkina Faso',   dial: '+226', length: 8,  flag: '🇧🇫' },
  { code: 'BJ', name_en: 'Benin',         name_fr: 'Bénin',          dial: '+229', length: 8,  flag: '🇧🇯' },
  { code: 'ML', name_en: 'Mali',          name_fr: 'Mali',           dial: '+223', length: 8,  flag: '🇲🇱' },
  { code: 'NE', name_en: 'Niger',         name_fr: 'Niger',          dial: '+227', length: 8,  flag: '🇳🇪' },
  { code: 'TG', name_en: 'Togo',          name_fr: 'Togo',           dial: '+228', length: 8,  flag: '🇹🇬' },
  { code: 'GN', name_en: 'Guinea',        name_fr: 'Guinée',         dial: '+224', length: 9,  flag: '🇬🇳' },
  { code: 'SL', name_en: 'Sierra Leone',  name_fr: 'Sierra Leone',   dial: '+232', length: 8,  flag: '🇸🇱' },
  { code: 'LR', name_en: 'Liberia',       name_fr: 'Libéria',        dial: '+231', length: 8,  flag: '🇱🇷' },
  { code: 'GW', name_en: 'Guinea-Bissau', name_fr: 'Guinée-Bissau',  dial: '+245', length: 9,  flag: '🇬🇼' },
  { code: 'GM', name_en: 'Gambia',        name_fr: 'Gambie',         dial: '+220', length: 7,  flag: '🇬🇲' },
  { code: 'CV', name_en: 'Cabo Verde',    name_fr: 'Cap-Vert',       dial: '+238', length: 7,  flag: '🇨🇻' },
]

const countryName = (c: EcowasCountry) => (locale.value === 'fr' ? c.name_fr : c.name_en)
const findCountry = (dial: string) => ECOWAS_COUNTRIES.find((c) => c.dial === dial)
const selectedCountry = computed(() => findCountry(form.country_code) ?? ECOWAS_COUNTRIES[0])

const form = reactive({
  firstname: '',
  email: '',
  country_code: '+221',
  phone: '',
  company_name: '',
  password: '',
  confirm_password: '',
  tos_accepted: false,
})

const touched = reactive({
  firstname: false,
  email: false,
  phone: false,
  company_name: false,
  password: false,
  confirm_password: false,
  tos_accepted: false,
})

const errors = reactive({
  firstname: '',
  email: '',
  phone: '',
  company_name: '',
  password: '',
  confirm_password: '',
  tos_accepted: '',
})

const isLoading = ref(false)

const schema = z
  .object({
    firstname: z.string().min(1, t('errors.required')),
    email: z.string().email(t('errors.invalid_email')),
    country_code: z.string().min(1, t('errors.required')),
    phone: z.string().min(1, t('errors.required')),
    company_name: z.string().min(1, t('errors.required')),
    password: z
      .string()
      .min(6, t('auth.password_too_short'))
      .regex(/[A-Z]/, t('auth.password_no_uppercase'))
      .regex(/[a-z]/, t('auth.password_no_lowercase'))
      .regex(/[0-9]/, t('auth.password_no_digit')),
    confirm_password: z.string().min(1, t('errors.required')),
    tos_accepted: z.literal(true, { errorMap: () => ({ message: t('auth.tos_required') }) }),
  })
  .refine(
    (data) => {
      const country = findCountry(data.country_code)
      if (!country) return false
      return new RegExp(`^[0-9]{${country.length}}$`).test(data.phone)
    },
    { path: ['phone'], message: t('auth.phone_invalid_for_country') },
  )
  .refine((data) => data.password === data.confirm_password, {
    path: ['confirm_password'],
    message: t('auth.password_mismatch'),
  })

const validate = () => {
  Object.keys(errors).forEach((key) => {
    ;(errors as Record<string, string>)[key] = ''
  })
  const result = schema.safeParse(form)
  if (!result.success) {
    Object.entries(result.error.flatten().fieldErrors).forEach(([field, msgs]) => {
      ;(errors as Record<string, string>)[field] = (msgs?.[0] as string) || ''
    })
    return false
  }
  return true
}

// Map a thrown error from auth.signUp() to a user-facing message.
// Order matters: more specific patterns first, generic fallback last.
const mapSignupError = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  const msg = raw.toLowerCase()
  if (msg.includes('phone_already_registered') || msg.includes('partners_phone_unique')) {
    return t('auth.phone_already_registered')
  }
  if (msg.includes('email_already_registered') || msg.includes('user already') || msg.includes('already registered')) {
    return t('auth.email_already_registered')
  }
  if (msg.includes('weak_password') || msg.includes('password should be') || msg.includes('password is too')) {
    return t('auth.password_too_weak')
  }
  if (msg.includes('email_address_invalid') || msg.includes('invalid email')) {
    return t('errors.invalid_email')
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate') || msg.includes('too many')) {
    return t('auth.rate_limited')
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request')) {
    return t('auth.network_error')
  }
  // Surface the raw provider message so the user knows *why* it failed
  // instead of seeing a generic catch-all.
  return raw || t('auth.registration_failed')
}

const handleSubmit = async () => {
  Object.keys(touched).forEach((key) => {
    ;(touched as Record<string, boolean>)[key] = true
  })
  if (!validate()) return

  isLoading.value = true
  try {
    const e164Phone = `${form.country_code}${form.phone}`
    await authStore.signUp(form.email, form.password, {
      firstname: form.firstname,
      phone: e164Phone,
      company_name: form.company_name,
    })
    toast.add({
      severity: 'success',
      summary: t('auth.register'),
      detail: t('auth.check_email_to_verify'),
      life: 6000,
    })
    await router.push('/auth/login')
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('errors.error'),
      detail: mapSignupError(err),
      life: 5000,
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.register-shell {
  background-image:
    linear-gradient(to right, rgba(184, 196, 255, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(184, 196, 255, 0.08) 1px, transparent 1px);
  background-size: 48px 48px;
}

.register-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--on-surface-variant);
  margin-inline-start: 0.25rem;
}

.register-error {
  display: block;
  color: var(--error);
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

:deep(.register-input) {
  height: 3rem;
  background-color: var(--surface-container-lowest);
  border: 1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent);
  border-radius: 0.5rem;
  padding: 0 1rem;
  font-size: 0.875rem;
  width: 100%;
  transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
  color: var(--on-surface);
}

:deep(.register-input::placeholder) {
  color: color-mix(in srgb, var(--outline) 50%, transparent);
}

:deep(.register-country) {
  width: 6.5rem;
  padding: 0 0.5rem;
  display: inline-flex;
  align-items: center;
}

:deep(.register-country .p-select-label) {
  padding: 0;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
}

:deep(.register-input:focus),
:deep(.register-input:focus-visible) {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

:deep(.register-input.p-invalid),
:deep(.register-input[aria-invalid='true']) {
  border-color: var(--error);
  box-shadow: 0 0 0 1px var(--error);
}

:deep(.register-input-mono) {
  font-family: var(--font-data, 'IBM Plex Mono', monospace);
  letter-spacing: 0.02em;
}

.register-password,
:deep(.register-password .p-password-input) {
  width: 100%;
}

:deep(.register-password .p-icon-field) {
  width: 100%;
}

:deep(.register-password .p-password-toggle-mask-icon) {
  color: var(--outline);
  right: 0.875rem;
}

.register-submit {
  background-color: var(--primary-container);
  color: var(--on-primary);
  border: none;
  height: 3.5rem;
  border-radius: 0.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  transition: background-color 200ms ease-out;
}

.register-submit:hover:not(:disabled) {
  background-color: var(--primary);
}

.register-submit:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.register-social {
  color: var(--on-surface);
  background-color: var(--surface-container-lowest);
  transition: background-color 150ms ease-out;
}

.register-social:hover:not(:disabled) {
  background-color: var(--surface-container);
}

.register-social:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.4);
}
</style>
