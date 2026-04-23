import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabaseFrom } from './supabase'
import {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransactionStatus,
  calculateBalance,
  getTotalCreditsEarned,
  getApplicableDiscount,
  calculateDiscountedPrice,
  getTransactionsByDateRange,
} from './credits.service'

vi.mock('./supabase', () => ({ supabaseFrom: vi.fn() }))

describe('Credits Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listTransactions', () => {
    it('should list transactions with filters and pagination', async () => {
      const mockData = [
        {
          id: '1',
          partner_id: 'partner1',
          amount: 5000,
          type: 'TOPUP',
          status: 'COMPLETED',
          created_at: '2026-03-01T10:00:00',
        },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockData, count: 1, error: null }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const result = await listTransactions({
        partnerId: 'partner1',
        type: 'TOPUP',
        status: 'COMPLETED',
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
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 100, error: null }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      await listTransactions({ page: 3, pageSize: 20 })

      expect(mockQuery.range).toHaveBeenCalledWith(40, 59)
    })

    it('should apply filters correctly', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const startDate = '2026-03-01T00:00:00.000Z'
      const endDate = '2026-03-31T23:59:59.999Z'

      await listTransactions({
        partnerId: 'partner1',
        startDate,
        endDate,
        type: 'TOPUP',
      })

      expect(mockQuery.eq).toHaveBeenCalledWith('partner_id', 'partner1')
      expect(mockQuery.eq).toHaveBeenCalledWith('type', 'TOPUP')
      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', startDate)
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', endDate)
    })
  })

  describe('getTransaction', () => {
    it('should fetch a transaction by ID', async () => {
      const mockTransaction = {
        id: '1',
        amount: 5000,
        type: 'TOPUP',
        status: 'COMPLETED',
      }

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTransaction, error: null }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const result = await getTransaction('1')

      expect(result).toEqual(mockTransaction)
    })

    it('should throw error if transaction not found', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      await expect(getTransaction('invalid')).rejects.toThrow()
    })
  })

  describe('createTransaction', () => {
    it('should create a new transaction', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1', partner_id: 'partner1', amount: 5000 }],
          error: null,
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValue(mockQuery as any)

      const result = await createTransaction('partner1', 'TOPUP', 5000, { status: 'PENDING' })

      expect(result.partner_id).toBe('partner1')
      expect(result.amount).toBe(5000)
    })

    it('should handle creation error', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Insert failed'),
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValue(mockQuery as any)

      await expect(
        createTransaction('partner1', 'TOPUP', 5000)
      ).rejects.toThrow()
    })
  })

  describe('updateTransactionStatus', () => {
    it('should update transaction status', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', status: 'PENDING' },
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1', status: 'COMPLETED' }],
          error: null,
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValueOnce({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any).mockReturnValueOnce(mockUpdateQuery as any)

      const result = await updateTransactionStatus('1', 'COMPLETED')

      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'COMPLETED' })
      )
      expect(result).toBeDefined()
    })

    it('should throw on update error', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', status: 'PENDING' },
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Update failed'),
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValueOnce({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any).mockReturnValueOnce(mockUpdateQuery as any)

      await expect(updateTransactionStatus('1', 'COMPLETED')).rejects.toThrow()
    })

    it('handles duplicate COMPLETED IPN gracefully (no-throw on COMPLETED → COMPLETED)', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', status: 'COMPLETED' },
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1', status: 'COMPLETED' }],
          error: null,
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValueOnce({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any).mockReturnValueOnce(mockUpdateQuery as any)

      const result = await updateTransactionStatus('1', 'COMPLETED')

      expect(result).toBeDefined()
    })
  })

  describe('IPN idempotency', () => {
    it('updateTransactionStatus to COMPLETED succeeds and returns updated row', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', status: 'PENDING' },
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1', status: 'COMPLETED', amount: 5000 }],
          error: null,
        }),
      }

      vi.mocked(supabaseFrom)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockQuery) } as any)
        .mockReturnValueOnce(mockUpdateQuery as any)

      const result = await updateTransactionStatus('1', 'COMPLETED')

      expect(result.status).toBe('COMPLETED')
      expect(result.amount).toBe(5000)
    })

    it('second call with COMPLETED on already-COMPLETED row succeeds (idempotent no-op)', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', status: 'COMPLETED' },
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1', status: 'COMPLETED', amount: 5000 }],
          error: null,
        }),
      }

      vi.mocked(supabaseFrom)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockQuery) } as any)
        .mockReturnValueOnce(mockUpdateQuery as any)

      const result = await updateTransactionStatus('1', 'COMPLETED')

      expect(result.status).toBe('COMPLETED')
    })

    it('call with FAILED on already-COMPLETED row throws "Transaction already completed"', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', status: 'COMPLETED' },
          error: null,
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) } as any)

      await expect(updateTransactionStatus('1', 'FAILED')).rejects.toThrow('Transaction already completed')
    })
  })

  describe('calculateBalance', () => {
    it('should calculate balance correctly', async () => {
      const mockTransactions = [
        { amount: 5000, type: 'TOPUP' },
        { amount: 2000, type: 'DEBIT' },
        { amount: 100, type: 'EXPIRY' },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any, reject: any) =>
          Promise.resolve({ data: mockTransactions, error: null }).then(resolve, reject),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const balance = await calculateBalance('partner1')

      expect(balance).toBe(2900)
    })

    it('should return 0 if no transactions', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any, reject: any) =>
          Promise.resolve({ data: [], error: null }).then(resolve, reject),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const balance = await calculateBalance('partner1')

      expect(balance).toBe(0)
    })
  })

  describe('getTotalCreditsEarned', () => {
    it('should calculate total credits earned', async () => {
      const mockTransactions = [
        { amount: 5000 },
        { amount: 3000 },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: (resolve: any, reject: any) =>
          Promise.resolve({ data: mockTransactions, error: null }).then(resolve, reject),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const earned = await getTotalCreditsEarned('partner1')

      expect(earned).toBe(8000)
    })
  })

  describe('getApplicableDiscount', () => {
    it('should apply discount based on partner type and instance count', async () => {
      const mockOptions = [
        { threshold_value: 16, threshold_discount_percent: 20 },
        { threshold_value: 6, threshold_discount_percent: 10 },
        { threshold_value: 1, threshold_discount_percent: 0 },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any, reject: any) =>
          Promise.resolve({ data: mockOptions, error: null }).then(resolve, reject),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const result = await getApplicableDiscount('RESELLER', 12)

      expect(result?.discountPercent).toBe(10)
    })

    it('should return null when no tiers match', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any, reject: any) =>
          Promise.resolve({ data: [], error: null }).then(resolve, reject),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const result = await getApplicableDiscount('CUSTOMER', 20)

      expect(result).toBeNull()
    })
  })

  describe('calculateDiscountedPrice', () => {
    it('should calculate discounted price correctly', () => {
      const { discountedPrice, savings } = calculateDiscountedPrice(10000, 20)
      expect(discountedPrice).toBe(8000)
      expect(savings).toBe(2000)
    })

    it('should handle 0% discount', () => {
      const { discountedPrice } = calculateDiscountedPrice(10000, 0)
      expect(discountedPrice).toBe(10000)
    })

    it('should handle 100% discount', () => {
      const { discountedPrice } = calculateDiscountedPrice(10000, 100)
      expect(discountedPrice).toBe(0)
    })
  })

  describe('getTransactionsByDateRange', () => {
    it('should fetch transactions within date range', async () => {
      const mockData = [
        { id: '1', created_at: '2026-03-15T10:00:00', amount: 5000 },
        { id: '2', created_at: '2026-03-20T14:30:00', amount: -1000 },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any, reject: any) =>
          Promise.resolve({ data: mockData, error: null }).then(resolve, reject),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const result = await getTransactionsByDateRange(
        'partner1',
        '2026-03-01T00:00:00.000Z',
        '2026-03-31T23:59:59.999Z'
      )

      expect(result).toEqual(mockData)
      expect(mockQuery.gte).toHaveBeenCalled()
      expect(mockQuery.lte).toHaveBeenCalled()
    })
  })
})
