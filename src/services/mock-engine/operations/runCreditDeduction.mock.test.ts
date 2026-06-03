import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services.service', () => ({
  findServicePlan: vi.fn(),
}))

import { runCreditDeductionMock } from './runCreditDeduction.mock'
import { findServicePlan } from '../../services.service'

beforeEach(() => vi.clearAllMocks())

function buildFrom(opts: {
  deployments?: Array<{ id: number; partner_id: number; plan_slug: string; status: string; service: unknown }>
  partners?: Array<{ id: number; remainingCredits: number; allowCreditDebt?: boolean | null; creditDebtThreshold?: number | null }>
  spies?: {
    partnerUpdate?: ReturnType<typeof vi.fn>
    txnInsert?: ReturnType<typeof vi.fn>
    depUpdate?: ReturnType<typeof vi.fn>
    notifInsert?: ReturnType<typeof vi.fn>
  }
}) {
  const spies = opts.spies ?? {}
  return vi.fn((table: string) => {
    if (table === 'xayma_app.deployments') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: opts.deployments ?? [], error: null }),
        }),
        update: spies.depUpdate ?? vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }
    }
    if (table === 'xayma_app.partners') {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: opts.partners ?? [], error: null }),
        }),
        update: spies.partnerUpdate ?? vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }
    }
    if (table === 'xayma_app.credit_transactions') {
      return { insert: spies.txnInsert ?? vi.fn().mockResolvedValue({ error: null }) }
    }
    if (table === 'xayma_app.notifications') {
      return { insert: spies.notifInsert ?? vi.fn().mockResolvedValue({ error: null }) }
    }
    return {}
  })
}

describe('runCreditDeduction mock', () => {
  it('debits one credit per active deployment when plan is 2880/month', async () => {
    vi.mocked(findServicePlan).mockReturnValue({ slug: 's', monthlyCreditConsumption: 2880 } as never)
    const partnerUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const txnInsert = vi.fn().mockResolvedValue({ error: null })
    const from = buildFrom({
      deployments: [{ id: 1, partner_id: 42, plan_slug: 's', status: 'active', service: { plans: [] } }],
      partners: [{ id: 42, remainingCredits: 100 }],
      spies: { partnerUpdate, txnInsert },
    })

    const summary = await runCreditDeductionMock({
      supabase: { from } as never,
      authUserId: 'admin',
      partnerId: null,
    })

    // 2880 / (30*24*4) = 1 credit / 15min
    expect(summary.deploymentsProcessed).toBe(1)
    expect(summary.totalDebited).toBe(1)
    expect(summary.suspended).toEqual([])
    expect(txnInsert).toHaveBeenCalled()
    expect(partnerUpdate).toHaveBeenCalledWith({ remainingCredits: 99 })
  })

  it('suspends deployment and notifies when partner balance drops to ≤ 0', async () => {
    vi.mocked(findServicePlan).mockReturnValue({ slug: 's', monthlyCreditConsumption: 2880 } as never)
    const depUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const notifInsert = vi.fn().mockResolvedValue({ error: null })
    const from = buildFrom({
      deployments: [{ id: 1, partner_id: 42, plan_slug: 's', status: 'active', service: { plans: [] } }],
      partners: [{ id: 42, remainingCredits: 0 }],
      spies: { depUpdate, notifInsert },
    })

    const summary = await runCreditDeductionMock({
      supabase: { from } as never,
      authUserId: 'admin',
      partnerId: null,
    })

    expect(summary.suspended).toEqual([1])
    expect(depUpdate).toHaveBeenCalledWith({ status: 'suspended' })
    expect(notifInsert).toHaveBeenCalled()
  })

  it('respects allowCreditDebt + creditDebtThreshold', async () => {
    vi.mocked(findServicePlan).mockReturnValue({ slug: 's', monthlyCreditConsumption: 2880 } as never)
    const depUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const from = buildFrom({
      deployments: [{ id: 1, partner_id: 42, plan_slug: 's', status: 'active', service: { plans: [] } }],
      partners: [{ id: 42, remainingCredits: 0, allowCreditDebt: true, creditDebtThreshold: 100 }],
      spies: { depUpdate },
    })

    const summary = await runCreditDeductionMock({
      supabase: { from } as never,
      authUserId: 'admin',
      partnerId: null,
    })

    // Balance went to -1, but threshold allows -100 → not suspended
    expect(summary.suspended).toEqual([])
    expect(depUpdate).not.toHaveBeenCalled()
  })

  it('returns zeros when there are no active deployments', async () => {
    const from = buildFrom({ deployments: [] })
    const summary = await runCreditDeductionMock({
      supabase: { from } as never,
      authUserId: 'admin',
      partnerId: null,
    })
    expect(summary).toEqual({ deploymentsProcessed: 0, totalDebited: 0, suspended: [] })
  })
})
