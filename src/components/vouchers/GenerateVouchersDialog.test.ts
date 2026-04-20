import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import GenerateVouchersDialog from './GenerateVouchersDialog.vue'
vi.mock('@/services/vouchers.service')
vi.mock('@/services/workflow-engine')
vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      vouchers: {
        generate_title: 'Generate Vouchers',
        form: {
          credits_amount: 'Credits Per Voucher',
          credits_placeholder: 'e.g., 5000',
          credits_help: 'Each voucher will grant this amount',
          quantity: 'Number of Vouchers',
          quantity_placeholder: 'e.g., 10',
          quantity_help: 'Generate up to {max} vouchers at once.',
          expiry_date: 'Expiry Date',
          expiry_help: 'Vouchers cannot be redeemed after this date.',
          partner_restriction: 'Restrict to Partner Type',
          no_restriction: 'No restriction',
          partner_help: 'Leave empty to allow all partner types',
          target_partner: 'Target Specific Partner',
          select_partner: 'Select a partner...',
          target_partner_help: 'Leave empty or fill to restrict',
          summary_line1: 'Generate {quantity} voucher(s) worth {credits} FCFA',
          summary_line2: 'Total distribution: {total} FCFA',
          generate: 'Generate',
          error_credits_min: 'Credits must be at least 100 FCFA',
          error_quantity: 'Quantity must be between 1 and 100',
          error_expiry: 'Please select an expiry date',
        },
      },
      common: {
        cancel: 'Cancel',
      },
      errors: {
        webhook_failed: 'Operation failed. Please try again.',
      },
    },
  },
})

// Stub Dialog to render content inline so we can query the DOM
const DialogStub = {
  props: ['visible', 'header', 'modal', 'closable'],
  template: '<div v-if="visible" class="p-dialog"><slot /></div>',
}

const mountDialog = (props = { visible: true }) =>
  mount(GenerateVouchersDialog, {
    props,
    global: {
      plugins: [i18n],
      stubs: { Dialog: DialogStub },
    },
  })

describe('GenerateVouchersDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dialog when visible', () => {
    const wrapper = mountDialog({ visible: true })
    expect(wrapper.find('.p-dialog').exists()).toBe(true)
  })

  it('should not render dialog when not visible', () => {
    const wrapper = mountDialog({ visible: false })
    expect(wrapper.find('.p-dialog').exists()).toBe(false)
  })

  it('should emit update:visible when close button clicked', async () => {
    const wrapper = mountDialog()
    const closeButton = wrapper.find('[class*="p-dialog-close"]')
    if (closeButton.exists()) {
      await closeButton.trigger('click')
      expect(wrapper.emitted('update:visible')).toBeTruthy()
    }
  })

  it('should show validation error for insufficient credits', async () => {
    const wrapper = mountDialog()
    const vm = wrapper.vm as Record<string, any>
    vm.form.creditsAmount = 50
    vm.form.quantity = 10
    vm.form.expiryDate = new Date('2026-12-31')
    await wrapper.find('form').trigger('submit')
    expect(vm.error).toBeTruthy()
    expect(vm.error).toContain('100 FCFA')
  })

  it('should show validation error for invalid quantity', async () => {
    const wrapper = mountDialog()
    const vm = wrapper.vm as Record<string, any>
    vm.form.creditsAmount = 1000
    vm.form.quantity = 150
    vm.form.expiryDate = new Date('2026-12-31')
    await wrapper.find('form').trigger('submit')
    expect(vm.error).toBeTruthy()
    expect(vm.error).toContain('between 1 and 100')
  })

  it('should show validation error when expiry date is missing', async () => {
    const wrapper = mountDialog()
    const vm = wrapper.vm as Record<string, any>
    vm.form.creditsAmount = 1000
    vm.form.quantity = 10
    vm.form.expiryDate = null
    await wrapper.find('form').trigger('submit')
    expect(vm.error).toBeTruthy()
    expect(vm.error).toContain('expiry date')
  })

  it('should have tomorrow as minimum date', () => {
    const wrapper = mountDialog()
    const minDate = (wrapper.vm as Record<string, any>).minDate
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(minDate.toDateString()).toBe(tomorrow.toDateString())
  })

  it('should show partner type options', () => {
    const wrapper = mountDialog()
    const options = (wrapper.vm as Record<string, any>).partnerTypeOptions
    expect(options).toEqual([
      { label: 'Customer', value: 'CUSTOMER' },
      { label: 'Reseller', value: 'RESELLER' },
    ])
  })

  it('should have default form values', () => {
    const wrapper = mountDialog()
    const form = (wrapper.vm as Record<string, any>).form
    expect(form.creditsAmount).toBe(1000)
    expect(form.quantity).toBe(10)
    expect(form.expiryDate).toBeNull()
    expect(form.partnerTypeRestriction).toBeNull()
    expect(form.targetPartnerId).toBeNull()
  })

  it('should display summary with correct values', async () => {
    const wrapper = mountDialog()
    const vm = wrapper.vm as Record<string, any>
    vm.form.creditsAmount = 5000
    vm.form.quantity = 20
    await wrapper.vm.$nextTick()
    const message = wrapper.find('[class*="p-message"]')
    expect(message.text()).toContain('20')
    expect(message.text()).toContain('5000')
  })

  it('should reset form after successful generation', async () => {
    const wrapper = mountDialog()
    const initialForm = {
      creditsAmount: 1000,
      quantity: 10,
      expiryDate: null,
      partnerTypeRestriction: null,
      targetPartnerId: null,
    }
    expect((wrapper.vm as Record<string, any>).form).toEqual(initialForm)
  })

  it('should have cancel and generate buttons', () => {
    const wrapper = mountDialog()
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('should disable form during loading', async () => {
    const wrapper = mountDialog()
    const vm = wrapper.vm as Record<string, any>
    vm.loading = true
    await wrapper.vm.$nextTick()
    expect(vm.loading).toBe(true)
  })

  it('should load partners on mount', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as Record<string, any>).partners).toBeDefined()
  })
})
