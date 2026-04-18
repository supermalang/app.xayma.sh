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
          Card: true,
          InputText: true,
          Password: true,
          Button: true,
          RouterLink: true,
        },
      },
    })
  }

  it('renders register form with all fields', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.findAll('inputtext-stub')).toHaveLength(3) // firstname, email, phone, company_name
  })

  it('accepts valid West Africa phone format (70)', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    vm.form.firstname = 'John'
    vm.form.email = 'john@example.com'
    vm.form.phone = '70123456789'
    vm.form.company_name = 'Acme Corp'
    vm.form.password = 'password123'

    const isValid = vm.validate?.()
    expect(isValid).toBe(true)
  })

  it('accepts valid West Africa phone format (78)', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    vm.form.firstname = 'John'
    vm.form.email = 'john@example.com'
    vm.form.phone = '78123456789'
    vm.form.company_name = 'Acme Corp'
    vm.form.password = 'password123'

    const isValid = vm.validate?.()
    expect(isValid).toBe(true)
  })

  it('rejects invalid phone format (60)', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    vm.form.firstname = 'John'
    vm.form.email = 'john@example.com'
    vm.form.phone = '60123456789' // Invalid prefix
    vm.form.company_name = 'Acme Corp'
    vm.form.password = 'password123'
    vm.touched.phone = true

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
    expect(vm.errors.phone).toContain('West Africa')
  })

  it('rejects invalid phone format (too short)', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    vm.form.firstname = 'John'
    vm.form.email = 'john@example.com'
    vm.form.phone = '7012345' // Too short
    vm.form.company_name = 'Acme Corp'
    vm.form.password = 'password123'
    vm.touched.phone = true

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
  })

  it('requires all fields', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    vm.form.firstname = ''
    vm.form.email = ''
    vm.form.phone = ''
    vm.form.company_name = ''
    vm.form.password = ''

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
  })

  it('rejects invalid email', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    vm.form.firstname = 'John'
    vm.form.email = 'invalid-email' // Invalid email
    vm.form.phone = '70123456789'
    vm.form.company_name = 'Acme Corp'
    vm.form.password = 'password123'
    vm.touched.email = true

    const isValid = vm.validate?.()
    expect(isValid).toBe(false)
  })
})
