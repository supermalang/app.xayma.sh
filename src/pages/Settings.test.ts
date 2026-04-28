/**
 * Settings page tests
 * Verifies admin-only access, settings load, dirty-tracking, and stage-and-save flow.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Settings from '@/pages/Settings.vue'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/en'

const mockLoadSettings = vi.fn()
const mockSettings: { value: Record<string, string> } = { value: {} }

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    isAdmin: { value: true },
    isCustomer: { value: false },
    isReseller: { value: false },
    isSales: { value: false },
  }),
}))

vi.mock('@/composables/useSettings', () => ({
  useSettings: () => ({
    settings: mockSettings,
    loading: { value: false },
    loadSettings: mockLoadSettings,
  }),
}))

const mockUpsertSetting = vi.fn().mockResolvedValue(undefined)
const mockGetPaymentGateways = vi.fn().mockResolvedValue([])
vi.mock('@/services/settings', () => ({
  updateSetting: (...args: unknown[]) => mockUpsertSetting(...args),
  getPaymentGateways: (...args: unknown[]) => mockGetPaymentGateways(...args),
}))

vi.mock('@/services/credits.service', () => ({
  listTransactions: vi.fn().mockResolvedValue({ data: [], count: 0, page: 1, pageSize: 4, totalPages: 0 }),
}))

vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(() => ({
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  })),
}))

const stubs = {
  Button: {
    props: ['label', 'loading', 'disabled', 'icon', 'severity', 'variant', 'size'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot />{{ label }}</button>',
  },
  InputText: {
    props: ['modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  InputNumber: {
    props: ['modelValue', 'min', 'inputId', 'inputClass', 'useGrouping'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  DataTable: {
    props: ['value', 'pt', 'dataKey'],
    template: '<div class="datatable-stub"><slot name="empty" v-if="!value || value.length === 0" /><slot /></div>',
  },
  Column: { template: '<div></div>' },
  ProgressSpinner: { template: '<div>Loading</div>' },
  LifecycleDayInput: {
    props: ['modelValue', 'label', 'unit'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  RouterLink: { template: '<a><slot /></a>' },
}

describe('Settings', () => {
  const pinia = createPinia()
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

  beforeEach(() => {
    setActivePinia(pinia)
    vi.clearAllMocks()
    mockSettings.value = {}
  })

  function mountSettings() {
    return mount(Settings, {
      global: {
        plugins: [pinia, i18n],
        stubs,
        directives: { tooltip: {} },
      },
    })
  }

  it('renders the platform configuration heading', async () => {
    const wrapper = mountSettings()
    await flushPromises()
    expect(wrapper.find('h1').text()).toContain('Platform Configuration')
  })

  it('calls loadSettings on mount', async () => {
    mountSettings()
    await flushPromises()
    expect(mockLoadSettings).toHaveBeenCalled()
  })

  it('seeds form refs from settings ref after load', async () => {
    mockSettings.value = {
      WORKFLOW_ENGINE_URL: 'https://wf.example.test',
      CREDIT_PRICE_FCFA: '200',
      ARCHIVE_DEPLOYMENTS_DAYS: '45',
    }
    const wrapper = mountSettings()
    await flushPromises()
    const vm = wrapper.vm as unknown as {
      form: Record<string, string | number>
      isDirty: boolean
    }
    expect(vm.form.WORKFLOW_ENGINE_URL).toBe('https://wf.example.test')
    expect(vm.form.CREDIT_PRICE_FCFA).toBe(200)
    expect(vm.form.ARCHIVE_DEPLOYMENTS_DAYS).toBe(45)
    expect(vm.isDirty).toBe(false)
  })

  it('marks the page dirty when a form field changes, then clears on saveAll', async () => {
    const wrapper = mountSettings()
    await flushPromises()
    const vm = wrapper.vm as unknown as {
      form: Record<string, string | number>
      isDirty: boolean
      saveAll: () => Promise<void>
    }
    vm.form.WORKFLOW_ENGINE_URL = 'https://changed.example.test'
    await flushPromises()
    expect(vm.isDirty).toBe(true)

    await vm.saveAll()
    expect(mockUpsertSetting).toHaveBeenCalledWith('WORKFLOW_ENGINE_URL', 'https://changed.example.test')
    expect(vm.isDirty).toBe(false)
  })

  it('discardChanges restores last loaded snapshot', async () => {
    mockSettings.value = { CREDIT_PRICE_FCFA: '150' }
    const wrapper = mountSettings()
    await flushPromises()
    const vm = wrapper.vm as unknown as {
      form: Record<string, string | number>
      isDirty: boolean
      discardChanges: () => void
    }
    vm.form.CREDIT_PRICE_FCFA = 999
    await flushPromises()
    expect(vm.isDirty).toBe(true)

    vm.discardChanges()
    await flushPromises()
    expect(vm.form.CREDIT_PRICE_FCFA).toBe(150)
    expect(vm.isDirty).toBe(false)
  })
})
