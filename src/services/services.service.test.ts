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

    it('should apply status filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await serviceService.listServices({ status: 'active' })

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active')
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

  describe('changeServiceStatus', () => {
    it('should change service status to active', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1, status: 'active' }],
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await serviceService.changeServiceStatus(1, 'active')

      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'active' })
    })

    it('should change service status to inactive', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1, status: 'inactive' }],
          error: null,
        }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await serviceService.changeServiceStatus(1, 'inactive')

      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'inactive' })
    })
  })

  describe('listServicePlans', () => {
    it('should list all service plans with pagination', async () => {
      const mockData = [
        { id: 1, label: 'Starter', service_id: 1, monthlyCreditConsumption: 10 },
        { id: 2, label: 'Pro', service_id: 1, monthlyCreditConsumption: 20 },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 2 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await serviceService.listServicePlans({ page: 1, pageSize: 20 })

      expect(result.data).toEqual(mockData)
      expect(result.count).toBe(2)
      expect(result.page).toBe(1)
    })

    it('should filter by service_id', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await serviceService.listServicePlans({ service_id: 1 })

      expect(mockQuery.eq).toHaveBeenCalledWith('service_id', 1)
    })

    it('should apply search filter on label and description', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await serviceService.listServicePlans({ search: 'starter' })

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

      await expect(serviceService.listServicePlans()).rejects.toThrow(error)
    })
  })

  describe('getServicePlan', () => {
    it('should fetch a single service plan by id', async () => {
      const mockPlan = { id: 1, label: 'Starter', service_id: 1 }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPlan, error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await serviceService.getServicePlan(1)

      expect(result).toEqual(mockPlan)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 1)
    })

    it('should throw error if plan not found', async () => {
      const error = new Error('Not found')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await expect(serviceService.getServicePlan(999)).rejects.toThrow(error)
    })
  })

  describe('getServicePlansByServiceId', () => {
    it('should fetch all plans for a service ordered by created desc', async () => {
      const mockPlans = [
        { id: 2, label: 'Pro', service_id: 1, created: '2026-04-18' },
        { id: 1, label: 'Starter', service_id: 1, created: '2026-04-17' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPlans, error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await serviceService.getServicePlansByServiceId(1)

      expect(result).toEqual(mockPlans)
      expect(mockQuery.eq).toHaveBeenCalledWith('service_id', 1)
    })

    it('should return empty array when no plans found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await serviceService.getServicePlansByServiceId(999)

      expect(result).toEqual([])
    })
  })

  describe('createServicePlan', () => {
    it('should create a new service plan', async () => {
      const newPlan = {
        label: 'Starter',
        service_id: 1,
        monthlyCreditConsumption: 10,
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [newPlan], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await serviceService.createServicePlan(newPlan)

      expect(result).toEqual(newPlan)
      expect(mockQuery.insert).toHaveBeenCalledWith([newPlan])
    })

    it('should throw error on creation failure', async () => {
      const error = new Error('Creation failed')
      const newPlan = { label: 'Test' }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: null, error }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await expect(serviceService.createServicePlan(newPlan as any)).rejects.toThrow(error)
    })
  })

  describe('updateServicePlan', () => {
    it('should update an existing service plan', async () => {
      const updates = { label: 'Premium' }
      const updatedPlan = { id: 1, label: 'Premium' }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [updatedPlan], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const result = await serviceService.updateServicePlan(1, updates)

      expect(result).toEqual(updatedPlan)
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

      await expect(serviceService.updateServicePlan(1, {})).rejects.toThrow(error)
    })
  })

  describe('deleteServicePlan', () => {
    it('should delete a service plan', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await serviceService.deleteServicePlan(1)

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

      await expect(serviceService.deleteServicePlan(1)).rejects.toThrow(error)
    })
  })

  describe('isServicePlanSlugUnique', () => {
    it('should return true for unique slug', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      const isUnique = await serviceService.isServicePlanSlugUnique('unique-slug')

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

      const isUnique = await serviceService.isServicePlanSlugUnique('duplicate-slug')

      expect(isUnique).toBe(false)
    })

    it('should exclude plan id when checking uniqueness', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await serviceService.isServicePlanSlugUnique('slug', 1)

      expect(mockQuery.neq).toHaveBeenCalledWith('id', 1)
    })

    it('should throw error on query failure', async () => {
      const error = new Error('Query failed')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error }),
      }

      ;(supabaseFrom as any).mockReturnValue(mockQuery)

      await expect(serviceService.isServicePlanSlugUnique('slug')).rejects.toThrow(error)
    })
  })
})
