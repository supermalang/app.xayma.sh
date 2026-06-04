import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../settings', () => ({
  getCreditBundles: vi.fn(),
}))

import { initiateCheckoutMock } from './initiateCheckout.mock'
import { getCreditBundles } from '../../settings'

const insertSelectSingle = vi.fn()
const insertSelect = vi.fn().mockReturnValue({ single: insertSelectSingle })
const insert = vi.fn().mockReturnValue({ select: insertSelect })
const from = vi.fn().mockImplementation((table: string) => {
  if (table === 'credit_transactions') {
    return { insert }
  }
  return {}
})

beforeEach(() => {
  vi.clearAllMocks()
  insertSelectSingle.mockResolvedValue({ data: { id: 9001 }, error: null })
  insert.mockReturnValue({ select: insertSelect })
  insertSelect.mockReturnValue({ single: insertSelectSingle })
})

describe('initiateCheckout mock', () => {
  it('inserts a pending credit_transactions row and returns a mock-gateway envelope', async () => {
    vi.mocked(getCreditBundles).mockResolvedValue([
      { id: 'b1', label: 'Starter', creditsAmount: 5000, priceXOF: 10000, discountPercent: 0, validityDays: 30 },
    ])

    const result = await initiateCheckoutMock(
      { bundleId: 'b1', partnerId: '42', paymentGatewayId: 'g1' },
      { supabase: { from } as never, authUserId: 'u1', partnerId: 42 },
    )

    expect(insert).toHaveBeenCalled()
    const inserted = insert.mock.calls[0][0][0]
    expect(inserted).toMatchObject({
      partner_id: 42,
      transactionType: 'credit',
      status: 'pending',
      creditsPurchased: 5000,
      amountPaid: 10000,
      paymentMethod: 'paytech',
    })
    expect(result.success).toBe(true)
    expect(result.results.SUCCESS).toBe(true)
    expect(result.results.PAYMENT_URL).toContain('/credits/_mock-gateway')
    expect(result.results.PAYMENT_URL).toContain('transactionId=9001')
    expect(result.results.PAYMENT_URL).toContain('bundleLabel=Starter')
    expect(result.results.TRANSACTION_ID).toBe(9001)
  })

  it('throws WorkflowEngineError when bundle not found', async () => {
    vi.mocked(getCreditBundles).mockResolvedValue([])
    await expect(
      initiateCheckoutMock(
        { bundleId: 'unknown', partnerId: '42', paymentGatewayId: 'g1' },
        { supabase: { from } as never, authUserId: 'u1', partnerId: 42 },
      ),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws WorkflowEngineError when transaction insert fails', async () => {
    vi.mocked(getCreditBundles).mockResolvedValue([
      { id: 'b1', label: 'Starter', creditsAmount: 5000, priceXOF: 10000, discountPercent: 0, validityDays: 30 },
    ])
    insertSelectSingle.mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } })
    await expect(
      initiateCheckoutMock(
        { bundleId: 'b1', partnerId: '42', paymentGatewayId: 'g1' },
        { supabase: { from } as never, authUserId: 'u1', partnerId: 42 },
      ),
    ).rejects.toMatchObject({ statusCode: 500 })
  })
})
