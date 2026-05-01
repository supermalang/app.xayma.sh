import { supabaseFrom } from '@/services/supabase'

// Frontend model — field names differ from DB (credits_value vs credits, etc.)
export interface Voucher {
  id: number
  code: string
  credits_value: number
  max_uses: number
  uses_count: number
  expiry_date: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'FULLY_REDEEMED'
  partner_type?: 'CUSTOMER' | 'RESELLER'
  target_partner_id?: number
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

export async function listVouchers(options: ListVouchersOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    orderDirection = 'desc',
    status,
    partnerType,
    search,
  } = options

  let query = supabaseFrom('vouchers').select('*', { count: 'exact' })

  if (status) {
    query = query.eq('status', status.toLowerCase() as unknown as 'active')
  }
  if (partnerType) {
    query = query.contains('partner_type', [partnerType.toLowerCase()] as unknown as ('customer')[])
  }
  if (search) {
    query = query.ilike('code', `%${search}%`)
  }

  query = query.order('created', { ascending: orderDirection === 'asc' })

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error listing vouchers:', error)
    throw error
  }

  return {
    data: (data || []) as unknown as Voucher[],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}

export async function getVoucher(id: number) {
  const { data, error } = await supabaseFrom('vouchers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching voucher:', error)
    throw error
  }

  return data as unknown as Voucher
}

export async function getVoucherByCode(code: string) {
  const { data, error } = await supabaseFrom('vouchers')
    .select('*')
    .eq('code', code)
    .single()

  if (error) {
    console.error('Error fetching voucher by code:', error)
    throw error
  }

  return data as unknown as Voucher
}

export async function createVoucher(voucher: Omit<Voucher, 'id'>) {
  const { data, error } = await supabaseFrom('vouchers')
     
    .insert([voucher as any])
    .select()

  if (error) {
    console.error('Error creating voucher:', error)
    throw error
  }

  return data?.[0] as unknown as Voucher
}

export async function createVouchersBulk(vouchers: Omit<Voucher, 'id'>[]) {
  const { data, error } = await supabaseFrom('vouchers')
     
    .insert(vouchers as any)
    .select()

  if (error) {
    console.error('Error creating vouchers in bulk:', error)
    throw error
  }

  return (data || []) as unknown as Voucher[]
}

export async function updateVoucherStatus(id: number, status: 'ACTIVE' | 'INACTIVE' | 'FULLY_REDEEMED') {
  const { data, error } = await supabaseFrom('vouchers')
    .update({ status: status.toLowerCase() as unknown as 'active' })
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating voucher status:', error)
    throw error
  }

  return data?.[0] as unknown as Voucher
}

export async function incrementVoucherUsage(id: number) {
  const { data: current, error: fetchError } = await supabaseFrom('vouchers')
    .select('uses_count')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching voucher usage count:', fetchError)
    throw fetchError
  }

  const { data, error } = await supabaseFrom('vouchers')
    .update({ uses_count: (current?.uses_count ?? 0) + 1 })
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error incrementing voucher usage:', error)
    throw error
  }

  return data?.[0] as unknown as Voucher
}

export async function deactivateVoucher(id: number) {
  return updateVoucherStatus(id, 'INACTIVE')
}

export async function validateVoucher(
  code: string,
  partnerType?: 'CUSTOMER' | 'RESELLER'
): Promise<{ valid: boolean; reason?: string; voucher?: Voucher }> {
  try {
    const voucher = await getVoucherByCode(code)

    if (voucher.status === 'INACTIVE') return { valid: false, reason: 'Voucher is inactive' }
    if (voucher.status === 'FULLY_REDEEMED') return { valid: false, reason: 'Voucher has been fully redeemed' }

    if (voucher.expiry_date) {
      const now = new Date()
      const expiry = new Date(voucher.expiry_date)
      if (now > expiry) return { valid: false, reason: 'Voucher has expired' }
    }

    if (voucher.uses_count >= voucher.max_uses) return { valid: false, reason: 'Voucher usage limit reached' }

    if (voucher.partner_type && partnerType && voucher.partner_type !== partnerType) {
      return { valid: false, reason: `Voucher is restricted to ${voucher.partner_type} partners` }
    }

    return { valid: true, voucher }
  } catch (err) {
    console.error('Error validating voucher:', err)
    return { valid: false, reason: 'Voucher not found' }
  }
}

export async function hasPartnerRedeemedVoucher(voucherId: number, partnerId: number): Promise<boolean> {
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

export async function getVoucherStats() {
  const { data: active } = await supabaseFrom('vouchers').select('id').eq('status', 'active' as unknown as 'active')
  const { data: inactive } = await supabaseFrom('vouchers').select('id').eq('status', 'inactive' as unknown as 'active')
  const { data: fullyRedeemed } = await supabaseFrom('vouchers').select('id').eq('status', 'fully_redeemed' as unknown as 'active')
  const { data: totalValue } = await supabaseFrom('vouchers').select('credits, uses_count')

  let totalCreditsDistributed = 0
  let totalCreditsRedeemed = 0

  if (totalValue) {
    totalCreditsDistributed = totalValue.reduce((sum, v) => sum + v.credits, 0)
    totalCreditsRedeemed = totalValue.reduce((sum, v) => sum + v.credits * v.uses_count, 0)
  }

  return {
    activeCount: active?.length || 0,
    inactiveCount: inactive?.length || 0,
    fullyRedeemedCount: fullyRedeemed?.length || 0,
    totalCreditsDistributed,
    totalCreditsRedeemed,
  }
}
