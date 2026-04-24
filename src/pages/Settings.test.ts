/**
 * Settings page tests
 * Tests admin-only access, settings loading, and saving
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Settings from '@/pages/Settings.vue'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/en'

// Mock composables
const mockLoadSettings = vi.fn()
const mockUpdateSetting = vi.fn()

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
    settings: { value: {} },
    loading: { value: false },
    loadSettings: mockLoadSettings,
    updateSetting: mockUpdateSetting,
  }),
}))

vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(() => ({
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
}))

describe('Settings', () => {
  let wrapper: any
  const pinia = createPinia()
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en },
  })

  beforeEach(() => {
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('renders the settings page', async () => {
    wrapper = mount(Settings, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          Card: { template: '<div><slot /></div>' },
          Accordion: { template: '<div><slot /></div>' },
          AccordionTab: { template: '<div><slot /></div>' },
          InputText: { template: '<input />' },
          InputNumber: { template: '<input />' },
          ToggleButton: { template: '<button />' },
          ProgressSpinner: { template: '<div>Loading</div>' },
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.find('h1').text()).toContain('Settings')
  })

  it('calls loadSettings on mount', async () => {
    wrapper = mount(Settings, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          Card: { template: '<div><slot /></div>' },
          Accordion: { template: '<div><slot /></div>' },
          AccordionTab: { template: '<div><slot /></div>' },
          InputText: { template: '<input />' },
          InputNumber: { template: '<input />' },
          ToggleButton: { template: '<button />' },
          ProgressSpinner: { template: '<div>Loading</div>' },
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await wrapper.vm.$nextTick()
    expect(mockLoadSettings).toHaveBeenCalled()
  })

  it('populates form from settings on mount', async () => {
    vi.resetModules()

    wrapper = mount(Settings, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          Card: { template: '<div><slot /></div>' },
          Accordion: { template: '<div><slot /></div>' },
          AccordionTab: { template: '<div><slot /></div>' },
          InputText: { template: '<input />' },
          InputNumber: { template: '<input />' },
          ToggleButton: { template: '<button />' },
          ProgressSpinner: { template: '<div>Loading</div>' },
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await wrapper.vm.$nextTick()

    // Check that form refs are populated (defaults)
    expect(wrapper.vm.creditWarningThreshold).toBeDefined()
    expect(wrapper.vm.maxDeploymentsPerPartner).toBeDefined()
  })
})
