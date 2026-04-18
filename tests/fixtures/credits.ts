/**
 * Credit transaction and balance mock factories for unit tests
 */

import type { CreditTransaction, CreditBundle } from '@/types'

export interface MockTransactionOptions extends Partial<CreditTransaction> {
  // All CreditTransaction fields are optional
}

export interface MockBundleOptions extends Partial<CreditBundle> {
  // All CreditBundle fields are optional
}

/**
 * Create a mock credit transaction
 */
export function mockTransaction(overrides?: MockTransactionOptions): CreditTransaction {
  const defaults: CreditTransaction = {
    id: 'transaction-' + Math.random().toString(36).substr(2, 9),
    partnerId: 'partner-' + Math.random().toString(36).substr(2, 9),
    type: 'TOPUP',
    amount: 10000,
    reason: 'Manual topup',
    reference: 'ref-' + Math.random().toString(36).substr(2, 9),
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  }

  return { ...defaults, ...overrides }
}

/**
 * Create multiple mock transactions
 */
export function mockTransactionList(count: number, type: CreditTransaction['type'] = 'TOPUP'): CreditTransaction[] {
  return Array.from({ length: count }, (_, i) =>
    mockTransaction({
      id: `transaction-${i}`,
      type,
      amount: 1000 * (i + 1),
      reference: `ref-${i}`,
    })
  )
}

/**
 * Create mock transactions with various types
 */
export function mockTransactionsByType() {
  return {
    topup: mockTransaction({ type: 'TOPUP' }),
    debit: mockTransaction({ type: 'DEBIT', amount: -5000 }),
    refund: mockTransaction({ type: 'REFUND', amount: 2000 }),
    expiry: mockTransaction({ type: 'EXPIRY', amount: -3000 }),
  }
}

/**
 * Create a mock credit bundle
 */
export function mockBundle(overrides?: MockBundleOptions): CreditBundle {
  const defaults: CreditBundle = {
    id: 'bundle-' + Math.random().toString(36).substr(2, 9),
    creditsAmount: 50000,
    priceXOF: 25000,
    priceUSD: 42,
    discountPercent: 0,
    validityDays: 365,
    status: 'ACTIVE',
  }

  return { ...defaults, ...overrides }
}

/**
 * Create multiple mock credit bundles (common tier offerings)
 */
export function mockBundleList(): CreditBundle[] {
  return [
    mockBundle({
      id: 'bundle-1',
      creditsAmount: 10000,
      priceXOF: 5000,
      priceUSD: 8.4,
      description: 'Starter',
    }),
    mockBundle({
      id: 'bundle-2',
      creditsAmount: 50000,
      priceXOF: 22500,
      priceUSD: 37.8,
      discountPercent: 10,
      description: 'Professional',
    }),
    mockBundle({
      id: 'bundle-3',
      creditsAmount: 100000,
      priceXOF: 40000,
      priceUSD: 67.2,
      discountPercent: 20,
      description: 'Enterprise',
    }),
  ]
}

/**
 * Mock credit balance state (for store tests)
 */
export interface MockCreditBalance {
  partnerId: string
  remainingCredits: number
  totalEarned: number
  lastTopupDate: string
  nextExpiryDate?: string
}

/**
 * Create mock credit balance
 */
export function mockCreditBalance(overrides?: Partial<MockCreditBalance>): MockCreditBalance {
  const defaults: MockCreditBalance = {
    partnerId: 'partner-' + Math.random().toString(36).substr(2, 9),
    remainingCredits: 50000,
    totalEarned: 100000,
    lastTopupDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    nextExpiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
  }

  return { ...defaults, ...overrides }
}
