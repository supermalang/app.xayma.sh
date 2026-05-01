/**
 * Services service
 * CRUD on xayma_app.services. Plans live inline as services.plans (jsonb array),
 * keyed by `slug` within a service.
 */

import { supabase, supabaseFrom } from '@/services/supabase'

const SERVICE_LOGOS_BUCKET = 'service-logos'

export type Service = any
export type ServiceInsert = any
export type ServiceUpdate = any

export interface ServicePlan {
  slug: string
  label: string
  description: string | null
  monthlyCreditConsumption: number
  options: string[]
}

export type ServicePlanInput = Partial<ServicePlan> & { slug: string; label: string }

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

  if (isPubliclyAvailable !== undefined) {
    query = query.eq('isPubliclyAvailable', isPubliclyAvailable)
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

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

export async function getService(id: number) {
  const { data, error } = await supabaseFrom('services').select('*').eq('id', id).single()

  if (error) {
    console.error('Error fetching service:', error)
    throw error
  }

  return data
}

export async function createService(service: ServiceInsert) {
  const { data, error } = await supabaseFrom('services').insert([service]).select()

  if (error) {
    console.error('Error creating service:', error)
    throw error
  }

  return data?.[0]
}

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

export async function deleteService(id: number) {
  const { error } = await supabaseFrom('services').delete().eq('id', id)

  if (error) {
    console.error('Error deleting service:', error)
    throw error
  }
}

export async function toggleServicePublicAvailability(id: number, isPubliclyAvailable: boolean) {
  return updateService(id, { isPubliclyAvailable })
}

/**
 * Normalise a stored plan entry. Tolerant of nulls and missing keys so that
 * callers always get a stable `ServicePlan` shape.
 */
export function normalizeServicePlan(raw: unknown): ServicePlan | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.slug !== 'string' || !r.slug || typeof r.label !== 'string') return null
  const options = Array.isArray(r.options)
    ? r.options.filter((o): o is string => typeof o === 'string')
    : []
  return {
    slug: r.slug,
    label: r.label,
    description: typeof r.description === 'string' ? r.description : null,
    monthlyCreditConsumption: Number(r.monthlyCreditConsumption ?? 0) || 0,
    options,
  }
}

export function readServicePlans(service: { plans?: unknown } | null | undefined): ServicePlan[] {
  if (!service) return []
  const raw = (service as { plans?: unknown }).plans
  if (!Array.isArray(raw)) return []
  const out: ServicePlan[] = []
  for (const entry of raw) {
    const plan = normalizeServicePlan(entry)
    if (plan) out.push(plan)
  }
  return out
}

export function findServicePlan(
  service: { plans?: unknown } | null | undefined,
  slug: string,
): ServicePlan | null {
  if (!slug) return null
  return readServicePlans(service).find((p) => p.slug === slug) ?? null
}

/**
 * Get all plans for a service (reads them off services.plans).
 */
export async function getServicePlansByServiceId(serviceId: number): Promise<ServicePlan[]> {
  const { data, error } = await (supabaseFrom('services') as any)
    .select('plans')
    .eq('id', serviceId)
    .single()

  if (error) {
    console.error('Error fetching service plans:', error)
    throw error
  }

  return readServicePlans(data)
}

/**
 * Replace the whole plans array on a service. Use this when you've edited multiple
 * entries client-side and want to commit them atomically.
 */
export async function setServicePlans(
  serviceId: number,
  plans: ServicePlanInput[],
): Promise<ServicePlan[]> {
  const normalised = plans.map((p) => ({
    slug: p.slug,
    label: p.label,
    description: p.description ?? null,
    monthlyCreditConsumption: Number(p.monthlyCreditConsumption ?? 0) || 0,
    options: Array.isArray(p.options) ? p.options.filter((o): o is string => typeof o === 'string') : [],
  }))

  const slugs = new Set<string>()
  for (const p of normalised) {
    if (slugs.has(p.slug)) {
      throw new Error(`Duplicate plan slug: ${p.slug}`)
    }
    slugs.add(p.slug)
  }

  const { data, error } = await (supabaseFrom('services') as any)
    .update({ plans: normalised } as any)
    .eq('id', serviceId)
    .select('plans')
    .single()

  if (error) {
    console.error('Error updating service plans:', error)
    throw error
  }

  return readServicePlans(data)
}

/**
 * Append (or replace by slug) a single plan on a service.
 */
export async function upsertServicePlan(
  serviceId: number,
  plan: ServicePlanInput,
): Promise<ServicePlan[]> {
  const existing = await getServicePlansByServiceId(serviceId)
  const idx = existing.findIndex((p) => p.slug === plan.slug)
  const next: ServicePlanInput[] =
    idx === -1 ? [...existing, plan] : existing.map((p, i) => (i === idx ? { ...p, ...plan } : p))
  return setServicePlans(serviceId, next)
}

/**
 * Remove a plan by slug. Caller is responsible for confirming no deployments
 * still reference the slug — RLS doesn't enforce that with a JSONB array.
 */
export async function deleteServicePlanBySlug(serviceId: number, slug: string): Promise<ServicePlan[]> {
  const existing = await getServicePlansByServiceId(serviceId)
  const next = existing.filter((p) => p.slug !== slug)
  return setServicePlans(serviceId, next)
}

export async function uploadServiceLogo(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage
    .from(SERVICE_LOGOS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) {
    console.error('Error uploading service logo:', error)
    throw error
  }

  const { data } = supabase.storage.from(SERVICE_LOGOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
