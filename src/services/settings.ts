/**
 * Platform-wide settings service
 * Settings are stored in xayma_app.settings (key/value pairs)
 * Admin-only write access via RLS
 */

import { supabaseFrom } from './supabase'

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

  // TODO: Once Supabase schema is properly typed, remove the 'as any' cast
  const { data, error } = await (supabaseFrom('xayma_app.settings') as any)
    .select('value')
    .eq('key', key)
    .single()

  if (error) {
    console.error(`Failed to fetch setting ${key}:`, error)
    return null
  }

  const value = (data as any)?.value
  cache.set(key, value)
  cacheTimestamps.set(key, Date.now())
  return value
}

/**
 * Fetch all settings
 */
export async function getAllSettings(): Promise<Record<string, unknown>> {
  // TODO: Once Supabase schema is properly typed, remove the 'as any' cast
  const { data, error } = await (supabaseFrom('xayma_app.settings') as any)
    .select('key, value')

  if (error) {
    console.error('Failed to fetch settings:', error)
    return {}
  }

  const result: Record<string, unknown> = {}
  ;(data as any)?.forEach((item: { key: string; value: string }) => {
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
  // TODO: Once Supabase schema is properly typed, remove the 'as any' cast
  const { error } = await (supabaseFrom('xayma_app.settings') as any).upsert({
    key,
    value: String(value),
  })

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
