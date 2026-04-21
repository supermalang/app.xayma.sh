import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import CreditMeter from './CreditMeter.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      common: {
        balance: 'Balance',
        expires: 'Expires',
        expired: 'Expired',
        topup: 'Top Up',
      },
      dashboard: {
        healthy_balance: 'Healthy balance',
        low_balance: 'Low balance',
        critical_balance: 'Critical balance',
      },
    },
  },
})

vi.mock('@/composables/useCurrency', () => ({
  useCurrency: () => ({
    formatSymbol: (n: number) => `${n} FCFA`,
  }),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    user: null,
  }),
}))

describe('CreditMeter.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders balance value correctly', () => {
    const wrapper = mount(CreditMeter, {
      props: {
        balance: 5000,
      },
      global: {
        plugins: [i18n],
        stubs: {
          Icon: true,
          Tag: true,
          Button: true,
        },
      },
    })

    expect(wrapper.text()).toContain('5000')
  })

  it('shows healthy status when percentageRemaining > 30', () => {
    const wrapper = mount(CreditMeter, {
      props: {
        balance: 40000,
      },
      global: {
        plugins: [i18n],
        stubs: {
          Icon: true,
          Tag: true,
          Button: true,
        },
      },
    })

    const html = wrapper.html()
    expect(html).toContain('healthy')
  })

  it('shows warning status when 10 < percentageRemaining <= 30', () => {
    const wrapper = mount(CreditMeter, {
      props: {
        balance: 15000,
      },
      global: {
        plugins: [i18n],
        stubs: {
          Icon: true,
          Tag: true,
          Button: true,
        },
      },
    })

    const html = wrapper.html()
    expect(html).toContain('warning')
  })

  it('shows critical status when percentageRemaining <= 10', () => {
    const wrapper = mount(CreditMeter, {
      props: {
        balance: 5000,
      },
      global: {
        plugins: [i18n],
        stubs: {
          Icon: true,
          Tag: true,
          Button: true,
        },
      },
    })

    const html = wrapper.html()
    expect(html).toContain('error')
  })

  it('shows expiry Tag when expiryDate provided', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)

    const wrapper = mount(CreditMeter, {
      props: {
        balance: 5000,
        expiryDate: futureDate.toISOString(),
      },
      global: {
        plugins: [i18n],
        stubs: {
          Icon: true,
          Tag: { template: '<div class="tag">{{ value }}</div>' },
          Button: true,
        },
      },
    })

    expect(wrapper.find('.tag').exists()).toBe(true)
  })

  it('shows EXPIRED when expiryDate is in the past', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)

    const wrapper = mount(CreditMeter, {
      props: {
        balance: 5000,
        expiryDate: pastDate.toISOString(),
      },
      global: {
        plugins: [i18n],
        stubs: {
          Icon: true,
          Tag: true,
          Button: true,
        },
      },
    })

    const html = wrapper.html()
    expect(html).toContain('EXPIRED')
  })

  it('shows topup Button when balance < 50% of maxBalance', () => {
    const wrapper = mount(CreditMeter, {
      props: {
        balance: 40000,
      },
      global: {
        plugins: [i18n],
        stubs: {
          Icon: true,
          Tag: true,
          Button: { template: '<button class="topup-btn"><slot /></button>' },
        },
      },
    })

    expect(wrapper.find('.topup-btn').exists()).toBe(true)
  })

  it('hides topup Button when balance >= 50%', () => {
    const wrapper = mount(CreditMeter, {
      props: {
        balance: 60000,
      },
      global: {
        plugins: [i18n],
        stubs: {
          Icon: true,
          Tag: true,
          Button: { template: '<button class="topup-btn"><slot /></button>' },
        },
      },
    })

    expect(wrapper.find('.topup-btn').exists()).toBe(false)
  })

  it('shows deployment info section when activeDeployments > 0', () => {
    const wrapper = mount(CreditMeter, {
      props: {
        balance: 5000,
        activeDeployments: 3,
      },
      global: {
        plugins: [i18n],
        stubs: {
          Icon: true,
          Tag: true,
          Button: true,
        },
      },
    })

    const html = wrapper.html()
    expect(html).toContain('active_deployments')
  })

  it('emits topup event on button click', async () => {
    const wrapper = mount(CreditMeter, {
      props: {
        balance: 40000,
      },
      global: {
        plugins: [i18n],
        stubs: {
          Icon: true,
          Tag: true,
          Button: { template: '<button class="topup-btn" @click="$emit(\'topup\')"><slot /></button>' },
        },
      },
    })

    await wrapper.find('.topup-btn').trigger('click')
    expect(wrapper.emitted('topup')).toBeTruthy()
  })

  it('zero balance renders without crash', () => {
    const wrapper = mount(CreditMeter, {
      props: {
        balance: 0,
      },
      global: {
        plugins: [i18n],
        stubs: {
          Icon: true,
          Tag: true,
          Button: true,
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('0')
  })

  it('no expiryDate does not render Tag', () => {
    const wrapper = mount(CreditMeter, {
      props: {
        balance: 5000,
      },
      global: {
        plugins: [i18n],
        stubs: {
          Icon: true,
          Tag: { template: '<div class="tag">{{ value }}</div>' },
          Button: true,
        },
      },
    })

    expect(wrapper.find('.tag').exists()).toBe(false)
  })
})
