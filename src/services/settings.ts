/**
 * Platform-wide settings service
 * Settings are stored in settings (key/value pairs)
 * Admin-only write access via RLS
 */

import { supabaseFrom } from './supabase'
import type { PaymentGateway } from '@/types'

const cache = new Map<string, unknown>()
const cacheTTL = 5 * 60 * 1000 // 5 minutes
const cacheTimestamps = new Map<string, number>()

/**
 * Fetch a single setting
 */
export async function getSetting(key: string): Promise<unknown> {
  // Check cache first
  const cached = cache.get(key)
  const timestamp = cacheTimestamps.get(key) || 0
  if (cached !== undefined && Date.now() - timestamp < cacheTTL) {
    return cached
  }

  const { data, error } = await supabaseFrom('settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error) {
    console.error(`Failed to fetch setting ${key}:`, error)
    return null
  }

  const value = data?.value
  cache.set(key, value)
  cacheTimestamps.set(key, Date.now())
  return value
}

/**
 * Fetch all settings
 */
export async function getAllSettings(): Promise<Record<string, unknown>> {
  const { data, error } = await supabaseFrom('settings')
    .select('key, value')

  if (error) {
    console.error('Failed to fetch settings:', error)
    return {}
  }

  const result: Record<string, unknown> = {}
  ;(data || []).forEach((item) => {
    result[item.key] = item.value
    cache.set(item.key, item.value)
    cacheTimestamps.set(item.key, Date.now())
  })

  return result
}

/**
 * Update a setting (admin only)
 */
export async function updateSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabaseFrom('settings').upsert(
    { key, value: String(value) },
    { onConflict: 'key' }
  )

  if (error) {
    console.error(`Failed to update setting ${key}:`, error)
    throw error
  }

  // Invalidate cache
  cache.delete(key)
  cacheTimestamps.delete(key)
}

/**
 * Clear cache for a setting
 */
export function invalidateSettingCache(key?: string): void {
  if (key) {
    cache.delete(key)
    cacheTimestamps.delete(key)
  } else {
    cache.clear()
    cacheTimestamps.clear()
  }
}

const PAYMENT_GATEWAYS_KEY = 'PAYMENT_GATEWAYS'

/**
 * Fetch payment gateways stored as JSON in xayma_app.settings.
 * Returns [] for missing rows or malformed JSON.
 */
export async function getPaymentGateways(): Promise<PaymentGateway[]> {
  const raw = (await getSetting(PAYMENT_GATEWAYS_KEY)) as string | null
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PaymentGateway[]) : []
  } catch (err) {
    console.error('Failed to parse PAYMENT_GATEWAYS:', err)
    return []
  }
}

/**
 * Persist payment gateways as JSON in xayma_app.settings.
 * Atomic — either the whole array writes or it throws.
 */
export async function updatePaymentGateways(gateways: PaymentGateway[]): Promise<void> {
  await updateSetting(PAYMENT_GATEWAYS_KEY, JSON.stringify(gateways))
}
