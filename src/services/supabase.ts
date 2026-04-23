/**
 * Supabase client singleton
 * All database queries must use the xayma_app schema prefix
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

const xayma = supabase.schema('xayma_app')

/**
 * Helper to ensure all queries use the xayma_app schema
 * Usage: supabaseFrom('partners') → xayma_app.partners
 */
export function supabaseFrom<T extends Parameters<typeof xayma.from>[0]>(table: T) {
  return xayma.from(table)
}

/**
 * Pre-built schema accessor for the xayma_app schema.
 * Use when supabaseFrom() is insufficient (e.g. join selects that TypeScript can't resolve).
 * Cast to `any` at the call-site if needed — not here.
 */
export const supabaseSchema = supabase.schema('xayma_app')
