/**
 * Register page tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import Register from '@/pages/Register.vue'
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

describe('Register.vue', () => {
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

    return mount(Register, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          InputText: true,
          Password: true,
          Button: true,
          Checkbox: true,
          Select: true,
          RouterLink: true,
        },
      },
    })
  }

  const fillValid = (vm: any) => {
    vm.form.firstname = 'John'
    vm.form.email = 'john@example.com'
    vm.form.country_code = '+221'
    vm.form.phone = '701234567'
    vm.form.company_name = 'Acme Corp'
    vm.form.password = 'Password123'
    vm.form.confirm_password = 'Password123'
    vm.form.tos_accepted = true
  }

  it('renders register form with all fields', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('accepts valid Senegal phone (9 digits)', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    fillValid(vm)
    vm.form.country_code = '+221'
    vm.form.phone = '781234567'

    const isValid = vm.validate?.()
    expect(isValid).toBe(true)
  })

  it('accepts valid Nigeria phone (10 digits)', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    fillValid(vm)
    vm.form.country_code = '+234'
    vm.form.phone = '8012345678'

    const isValid = vm.validate?.()
    expect(isValid).toBe(true)
  })

  it('rejects phone whose length does not match the selected country', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    fillValid(vm)
    // Senegal expects 9 digits; 10 digits should fail.
    vm.form.country_code = '+221'
    vm.form.phone = '7012345678'
    vm.touched.phone = true

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
    expect(vm.errors.phone).toBeTruthy()
  })

  it('rejects invalid phone format (too short)', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    fillValid(vm)
    vm.form.phone = '7012345'
    vm.touched.phone = true

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
  })

  it('rejects password without uppercase letter', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    fillValid(vm)
    vm.form.password = 'password123'
    vm.form.confirm_password = 'password123'
    vm.touched.password = true

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
    expect(vm.errors.password).toBeTruthy()
  })

  it('rejects password without a digit', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    fillValid(vm)
    vm.form.password = 'Password'
    vm.form.confirm_password = 'Password'
    vm.touched.password = true

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
    expect(vm.errors.password).toBeTruthy()
  })

  it('requires all fields', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    vm.form.firstname = ''
    vm.form.email = ''
    vm.form.phone = ''
    vm.form.company_name = ''
    vm.form.password = ''
    vm.form.confirm_password = ''
    vm.form.tos_accepted = false

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
  })

  it('rejects invalid email', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    fillValid(vm)
    vm.form.email = 'invalid-email'
    vm.touched.email = true

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
  })

  it('rejects when passwords do not match', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    fillValid(vm)
    vm.form.confirm_password = 'different123'
    vm.touched.confirm_password = true

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
    expect(vm.errors.confirm_password).toBeTruthy()
  })

  it('rejects when terms of service are not accepted', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    fillValid(vm)
    vm.form.tos_accepted = false
    vm.touched.tos_accepted = true

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
  })
})
