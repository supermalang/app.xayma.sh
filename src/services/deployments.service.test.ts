import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabaseFrom } from '@/services/supabase'
import * as deploymentService from '@/services/deployments.service'

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
}))

describe('Deployments Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listDeployments', () => {
    it('should list all deployments with pagination', async () => {
      const mockData = [
        {
          id: 1,
          label: 'Odoo Instance 1',
          status: 'active',
          partner_id: 1,
          service_id: 1,
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 1 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await deploymentService.listDeployments({ page: 1, pageSize: 20 })

      expect(result.data).toEqual(mockData)
      expect(result.count).toBe(1)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
    })

    it('should filter deployments by partner_id', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await deploymentService.listDeployments({ partner_id: 1 })

      expect(mockQuery.eq).toHaveBeenCalledWith('partner_id', 1)
    })

    it('should filter deployments by status', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await deploymentService.listDeployments({ status: 'active' })

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active')
    })

    it('should search deployments by label or slug', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await deploymentService.listDeployments({ search: 'odoo' })

      expect(mockQuery.or).toHaveBeenCalled()
    })
  })

  describe('getDeployment', () => {
    it('should get a single deployment with relations', async () => {
      const mockDeployment = {
        id: 1,
        label: 'Odoo Instance',
        status: 'active',
        service: { id: 1, name: 'Odoo Community' },
        serviceplan: { id: 1, label: 'Starter' },
        partner: { id: 1, name: 'Partner 1' },
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDeployment, error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await deploymentService.getDeployment(1)

      expect(result).toEqual(mockDeployment)
    })
  })

  describe('createDeployment', () => {
    it('should create a new deployment', async () => {
      const newDeployment = {
        label: 'New Odoo Instance',
        domainNames: ['odoo.example.com'],
        slug: 'new-odoo-instance',
        service_id: 1,
        serviceplanId: 1,
        partner_id: 1,
        status: 'pending_deployment' as const,
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [newDeployment], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await deploymentService.createDeployment(newDeployment)

      expect(result).toEqual(newDeployment)
      expect(mockQuery.insert).toHaveBeenCalledWith([newDeployment])
    })
  })

  describe('updateDeployment', () => {
    it('should update deployment status', async () => {
      const updates = { status: 'active' as const }
      const updatedDeployment = { id: 1, status: 'active' }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [updatedDeployment], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await deploymentService.updateDeployment(1, updates)

      expect(result).toEqual(updatedDeployment)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 1)
    })
  })

  describe('updateDeploymentStatus', () => {
    it('should update deployment to active status', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1, status: 'active' }],
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await deploymentService.updateDeploymentStatus(1, 'active')

      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'active' })
    })

    it('should update deployment to deploying status', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1, status: 'deploying' }],
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await deploymentService.updateDeploymentStatus(1, 'deploying')

      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'deploying' })
    })

    it('should update deployment to failed status', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1, status: 'failed' }],
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await deploymentService.updateDeploymentStatus(1, 'failed')

      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'failed' })
    })
  })

  describe('hasPartnerSufficientCredits', () => {
    it('should return true when partner has sufficient credits', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { remainingCredits: 1000 },
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const hasSufficient = await deploymentService.hasPartnerSufficientCredits(1, 500)

      expect(hasSufficient).toBe(true)
    })

    it('should return false when partner has insufficient credits', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { remainingCredits: 100 },
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const hasSufficient = await deploymentService.hasPartnerSufficientCredits(1, 500)

      expect(hasSufficient).toBe(false)
    })

    it('should return false when partner has exactly zero credits', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { remainingCredits: 0 },
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const hasSufficient = await deploymentService.hasPartnerSufficientCredits(1, 100)

      expect(hasSufficient).toBe(false)
    })

    it('should return true when credits exactly match requirement', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { remainingCredits: 500 },
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const hasSufficient = await deploymentService.hasPartnerSufficientCredits(1, 500)

      expect(hasSufficient).toBe(true)
    })
  })

  describe('getDeploymentCountByStatus', () => {
    it('should return count of deployments with given status', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ count: 5, error: null })),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const count = await deploymentService.getDeploymentCountByStatus(1, 'active')

      expect(count).toBe(5)
    })
  })

  describe('getPartnerTotalMonthlyConsumption', () => {
    it('should calculate total monthly credit consumption for a partner', async () => {
      const mockDeployments = [
        {
          serviceplan: { monthlyCreditConsumption: 100 },
        },
        {
          serviceplan: { monthlyCreditConsumption: 150 },
        },
        {
          serviceplan: { monthlyCreditConsumption: 75 },
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockDeployments, error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const totalConsumption = await deploymentService.getPartnerTotalMonthlyConsumption(1)

      expect(totalConsumption).toBe(325)
    })

    it('should return 0 when partner has no active deployments', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const totalConsumption = await deploymentService.getPartnerTotalMonthlyConsumption(1)

      expect(totalConsumption).toBe(0)
    })
  })

  describe('deleteDeployment', () => {
    it('should delete a deployment', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await deploymentService.deleteDeployment(1)

      expect(mockQuery.delete).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 1)
    })
  })

  describe('isDeploymentSlugUnique', () => {
    it('should return true for unique slug', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const isUnique = await deploymentService.isDeploymentSlugUnique('unique-slug')

      expect(isUnique).toBe(true)
    })

    it('should return false for duplicate slug', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const isUnique = await deploymentService.isDeploymentSlugUnique('duplicate-slug')

      expect(isUnique).toBe(false)
    })

    it('should exclude deployment when checking uniqueness', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await deploymentService.isDeploymentSlugUnique('slug', 1)

      expect(mockQuery.neq).toHaveBeenCalledWith('id', 1)
    })
  })
})
