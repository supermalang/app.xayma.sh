/**
 * Users service
 * CRUD operations for xayma_app.users table
 * Note: User creation/password reset should flow through Supabase Auth
 */

import { supabaseFrom } from '@/services/supabase'
import type { Database } from '@/types/supabase'

export type User = Database['xayma_app']['Tables']['users']['Row']
export type UserInsert = Database['xayma_app']['Tables']['users']['Insert']
export type UserUpdate = Database['xayma_app']['Tables']['users']['Update']

export interface ListUsersFilter {
  company_id?: number
  user_role?: string
  search?: string
}

export interface ListUsersOptions extends ListUsersFilter {
  page?: number
  pageSize?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

/**
 * List all users with optional filtering and pagination
 */
export async function listUsers(options: ListUsersOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    orderBy = 'created',
    orderDirection = 'desc',
    company_id,
    user_role,
    search,
  } = options

  let query = supabaseFrom('users').select('*', { count: 'exact' })

  // Apply filters
  if (company_id) {
    query = query.eq('company_id', company_id)
  }
  if (user_role) {
    query = query.eq('user_role', user_role)
  }
  if (search) {
    // Search in firstname, lastname, email
    query = query.or(
      `firstname.ilike.%${search}%,lastname.ilike.%${search}%,email.ilike.%${search}%`
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
    console.error('Error listing users:', error)
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
 * Get a single user by ID
 */
export async function getUser(id: string) {
  const { data, error } = await supabaseFrom('users').select('*').eq('id', id).single()

  if (error) {
    console.error('Error fetching user:', error)
    throw error
  }

  return data
}

/**
 * Get users by company ID (partner)
 */
export async function getUsersByCompanyId(companyId: number) {
  const { data, error } = await supabaseFrom('users')
    .select('*')
    .eq('company_id', companyId)

  if (error) {
    console.error('Error fetching company users:', error)
    throw error
  }

  return data || []
}

/**
 * Create a new user
 * Note: User must be created via Supabase Auth first
 */
export async function createUser(user: UserInsert) {
  const { data, error } = await supabaseFrom('users').insert([user]).select()

  if (error) {
    console.error('Error creating user:', error)
    throw error
  }

  return data?.[0]
}

/**
 * Update an existing user
 */
export async function updateUser(id: string, updates: UserUpdate) {
  const { data, error } = await supabaseFrom('users')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating user:', error)
    throw error
  }

  return data?.[0]
}

/**
 * Delete a user (soft delete - consider deactivating instead)
 */
export async function deleteUser(id: string) {
  const { error } = await supabaseFrom('users').delete().eq('id', id)

  if (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

/**
 * Update user role
 */
export async function updateUserRole(id: string, role: string) {
  return updateUser(id, { user_role: role as any })
}

/**
 * Link user to a partner company
 */
export async function linkUserToPartner(userId: string, companyId: number) {
  return updateUser(userId, { company_id: companyId })
}

/**
 * Check if email is unique
 */
export async function isEmailUnique(email: string, excludeId?: string) {
  let query = supabaseFrom('users').select('id').eq('email', email)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query.limit(1)

  if (error) {
    console.error('Error checking email uniqueness:', error)
    throw error
  }

  return (data || []).length === 0
}

/**
 * Get user details with partner info
 */
export async function getUserWithPartner(id: string) {
  const { data, error } = await supabaseFrom('users')
    .select(
      `
      *,
      partner:company_id(id, name, slug, partner_type, status)
    `
    )
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching user with partner:', error)
    throw error
  }

  return data
}
