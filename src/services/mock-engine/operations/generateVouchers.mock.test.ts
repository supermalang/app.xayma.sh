import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateVouchersMock } from './generateVouchers.mock'

beforeEach(() => vi.clearAllMocks())

describe('generateVouchers mock', () => {
  it('inserts N vouchers matching XAYMA-XXXX-XXXX format', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ insert })

    await generateVouchersMock(
      {
        quantity: 5,
        credits: 5000,
        maxUses: 1,
        expiresAt: '2026-12-31',
        partnerType: ['CUSTOMER'],
      },
      { supabase: { from } as never, authUserId: 'admin', partnerId: 1 },
    )

    expect(from).toHaveBeenCalledWith('vouchers')
    const rows = insert.mock.calls[0][0] as Array<{ code: string; credits: number; status: string; partner_type: string[] | null }>
    expect(rows).toHaveLength(5)
    for (const row of rows) {
      expect(row.code).toMatch(/^XAYMA-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
      expect(row.credits).toBe(5000)
      expect(row.status).toBe('active')
      // DB enum is lowercase; mock normalises caller input
      expect(row.partner_type).toEqual(['customer'])
    }
  })

  it('rejects unknown partner_type values', async () => {
    const from = vi.fn()
    await expect(
      generateVouchersMock(
        { quantity: 1, credits: 1000, partnerType: ['SUPER_USER'] },
        { supabase: { from } as never, authUserId: 'admin', partnerId: 1 },
      ),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects quantity > 100', async () => {
    const from = vi.fn()
    await expect(
      generateVouchersMock(
        { quantity: 101, credits: 1000 },
        { supabase: { from } as never, authUserId: 'admin', partnerId: 1 },
      ),
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects non-positive credits', async () => {
    const from = vi.fn()
    await expect(
      generateVouchersMock(
        { quantity: 5, credits: 0 },
        { supabase: { from } as never, authUserId: 'admin', partnerId: 1 },
      ),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('defaults maxUses to 1 and partner_type to null', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ insert })
    await generateVouchersMock(
      { quantity: 1, credits: 1000 },
      { supabase: { from } as never, authUserId: 'admin', partnerId: 1 },
    )
    const row = insert.mock.calls[0][0][0]
    expect(row.max_uses).toBe(1)
    expect(row.partner_type).toBeNull()
    expect(row.expires_at).toBeNull()
  })
})
