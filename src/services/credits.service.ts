/**
 * Credits service
 * CRUD operations for xayma_app.credit_transactions table
 * Handles transaction history, balance calculations, and discount tier selection
 */

import { supabaseFrom } from '@/services/supabase'
import type { CreditTransaction } from '@/types'

/**
 * Supabase types for credit_transactions table
 * These will be auto-generated once the table exists
 */
export interface CreditTransactionRow {
  id: string
  partner_id: string
  type: 'TOPUP' | 'DEBIT' | 'REFUND' | 'EXPIRY'
  amount: number
  payment_method?: string
  reason?: string
  reference?: string
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  created_at: string
  updated_at?: string
}

export interface ListTransactionsFilter {
  partnerId?: string
  type?: 'TOPUP' | 'DEBIT' | 'REFUND' | 'EXPIRY'
  status?: 'COMPLETED' | 'PENDING' | 'FAILED'
  startDate?: string
  endDate?: string
}

export interface ListTransactionsOptions extends ListTransactionsFilter {
  page?: number
  pageSize?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

/**
 * NOTE: Topup/debit/refund/expiry events are primarily published by workflow engine
 * The frontend should call workflow engine webhooks, not directly update credits
 */

/**
 * List credit transactions with filtering and pagination
 */
export async function listTransactions(options: ListTransactionsOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    orderBy = 'created_at',
    orderDirection = 'desc',
    partnerId,
    type,
    status,
    startDate,
    endDate,
  } = options

  let query = supabaseFrom('credit_transactions').select('*', { count: 'exact' })

  // Apply filters
  if (partnerId) {
    query = query.eq('partner_id', partnerId)
  }
  if (type) {
    query = query.eq('type', type)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  // Sorting
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error listing credit transactions:', error)
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
 * Get a single credit transaction by ID
 */
export async function getTransaction(id: string) {
  const { data, error } = await supabaseFrom('credit_transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching credit transaction:', error)
    throw error
  }

  return data as CreditTransactionRow
}

/**
 * Create a new credit transaction
 * NOTE: This is called primarily by workflow engine
 * The frontend should call workflow engine webhooks, not this directly
 */
export async function createTransaction(
  partnerId: string,
  type: 'TOPUP' | 'DEBIT' | 'REFUND' | 'EXPIRY',
  amount: number,
  options?: {
    paymentMethod?: string
    reason?: string
    reference?: string
    status?: 'COMPLETED' | 'PENDING' | 'FAILED'
  }
) {
  const { data, error } = await supabaseFrom('credit_transactions')
    .insert([
      {
        partner_id: partnerId,
        type,
        amount,
        payment_method: options?.paymentMethod,
        reason: options?.reason,
        reference: options?.reference,
        status: options?.status || 'PENDING',
      },
    ])
    .select()

  if (error) {
    console.error('Error creating credit transaction:', error)
    throw error
  }

  return data?.[0] as CreditTransactionRow
}

/**
 * Update transaction status
 * Used for marking transactions as COMPLETED after IPN confirmation
 * IPN idempotency: prevents changing COMPLETED transactions to FAILED
 */
export async function updateTransactionStatus(
  id: string,
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
) {
  // Fetch current status before updating
  const { data: current, error: fetchError } = await supabaseFrom('credit_transactions')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching credit transaction status:', fetchError)
    throw fetchError
  }

  // Prevent transitioning from COMPLETED to FAILED (IPN idempotency)
  if (current?.status === 'COMPLETED' && status !== 'COMPLETED') {
    throw new Error('Transaction already completed')
  }

  const { data, error } = await supabaseFrom('credit_transactions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating credit transaction status:', error)
    throw error
  }

  return data?.[0] as CreditTransactionRow
}

/**
 * Calculate current balance for a partner
 * Balance = sum of all COMPLETED TOPUP/REFUND - sum of all COMPLETED DEBIT/EXPIRY
 */
export async function calculateBalance(partnerId: string): Promise<number> {
  const { data, error } = await supabaseFrom('credit_transactions')
    .select('type, amount')
    .eq('partner_id', partnerId)
    .eq('status', 'COMPLETED')

  if (error) {
    console.error('Error calculating balance:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return 0
  }

  let balance = 0
  for (const transaction of data) {
    if (transaction.type === 'TOPUP' || transaction.type === 'REFUND') {
      balance += transaction.amount
    } else if (transaction.type === 'DEBIT' || transaction.type === 'EXPIRY') {
      balance -= transaction.amount
    }
  }

  return Math.max(0, balance)
}

/**
 * Get total credits earned by a partner (sum of all completed TOPUPs and REFUNDs)
 */
export async function getTotalCreditsEarned(partnerId: string): Promise<number> {
  const { data, error } = await supabaseFrom('credit_transactions')
    .select('amount')
    .eq('partner_id', partnerId)
    .eq('status', 'COMPLETED')
    .in('type', ['TOPUP', 'REFUND'])

  if (error) {
    console.error('Error calculating total credits earned:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return 0
  }

  return data.reduce((sum, txn) => sum + txn.amount, 0)
}

/**
 * Discount tier selection based on partner type and instance count
 * Returns the applicable discount percentage
 */
export interface DiscountTier {
  thresholdType: 'INSTANCE_COUNT' | 'MONTHLY_VOLUME'
  thresholdValue: number
  discountPercent: number
  maxCreditDebtAllowed: number
}

export async function getApplicableDiscount(
  partnerType: 'CUSTOMER' | 'RESELLER',
  instanceCount: number
): Promise<DiscountTier | null> {
  const { data, error } = await supabaseFrom('partner_credit_purchase_options')
    .select('*')
    .eq('partner_type', partnerType)
    .order('threshold_value', { ascending: false })

  if (error) {
    console.error('Error fetching discount tiers:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return null
  }

  // Find the highest threshold that the instance count meets or exceeds
  const applicableTier = data.find((tier: any) => instanceCount >= tier.threshold_value)

  if (!applicableTier) {
    return null
  }

  return {
    thresholdType: applicableTier.threshold_type || 'INSTANCE_COUNT',
    thresholdValue: applicableTier.threshold_value,
    discountPercent: applicableTier.threshold_discount_percent || 0,
    maxCreditDebtAllowed: applicableTier.max_credit_debt_allowed || 0,
  }
}

/**
 * Calculate discounted price for a credit bundle
 */
export function calculateDiscountedPrice(
  basePrice: number,
  discountPercent: number
): { discountedPrice: number; savings: number } {
  const savings = basePrice * (discountPercent / 100)
  const discountedPrice = basePrice - savings

  return {
    discountedPrice: Math.round(discountedPrice),
    savings: Math.round(savings),
  }
}

// ─── Credit Purchase Options (volume discount tiers) ─────────────────────────

export interface PurchaseOptionRow {
  id: number
  partner_type: 'CUSTOMER' | 'RESELLER'
  threshold_type: 'INSTANCE_COUNT' | 'MONTHLY_VOLUME'
  threshold_value: number
  threshold_discount_percent: number
  max_credit_debt_allowed: number
  created?: string
}

export async function listPurchaseOptions(): Promise<PurchaseOptionRow[]> {
  const { data, error } = await supabaseFrom('partner_credit_purchase_options')
    .select('*')
    .order('partner_type', { ascending: true })
    .order('threshold_value', { ascending: true })

  if (error) throw error
  return (data || []) as PurchaseOptionRow[]
}

export async function createPurchaseOption(
  payload: Omit<PurchaseOptionRow, 'id' | 'created'>
): Promise<PurchaseOptionRow> {
  const { data, error } = await supabaseFrom('partner_credit_purchase_options')
    .insert([payload])
    .select()
    .single()

  if (error) throw error
  return data as PurchaseOptionRow
}

export async function updatePurchaseOption(
  id: number,
  payload: Partial<Omit<PurchaseOptionRow, 'id' | 'created'>>
): Promise<PurchaseOptionRow> {
  const { data, error } = await supabaseFrom('partner_credit_purchase_options')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as PurchaseOptionRow
}

export async function deletePurchaseOption(id: number): Promise<void> {
  const { error } = await supabaseFrom('partner_credit_purchase_options')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── Date range transactions ──────────────────────────────────────────────────

/**
 * Get credit transactions for a date range (used for credit history page)
 */
export async function getTransactionsByDateRange(
  partnerId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabaseFrom('credit_transactions')
    .select('*')
    .eq('partner_id', partnerId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .eq('status', 'COMPLETED')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching transactions by date range:', error)
    throw error
  }

  return data || []
}
