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

// Deployment types
export interface Deployment {
  id: string
  partnerId: string
  name: string
  status: 'ACTIVE' | 'PENDING' | 'DEPLOYING' | 'SUSPENDED' | 'TERMINATED'
  type: 'ODOO_COMMUNITY' | 'CUSTOM_DOCKER'
  domain: string
  subdomain: string
  nodeId?: string
  cpuCores?: number
  ramGb?: number
  storageGb?: number
  monthlyCredits: number
  createdAt: string
  expiresAt?: string
  terminatedAt?: string
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
