/**
 * useCurrency composable
 * Format currency values in FCFA, USD, and EUR
 * All numeric output MUST be wrapped in <span class="font-mono"> (IBM Plex Mono)
 */

import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

export type CurrencyCode = 'XOF' | 'USD' | 'EUR'

interface CurrencyConfig {
  code: CurrencyCode
  locale: string
  minimumFractionDigits: number
  maximumFractionDigits: number
  symbol?: string
}

const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  XOF: {
    code: 'XOF',
    locale: 'fr-SN', // West Africa locale for FCFA
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    symbol: 'FCFA',
  },
  USD: {
    code: 'USD',
    locale: 'en-US',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    symbol: '$',
  },
  EUR: {
    code: 'EUR',
    locale: 'en-EU',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    symbol: '€',
  },
}

export function useCurrency() {
  const authStore = useAuthStore()

  // Get preferred currency from user preferences (default: XOF/FCFA)
  const preferredCurrency = computed(() => {
    return (authStore.user?.currency_preference || 'XOF') as CurrencyCode
  })

  /**
   * Format an amount to a currency string (without HTML wrapping)
   * Component must wrap result in <span class="font-mono">
   *
   * Examples:
   * - format(5000, 'XOF') → "5 000 FCFA"
   * - format(99.99, 'USD') → "$99.99"
   * - format(79.50, 'EUR') → "€79.50"
   */
  function format(amount: number, currency: CurrencyCode = preferredCurrency.value): string {
    const config = CURRENCY_CONFIGS[currency]

    const formatter = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: config.minimumFractionDigits,
      maximumFractionDigits: config.maximumFractionDigits,
    })

    return formatter.format(amount)
  }

  /**
   * Format with symbol only (for condensed display)
   * Examples:
   * - formatSymbol(5000, 'XOF') → "5 000"
   * - formatSymbol(99.99, 'USD') → "99.99"
   */
  function formatSymbol(amount: number, currency: CurrencyCode = preferredCurrency.value): string {
    const config = CURRENCY_CONFIGS[currency]

    const formatter = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: config.minimumFractionDigits,
      maximumFractionDigits: config.maximumFractionDigits,
    })

    return formatter.format(amount)
  }

  /**
   * Format amount as readable text for display
   * Includes currency symbol/code
   */
  function formatReadable(amount: number, currency: CurrencyCode = preferredCurrency.value): string {
    return format(amount, currency)
  }

  /**
   * Convert amount from one currency to another
   * Requires exchange rates (should be fetched from settings/API)
   * For now, returns the amount as-is pending exchange rate setup
   */
  function convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
    if (from === to) {
      return amount
    }

    // TODO: Implement exchange rate lookup from settings/cache
    // For now, return amount as placeholder
    console.warn(`Currency conversion from ${from} to ${to} not yet implemented`)
    return amount
  }

  /**
   * Format a range of amounts
   * Example: "5 000–10 000 FCFA"
   */
  function formatRange(min: number, max: number, currency: CurrencyCode = preferredCurrency.value): string {
    const minFormatted = formatSymbol(min, currency)
    const maxFormatted = formatSymbol(max, currency)
    const symbol = currency === 'XOF' ? 'FCFA' : CURRENCY_CONFIGS[currency].symbol || currency

    return `${minFormatted}–${maxFormatted} ${symbol}`
  }

  /**
   * Parse a formatted currency string back to number
   * This is locale-aware and handles different decimal separators
   */
  function parse(formatted: string, currency: CurrencyCode = preferredCurrency.value): number {
    const config = CURRENCY_CONFIGS[currency]

    // Create a formatter to get the parts
    const formatter = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency,
    })

    // Get parts to determine separators
    const parts = formatter.formatToParts(1234.56)
    let decimalSeparator = '.'
    let groupSeparator = ','

    for (const part of parts) {
      if (part.type === 'decimal') decimalSeparator = part.value
      if (part.type === 'group') groupSeparator = part.value
    }

    // Clean the string: remove currency symbols and whitespace, normalize separators
    let cleaned = formatted
      .replace(/[^\d.,-]/g, '')
      .trim()

    if (!cleaned) return 0

    // Handle negative numbers
    const isNegative = cleaned.startsWith('-')
    if (isNegative) cleaned = cleaned.substring(1)

    // Replace group separator with empty, then decimal with period
    cleaned = cleaned.replace(new RegExp(`\\${groupSeparator}`, 'g'), '').replace(decimalSeparator, '.')

    const value = parseFloat(cleaned)
    return isNegative ? -value : value
  }

  /**
   * Get the symbol/code for a currency
   */
  function getCurrencySymbol(currency: CurrencyCode = preferredCurrency.value): string {
    return CURRENCY_CONFIGS[currency].symbol || currency
  }

  /**
   * Check if amount would be displayed with decimal places
   */
  function hasDecimals(currency: CurrencyCode = preferredCurrency.value): boolean {
    return CURRENCY_CONFIGS[currency].maximumFractionDigits > 0
  }

  return {
    preferredCurrency,
    format,
    formatSymbol,
    formatReadable,
    convert,
    formatRange,
    parse,
    getCurrencySymbol,
    hasDecimals,
    CURRENCY_CODES: ['XOF', 'USD', 'EUR'] as const,
  }
}
