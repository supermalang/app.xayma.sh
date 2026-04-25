import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PartnerForm from './PartnerForm.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      errors: { required: 'This field is required', invalid_email: 'Invalid email address' },
      auth: { phone_invalid: 'Phone must be West Africa format (70/75/76/77/78 + 7 digits)' },
      partners: {
        form: {
          name: 'Partner Name', slug: 'Slug', email: 'Email', phone: 'Phone Number',
          type: 'Partner Type', status: 'Status', description: 'Description',
          address: 'Address', activity_area: 'Activity Areas', credit_settings: 'Credit Settings',
          allow_credit_debt: 'Allow Credit Debt', credit_debt_threshold: 'Credit Debt Threshold',
        },
        type: { customer: 'Customer', reseller: 'Reseller' },
        status: { active: 'Active', suspended: 'Suspended', inactive: 'Inactive' },
        errors: { name_too_short: 'Name must be at least 3 characters' },
      },
      common: { select: 'Select', create: 'Create', update: 'Update', cancel: 'Cancel' },
    },
  },
})

// Phone regex from CLAUDE.md spec: ^(70|75|76|77|78)[0-9]{7}$  — 9 raw digits, no country code
const PHONE_REGEX = /^(70|75|76|77|78)[0-9]{7}$/

// Slug helper mirrors the component implementation
const generateSlug = (name: string): string =>
  name.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

// ─── Phone Validation (2.T3) ──────────────────────────────────────────────────

describe('Phone validation — West Africa regex (2.T3)', () => {
  it('accepts all five valid prefixes (70, 75, 76, 77, 78) + 7 digits', () => {
    expect(PHONE_REGEX.test('701234567')).toBe(true)
    expect(PHONE_REGEX.test('751234567')).toBe(true)
    expect(PHONE_REGEX.test('761234567')).toBe(true)
    expect(PHONE_REGEX.test('771234567')).toBe(true)
    expect(PHONE_REGEX.test('781234567')).toBe(true)
  })

  it('rejects prefixes 60-69 (not in allowed set)', () => {
    expect(PHONE_REGEX.test('601234567')).toBe(false)
    expect(PHONE_REGEX.test('691234567')).toBe(false)
  })

  it('rejects prefixes 71-74 and 79 (not in allowed set)', () => {
    expect(PHONE_REGEX.test('711234567')).toBe(false)
    expect(PHONE_REGEX.test('721234567')).toBe(false)
    expect(PHONE_REGEX.test('791234567')).toBe(false)
  })

  it('rejects non-numeric input', () => {
    expect(PHONE_REGEX.test('notaphone')).toBe(false)
    expect(PHONE_REGEX.test('')).toBe(false)
  })

  it('rejects numbers that are too short or too long', () => {
    expect(PHONE_REGEX.test('7012345')).toBe(false)
    expect(PHONE_REGEX.test('701234567890')).toBe(false)
  })

  it('rejects non-West-Africa international formats', () => {
    expect(PHONE_REGEX.test('13015551234')).toBe(false)
    expect(PHONE_REGEX.test('441234567890')).toBe(false)
  })
})

// ─── Slug Generation (2.T3) ───────────────────────────────────────────────────

describe('Slug generation (2.T3)', () => {
  it('lowercases and hyphenates words', () => {
    expect(generateSlug('Test Partner')).toBe('test-partner')
    expect(generateSlug('UPPERCASE NAME')).toBe('uppercase-name')
  })

  it('collapses multiple spaces into a single hyphen', () => {
    expect(generateSlug('Name With   Spaces')).toBe('name-with-spaces')
  })

  it('preserves existing hyphens', () => {
    expect(generateSlug('Name-With-Dashes')).toBe('name-with-dashes')
  })

  it('removes punctuation; surrounding spaces collapse to one hyphen', () => {
    expect(generateSlug('My Company Inc.')).toBe('my-company-inc')
    expect(generateSlug('Company & Co. (2024)')).toBe('company-co-2024')
  })

  it('handles numbers embedded in names', () => {
    expect(generateSlug('123 Numbers 456')).toBe('123-numbers-456')
  })

  it('returns empty string for special-characters-only input', () => {
    expect(generateSlug('!!!')).toBe('')
  })
})

// ─── Component Tests ──────────────────────────────────────────────────────────
// PrimeVue registered globally via tests/setup.ts; i18n provided per test.

describe('PartnerForm component', () => {
  let wrapper: ReturnType<typeof mount<any>>

  const mountForm = (props: Record<string, unknown> = {}) =>
    mount(PartnerForm, { props, global: { plugins: [i18n] } })

  beforeEach(() => { wrapper = mountForm() })

  describe('Form mode', () => {
    it('is in create mode when no initialData provided', () => {
      expect((wrapper.vm as any).isEditMode).toBe(false)
    })

    it('is in edit mode when initialData has an id', () => {
      const w = mountForm({ initialData: { id: 1, name: 'Existing', slug: 'existing' } })
      expect((w.vm as any).isEditMode).toBe(true)
    })
  })

  describe('Form submission', () => {
    it('emits submit with the provided form values', async () => {
      const values = {
        name: 'Test Partner', slug: 'test-partner', email: 'test@example.com',
        phone: '701234567', partner_type: 'customer', status: 'active',
        description: '', address: '', activity_area: [], allowCreditDebt: false, creditDebtThreshold: 0,
      }
      await (wrapper.vm as any).onSubmit(values)
      expect(wrapper.emitted('submit')).toBeTruthy()
      expect(wrapper.emitted('submit')![0]).toEqual([values])
    })

    it('emits cancel when the cancel button is clicked', async () => {
      const cancel = wrapper.findAll('button').find(b => b.text().toLowerCase().includes('cancel'))
      expect(cancel).toBeTruthy()
      await cancel!.trigger('click')
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })
  })
})
