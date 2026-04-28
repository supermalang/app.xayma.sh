/**
 * Deployments service
 * CRUD operations for xayma_app.deployments table
 */

import { supabase, supabaseFrom } from '@/services/supabase'
import type { Database } from '@/types/supabase'

export type Deployment = Database['xayma_app']['Tables']['deployments']['Row']
export type DeploymentInsert = Database['xayma_app']['Tables']['deployments']['Insert']
export type DeploymentUpdate = Database['xayma_app']['Tables']['deployments']['Update']
export type Service = Database['xayma_app']['Tables']['services']['Row']
export type ServicePlan = Database['xayma_app']['Tables']['serviceplans']['Row']
export type Partner = Database['xayma_app']['Tables']['partners']['Row']

export interface DeploymentWithRelations extends Deployment {
  service?: Service
  serviceplan?: ServicePlan
  partner?: Partner
}

export interface ListDeploymentsFilter {
  partner_id?: number
  status?: string
  service_id?: number
  search?: string
}

export interface ListDeploymentsOptions extends ListDeploymentsFilter {
  page?: number
  pageSize?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

/**
 * List all deployments with optional filtering and pagination
 * RLS policies should handle role-based filtering on the database level
 */
export async function listDeployments(options: ListDeploymentsOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    orderBy = 'created',
    orderDirection = 'desc',
    partner_id,
    status,
    service_id,
    search,
  } = options

  let query = supabaseFrom('deployments').select(
    `*,
    service:services(*),
    serviceplan:serviceplans(*),
    partner:partners(*)`,
    { count: 'exact' }
  )

  // Apply filters
  if (partner_id) {
    query = query.eq('partner_id', partner_id)
  }
  if (status) {
    query = query.eq('status', status as unknown as 'active')
  }
  if (service_id) {
    query = query.eq('service_id', service_id)
  }
  if (search) {
    query = query.or(`label.ilike.%${search}%,slug.ilike.%${search}%`)
  }

  // Sorting
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error listing deployments:', error)
    throw error
  }

  return {
    data: (data || []) as unknown as DeploymentWithRelations[],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}

/**
 * Get a single deployment by ID with related data
 */
export async function getDeployment(id: number): Promise<DeploymentWithRelations | null> {
  const { data, error } = await supabaseFrom('deployments')
    .select(
      `*,
      service:services(*),
      serviceplan:serviceplans(*),
      partner:partners(*)`
    )
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching deployment:', error)
    throw error
  }

  return data as unknown as DeploymentWithRelations | null
}

/**
 * Get deployments by partner ID
 */
export async function getDeploymentsByPartnerId(partnerId: number) {
  const { data, error } = await supabaseFrom('deployments')
    .select(
      `*,
      service:services(*),
      serviceplan:serviceplans(*)`
    )
    .eq('partner_id', partnerId)
    .order('created', { ascending: false })

  if (error) {
    console.error('Error fetching deployments by partner:', error)
    throw error
  }

  return data || []
}

/**
 * Create a new deployment
 */
export async function createDeployment(deployment: DeploymentInsert): Promise<Deployment | undefined> {
  const { data, error } = await supabaseFrom('deployments').insert([deployment]).select()

  if (error) {
    console.error('Error creating deployment:', error)
    throw error
  }

  return (data?.[0]) as unknown as Deployment | undefined
}

/**
 * Update an existing deployment
 */
export async function updateDeployment(id: number, updates: DeploymentUpdate) {
  const { data, error } = await supabaseFrom('deployments')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating deployment:', error)
    throw error
  }

  return data?.[0]
}

/**
 * Update deployment status
 */
export async function updateDeploymentStatus(
  id: number,
  status:
    | 'pending_deployment'
    | 'deploying'
    | 'failed'
    | 'active'
    | 'stopped'
    | 'suspended'
    | 'archived'
    | 'pending_deletion'
) {
  return updateDeployment(id, { status })
}

/**
 * Delete a deployment
 */
export async function deleteDeployment(id: number) {
  const { error } = await supabaseFrom('deployments').delete().eq('id', id)

  if (error) {
    console.error('Error deleting deployment:', error)
    throw error
  }
}

/**
 * Validate domain names via database function valid_domain_array.
 * Returns true if all domains are valid.
 */
export async function validateDomains(domains: string[]): Promise<boolean> {
  if (domains.length === 0) return false

  const { data, error } = await supabase
    .schema('xayma_app')
    .rpc('valid_domain_array', { domains })

  if (error) {
    console.error('Error validating domains:', error)
    throw error
  }

  return data === true
}

/**
 * Check if a slug is unique
 */
export async function isDeploymentSlugUnique(slug: string, excludeId?: number) {
  let query = supabaseFrom('deployments').select('id').eq('slug', slug)

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
 * Check if partner has sufficient credits for a deployment plan
 * Returns true if partner has enough credits, false otherwise
 */
export async function hasPartnerSufficientCredits(
  partnerId: number,
  monthlyCreditConsumption: number
): Promise<boolean> {
  const { data, error } = await supabaseFrom('partners')
    .select('remainingCredits')
    .eq('id', partnerId)
    .single()

  if (error) {
    console.error('Error fetching partner credits:', error)
    throw error
  }

  const row = data as unknown as { remainingCredits: number } | null
  return (row?.remainingCredits || 0) >= monthlyCreditConsumption
}

/**
 * Get deployment count by status for a partner
 */
export async function getDeploymentCountByStatus(partnerId: number, status: string) {
  const { count, error } = await supabaseFrom('deployments')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .eq('status', status as unknown as 'active')

  if (error) {
    console.error('Error counting deployments:', error)
    throw error
  }

  return count || 0
}

/**
 * Get total monthly credit consumption for a partner
 * (sum of all active deployment plans' monthly consumption)
 */
export async function getPartnerTotalMonthlyConsumption(partnerId: number): Promise<number> {
  const { data, error } = await supabaseFrom('deployments')
    .select('serviceplan:serviceplans(monthlyCreditConsumption)')
    .eq('partner_id', partnerId)
    .in('status', ['active', 'deploying', 'pending_deployment'])

  if (error) {
    console.error('Error calculating monthly consumption:', error)
    throw error
  }

  if (!data) return 0

  return (data as Array<{ serviceplan?: ServicePlan }>).reduce((total, deployment) => {
    return total + (deployment.serviceplan?.monthlyCreditConsumption || 0)
  }, 0)
}
