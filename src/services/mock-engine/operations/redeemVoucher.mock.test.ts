import { describe, it, expect, vi, beforeEach } from 'vitest'
import { redeemVoucherMock } from './redeemVoucher.mock'

beforeEach(() => vi.clearAllMocks())

function makeFrom(opts: {
  voucher?: Record<string, unknown> | null
  partner?: Record<string, unknown> | null
  existingRedemption?: Record<string, unknown> | null
  insertedTxnId?: number
} = {}) {
  const txnInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: opts.insertedTxnId ?? 1 },
        error: null,
      }),
    }),
  })
  const redemptionInsert = vi.fn().mockResolvedValue({ error: null })
  const voucherUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  const partnerUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  const notifInsert = vi.fn().mockResolvedValue({ error: null })

  const from = vi.fn((table: string) => {
    if (table === 'xayma_app.vouchers') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: opts.voucher ?? null,
              error: opts.voucher ? null : { message: 'not found' },
            }),
          }),
        }),
        update: voucherUpdate,
      }
    }
    if (table === 'xayma_app.partners') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: opts.partner ?? null, error: null }),
          }),
        }),
        update: partnerUpdate,
      }
    }
    if (table === 'xayma_app.voucher_redemptions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: opts.existingRedemption ?? null, error: null }),
            }),
          }),
        }),
        insert: redemptionInsert,
      }
    }
    if (table === 'xayma_app.credit_transactions') return { insert: txnInsert }
    if (table === 'xayma_app.notifications') return { insert: notifInsert }
    if (table === 'xayma_app.deployments') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ error: null }) }),
      }
    }
    return {}
  })
  return { from, spies: { txnInsert, redemptionInsert, voucherUpdate, partnerUpdate, notifInsert } }
}

const ctx = (from: ReturnType<typeof vi.fn>) => ({
  supabase: { from } as never,
  authUserId: 'auth-user',
  partnerId: 42,
})

describe('redeemVoucher mock', () => {
  it('credits the partner when voucher is valid and unused', async () => {
    const { from, spies } = makeFrom({
      voucher: { id: 1, code: 'XAYMA-AAAA-BBBB', status: 'active', credits: 5000, uses_count: 0, max_uses: 1, partner_type: null, expires_at: null },
      partner: { id: 42, remainingCredits: 1000, partner_type: 'CUSTOMER' },
    })
    await expect(redeemVoucherMock({ voucherCode: 'XAYMA-AAAA-BBBB', partnerId: 42 }, ctx(from))).resolves.toBeUndefined()
    expect(spies.txnInsert).toHaveBeenCalled()
    expect(spies.redemptionInsert).toHaveBeenCalled()
    expect(spies.partnerUpdate).toHaveBeenCalledWith({ remainingCredits: 6000 })
    expect(spies.voucherUpdate).toHaveBeenCalledWith({ uses_count: 1, status: 'fully_redeemed' })
  })

  it('rejects expired voucher', async () => {
    const { from } = makeFrom({
      voucher: { id: 1, code: 'X', status: 'active', credits: 5000, uses_count: 0, max_uses: 1, partner_type: null, expires_at: new Date(Date.now() - 86400000).toISOString() },
      partner: { id: 42, remainingCredits: 1000, partner_type: 'CUSTOMER' },
    })
    await expect(redeemVoucherMock({ voucherCode: 'X', partnerId: 42 }, ctx(from))).rejects.toMatchObject({
      statusCode: 400,
      originalError: 'vouchers.errors.expired',
    })
  })

  it('rejects fully-redeemed voucher status', async () => {
    const { from } = makeFrom({
      voucher: { id: 1, code: 'X', status: 'fully_redeemed', credits: 5000, uses_count: 1, max_uses: 1, partner_type: null, expires_at: null },
      partner: { id: 42, remainingCredits: 1000, partner_type: 'CUSTOMER' },
    })
    await expect(redeemVoucherMock({ voucherCode: 'X', partnerId: 42 }, ctx(from))).rejects.toMatchObject({
      statusCode: 400,
      originalError: 'vouchers.errors.fully_redeemed',
    })
  })

  it('rejects when partner type does not match', async () => {
    const { from } = makeFrom({
      voucher: { id: 1, code: 'X', status: 'active', credits: 5000, uses_count: 0, max_uses: 1, partner_type: ['RESELLER'], expires_at: null },
      partner: { id: 42, remainingCredits: 1000, partner_type: 'CUSTOMER' },
    })
    await expect(redeemVoucherMock({ voucherCode: 'X', partnerId: 42 }, ctx(from))).rejects.toMatchObject({
      statusCode: 400,
      originalError: 'vouchers.errors.wrong_type',
    })
  })

  it('allows redemption when partner type is in the allowed array', async () => {
    const { from } = makeFrom({
      voucher: { id: 1, code: 'X', status: 'active', credits: 5000, uses_count: 0, max_uses: 5, partner_type: ['CUSTOMER', 'RESELLER'], expires_at: null },
      partner: { id: 42, remainingCredits: 1000, partner_type: 'CUSTOMER' },
    })
    await expect(redeemVoucherMock({ voucherCode: 'X', partnerId: 42 }, ctx(from))).resolves.toBeUndefined()
  })

  it('rejects when partner has already redeemed', async () => {
    const { from } = makeFrom({
      voucher: { id: 1, code: 'X', status: 'active', credits: 5000, uses_count: 1, max_uses: 5, partner_type: null, expires_at: null },
      partner: { id: 42, remainingCredits: 1000, partner_type: 'CUSTOMER' },
      existingRedemption: { id: 99 },
    })
    await expect(redeemVoucherMock({ voucherCode: 'X', partnerId: 42 }, ctx(from))).rejects.toMatchObject({
      statusCode: 400,
      originalError: 'vouchers.errors.already_redeemed',
    })
  })

  it('rejects when voucher code not found', async () => {
    const { from } = makeFrom({ voucher: null })
    await expect(redeemVoucherMock({ voucherCode: 'NOPE', partnerId: 42 }, ctx(from))).rejects.toMatchObject({
      statusCode: 400,
      originalError: 'vouchers.errors.not_found',
    })
  })
})
