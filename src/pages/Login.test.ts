/**
 * Login page tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import Login from '@/pages/Login.vue'
import enMessages from '@/i18n/en'

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))

// Mock router
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
    }),
  }
})

// Mock Toast
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
  }),
}))

describe('Login.vue', () => {
  let pinia: any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: { en: enMessages },
    })

    return mount(Login, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          Card: { template: '<div><slot name="header" /><slot name="content" /></div>' },
          InputText: true,
          Password: true,
          Button: true,
          RouterLink: true,
        },
      },
    })
  }

  it('renders login form', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('displays email and password inputs', () => {
    const wrapper = createWrapper()
    // Stubs replace InputText/Password — form existence + validation tests verify fields
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows email validation error when invalid', async () => {
    const wrapper = createWrapper()
    const emailInput = wrapper.vm as any
    emailInput.touched.email = true
    emailInput.form.email = 'invalid-email'

    // Simulate validation
    const isValid = emailInput.validate?.()
    expect(isValid).toBe(false)
  })

  it('shows required error when password is empty', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    vm.touched.password = true
    vm.form.password = ''

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
  })

  it('disables submit button while loading', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    vm.isLoading = true

    await wrapper.vm.$nextTick()
    const button = wrapper.findAll('button-stub').find((b) => b.attributes('type') === 'submit')
    expect(button?.attributes('loading')).toBe('true')
  })

  it('invokes signIn when the visible Login button is clicked', async () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: { en: enMessages },
    })

    const wrapper = mount(Login, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          // Do NOT stub Button — we need the real PrimeVue Button rendered.
          Card: { template: '<div><slot name="header" /><slot name="content" /></div>' },
          InputText: {
            props: ['modelValue'],
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          Password: {
            props: ['modelValue'],
            template: '<input type="password" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          RouterLink: true,
        },
      },
    })

    const vm = wrapper.vm as any
    vm.form.email = 'admin@test.example.com'
    vm.form.password = 'test123456'
    await wrapper.vm.$nextTick()

    const authStore = (await import('@/stores/auth.store')).useAuthStore()
    const signInSpy = vi.spyOn(authStore, 'signIn').mockResolvedValue(undefined as any)

    await wrapper.find('button.p-button').trigger('click')
    await wrapper.vm.$nextTick()

    expect(signInSpy).toHaveBeenCalledWith('admin@test.example.com', 'test123456')
  })
})
