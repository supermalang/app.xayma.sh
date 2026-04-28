/**
 * Partners service
 * CRUD operations for xayma_app.partners table
 */

import { supabaseFrom } from '@/services/supabase'
import type { Database } from '@/types/supabase'

export type Partner = Database['xayma_app']['Tables']['partners']['Row']
export type PartnerInsert = Database['xayma_app']['Tables']['partners']['Insert']
export type PartnerUpdate = Database['xayma_app']['Tables']['partners']['Update']

export interface ListPartnersFilter {
  status?: string
  partner_type?: string
  search?: string
}

export interface ListPartnersOptions extends ListPartnersFilter {
  page?: number
  pageSize?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

/**
 * List all partners with optional filtering and pagination
 */
export async function listPartners(options: ListPartnersOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    orderBy = 'created',
    orderDirection = 'desc',
    status,
    partner_type,
    search,
  } = options

  let query = supabaseFrom('partners').select('*', { count: 'exact' })

  // Apply filters
  if (status) {
    query = query.eq('status', status as unknown as 'active')
  }
  if (partner_type) {
    query = query.eq('partner_type', partner_type as unknown as 'customer')
  }
  if (search) {
    // Search in name, email, phone
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }

  // Sorting
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error listing partners:', error)
    throw error
  }

  return {
    data: data || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}

/**
 * Get a single partner by ID
 */
export async function getPartner(id: number) {
  const { data, error } = await supabaseFrom('partners').select('*').eq('id', id).single()

  if (error) {
    console.error('Error fetching partner:', error)
    throw error
  }

  return data
}

/**
 * Create a new partner
 */
export async function createPartner(partner: PartnerInsert) {
  const { data, error } = await supabaseFrom('partners').insert([partner]).select()

  if (error) {
    console.error('Error creating partner:', error)
    throw error
  }

  return data?.[0]
}

/**
 * Update an existing partner
 */
export async function updatePartner(id: number, updates: PartnerUpdate) {
  const { data, error } = await supabaseFrom('partners')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating partner:', error)
    throw error
  }

  return data?.[0]
}

/**
 * Delete a partner
 */
export async function deletePartner(id: number) {
  const { error } = await supabaseFrom('partners').delete().eq('id', id)

  if (error) {
    console.error('Error deleting partner:', error)
    throw error
  }
}

/**
 * Change partner status (active, suspended, archived)
 */
export async function changePartnerStatus(id: number, status: string) {
  return updatePartner(id, { status: status as any })
}

/**
 * Check if a slug is unique
 */
export async function isSlugUnique(slug: string, excludeId?: number) {
  let query = supabaseFrom('partners').select('id').eq('slug', slug)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query.limit(1)

  if (error) {
    console.error('Error checking slug uniqueness:', error)
    throw error
  }

  return (data || []).length === 0
}

/**
 * Get remaining credits for a partner
 */
export async function getPartnerCredits(partnerId: number) {
  const { data, error } = await supabaseFrom('partners')
    .select('remainingCredits')
    .eq('id', partnerId)
    .single()

  if (error) {
    console.error('Error fetching partner credits:', error)
    throw error
  }

  return data?.remainingCredits || 0
}
