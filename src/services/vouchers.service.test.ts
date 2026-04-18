import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabaseFrom } from './supabase'
import {
  listVouchers,
  getVoucher,
  getVoucherByCode,
  updateVoucherStatus,
  incrementVoucherUsage,
  deactivateVoucher,
  validateVoucher,
  hasPartnerRedeemedVoucher,
  getVoucherStats,
} from './vouchers.service'

vi.mock('./supabase')

describe('Vouchers Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listVouchers', () => {
    it('should list vouchers with filters', async () => {
      const mockData = [
        {
          id: '1',
          code: 'VCHR001',
          credits_value: 5000,
          expiry_date: '2026-12-31',
          status: 'ACTIVE',
          uses_count: 0,
          max_uses: 10,
          partner_type: 'CUSTOMER',
          created_at: '2026-03-01',
        },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockData, count: 1, error: null }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const result = await listVouchers({
        status: 'ACTIVE',
        partnerType: 'CUSTOMER',
        search: 'VCHR',
        page: 1,
        pageSize: 20,
      })

      expect(result.data).toEqual(mockData)
      expect(result.count).toBe(1)
    })

    it('should handle pagination correctly', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 50, error: null }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      await listVouchers({ page: 2, pageSize: 20 })

      expect(mockQuery.range).toHaveBeenCalledWith(20, 39)
    })

    it('should handle errors gracefully', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: null, count: 0, error: new Error('DB error') }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      await expect(listVouchers()).rejects.toThrow('DB error')
    })
  })

  describe('getVoucher', () => {
    it('should fetch a single voucher by ID', async () => {
      const mockVoucher = {
        id: '1',
        code: 'VCHR001',
        credits_value: 5000,
        status: 'ACTIVE',
      }

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockVoucher, error: null }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const result = await getVoucher('1')

      expect(result).toEqual(mockVoucher)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1')
    })

    it('should throw error if voucher not found', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      await expect(getVoucher('invalid')).rejects.toThrow()
    })
  })

  describe('getVoucherByCode', () => {
    it('should fetch voucher by code', async () => {
      const mockVoucher = {
        id: '1',
        code: 'VCHR001',
        credits_value: 5000,
        status: 'ACTIVE',
      }

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockVoucher, error: null }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const result = await getVoucherByCode('VCHR001')

      expect(result).toEqual(mockVoucher)
      expect(mockQuery.eq).toHaveBeenCalledWith('code', 'VCHR001')
    })
  })

  describe('validateVoucher', () => {
    it('should validate an active non-expired voucher', async () => {
      const mockVoucher = {
        id: '1',
        code: 'VCHR001',
        status: 'ACTIVE',
        expiry_date: '2026-12-31',
        uses_count: 0,
        max_uses: 10,
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockVoucher, error: null }),
        }),
      } as any)

      const result = await validateVoucher('VCHR001', 'CUSTOMER')

      expect(result.valid).toBe(true)
      expect(result.voucher).toEqual(mockVoucher)
    })

    it('should reject expired voucher', async () => {
      const mockVoucher = {
        id: '1',
        code: 'VCHR001',
        status: 'ACTIVE',
        expiry_date: '2026-01-01',
        uses_count: 0,
        max_uses: 10,
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockVoucher, error: null }),
        }),
      } as any)

      const result = await validateVoucher('VCHR001', 'CUSTOMER')

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Voucher has expired')
    })

    it('should reject inactive voucher', async () => {
      const mockVoucher = {
        id: '1',
        code: 'VCHR001',
        status: 'INACTIVE',
        expiry_date: '2026-12-31',
        uses_count: 0,
        max_uses: 10,
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockVoucher, error: null }),
        }),
      } as any)

      const result = await validateVoucher('VCHR001', 'CUSTOMER')

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Voucher is inactive')
    })

    it('should reject fully redeemed voucher', async () => {
      const mockVoucher = {
        id: '1',
        code: 'VCHR001',
        status: 'FULLY_REDEEMED',
        expiry_date: '2026-12-31',
        uses_count: 10,
        max_uses: 10,
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockVoucher, error: null }),
        }),
      } as any)

      const result = await validateVoucher('VCHR001', 'CUSTOMER')

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Voucher has been fully redeemed')
    })

    it('should reject voucher with partner type restriction', async () => {
      const mockVoucher = {
        id: '1',
        code: 'VCHR001',
        status: 'ACTIVE',
        expiry_date: '2026-12-31',
        uses_count: 0,
        max_uses: 10,
        partner_type: 'RESELLER',
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockVoucher, error: null }),
        }),
      } as any)

      const result = await validateVoucher('VCHR001', 'CUSTOMER')

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('RESELLER')
    })
  })

  describe('hasPartnerRedeemedVoucher', () => {
    it('should return true if partner has redeemed voucher', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const result = await hasPartnerRedeemedVoucher('voucher1', 'partner1')

      expect(result).toBe(true)
    })

    it('should return false if partner has not redeemed voucher', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const result = await hasPartnerRedeemedVoucher('voucher1', 'partner1')

      expect(result).toBe(false)
    })
  })

  describe('getVoucherStats', () => {
    it('should calculate statistics correctly', async () => {
      let callCount = 0
      vi.mocked(supabaseFrom).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{}, {}, {}, {}, {}], error: null }) }) } as any // 5 active
        }
        if (callCount === 2) {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{}, {}], error: null }) }) } as any // 2 inactive
        }
        if (callCount === 3) {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{}, {}, {}], error: null }) }) } as any // 3 fully redeemed
        }
        // 4th call: total value
        return { select: vi.fn().mockResolvedValue({ data: [{ credits_value: 5000, uses_count: 2 }, { credits_value: 3000, uses_count: 0 }], error: null }) } as any
      })

      const result = await getVoucherStats()

      expect(result.activeCount).toBe(5)
      expect(result.inactiveCount).toBe(2)
      expect(result.fullyRedeemedCount).toBe(3)
      expect(result.totalCreditsDistributed).toBe(8000)
    })
  })

  describe('updateVoucherStatus', () => {
    it('should update voucher status', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ id: 'voucher1', status: 'INACTIVE' }], error: null }),
      }

      vi.mocked(supabaseFrom).mockReturnValue(mockQuery as any)

      await updateVoucherStatus('voucher1', 'INACTIVE')

      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'INACTIVE' })
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'voucher1')
    })
  })

  describe('deactivateVoucher', () => {
    it('should deactivate a voucher', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ id: 'voucher1', status: 'INACTIVE' }], error: null }),
      }

      vi.mocked(supabaseFrom).mockReturnValue(mockQuery as any)

      await deactivateVoucher('voucher1')

      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'INACTIVE' })
    })
  })

  describe('incrementVoucherUsage', () => {
    it('should increment usage count', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        then: (resolve: any, reject: any) =>
          Promise.resolve({ data: [{ id: 'voucher1', uses_count: 1 }], error: null }).then(resolve, reject),
      }

      vi.mocked(supabaseFrom).mockReturnValue(mockQuery as any)

      await incrementVoucherUsage('voucher1')

      expect(mockQuery.update).toHaveBeenCalled()
    })
  })
})
