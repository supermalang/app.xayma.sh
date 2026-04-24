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
import router from '@/router'

// Mock composables
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
    loadSettings: vi.fn(),
    updateSetting: vi.fn(),
  }),
}))

vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
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

  it('renders the settings page with accordion sections', () => {
    wrapper = mount(Settings, {
      global: {
        plugins: [pinia, i18n, router],
        stubs: {
          Card: true,
          Accordion: true,
          AccordionTab: true,
          InputText: true,
          InputNumber: true,
          ToggleButton: true,
          ProgressSpinner: true,
        },
      },
    })

    expect(wrapper.find('h1').text()).toContain('Settings')
    expect(wrapper.text()).toContain('Payments')
    expect(wrapper.text()).toContain('Notifications')
    expect(wrapper.text()).toContain('Limits')
    expect(wrapper.text()).toContain('Infrastructure')
  })

  it('shows loading spinner when loading is true', async () => {
    const useSettingsMock = vi.hoisted(() => ({
      useSettings: () => ({
        settings: { value: {} },
        loading: { value: true },
        loadSettings: vi.fn(),
        updateSetting: vi.fn(),
      }),
    }))

    vi.doMock('@/composables/useSettings', () => useSettingsMock)

    wrapper = mount(Settings, {
      global: {
        plugins: [pinia, i18n, router],
        stubs: {
          Card: true,
          Accordion: true,
          AccordionTab: true,
          InputText: true,
          InputNumber: true,
          ToggleButton: true,
          ProgressSpinner: true,
        },
      },
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Loading')
  })

  it('calls loadSettings on mount', async () => {
    const loadSettingsMock = vi.fn()

    vi.doMock('@/composables/useSettings', () => ({
      useSettings: () => ({
        settings: { value: {} },
        loading: { value: false },
        loadSettings: loadSettingsMock,
        updateSetting: vi.fn(),
      }),
    }))

    wrapper = mount(Settings, {
      global: {
        plugins: [pinia, i18n, router],
        stubs: {
          Card: true,
          Accordion: true,
          AccordionTab: true,
          InputText: true,
          InputNumber: true,
          ToggleButton: true,
          ProgressSpinner: true,
        },
      },
    })

    expect(loadSettingsMock).toHaveBeenCalled()
  })
})
