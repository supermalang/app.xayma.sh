/**
 * Deployment mock factory for unit tests
 */

import type { Deployment } from '@/types'

export interface MockDeploymentOptions extends Partial<Deployment> {
  // All Deployment fields are optional to allow flexible overrides
}

/**
 * Create a mock deployment with sensible defaults
 */
export function mockDeployment(overrides?: MockDeploymentOptions): Deployment {
  const defaults: Deployment = {
    id: 'deployment-' + Math.random().toString(36).substr(2, 9),
    partnerId: 'partner-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Deployment',
    status: 'ACTIVE',
    type: 'ODOO_COMMUNITY',
    domain: 'test.example.com',
    subdomain: 'test',
    nodeId: 'node-001',
    cpuCores: 4,
    ramGb: 8,
    storageGb: 100,
    monthlyCredits: 5000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return { ...defaults, ...overrides }
}

/**
 * Create multiple mock deployments
 */
export function mockDeploymentList(count: number, status: Deployment['status'] = 'ACTIVE'): Deployment[] {
  return Array.from({ length: count }, (_, i) =>
    mockDeployment({
      id: `deployment-${i}`,
      name: `Deployment ${i}`,
      status,
      domain: `test${i}.example.com`,
      subdomain: `test${i}`,
    })
  )
}

/**
 * Create mock deployments with various statuses
 */
export function mockDeploymentsByStatus() {
  return {
    active: mockDeployment({ status: 'ACTIVE' }),
    pending: mockDeployment({ status: 'PENDING' }),
    deploying: mockDeployment({ status: 'DEPLOYING' }),
    suspended: mockDeployment({ status: 'SUSPENDED' }),
    terminated: mockDeployment({ status: 'TERMINATED' }),
  }
}

/**
 * Create mock deployments with various types
 */
export function mockDeploymentsByType() {
  return {
    odoo: mockDeployment({ type: 'ODOO_COMMUNITY' }),
    custom: mockDeployment({ type: 'CUSTOM_DOCKER' }),
  }
}
