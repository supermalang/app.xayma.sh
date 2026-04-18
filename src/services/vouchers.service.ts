/**
 * Vouchers service
 * CRUD operations for xayma_app.vouchers table
 * Handles admin voucher creation, tracking, and redemption state
 */

import { supabaseFrom } from '@/services/supabase'

export interface Voucher {
  id: string
  code: string
  credits_value: number
  max_uses: number
  uses_count: number
  expiry_date: string
  status: 'ACTIVE' | 'INACTIVE' | 'FULLY_REDEEMED'
  partner_type?: 'CUSTOMER' | 'RESELLER'
  target_partner_id?: string
  created_at: string
  created_by: string
}

export interface ListVouchersFilter {
  status?: 'ACTIVE' | 'INACTIVE' | 'FULLY_REDEEMED'
  partnerType?: 'CUSTOMER' | 'RESELLER'
  search?: string
}

export interface ListVouchersOptions extends ListVouchersFilter {
  page?: number
  pageSize?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

/**
 * List all vouchers with optional filtering and pagination
 */
export async function listVouchers(options: ListVouchersOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    orderBy = 'created_at',
    orderDirection = 'desc',
    status,
    partnerType,
    search,
  } = options

  let query = supabaseFrom('vouchers').select('*', { count: 'exact' })

  // Apply filters
  if (status) {
    query = query.eq('status', status)
  }
  if (partnerType) {
    query = query.eq('partner_type', partnerType)
  }
  if (search) {
    // Search in code field
    query = query.ilike('code', `%${search}%`)
  }

  // Sorting
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error listing vouchers:', error)
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
 * Get a single voucher by ID
 */
export async function getVoucher(id: string) {
  const { data, error } = await supabaseFrom('vouchers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching voucher:', error)
    throw error
  }

  return data as Voucher
}

/**
 * Get voucher by code
 * Used for redemption lookup
 */
export async function getVoucherByCode(code: string) {
  const { data, error } = await supabaseFrom('vouchers')
    .select('*')
    .eq('code', code)
    .single()

  if (error) {
    console.error('Error fetching voucher by code:', error)
    throw error
  }

  return data as Voucher
}

/**
 * Create a new voucher
 * NOTE: This is typically called by n8n after code generation
 */
export async function createVoucher(voucher: Omit<Voucher, 'id' | 'created_at'>) {
  const { data, error } = await supabaseFrom('vouchers')
    .insert([voucher])
    .select()

  if (error) {
    console.error('Error creating voucher:', error)
    throw error
  }

  return data?.[0] as Voucher
}

/**
 * Bulk create vouchers
 * Used after code generation
 */
export async function createVouchersBulk(vouchers: Omit<Voucher, 'id' | 'created_at'>[]) {
  const { data, error } = await supabaseFrom('vouchers').insert(vouchers).select()

  if (error) {
    console.error('Error creating vouchers in bulk:', error)
    throw error
  }

  return data || []
}

/**
 * Update voucher status
 * Used when voucher is deactivated or fully redeemed
 */
export async function updateVoucherStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'FULLY_REDEEMED') {
  const { data, error } = await supabaseFrom('vouchers')
    .update({ status })
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating voucher status:', error)
    throw error
  }

  return data?.[0] as Voucher
}

/**
 * Increment voucher usage count
 * Called when voucher is successfully redeemed
 */
export async function incrementVoucherUsage(id: string) {
  const { data, error } = await supabaseFrom('vouchers')
    .update({ uses_count: supabaseFrom('vouchers').select('uses_count').eq('id', id) })
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error incrementing voucher usage:', error)
    throw error
  }

  return data?.[0] as Voucher
}

/**
 * Deactivate a voucher
 * Admin action to prevent further redemptions
 */
export async function deactivateVoucher(id: string) {
  return updateVoucherStatus(id, 'INACTIVE')
}

/**
 * Check if voucher can be redeemed
 * Validates: status, expiry date, usage limit, partner type
 */
export async function validateVoucher(
  code: string,
  partnerType?: 'CUSTOMER' | 'RESELLER'
): Promise<{ valid: boolean; reason?: string; voucher?: Voucher }> {
  try {
    const voucher = await getVoucherByCode(code)

    // Check status
    if (voucher.status === 'INACTIVE') {
      return { valid: false, reason: 'Voucher is inactive' }
    }

    if (voucher.status === 'FULLY_REDEEMED') {
      return { valid: false, reason: 'Voucher has been fully redeemed' }
    }

    // Check expiry
    const now = new Date()
    const expiry = new Date(voucher.expiry_date)
    if (now > expiry) {
      return { valid: false, reason: 'Voucher has expired' }
    }

    // Check usage limit
    if (voucher.uses_count >= voucher.max_uses) {
      return { valid: false, reason: 'Voucher usage limit reached' }
    }

    // Check partner type restriction
    if (voucher.partner_type && partnerType && voucher.partner_type !== partnerType) {
      return {
        valid: false,
        reason: `Voucher is restricted to ${voucher.partner_type} partners`,
      }
    }

    return { valid: true, voucher }
  } catch (err) {
    console.error('Error validating voucher:', err)
    return { valid: false, reason: 'Voucher not found' }
  }
}

/**
 * Check if partner has already redeemed a voucher
 * Prevents duplicate redemptions
 */
export async function hasPartnerRedeemedVoucher(voucherId: string, partnerId: string): Promise<boolean> {
  const { data, error } = await supabaseFrom('voucher_redemptions')
    .select('id')
    .eq('voucher_id', voucherId)
    .eq('partner_id', partnerId)
    .limit(1)

  if (error) {
    console.error('Error checking voucher redemption:', error)
    return false
  }

  return (data || []).length > 0
}

/**
 * Get voucher statistics for admin dashboard
 */
export async function getVoucherStats() {
  const { data: active } = await supabaseFrom('vouchers').select('id').eq('status', 'ACTIVE')

  const { data: inactive } = await supabaseFrom('vouchers').select('id').eq('status', 'INACTIVE')

  const { data: fullyRedeemed } = await supabaseFrom('vouchers')
    .select('id')
    .eq('status', 'FULLY_REDEEMED')

  const { data: totalValue } = await supabaseFrom('vouchers')
    .select('credits_value, uses_count')

  let totalCreditsDistributed = 0
  let totalCreditsRedeemed = 0

  if (totalValue) {
    totalCreditsDistributed = totalValue.reduce((sum, v) => sum + v.credits_value, 0)
    totalCreditsRedeemed = totalValue.reduce((sum, v) => sum + v.credits_value * v.uses_count, 0)
  }

  return {
    activeCount: active?.length || 0,
    inactiveCount: inactive?.length || 0,
    fullyRedeemedCount: fullyRedeemed?.length || 0,
    totalCreditsDistributed,
    totalCreditsRedeemed,
  }
}
