/**
 * Partner mock factory for unit tests
 */

import type { Partner } from '@/types'

export interface MockPartnerOptions extends Partial<Partner> {
  // All Partner fields are optional to allow flexible overrides
}

/**
 * Create a mock partner with sensible defaults
 */
export function mockPartner(overrides?: MockPartnerOptions): Partner {
  const defaults: Partner = {
    id: 'partner-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Partner',
    slug: 'test-partner',
    type: 'CUSTOMER',
    status: 'ACTIVE',
    remainingCredits: 50000,
    totalCreditsEarned: 100000,
    phone: '+221701234567',
    email: 'partner@example.com',
    country: 'SN',
    city: 'Dakar',
    address: '123 Test Street',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return { ...defaults, ...overrides }
}

/**
 * Create multiple mock partners
 */
export function mockPartnerList(count: number, status: Partner['status'] = 'ACTIVE'): Partner[] {
  return Array.from({ length: count }, (_, i) =>
    mockPartner({
      id: `partner-${i}`,
      name: `Partner ${i}`,
      slug: `partner-${i}`,
      status,
      email: `partner${i}@example.com`,
    })
  )
}

/**
 * Create mock partners with various statuses
 */
export function mockPartnersByStatus() {
  return {
    active: mockPartner({ status: 'ACTIVE' }),
    suspended: mockPartner({ status: 'SUSPENDED' }),
    inactive: mockPartner({ status: 'INACTIVE' }),
  }
}

/**
 * Create mock partners with various types
 */
export function mockPartnersByType() {
  return {
    customer: mockPartner({ type: 'CUSTOMER' }),
    reseller: mockPartner({ type: 'RESELLER' }),
  }
}
