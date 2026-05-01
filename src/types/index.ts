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

// Credit bundle types — admin-configured, stored as JSON in xayma_app.settings (CREDIT_BUNDLES)
export interface CreditBundle {
  id: string
  label: string
  creditsAmount: number
  priceXOF: number
  discountPercent: number
  validityDays: number
}

// Bundle line items — global fees (VAT, processing fee, etc.) applied to every bundle.
// Stored as JSON in xayma_app.settings (BUNDLE_LINE_ITEMS).
export type BundleLineItemType = 'PERCENT' | 'FIXED'

// ADDITIONAL: added on top of the bundle price.
// INCLUDED:   already included in the bundle price, shown for transparency only.
export type BundleLineItemMode = 'ADDITIONAL' | 'INCLUDED'

export interface BundleLineItem {
  id: string
  title: string
  type: BundleLineItemType
  amount: number
  mode: BundleLineItemMode
  displayOrder?: number
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
  displayName?: string
  logoUrl?: string
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
