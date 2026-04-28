/**
 * Domain types for Xayma.sh
 * Auto-generated Supabase types are in ./supabase.ts
 */

// User Roles
export type UserRole = 'ADMIN' | 'CUSTOMER' | 'RESELLER' | 'SALES'

// Partner types
export interface Partner {
  id: string
  name: string
  slug: string
  type: 'CUSTOMER' | 'RESELLER'
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  remainingCredits: number
  totalCreditsEarned: number
  phone: string
  email: string
  country: string
  city: string
  address: string
  companyRegistration?: string
  taxId?: string
  bankAccount?: string
  bankCode?: string
  createdAt: string
  updatedAt: string
}

// Credit transaction types
export interface CreditTransaction {
  id: string
  partnerId: string
  type: 'TOPUP' | 'DEBIT' | 'REFUND' | 'EXPIRY'
  amount: number
  reason?: string
  reference?: string
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  createdAt: string
}

// Credit bundle types
export interface CreditBundle {
  id: string
  creditsAmount: number
  priceXOF: number
  priceUSD: number
  discountPercent: number
  validityDays: number
  description?: string
  status: 'ACTIVE' | 'INACTIVE'
}

// Notification types
export interface Notification {
  id: string
  userId: string
  type: 'DEPLOYMENT_STATUS' | 'CREDIT_LOW' | 'CREDIT_TOPUP' | 'MAINTENANCE' | 'SYSTEM'
  title: string
  message: string
  relatedEntityId?: string
  relatedEntityType?: string
  read: boolean
  createdAt: string
}

// Settings types
export interface Settings {
  key: string
  value: string
  description?: string
  updatedAt: string
}

// Payment gateway types (frontend-only shell — not yet persisted)
export type PaymentGatewayProvider = 'wave' | 'orange_money' | 'paytech'
export type PaymentGatewayMode = 'sandbox' | 'live'

export interface PaymentGateway {
  id: string
  provider: PaymentGatewayProvider
  mode: PaymentGatewayMode
  apiKey: string
  secretKey: string
  publicKey?: string
  webhookSecret?: string
  merchantId?: string
  ipnUrl: string
  successUrl: string
  cancelUrl: string
  errorUrl?: string
  baseUrl?: string
  currency: string
}

// Audit log types
export interface AuditLog {
  id: string
  schema: string
  table: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  changedFields?: Record<string, { old: unknown; new: unknown }>
  userId?: string
  createdAt: string
}
