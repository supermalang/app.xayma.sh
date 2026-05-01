import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabaseFrom } from '@/services/supabase'
import * as serviceService from '@/services/services.service'

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
}))

describe('Services Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listServices', () => {
    it('should list all services with pagination', async () => {
      const mockData = [
        { id: 1, name: 'Odoo Community', status: 'active', isPubliclyAvailable: true },
        { id: 2, name: 'Custom Docker', status: 'active', isPubliclyAvailable: false },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 2 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await serviceService.listServices({ page: 1, pageSize: 20 })

      expect(result.data).toEqual(mockData)
      expect(result.count).toBe(2)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
    })

    it('should apply isPubliclyAvailable filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await serviceService.listServices({ isPubliclyAvailable: true })

      expect(mockQuery.eq).toHaveBeenCalledWith('isPubliclyAvailable', true)
    })

    it('should apply search filter on name and description', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await serviceService.listServices({ search: 'odoo' })

      expect(mockQuery.or).toHaveBeenCalled()
    })

    it('should throw error on query failure', async () => {
      const error = new Error('Database error')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: null, error }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await expect(serviceService.listServices()).rejects.toThrow(error)
    })
  })

  describe('getService', () => {
    it('should fetch a single service by id', async () => {
      const mockService = { id: 1, name: 'Odoo Community', status: 'active' }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockService, error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await serviceService.getService(1)

      expect(result).toEqual(mockService)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 1)
    })

    it('should throw error if service not found', async () => {
      const error = new Error('Not found')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await expect(serviceService.getService(999)).rejects.toThrow(error)
    })
  })

  describe('createService', () => {
    it('should create a new service', async () => {
      const newService = {
        name: 'Odoo Community',
        description: 'Free ERP for SMEs',
        status: 'active',
        isPubliclyAvailable: true,
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [newService], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await serviceService.createService(newService)

      expect(result).toEqual(newService)
      expect(mockQuery.insert).toHaveBeenCalledWith([newService])
    })

    it('should throw error on creation failure', async () => {
      const error = new Error('Creation failed')
      const newService = { name: 'Test' }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: null, error }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await expect(serviceService.createService(newService as any)).rejects.toThrow(error)
    })
  })

  describe('updateService', () => {
    it('should update an existing service', async () => {
      const updates = { status: 'inactive' }
      const updatedService = { id: 1, status: 'inactive' }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [updatedService], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await serviceService.updateService(1, updates)

      expect(result).toEqual(updatedService)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 1)
    })

    it('should throw error on update failure', async () => {
      const error = new Error('Update failed')
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: null, error }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await expect(serviceService.updateService(1, {})).rejects.toThrow(error)
    })
  })

  describe('deleteService', () => {
    it('should delete a service', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await serviceService.deleteService(1)

      expect(mockQuery.delete).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 1)
    })

    it('should throw error on deletion failure', async () => {
      const error = new Error('Deletion failed')
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await expect(serviceService.deleteService(1)).rejects.toThrow(error)
    })
  })

  describe('toggleServicePublicAvailability', () => {
    it('should toggle public availability to true', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1, isPubliclyAvailable: true }],
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await serviceService.toggleServicePublicAvailability(1, true)

      expect(mockQuery.update).toHaveBeenCalledWith({ isPubliclyAvailable: true })
    })

    it('should toggle public availability to false', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1, isPubliclyAvailable: false }],
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await serviceService.toggleServicePublicAvailability(1, false)

      expect(mockQuery.update).toHaveBeenCalledWith({ isPubliclyAvailable: false })
    })
  })

  describe('plan helpers (jsonb)', () => {
    describe('normalizeServicePlan', () => {
      it('returns null for non-objects or missing slug/label', () => {
        expect(serviceService.normalizeServicePlan(null)).toBeNull()
        expect(serviceService.normalizeServicePlan({})).toBeNull()
        expect(serviceService.normalizeServicePlan({ slug: '' })).toBeNull()
        expect(serviceService.normalizeServicePlan({ slug: 's' })).toBeNull()
      })

      it('coerces values into a stable shape', () => {
        const plan = serviceService.normalizeServicePlan({
          slug: 'starter',
          label: 'Starter',
          description: 'Entry tier',
          monthlyCreditConsumption: '5000' as unknown as number,
          options: ['a', 1, 'b'],
        })
        expect(plan).toEqual({
          slug: 'starter',
          label: 'Starter',
          description: 'Entry tier',
          monthlyCreditConsumption: 5000,
          options: ['a', 'b'],
        })
      })
    })

    describe('readServicePlans / findServicePlan', () => {
      const service = {
        plans: [
          { slug: 'a', label: 'A', monthlyCreditConsumption: 100 },
          { slug: 'b', label: 'B', monthlyCreditConsumption: 200, options: ['x'] },
          'garbage',
        ],
      }

      it('reads the array, dropping invalid entries', () => {
        const plans = serviceService.readServicePlans(service)
        expect(plans).toHaveLength(2)
        expect(plans.map((p) => p.slug)).toEqual(['a', 'b'])
      })

      it('looks up a plan by slug', () => {
        expect(serviceService.findServicePlan(service, 'b')?.label).toBe('B')
        expect(serviceService.findServicePlan(service, 'missing')).toBeNull()
        expect(serviceService.findServicePlan(null, 'a')).toBeNull()
        expect(serviceService.findServicePlan(service, '')).toBeNull()
      })
    })

    describe('getServicePlansByServiceId', () => {
      it('reads plans off the services row', async () => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { plans: [{ slug: 'a', label: 'A', monthlyCreditConsumption: 10 }] },
            error: null,
          }),
        }
        ;(supabaseFrom as any).mockReturnValue(mockQuery)

        const plans = await serviceService.getServicePlansByServiceId(1)

        expect(plans).toEqual([
          { slug: 'a', label: 'A', description: null, monthlyCreditConsumption: 10, options: [] },
        ])
        expect(mockQuery.select).toHaveBeenCalledWith('plans')
      })
    })

    describe('setServicePlans', () => {
      it('updates services.plans atomically', async () => {
        const mockQuery = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { plans: [{ slug: 'a', label: 'A', monthlyCreditConsumption: 10 }] },
            error: null,
          }),
        }
        ;(supabaseFrom as any).mockReturnValue(mockQuery)

        const result = await serviceService.setServicePlans(1, [
          { slug: 'a', label: 'A', monthlyCreditConsumption: 10 },
        ])
        expect(result).toHaveLength(1)
        expect(mockQuery.update).toHaveBeenCalledWith(
          expect.objectContaining({
            plans: [
              { slug: 'a', label: 'A', description: null, monthlyCreditConsumption: 10, options: [] },
            ],
          }),
        )
      })

      it('rejects duplicate slugs', async () => {
        await expect(
          serviceService.setServicePlans(1, [
            { slug: 'dup', label: 'A' },
            { slug: 'dup', label: 'B' },
          ]),
        ).rejects.toThrow(/Duplicate plan slug/)
      })
    })

    describe('deleteServicePlanBySlug', () => {
      it('drops the matching slug and writes back', async () => {
        const fetchQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              plans: [
                { slug: 'a', label: 'A', monthlyCreditConsumption: 10 },
                { slug: 'b', label: 'B', monthlyCreditConsumption: 20 },
              ],
            },
            error: null,
          }),
        }
        const writeQuery = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { plans: [{ slug: 'a', label: 'A', monthlyCreditConsumption: 10 }] },
            error: null,
          }),
        }
        ;(supabaseFrom as any)
          .mockReturnValueOnce(fetchQuery)
          .mockReturnValueOnce(writeQuery)

        const remaining = await serviceService.deleteServicePlanBySlug(1, 'b')
        expect(remaining.map((p) => p.slug)).toEqual(['a'])
        expect(writeQuery.update).toHaveBeenCalledWith(
          expect.objectContaining({
            plans: [
              { slug: 'a', label: 'A', description: null, monthlyCreditConsumption: 10, options: [] },
            ],
          }),
        )
      })
    })
  })

})
