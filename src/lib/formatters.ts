/**
 * Formatting utilities
 */

/**
 * Format date as locale string
 */
export function formatDate(date: string | Date, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

/**
 * Format date + time as `dd/mm/yyyy hh:mm` (or hh:mm:ss with withSeconds).
 */
export function formatDateTime(
  date: string | Date,
  locale = 'en-US',
  options: { withSeconds?: boolean } = {},
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const datePart = d.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const timeOpts: Intl.DateTimeFormatOptions = options.withSeconds
    ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
    : { hour: '2-digit', minute: '2-digit' }
  return `${datePart} ${d.toLocaleTimeString(locale, timeOpts)}`
}

/**
 * Format currency (FCFA/USD).
 * For XOF, renders as "<number> FCFA" (number first, FCFA suffix).
 */
export function formatCurrency(amount: number, currency = 'XOF'): string {
  if (currency === 'XOF') {
    return `${new Intl.NumberFormat('en-US').format(amount)} FCFA`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(num)
}

/**
 * Slugify a string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
