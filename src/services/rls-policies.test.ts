/**
 * RLS policy unit tests
 *
 * Verifies that the service layer behaves correctly when Supabase RLS
 * returns filtered results for non-admin users.
 *
 * RLS is enforced at the database layer — these tests mock Supabase to
 * simulate the data each role would actually receive after RLS filtering,
 * confirming the frontend never adds its own role-based WHERE clauses and
 * correctly handles an empty dataset for out-of-scope records.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as supabaseService from '@/services/supabase'
import {
  listPartners,
  getPartner,
} from '@/services/partners.service'

vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSelectChain(resolvedValue: object) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'ilike', 'or', 'order', 'range']
  for (const m of methods) {
    chain[m] = vi.fn(() => chain)
  }
  // Terminal call returns the resolved value
  chain['range'] = vi.fn(() => Promise.resolve(resolvedValue))
  chain['select'] = vi.fn(() => chain)
  return chain
}

function buildSingleChain(resolvedValue: object) {
  const chain: Record<string, unknown> = {}
  chain['select'] = vi.fn(() => chain)
  chain['eq'] = vi.fn(() => chain)
  chain['single'] = vi.fn(() => Promise.resolve(resolvedValue))
  return chain
}

// ─── partners RLS ─────────────────────────────────────────────────────────────

describe('RLS — partners table', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ADMIN receives all partner records (RLS returns full dataset)', async () => {
    const adminPartners = [
      { id: 1, name: 'Alpha Corp', partner_type: 'customer', status: 'active' },
      { id: 2, name: 'Beta Ltd', partner_type: 'reseller', status: 'active' },
      { id: 3, name: 'Gamma Inc', partner_type: 'customer', status: 'suspended' },
    ]

    const chain = buildSelectChain({ data: adminPartners, error: null, count: 3 })
    ;(supabaseService.supabaseFrom as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    const result = await listPartners()

    expect(result.data).toHaveLength(3)
    expect(result.count).toBe(3)
    // Service must NOT add manual company_id filtering — RLS handles that
    expect(chain['eq']).not.toHaveBeenCalledWith('company_id', expect.anything())
  })

  it('CUSTOMER receives only their own partner record (RLS returns single row)', async () => {
    // Supabase RLS silently filters — the frontend gets only the matching row
    const customerPartners = [
      { id: 5, name: 'My Company', partner_type: 'customer', status: 'active' },
    ]

    const chain = buildSelectChain({ data: customerPartners, error: null, count: 1 })
    ;(supabaseService.supabaseFrom as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    const result = await listPartners()

    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe(5)
    // Frontend must not add extra where clause — RLS did the filtering
    expect(chain['eq']).not.toHaveBeenCalledWith('company_id', expect.anything())
  })

  it('CUSTOMER cannot access another partner record (RLS returns empty)', async () => {
    // RLS returns empty when the user's company_id does not match
    const chain = buildSelectChain({ data: [], error: null, count: 0 })
    ;(supabaseService.supabaseFrom as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    const result = await listPartners()

    expect(result.data).toHaveLength(0)
    expect(result.count).toBe(0)
  })

  it('getPartner returns empty when RLS blocks access (returns null from single)', async () => {
    // Supabase single() returns an error when RLS finds no row
    const chain = buildSingleChain({
      data: null,
      error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
    })
    ;(supabaseService.supabaseFrom as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    await expect(getPartner(999)).rejects.toMatchObject({ code: 'PGRST116' })
  })
})

// ─── users RLS ────────────────────────────────────────────────────────────────

import {
  listUsers,
  getUser,
} from '@/services/users.service'

describe('RLS — users table', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ADMIN receives all user records (RLS returns full dataset)', async () => {
    const allUsers = [
      { id: 'uuid-1', firstname: 'Alice', user_role: 'ADMIN', company_id: 1 },
      { id: 'uuid-2', firstname: 'Bob', user_role: 'CUSTOMER', company_id: 5 },
      { id: 'uuid-3', firstname: 'Carol', user_role: 'RESELLER', company_id: 7 },
    ]

    const chain = buildSelectChain({ data: allUsers, error: null, count: 3 })
    ;(supabaseService.supabaseFrom as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    const result = await listUsers()

    expect(result.data).toHaveLength(3)
    // Service must not add manual company_id filtering
    expect(chain['eq']).not.toHaveBeenCalledWith('company_id', expect.anything())
  })

  it('CUSTOMER sees only users in their company (RLS returns scoped set)', async () => {
    const companyUsers = [
      { id: 'uuid-2', firstname: 'Bob', user_role: 'CUSTOMER', company_id: 5 },
    ]

    const chain = buildSelectChain({ data: companyUsers, error: null, count: 1 })
    ;(supabaseService.supabaseFrom as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    const result = await listUsers()

    expect(result.data).toHaveLength(1)
    expect(result.data[0].company_id).toBe(5)
  })

  it('CUSTOMER cannot access a user outside their company (RLS returns empty)', async () => {
    const chain = buildSelectChain({ data: [], error: null, count: 0 })
    ;(supabaseService.supabaseFrom as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    const result = await listUsers()

    expect(result.data).toHaveLength(0)
  })

  it('getUser throws when RLS blocks access to another user', async () => {
    const chain = buildSingleChain({
      data: null,
      error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
    })
    ;(supabaseService.supabaseFrom as ReturnType<typeof vi.fn>).mockReturnValue(chain)

    await expect(getUser('other-user-uuid')).rejects.toMatchObject({ code: 'PGRST116' })
  })
})
