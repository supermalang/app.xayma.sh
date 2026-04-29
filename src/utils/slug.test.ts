import { describe, it, expect } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Odoo Enterprise v16')).toBe('odoo-enterprise-v16')
  })

  it('strips diacritics', () => {
    expect(slugify('Café Numérique')).toBe('cafe-numerique')
  })

  it('collapses repeated dashes and trims edges', () => {
    expect(slugify('  hello   world!! ')).toBe('hello-world')
  })

  it('returns empty string for input with no slug-friendly chars', () => {
    expect(slugify('   !!! ')).toBe('')
  })

  it('keeps numbers and dashes', () => {
    expect(slugify('plan-2024-v3')).toBe('plan-2024-v3')
  })
})
