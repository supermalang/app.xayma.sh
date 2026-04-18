import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PartnerTypeBadge from './PartnerTypeBadge.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      partners: {
        type: {
          customer: 'Customer',
          reseller: 'Reseller',
        },
      },
    },
  },
})

describe('PartnerTypeBadge.vue', () => {
  it('renders Customer type with info severity', () => {
    const wrapper = mount(PartnerTypeBadge, {
      props: { type: 'customer' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('Customer')
    expect(wrapper.vm.severity).toBe('info')
  })

  it('renders Reseller type with success severity', () => {
    const wrapper = mount(PartnerTypeBadge, {
      props: { type: 'reseller' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('Reseller')
    expect(wrapper.vm.severity).toBe('success')
  })

  it('updates when type prop changes', async () => {
    const wrapper = mount(PartnerTypeBadge, {
      props: { type: 'customer' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('Customer')

    await wrapper.setProps({ type: 'reseller' })

    expect(wrapper.text()).toContain('Reseller')
    expect(wrapper.vm.severity).toBe('success')
  })

  it('handles unknown type gracefully', () => {
    const wrapper = mount(PartnerTypeBadge, {
      props: { type: 'unknown' as any },
      global: { plugins: [i18n] },
    })

    expect(wrapper.vm.severity).toBe('secondary')
  })
})
