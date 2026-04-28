/**
 * Services service
 * CRUD operations for xayma_app.services and xayma_app.serviceplans tables
 */

import { supabaseFrom } from '@/services/supabase'

// Service types (auto-generated from Supabase schema)
export type Service = any
export type ServiceInsert = any
export type ServiceUpdate = any

// Service plan types (auto-generated from Supabase schema)
export type ServicePlan = any
export type ServicePlanInsert = any
export type ServicePlanUpdate = any

export interface ListServicesFilter {
  isPubliclyAvailable?: boolean
  search?: string
}

export interface ListServicesOptions extends ListServicesFilter {
  page?: number
  pageSize?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export interface ListServicePlansFilter {
  service_id?: number
  search?: string
}

export interface ListServicePlansOptions extends ListServicePlansFilter {
  page?: number
  pageSize?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

/**
 * List all services with optional filtering and pagination
 */
export async function listServices(options: ListServicesOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    orderBy = 'created',
    orderDirection = 'desc',
    isPubliclyAvailable,
    search,
  } = options

  let query = supabaseFrom('services').select('*', { count: 'exact' })

  // Apply filters
  if (isPubliclyAvailable !== undefined) {
    query = query.eq('isPubliclyAvailable', isPubliclyAvailable)
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  // Sorting
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error listing services:', error)
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
 * Get a single service by ID
 */
export async function getService(id: number) {
  const { data, error } = await supabaseFrom('services').select('*').eq('id', id).single()

  if (error) {
    console.error('Error fetching service:', error)
    throw error
  }

  return data
}

/**
 * Create a new service
 */
export async function createService(service: ServiceInsert) {
  const { data, error } = await supabaseFrom('services').insert([service]).select()

  if (error) {
    console.error('Error creating service:', error)
    throw error
  }

  return data?.[0]
}

/**
 * Update an existing service
 */
export async function updateService(id: number, updates: ServiceUpdate) {
  const { data, error } = await supabaseFrom('services')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating service:', error)
    throw error
  }

  return data?.[0]
}

/**
 * Delete a service
 */
export async function deleteService(id: number) {
  const { error } = await supabaseFrom('services').delete().eq('id', id)

  if (error) {
    console.error('Error deleting service:', error)
    throw error
  }
}

/**
 * Toggle service public availability
 */
export async function toggleServicePublicAvailability(id: number, isPubliclyAvailable: boolean) {
  return updateService(id, { isPubliclyAvailable })
}

/**
 * Change service status (active, inactive, archived)
 */
export async function changeServiceStatus(id: number, status: string) {
  return updateService(id, { status: status as any })
}

/**
 * List all service plans with optional filtering
 */
export async function listServicePlans(options: ListServicePlansOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    orderBy = 'created',
    orderDirection = 'desc',
    service_id,
    search,
  } = options

  let query = supabaseFrom('serviceplans').select('*', { count: 'exact' })

  // Apply filters
  if (service_id) {
    query = query.eq('service_id', service_id)
  }
  if (search) {
    query = query.or(`label.ilike.%${search}%,description.ilike.%${search}%`)
  }

  // Sorting
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error listing service plans:', error)
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
 * Get a single service plan by ID
 */
export async function getServicePlan(id: number) {
  const { data, error } = await supabaseFrom('serviceplans')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching service plan:', error)
    throw error
  }

  return data
}

/**
 * Get all service plans for a specific service
 */
export async function getServicePlansByServiceId(serviceId: number) {
  const { data, error } = await supabaseFrom('serviceplans')
    .select('*')
    .eq('service_id', serviceId)
    .order('created', { ascending: false })

  if (error) {
    console.error('Error fetching service plans:', error)
    throw error
  }

  return data || []
}

/**
 * Create a new service plan
 */
export async function createServicePlan(plan: ServicePlanInsert) {
  const { data, error } = await supabaseFrom('serviceplans').insert([plan]).select()

  if (error) {
    console.error('Error creating service plan:', error)
    throw error
  }

  return data?.[0]
}

/**
 * Update an existing service plan
 */
export async function updateServicePlan(id: number, updates: ServicePlanUpdate) {
  const { data, error } = await supabaseFrom('serviceplans')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating service plan:', error)
    throw error
  }

  return data?.[0]
}

/**
 * Delete a service plan
 */
export async function deleteServicePlan(id: number) {
  const { error } = await supabaseFrom('serviceplans').delete().eq('id', id)

  if (error) {
    console.error('Error deleting service plan:', error)
    throw error
  }
}

/**
 * Check if a slug is unique for a service plan
 */
export async function isServicePlanSlugUnique(slug: string, excludeId?: number) {
  let query = supabaseFrom('serviceplans').select('id').eq('slug', slug)

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
