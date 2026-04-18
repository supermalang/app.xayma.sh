/**
 * User mock factory for unit tests
 * All unit tests use these factories — never real Supabase queries
 */

import type { UserRole } from '@/types'

export interface MockUserOptions {
  id?: string
  email?: string
  role?: UserRole
  firstName?: string
  lastName?: string
  companyId?: string
  active?: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * Create a mock user with sensible defaults
 * Override any property by passing options
 */
export function mockUser(overrides?: MockUserOptions) {
  const defaults = {
    id: 'user-' + Math.random().toString(36).substr(2, 9),
    email: 'test@example.com',
    role: 'CUSTOMER' as UserRole,
    firstName: 'Test',
    lastName: 'User',
    companyId: 'company-' + Math.random().toString(36).substr(2, 9),
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return { ...defaults, ...overrides }
}

/**
 * Create multiple mock users of same role
 */
export function mockUserList(count: number, role: UserRole = 'CUSTOMER') {
  return Array.from({ length: count }, (_, i) =>
    mockUser({
      email: `user${i}@example.com`,
      role,
    })
  )
}

/**
 * Create mock users for each role (for comprehensive testing)
 */
export function mockUsersByRole() {
  return {
    admin: mockUser({ email: 'admin@example.com', role: 'ADMIN' }),
    customer: mockUser({ email: 'customer@example.com', role: 'CUSTOMER' }),
    reseller: mockUser({ email: 'reseller@example.com', role: 'RESELLER' }),
    sales: mockUser({ email: 'sales@example.com', role: 'SALES' }),
  }
}
