/**
 * Validation utilities
 */

/**
 * Validate West African phone number
 * Format: 7X xxxxxxxx (70-78)
 */
export function isValidWestAfricanPhone(phone: string): boolean {
  const regex = /^(70|75|76|77|78)[0-9]{7}$/
  return regex.test(phone.replace(/\s+/g, ''))
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Validate domain name
 */
export function isValidDomain(domain: string): boolean {
  const regex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
  return regex.test(domain)
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Check if string is valid JSON
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

/**
 * Convert string to URL-friendly slug
 */
export function slugify(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
}
