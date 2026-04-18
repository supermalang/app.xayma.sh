import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PartnerStatusBadge from './PartnerStatusBadge.vue'

// Mock translations
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      partners: {
        status: {
          active: 'Active',
          suspended: 'Suspended',
          inactive: 'Inactive',
        },
      },
    },
  },
})

describe('PartnerStatusBadge.vue', () => {
  it('renders Active status with success severity', () => {
    const wrapper = mount(PartnerStatusBadge, {
      props: { status: 'active' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('Active')
    expect(wrapper.vm.severity).toBe('success')
  })

  it('renders Suspended status with warning severity', () => {
    const wrapper = mount(PartnerStatusBadge, {
      props: { status: 'suspended' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('Suspended')
    expect(wrapper.vm.severity).toBe('warning')
  })

  it('renders Inactive status with info severity', () => {
    const wrapper = mount(PartnerStatusBadge, {
      props: { status: 'inactive' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('Inactive')
    expect(wrapper.vm.severity).toBe('info')
  })

  it('updates when status prop changes', async () => {
    const wrapper = mount(PartnerStatusBadge, {
      props: { status: 'active' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('Active')

    await wrapper.setProps({ status: 'suspended' })

    expect(wrapper.text()).toContain('Suspended')
    expect(wrapper.vm.severity).toBe('warning')
  })

  it('handles invalid status gracefully', () => {
    const wrapper = mount(PartnerStatusBadge, {
      props: { status: 'invalid' as any },
      global: { plugins: [i18n] },
    })

    expect(wrapper.vm.severity).toBe('secondary')
  })
})
