import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CreditPurchaseOptions from './CreditPurchaseOptions.vue'
import { createI18n } from 'vue-i18n'
import * as supabaseService from '@/services/supabase'

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
}))

describe('CreditPurchaseOptions.vue', () => {
  let wrapper: any
  const mockOptions = [
    {
      id: 1,
      partner_type: 'customer',
      threshold_type: 'INSTANCE_COUNT',
      threshold_value: 5,
      threshold_discount_percent: 10,
      priority: 1,
      is_active: true,
    },
    {
      id: 2,
      partner_type: 'reseller',
      threshold_type: 'CREDIT_AMOUNT',
      threshold_value: 10000,
      threshold_discount_percent: 15,
      priority: 2,
      is_active: true,
    },
  ]

  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
      en: {
        common: {
          create: 'Create',
          edit: 'Edit',
          cancel: 'Cancel',
          update: 'Update',
          delete: 'Delete',
          status: 'Status',
          priority: 'Priority',
          active: 'Active',
          confirm_delete: 'Are you sure you want to delete this item?',
        },
        credits: {
          purchase_options: {
            title: 'Credit Purchase Options',
            description: 'Manage credit purchase tiers',
            threshold_type: 'Threshold Type',
            threshold_value: 'Threshold Value',
            discount_percent: 'Discount (%)',
          },
        },
        partners: {
          form: {
            type: 'Partner Type',
          },
          type: {
            customer: 'Customer',
            reseller: 'Reseller',
          },
        },
      },
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    const mockFromFn = vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: mockOptions,
            error: null,
          }),
        })),
      })),
      update: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }))
    ;(supabaseService.supabaseFrom as any).mockImplementation(mockFromFn)
  })

  it('renders the component', () => {
    wrapper = mount(CreditPurchaseOptions, {
      global: {
        plugins: [i18n],
        stubs: {
          Card: { template: '<div><slot /></div>' },
          DataTable: { template: '<div><slot /></div>' },
          Column: { template: '<div />'},
          Dialog: { template: '<div><slot /></div>' },
          Button: { template: '<button><slot /></button>' },
          Dropdown: { template: '<select><slot /></select>' },
          InputNumber: { template: '<input type="number" />' },
          InputSwitch: { template: '<input type="checkbox" />' },
          Tag: { template: '<span><slot /></span>' },
          PartnerTypeBadge: { template: '<div>{{ type }}</div>' },
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('loads options on mount', async () => {
    wrapper = mount(CreditPurchaseOptions, {
      global: {
        plugins: [i18n],
        stubs: {
          Card: { template: '<div><slot /></div>' },
          DataTable: { template: '<div><slot /></div>' },
          Column: { template: '<div />' },
          Dialog: { template: '<div><slot /></div>' },
          Button: { template: '<button><slot /></button>' },
          Dropdown: { template: '<select><slot /></select>' },
          InputNumber: { template: '<input type="number" />' },
          InputSwitch: { template: '<input type="checkbox" />' },
          Tag: { template: '<span><slot /></span>' },
          PartnerTypeBadge: { template: '<div>{{ type }}</div>' },
        },
      },
    })

    await wrapper.vm.$nextTick()
    expect(supabaseService.supabaseFrom).toHaveBeenCalledWith('partner_credit_purchase_options')
  })

  it('has correct initial form data', () => {
    wrapper = mount(CreditPurchaseOptions, {
      global: {
        plugins: [i18n],
        stubs: {
          Card: { template: '<div><slot /></div>' },
          DataTable: { template: '<div><slot /></div>' },
          Column: { template: '<div />' },
          Dialog: { template: '<div><slot /></div>' },
          Button: { template: '<button><slot /></button>' },
          Dropdown: { template: '<select><slot /></select>' },
          InputNumber: { template: '<input type="number" />' },
          InputSwitch: { template: '<input type="checkbox" />' },
          Tag: { template: '<span><slot /></span>' },
          PartnerTypeBadge: { template: '<div>{{ type }}</div>' },
        },
      },
    })

    const defaultFormData = {
      partner_type: 'customer',
      threshold_type: 'INSTANCE_COUNT',
      threshold_value: 0,
      threshold_discount_percent: 0,
      priority: 0,
      is_active: true,
    }

    expect(wrapper.vm.formData).toEqual(defaultFormData)
  })

  it('shows create dialog when create button is clicked', async () => {
    wrapper = mount(CreditPurchaseOptions, {
      global: {
        plugins: [i18n],
        stubs: {
          Card: { template: '<div><slot /></div>' },
          DataTable: { template: '<div><slot /></div>' },
          Column: { template: '<div />' },
          Dialog: { template: '<div v-if="visible"><slot /></div>' },
          Button: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          Dropdown: { template: '<select><slot /></select>' },
          InputNumber: { template: '<input type="number" />' },
          InputSwitch: { template: '<input type="checkbox" />' },
          Tag: { template: '<span><slot /></span>' },
          PartnerTypeBadge: { template: '<div>{{ type }}</div>' },
        },
      },
    })

    expect(wrapper.vm.showDialog).toBe(false)
    wrapper.vm.showCreateDialog()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.showDialog).toBe(true)
    expect(wrapper.vm.isEditing).toBe(false)
  })

  it('closes dialog and resets form', async () => {
    wrapper = mount(CreditPurchaseOptions, {
      global: {
        plugins: [i18n],
        stubs: {
          Card: { template: '<div><slot /></div>' },
          DataTable: { template: '<div><slot /></div>' },
          Column: { template: '<div />' },
          Dialog: { template: '<div><slot /></div>' },
          Button: { template: '<button><slot /></button>' },
          Dropdown: { template: '<select><slot /></select>' },
          InputNumber: { template: '<input type="number" />' },
          InputSwitch: { template: '<input type="checkbox" />' },
          Tag: { template: '<span><slot /></span>' },
          PartnerTypeBadge: { template: '<div>{{ type }}</div>' },
        },
      },
    })

    wrapper.vm.showDialog = true
    wrapper.vm.isEditing = true
    wrapper.vm.editingId = 1

    wrapper.vm.closeDialog()

    expect(wrapper.vm.showDialog).toBe(false)
    expect(wrapper.vm.isEditing).toBe(false)
    expect(wrapper.vm.editingId).toBe(null)
  })
})
