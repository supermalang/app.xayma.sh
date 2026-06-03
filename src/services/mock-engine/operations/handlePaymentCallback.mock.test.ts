import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handlePaymentCallbackMock } from './handlePaymentCallback.mock'

beforeEach(() => vi.clearAllMocks())

interface FromCall {
  table: string
  result: Record<string, unknown>
}

function buildFrom(
  txn: { id: number; partner_id: number; creditsPurchased: number | null; status: string | null } | null,
  partner: { id: number; remainingCredits: number } | null,
  spies: {
    txUpdate?: ReturnType<typeof vi.fn>
    partnerUpdate?: ReturnType<typeof vi.fn>
    notifInsert?: ReturnType<typeof vi.fn>
    deploymentsSelect?: ReturnType<typeof vi.fn>
  } = {},
) {
  const calls: FromCall[] = []
  const from = vi.fn((table: string) => {
    if (table === 'credit_transactions') {
      const update = spies.txUpdate ?? vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: txn, error: txn ? null : { message: 'not found' } }),
          }),
        }),
        update,
      }
    }
    if (table === 'partners') {
      const update = spies.partnerUpdate ?? vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: partner, error: null }),
          }),
        }),
        update,
      }
    }
    if (table === 'notifications') {
      const insert = spies.notifInsert ?? vi.fn().mockResolvedValue({ error: null })
      return { insert }
    }
    if (table === 'deployments') {
      const sel = spies.deploymentsSelect ?? vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })
      return { select: sel, update: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ error: null }) }) }
    }
    return {}
  })
  return { from, calls }
}

describe('handlePaymentCallback mock', () => {
  it('marks the transaction completed and bumps partner balance on sale_complete', async () => {
    const txUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const partnerUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const notifInsert = vi.fn().mockResolvedValue({ error: null })
    const { from } = buildFrom(
      { id: 1, partner_id: 42, creditsPurchased: 5000, status: 'pending' },
      { id: 42, remainingCredits: 1000 },
      { txUpdate, partnerUpdate, notifInsert },
    )

    await handlePaymentCallbackMock(
      { transactionId: 1, status: 'sale_complete' },
      { supabase: { from } as never, authUserId: 'u1', partnerId: 42 },
    )

    expect(txUpdate).toHaveBeenCalledWith({ status: 'completed' })
    expect(partnerUpdate).toHaveBeenCalledWith({ remainingCredits: 6000 })
    expect(notifInsert).toHaveBeenCalled()
  })

  it('is idempotent — no-op on already-completed tx', async () => {
    const txUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const partnerUpdate = vi.fn()
    const { from } = buildFrom(
      { id: 1, partner_id: 42, creditsPurchased: 5000, status: 'completed' },
      { id: 42, remainingCredits: 1000 },
      { txUpdate, partnerUpdate },
    )
    await handlePaymentCallbackMock(
      { transactionId: 1, status: 'sale_complete' },
      { supabase: { from } as never, authUserId: null, partnerId: null },
    )
    expect(txUpdate).not.toHaveBeenCalled()
    expect(partnerUpdate).not.toHaveBeenCalled()
  })

  it('marks transaction failed on sale_canceled', async () => {
    const txUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const { from } = buildFrom(
      { id: 1, partner_id: 42, creditsPurchased: 5000, status: 'pending' },
      { id: 42, remainingCredits: 1000 },
      { txUpdate },
    )
    await handlePaymentCallbackMock(
      { transactionId: 1, status: 'sale_canceled' },
      { supabase: { from } as never, authUserId: null, partnerId: null },
    )
    expect(txUpdate).toHaveBeenCalledWith({ status: 'failed' })
  })

  it('throws 404 when transaction not found', async () => {
    const { from } = buildFrom(null, null)
    await expect(
      handlePaymentCallbackMock(
        { transactionId: 999, status: 'sale_complete' },
        { supabase: { from } as never, authUserId: null, partnerId: null },
      ),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 400 when neither reference nor transactionId provided', async () => {
    const from = vi.fn()
    await expect(
      handlePaymentCallbackMock(
        { status: 'sale_complete' },
        { supabase: { from } as never, authUserId: null, partnerId: null },
      ),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('supports lookup by MOCK-<id> reference', async () => {
    const txUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const { from } = buildFrom(
      { id: 7, partner_id: 42, creditsPurchased: 1000, status: 'pending' },
      { id: 42, remainingCredits: 500 },
      { txUpdate },
    )
    await handlePaymentCallbackMock(
      { reference: 'MOCK-7', status: 'sale_complete' },
      { supabase: { from } as never, authUserId: null, partnerId: null },
    )
    expect(txUpdate).toHaveBeenCalled()
  })
})
