/**
 * Deployments service
 * CRUD on xayma_app.deployments. Plan data lives on services.plans (jsonb),
 * keyed by plan_slug from the deployment row.
 */

import { supabase, supabaseFrom } from '@/services/supabase'
import type { Database } from '@/types/supabase'
import {
  findServicePlan,
  type ServicePlan as ServicePlanShape,
} from '@/services/services.service'

export type Deployment = Database['xayma_app']['Tables']['deployments']['Row']
export type DeploymentInsert = Database['xayma_app']['Tables']['deployments']['Insert']
export type DeploymentUpdate = Database['xayma_app']['Tables']['deployments']['Update']
export type Service = Database['xayma_app']['Tables']['services']['Row']
export type ServicePlan = ServicePlanShape
export type Partner = Database['xayma_app']['Tables']['partners']['Row']

export interface DeploymentWithRelations extends Deployment {
  service?: Service
  serviceplan?: ServicePlan | null
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
 * Hydrate a deployment row with its plan looked up from `service.plans`.
 * `service.plans` arrives as the JSONB array via the embedded `services(*)` join.
 * Typing is loose because generated supabase types don't yet expose plan_slug / plans.
 */
function attachServicePlan(row: any): any {
  const slug = row?.plan_slug ?? ''
  return {
    ...row,
    serviceplan: slug ? findServicePlan(row?.service ?? null, slug) : null,
  }
}

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
    partner:partners(*)`,
    { count: 'exact' },
  )

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

  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error listing deployments:', error)
    throw error
  }

  const rows = (data || []) as unknown as Array<DeploymentWithRelations & { plan_slug?: string | null }>
  const hydrated = rows.map((r) => attachServicePlan(r) as DeploymentWithRelations)

  return {
    data: hydrated,
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}

export async function getDeployment(id: number): Promise<DeploymentWithRelations | null> {
  const { data, error } = await supabaseFrom('deployments')
    .select(
      `*,
      service:services(*),
      partner:partners(*)`,
    )
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching deployment:', error)
    throw error
  }

  if (!data) return null
  return attachServicePlan(data as unknown as DeploymentWithRelations) as DeploymentWithRelations
}

export async function getDeploymentsByPartnerId(partnerId: number) {
  const { data, error } = await supabaseFrom('deployments')
    .select(
      `*,
      service:services(*)`,
    )
    .eq('partner_id', partnerId)
    .order('created', { ascending: false })

  if (error) {
    console.error('Error fetching deployments by partner:', error)
    throw error
  }

  const rows = (data || []) as unknown as Array<DeploymentWithRelations & { plan_slug?: string | null }>
  return rows.map((r) => attachServicePlan(r))
}

export async function createDeployment(deployment: DeploymentInsert): Promise<Deployment | undefined> {
  const { data, error } = await supabaseFrom('deployments').insert([deployment]).select()

  if (error) {
    console.error('Error creating deployment:', error)
    throw error
  }

  return (data?.[0]) as unknown as Deployment | undefined
}

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
    | 'pending_deletion',
) {
  return updateDeployment(id, { status })
}

export async function deleteDeployment(id: number) {
  const { error } = await supabaseFrom('deployments').delete().eq('id', id)

  if (error) {
    console.error('Error deleting deployment:', error)
    throw error
  }
}

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

export async function hasPartnerSufficientCredits(
  partnerId: number,
  monthlyCreditConsumption: number,
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
 * Sum monthly credit consumption across a partner's running deployments.
 * Joins through services(plans) and resolves each deployment's plan by slug.
 */
export async function getPartnerTotalMonthlyConsumption(partnerId: number): Promise<number> {
  const { data, error } = await supabaseFrom('deployments')
    .select('plan_slug, service:services(plans)')
    .eq('partner_id', partnerId)
    .in('status', ['active', 'deploying', 'pending_deployment'])

  if (error) {
    console.error('Error calculating monthly consumption:', error)
    throw error
  }

  if (!data) return 0

  return (data as unknown as Array<{ plan_slug: string | null; service?: { plans?: unknown } | null }>).reduce(
    (total, dep) => {
      const plan = findServicePlan(dep.service ?? null, dep.plan_slug ?? '')
      return total + (plan?.monthlyCreditConsumption || 0)
    },
    0,
  )
}
