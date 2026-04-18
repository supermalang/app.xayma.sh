import { describe, it, expect } from 'vitest'
import { slugify, isValidWestAfricanPhone } from '@/lib/validators'

describe('Validators', () => {
  it('should validate West African phone numbers', () => {
    expect(isValidWestAfricanPhone('701234567')).toBe(true)
    expect(isValidWestAfricanPhone('751234567')).toBe(true)
    expect(isValidWestAfricanPhone('691234567')).toBe(false)
    expect(isValidWestAfricanPhone('123456789')).toBe(false)
  })
})

describe('Formatters', () => {
  it('should slugify strings', () => {
    expect(slugify('Hello World')).toBe('hello-world')
    expect(slugify('My Test Company')).toBe('my-test-company')
    expect(slugify('  spaces  ')).toBe('spaces')
  })
})
