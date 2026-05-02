import { supabaseFrom } from '@/services/supabase'

// Frontend model for credit transactions — DB columns are in `xayma_app.credit_transactions`
// (transactionType/creditsPurchased/creditsUsed/creditsRemaining/paymentMethod/created).
// `normalizeTransaction` maps them onto this UI-friendly shape.
export interface CreditTransactionRow {
  id: number
  partner_id: number
  type: 'TOPUP' | 'DEBIT' | 'REFUND' | 'EXPIRY'
  amount: number
  balanceAfter: number | null
  payment_method?: string
  reason?: string
  reference?: string
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  created_at: string
}

interface DbCreditTransactionRow {
  id: number
  partner_id: number
  transactionType: 'credit' | 'debit' | null
  creditsPurchased: number | null
  creditsUsed: number | null
  creditsRemaining: number | null
  amountPaid: number | null
  paymentMethod: string | null
  status: 'pending' | 'completed' | 'failed' | null
  created: string
}

function normalizeTransaction(row: DbCreditTransactionRow): CreditTransactionRow {
  const type: CreditTransactionRow['type'] = row.transactionType === 'credit' ? 'TOPUP' : 'DEBIT'
  const amount = type === 'TOPUP' ? (row.creditsPurchased ?? 0) : (row.creditsUsed ?? 0)
  const status = (row.status ?? 'completed').toUpperCase() as CreditTransactionRow['status']
  return {
    id: row.id,
    partner_id: row.partner_id,
    type,
    amount,
    balanceAfter: row.creditsRemaining,
    payment_method: row.paymentMethod ?? undefined,
    status,
    created_at: row.created,
  }
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

export async function listTransactions(options: ListTransactionsOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    orderDirection = 'desc',
    partnerId,
  } = options

  let query = supabaseFrom('credit_transactions').select('*', { count: 'exact' })

  if (partnerId) {
    query = query.eq('partner_id', parseInt(partnerId))
  }

  query = query.order('created', { ascending: orderDirection === 'asc' })

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error listing credit transactions:', error)
    throw error
  }

  return {
    data: ((data ?? []) as unknown as DbCreditTransactionRow[]).map(normalizeTransaction),
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}

export async function getTransaction(id: number) {
  const { data, error } = await supabaseFrom('credit_transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching credit transaction:', error)
    throw error
  }

  return normalizeTransaction(data as unknown as DbCreditTransactionRow)
}

export async function calculateBalance(partnerId: number): Promise<number> {
  const { data, error } = await supabaseFrom('credit_transactions')
    .select('creditsUsed, creditsPurchased')
    .eq('partner_id', partnerId)
    .eq('status', 'completed' as unknown as 'pending')

  if (error) {
    console.error('Error calculating balance:', error)
    throw error
  }

  if (!data || data.length === 0) return 0

  let balance = 0
  for (const row of data) {
    balance += row.creditsPurchased ?? 0
    balance -= row.creditsUsed ?? 0
  }
  return Math.max(0, balance)
}

export async function getTotalCreditsEarned(partnerId: number): Promise<number> {
  const { data, error } = await supabaseFrom('credit_transactions')
    .select('creditsPurchased')
    .eq('partner_id', partnerId)
    .eq('status', 'completed' as unknown as 'pending')

  if (error) {
    console.error('Error calculating total credits earned:', error)
    throw error
  }

  if (!data || data.length === 0) return 0

  return data.reduce((sum, row) => sum + (row.creditsPurchased ?? 0), 0)
}

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
    .eq('partner_type', partnerType.toLowerCase() as unknown as 'customer')
    .order('threshold_value', { ascending: false })

  if (error) {
    console.error('Error fetching discount tiers:', error)
    throw error
  }

  if (!data || data.length === 0) return null

  const applicableTier = data.find((tier) => instanceCount >= (tier.threshold_value ?? 0))
  if (!applicableTier) return null

  return {
    thresholdType: (applicableTier.threshold_type as unknown as string || 'INSTANCE_COUNT') as 'INSTANCE_COUNT' | 'MONTHLY_VOLUME',
    thresholdValue: applicableTier.threshold_value ?? 0,
    discountPercent: applicableTier.threshold_discount_percent ?? 0,
    maxCreditDebtAllowed: applicableTier.max_credit_debt_allowed ?? 0,
  }
}

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

export interface PurchaseOptionRow {
  id: number
  partner_type: 'CUSTOMER' | 'RESELLER'
  threshold_type: 'INSTANCE_COUNT' | 'MONTHLY_VOLUME'
  threshold_value: number
  threshold_discount_percent: number
  max_credit_debt_allowed: number
  created?: string | null
}

export async function listPurchaseOptions(): Promise<PurchaseOptionRow[]> {
  const { data, error } = await supabaseFrom('partner_credit_purchase_options')
    .select('*')
    .order('partner_type', { ascending: true })
    .order('threshold_value', { ascending: true })

  if (error) throw error
  return (data || []) as unknown as PurchaseOptionRow[]
}

export async function createPurchaseOption(
  payload: Omit<PurchaseOptionRow, 'id' | 'created'>
): Promise<PurchaseOptionRow> {
  const { data, error } = await supabaseFrom('partner_credit_purchase_options')
     
    .insert([payload as any])
    .select()
    .single()

  if (error) throw error
  return data as unknown as PurchaseOptionRow
}

export async function updatePurchaseOption(
  id: number,
  payload: Partial<Omit<PurchaseOptionRow, 'id' | 'created'>>
): Promise<PurchaseOptionRow> {
  const { data, error } = await supabaseFrom('partner_credit_purchase_options')
     
    .update(payload as any)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as PurchaseOptionRow
}

export async function deletePurchaseOption(id: number): Promise<void> {
  const { error } = await supabaseFrom('partner_credit_purchase_options')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getTransactionsByDateRange(
  partnerId: number,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabaseFrom('credit_transactions')
    .select('*')
    .eq('partner_id', partnerId)
    .gte('created', startDate)
    .lte('created', endDate)
    .eq('status', 'completed' as unknown as 'pending')
    .order('created', { ascending: false })

  if (error) {
    console.error('Error fetching transactions by date range:', error)
    throw error
  }

  return (data || []) as unknown as CreditTransactionRow[]
}
