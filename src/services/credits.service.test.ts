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

vi.mock('./supabase')

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

      const startDate = new Date('2026-03-01')
      const endDate = new Date('2026-03-31')

      await listTransactions({
        partnerId: 'partner1',
        startDate,
        endDate,
        types: ['TOPUP', 'DEBIT'],
      })

      expect(mockQuery.eq).toHaveBeenCalledWith('partner_id', 'partner1')
      expect(mockQuery.in).toHaveBeenCalledWith('type', ['TOPUP', 'DEBIT'])
      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', startDate.toISOString())
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', endDate.toISOString())
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
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', partner_id: 'partner1', amount: 5000 },
          error: null,
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValue(mockQuery as any)

      const result = await createTransaction({
        partner_id: 'partner1',
        amount: 5000,
        type: 'TOPUP',
        status: 'PENDING',
      })

      expect(result.partner_id).toBe('partner1')
      expect(result.amount).toBe(5000)
    })

    it('should handle creation error', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Insert failed'),
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValue(mockQuery as any)

      await expect(
        createTransaction({
          partner_id: 'partner1',
          amount: 5000,
          type: 'TOPUP',
          status: 'PENDING',
        })
      ).rejects.toThrow()
    })
  })

  describe('updateTransactionStatus', () => {
    it('should update transaction status if different', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', status: 'PENDING' },
          error: null,
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValue(mockQuery as any)

      const mockUpdateQuery = {
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockResolvedValue({ error: null }),
      }

      let callCount = 0
      vi.mocked(supabaseFrom).mockImplementation(() => {
        callCount++
        if (callCount === 1) return mockQuery as any
        return mockUpdateQuery as any
      })

      await updateTransactionStatus('1', 'COMPLETED')

      expect(mockUpdateQuery.update).toHaveBeenCalledWith({ status: 'COMPLETED' })
    })

    it('should skip update if status unchanged', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', status: 'COMPLETED' },
          error: null,
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValue(mockQuery as any)

      const result = await updateTransactionStatus('1', 'COMPLETED')

      expect(result).toBe(false)
    })
  })

  describe('calculateBalance', () => {
    it('should calculate balance correctly', async () => {
      const mockTransactions = [
        { amount: 5000, type: 'TOPUP' },
        { amount: -2000, type: 'DEBIT' },
        { amount: -100, type: 'EXPIRY' },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
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
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
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
        { amount: 5000, type: 'TOPUP' },
        { amount: 3000, type: 'TOPUP' },
        { amount: -2000, type: 'DEBIT' },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
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
        { tier: 1, from_instances: 1, to_instances: 5, discount_percentage: 0 },
        { tier: 2, from_instances: 6, to_instances: 15, discount_percentage: 10 },
        { tier: 3, from_instances: 16, to_instances: null, discount_percentage: 20 },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: mockOptions,
          error: null,
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const discount = await getApplicableDiscount('RESELLER', 12)

      expect(discount).toBe(10)
    })

    it('should return 0 for customers', async () => {
      const mockOptions = [
        { tier: 1, from_instances: 1, to_instances: null, discount_percentage: 0 },
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: mockOptions,
          error: null,
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const discount = await getApplicableDiscount('CUSTOMER', 20)

      expect(discount).toBe(0)
    })
  })

  describe('calculateDiscountedPrice', () => {
    it('should calculate discounted price correctly', () => {
      const originalPrice = 10000
      const discount = 20

      const discountedPrice = calculateDiscountedPrice(originalPrice, discount)

      expect(discountedPrice).toBe(8000)
    })

    it('should handle 0% discount', () => {
      const originalPrice = 10000
      const discount = 0

      const discountedPrice = calculateDiscountedPrice(originalPrice, discount)

      expect(discountedPrice).toBe(10000)
    })

    it('should handle 100% discount', () => {
      const originalPrice = 10000
      const discount = 100

      const discountedPrice = calculateDiscountedPrice(originalPrice, discount)

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
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }

      vi.mocked(supabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any)

      const startDate = new Date('2026-03-01')
      const endDate = new Date('2026-03-31')

      const result = await getTransactionsByDateRange('partner1', startDate, endDate)

      expect(result).toEqual(mockData)
      expect(mockQuery.gte).toHaveBeenCalled()
      expect(mockQuery.lte).toHaveBeenCalled()
    })
  })
})
