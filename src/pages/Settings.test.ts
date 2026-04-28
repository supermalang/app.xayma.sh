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
const mockUpdatePaymentGateways = vi.fn().mockResolvedValue(undefined)
vi.mock('@/services/settings', () => ({
  updateSetting: (...args: unknown[]) => mockUpsertSetting(...args),
  getPaymentGateways: (...args: unknown[]) => mockGetPaymentGateways(...args),
  updatePaymentGateways: (...args: unknown[]) => mockUpdatePaymentGateways(...args),
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
    mockGetPaymentGateways.mockResolvedValue([])
    mockUpsertSetting.mockResolvedValue(undefined)
    mockUpdatePaymentGateways.mockResolvedValue(undefined)
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

  it('partial saveAll failure rebases successful keys but leaves the failed one dirty', async () => {
    mockSettings.value = {
      WORKFLOW_ENGINE_URL: 'https://wf.example.test',
      DEPLOYMENT_ENGINE_URL: 'https://dep.example.test',
    }
    // First key succeeds, second key fails.
    mockUpsertSetting
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('boom'))

    const wrapper = mountSettings()
    await flushPromises()
    const vm = wrapper.vm as unknown as {
      form: Record<string, string | number>
      isDirty: boolean
      saveAll: () => Promise<void>
    }

    vm.form.WORKFLOW_ENGINE_URL = 'https://changed-1.example.test'
    vm.form.DEPLOYMENT_ENGINE_URL = 'https://changed-2.example.test'
    await flushPromises()

    await vm.saveAll()
    await flushPromises()

    // Assert both upserts were attempted in order.
    expect(mockUpsertSetting).toHaveBeenNthCalledWith(
      1, 'WORKFLOW_ENGINE_URL', 'https://changed-1.example.test'
    )
    expect(mockUpsertSetting).toHaveBeenNthCalledWith(
      2, 'DEPLOYMENT_ENGINE_URL', 'https://changed-2.example.test'
    )

    // The first key's snapshot was rebased, so editing it back to the new value isn't dirty.
    // The second key still differs from snapshot, so isDirty stays true.
    expect(vm.isDirty).toBe(true)
    // Reverting the failed key to its original snapshot value should clear isDirty.
    vm.form.DEPLOYMENT_ENGINE_URL = 'https://dep.example.test'
    await flushPromises()
    expect(vm.isDirty).toBe(false)
  })

  it('saveAll persists dirty gateways and clears gatewaysDirty', async () => {
    const existing = {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      provider: 'wave',
      mode: 'sandbox',
      apiKey: 'k',
      secretKey: 's',
      ipnUrl: 'https://example.test/ipn',
      successUrl: 'https://example.test/ok',
      cancelUrl: 'https://example.test/cancel',
      currency: 'XOF',
    }
    mockGetPaymentGateways.mockResolvedValue([existing])

    // Stub randomUUID so the test is deterministic.
    const uuidSpy = vi.spyOn(crypto, 'randomUUID')
      .mockReturnValue('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as `${string}-${string}-${string}-${string}-${string}`)

    const wrapper = mountSettings()
    await flushPromises()
    const vm = wrapper.vm as unknown as {
      isDirty: boolean
      saveAll: () => Promise<void>
      saveGateway: (payload: unknown) => void
    }

    // Add a second gateway via the existing handler.
    vm.saveGateway({
      provider: 'orange_money',
      mode: 'sandbox',
      apiKey: 'k2',
      secretKey: 's2',
      ipnUrl: 'https://example.test/ipn2',
      successUrl: 'https://example.test/ok2',
      cancelUrl: 'https://example.test/cancel2',
      currency: 'XOF',
    })
    await flushPromises()
    expect(vm.isDirty).toBe(true)

    await vm.saveAll()
    await flushPromises()

    expect(mockUpdatePaymentGateways).toHaveBeenCalledTimes(1)
    const [persisted] = mockUpdatePaymentGateways.mock.calls[0] as [Array<{ id: string }>]
    expect(persisted).toHaveLength(2)
    expect(persisted.map((g) => g.id)).toEqual([
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    ])
    expect(vm.isDirty).toBe(false)

    uuidSpy.mockRestore()
  })

  it('discardChanges restores gateways to their loaded snapshot', async () => {
    const existing = {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      provider: 'wave',
      mode: 'sandbox',
      apiKey: 'k',
      secretKey: 's',
      ipnUrl: 'https://example.test/ipn',
      successUrl: 'https://example.test/ok',
      cancelUrl: 'https://example.test/cancel',
      currency: 'XOF',
    }
    mockGetPaymentGateways.mockResolvedValue([existing])

    const wrapper = mountSettings()
    await flushPromises()
    const vm = wrapper.vm as unknown as {
      isDirty: boolean
      discardChanges: () => void
      saveGateway: (payload: unknown) => void
    }

    vm.saveGateway({
      provider: 'orange_money',
      mode: 'sandbox',
      apiKey: 'k2',
      secretKey: 's2',
      ipnUrl: 'https://example.test/ipn2',
      successUrl: 'https://example.test/ok2',
      cancelUrl: 'https://example.test/cancel2',
      currency: 'XOF',
    })
    await flushPromises()
    expect(vm.isDirty).toBe(true)

    vm.discardChanges()
    await flushPromises()
    expect(vm.isDirty).toBe(false)
  })
})
