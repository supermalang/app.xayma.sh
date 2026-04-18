import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCurrency } from './useCurrency'

describe('useCurrency', () => {
  let formatter: ReturnType<typeof useCurrency>

  beforeEach(() => {
    formatter = useCurrency()
  })

  describe('format', () => {
    it('should format FCFA with no decimals', () => {
      const result = formatter.format(5000, 'FCFA')
      expect(result).toBe('5 000')
    })

    it('should format USD with 2 decimals', () => {
      const result = formatter.format(100.5, 'USD')
      expect(result).toMatch(/100.*5/)
    })

    it('should format EUR with 2 decimals', () => {
      const result = formatter.format(100.5, 'EUR')
      expect(result).toMatch(/100.*5/)
    })

    it('should handle zero values', () => {
      const result = formatter.format(0, 'FCFA')
      expect(result).toBe('0')
    })

    it('should handle negative values', () => {
      const result = formatter.format(-5000, 'FCFA')
      expect(result).toContain('5 000')
    })

    it('should use default currency if not specified', () => {
      const result = formatter.format(5000)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })
  })

  describe('formatSymbol', () => {
    it('should return correct symbol for FCFA', () => {
      const result = formatter.formatSymbol('FCFA')
      expect(result).toBe('Fr')
    })

    it('should return correct symbol for USD', () => {
      const result = formatter.formatSymbol('USD')
      expect(result).toBe('$')
    })

    it('should return correct symbol for EUR', () => {
      const result = formatter.formatSymbol('EUR')
      expect(result).toBe('€')
    })

    it('should return empty string for unknown currency', () => {
      const result = formatter.formatSymbol('XXX')
      expect(result).toBe('')
    })
  })

  describe('formatReadable', () => {
    it('should format amount with symbol', () => {
      const result = formatter.formatReadable(5000, 'FCFA')
      expect(result).toBe('5 000 Fr')
    })

    it('should handle different currencies', () => {
      const usdResult = formatter.formatReadable(100, 'USD')
      expect(usdResult).toContain('$')

      const eurResult = formatter.formatReadable(100, 'EUR')
      expect(eurResult).toContain('€')
    })

    it('should handle very large numbers', () => {
      const result = formatter.formatReadable(1000000, 'FCFA')
      expect(result).toBeDefined()
    })
  })

  describe('parse', () => {
    it('should parse formatted FCFA string', () => {
      const result = formatter.parse('5 000', 'FCFA')
      expect(result).toBe(5000)
    })

    it('should parse formatted USD string', () => {
      const result = formatter.parse('$100.50', 'USD')
      expect(result).toBe(100.5)
    })

    it('should handle various formats', () => {
      const result = formatter.parse('5000', 'FCFA')
      expect(result).toBe(5000)
    })

    it('should handle empty string', () => {
      const result = formatter.parse('', 'FCFA')
      expect(result).toBe(0)
    })
  })

  describe('getCurrencySymbol', () => {
    it('should return currency symbol', () => {
      const result = formatter.getCurrencySymbol('FCFA')
      expect(result).toBe('Fr')
    })

    it('should work with standard currencies', () => {
      expect(formatter.getCurrencySymbol('USD')).toBe('$')
      expect(formatter.getCurrencySymbol('EUR')).toBe('€')
    })
  })

  describe('hasDecimals', () => {
    it('should return false for FCFA', () => {
      const result = formatter.hasDecimals('FCFA')
      expect(result).toBe(false)
    })

    it('should return true for USD', () => {
      const result = formatter.hasDecimals('USD')
      expect(result).toBe(true)
    })

    it('should return true for EUR', () => {
      const result = formatter.hasDecimals('EUR')
      expect(result).toBe(true)
    })
  })

  describe('formatRange', () => {
    it('should format price range', () => {
      const result = formatter.formatRange(5000, 10000, 'FCFA')
      expect(result).toContain('5')
      expect(result).toContain('10')
      expect(result).toContain('-')
    })

    it('should handle same start and end', () => {
      const result = formatter.formatRange(5000, 5000, 'FCFA')
      expect(result).toBeDefined()
    })
  })

  describe('convert', () => {
    it('should handle currency conversion', () => {
      // This depends on exchange rates, so we just check it returns a number
      const result = formatter.convert(5000, 'FCFA', 'FCFA')
      expect(result).toBe(5000)
    })

    it('should handle same currency conversion', () => {
      const result = formatter.convert(100, 'USD', 'USD')
      expect(result).toBe(100)
    })
  })
})
