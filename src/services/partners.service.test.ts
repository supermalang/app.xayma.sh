import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabaseFrom } from '@/services/supabase'
import * as partnerService from '@/services/partners.service'

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
}))

describe('Partners Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listPartners', () => {
    it('should list all partners with pagination', async () => {
      const mockData = [
        { id: 1, name: 'Partner 1', status: 'active' },
        { id: 2, name: 'Partner 2', status: 'active' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 2 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await partnerService.listPartners({ page: 1, pageSize: 20 })

      expect(result.data).toEqual(mockData)
      expect(result.count).toBe(2)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
    })

    it('should apply status filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await partnerService.listPartners({ status: 'active' })

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active')
    })

    it('should apply partner_type filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await partnerService.listPartners({ partner_type: 'customer' })

      expect(mockQuery.eq).toHaveBeenCalledWith('partner_type', 'customer')
    })

    it('should apply search filter on name, email, phone', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await partnerService.listPartners({ search: 'test' })

      expect(mockQuery.or).toHaveBeenCalled()
    })
  })

  describe('createPartner', () => {
    it('should create a new partner', async () => {
      const newPartner = {
        name: 'New Partner',
        slug: 'new-partner',
        email: 'test@example.com',
        partner_type: 'customer',
        status: 'active',
        remainingCredits: 0,
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [newPartner], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await partnerService.createPartner(newPartner)

      expect(result).toEqual(newPartner)
      expect(mockQuery.insert).toHaveBeenCalledWith([newPartner])
    })
  })

  describe('updatePartner', () => {
    it('should update an existing partner', async () => {
      const updates = { status: 'suspended' }
      const updatedPartner = { id: 1, status: 'suspended' }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [updatedPartner], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await partnerService.updatePartner(1, updates)

      expect(result).toEqual(updatedPartner)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 1)
    })
  })

  describe('changePartnerStatus', () => {
    it('should change partner status to suspended', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1, status: 'suspended' }],
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await partnerService.changePartnerStatus(1, 'suspended')

      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'suspended' })
    })

    it('should change partner status to active', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1, status: 'active' }],
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await partnerService.changePartnerStatus(1, 'active')

      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'active' })
    })
  })

  describe('deletePartner', () => {
    it('should delete a partner', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await partnerService.deletePartner(1)

      expect(mockQuery.delete).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 1)
    })
  })

  describe('isSlugUnique', () => {
    it('should return true for unique slug', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const isUnique = await partnerService.isSlugUnique('unique-slug')

      expect(isUnique).toBe(true)
    })

    it('should return false for duplicate slug', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const isUnique = await partnerService.isSlugUnique('duplicate-slug')

      expect(isUnique).toBe(false)
    })

    it('should exclude partner when checking uniqueness', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await partnerService.isSlugUnique('slug', 1)

      expect(mockQuery.neq).toHaveBeenCalledWith('id', 1)
    })
  })

  describe('getPartnerCredits', () => {
    it('should get remaining credits for a partner', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { remainingCredits: 1000 },
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const credits = await partnerService.getPartnerCredits(1)

      expect(credits).toBe(1000)
    })

    it('should return 0 if partner has no credits', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { remainingCredits: 0 },
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const credits = await partnerService.getPartnerCredits(1)

      expect(credits).toBe(0)
    })
  })

  describe('Phone validation (West Africa regex)', () => {
    const phoneRegex = /^(?:\+221)?(?:70|75|76|77|78)[0-9]{7}$/

    it('should accept valid West Africa phone numbers', () => {
      const validNumbers = [
        '+221701234567', // Senegal 70x
        '+221751234567', // Senegal 75x
        '+221761234567', // Senegal 76x
        '+221771234567', // Senegal 77x
        '+221781234567', // Senegal 78x
        '701234567', // Without country code
        '751234567',
        '761234567',
        '771234567',
        '781234567',
      ]

      validNumbers.forEach((phone) => {
        expect(phoneRegex.test(phone)).toBe(true)
      })
    })

    it('should reject invalid West Africa phone numbers', () => {
      const invalidNumbers = [
        '+221601234567', // 60x - invalid prefix
        '+221691234567', // 69x - invalid prefix
        '+221801234567', // 80x - invalid prefix
        '+221901234567', // 90x - invalid prefix
        '+22170123456', // Too short
        '+2217012345678', // Too long
        '601234567', // Invalid prefix
        '691234567',
        'not-a-phone',
        '+221', // Too short
      ]

      invalidNumbers.forEach((phone) => {
        expect(phoneRegex.test(phone)).toBe(false)
      })
    })
  })
})
