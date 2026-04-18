import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePartnerStore } from '@/stores/partner.store'
import * as partnerService from '@/services/partners.service'

// Mock partner service
vi.mock('@/services/partners.service', () => ({
  listPartners: vi.fn(),
  getPartner: vi.fn(),
  createPartner: vi.fn(),
  updatePartner: vi.fn(),
  deletePartner: vi.fn(),
}))

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}))

describe('Partner Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchPartners', () => {
    it('should fetch partners and update store', async () => {
      const mockPartners = [
        { id: 1, name: 'Partner 1', remainingCredits: 1000 },
        { id: 2, name: 'Partner 2', remainingCredits: 500 },
      ]

      ;(partnerService.listPartners as any).mockResolvedValue({
        data: mockPartners,
        count: 2,
      })

      const store = usePartnerStore()
      const result = await store.fetchPartners()

      expect(store.partners).toEqual(mockPartners)
      expect(result.count).toBe(2)
      expect(result.data).toEqual(mockPartners)
    })

    it('should handle fetch errors gracefully', async () => {
      ;(partnerService.listPartners as any).mockRejectedValue(new Error('Fetch failed'))

      const store = usePartnerStore()

      try {
        await store.fetchPartners()
      } catch (error) {
        expect(store.error).toBeTruthy()
      }
    })
  })

  describe('fetchPartner', () => {
    it('should fetch single partner and set as selected', async () => {
      const mockPartner = { id: 1, name: 'Partner 1', remainingCredits: 1000 }

      ;(partnerService.getPartner as any).mockResolvedValue(mockPartner)

      const store = usePartnerStore()
      const result = await store.fetchPartner(1)

      expect(store.selectedPartner).toEqual(mockPartner)
      expect(result).toEqual(mockPartner)
    })
  })

  describe('createPartner', () => {
    it('should create a new partner and add to store', async () => {
      const newPartner = {
        name: 'New Partner',
        slug: 'new-partner',
        remainingCredits: 0,
      }

      ;(partnerService.createPartner as any).mockResolvedValue({
        id: 3,
        ...newPartner,
      })

      const store = usePartnerStore()
      store.partners = [
        { id: 1, name: 'Partner 1' },
        { id: 2, name: 'Partner 2' },
      ]

      const result = await store.createPartner(newPartner)

      expect(result.id).toBe(3)
      expect(store.partners[0].id).toBe(3) // Prepended to list
    })
  })

  describe('updatePartner', () => {
    it('should update partner in store', async () => {
      const updatedData = { status: 'suspended' }
      const updatedPartner = { id: 1, status: 'suspended' }

      ;(partnerService.updatePartner as any).mockResolvedValue(updatedPartner)

      const store = usePartnerStore()
      store.partners = [{ id: 1, status: 'active' }]

      await store.updatePartner(1, updatedData)

      expect(store.partners[0].status).toBe('suspended')
    })

    it('should update selected partner if it matches', async () => {
      const updatedPartner = { id: 1, status: 'suspended' }

      ;(partnerService.updatePartner as any).mockResolvedValue(updatedPartner)

      const store = usePartnerStore()
      store.selectedPartner = { id: 1, status: 'active' }

      await store.updatePartner(1, { status: 'suspended' })

      expect(store.selectedPartner.status).toBe('suspended')
    })
  })

  describe('deletePartner', () => {
    it('should remove partner from store', async () => {
      ;(partnerService.deletePartner as any).mockResolvedValue(undefined)

      const store = usePartnerStore()
      store.partners = [
        { id: 1, name: 'Partner 1' },
        { id: 2, name: 'Partner 2' },
      ]

      await store.deletePartner(1)

      expect(store.partners).toEqual([{ id: 2, name: 'Partner 2' }])
    })

    it('should clear selectedPartner if deleted', async () => {
      ;(partnerService.deletePartner as any).mockResolvedValue(undefined)

      const store = usePartnerStore()
      store.selectedPartner = { id: 1, name: 'Partner 1' }

      await store.deletePartner(1)

      expect(store.selectedPartner).toBeNull()
    })
  })

  describe('changeStatus', () => {
    it('should change partner status', async () => {
      const updatedPartner = { id: 1, status: 'suspended' }

      ;(partnerService.updatePartner as any).mockResolvedValue(updatedPartner)

      const store = usePartnerStore()
      store.partners = [{ id: 1, status: 'active' }]

      await store.changeStatus(1, 'suspended')

      expect(store.partners[0].status).toBe('suspended')
    })
  })

  describe('updateCredits', () => {
    it('should update credits for partner in list', () => {
      const store = usePartnerStore()
      store.partners = [{ id: 1, remainingCredits: 1000 }]

      store.updateCredits(1, 500)

      expect(store.partners[0].remainingCredits).toBe(500)
    })

    it('should update credits for selected partner', () => {
      const store = usePartnerStore()
      store.selectedPartner = { id: 1, remainingCredits: 1000 }

      store.updateCredits(1, 500)

      expect(store.selectedPartner.remainingCredits).toBe(500)
    })
  })

  describe('computed properties', () => {
    it('partnerCount should return number of partners', () => {
      const store = usePartnerStore()
      store.partners = [{ id: 1 }, { id: 2 }]

      expect(store.partnerCount).toBe(2)
    })

    it('selectedPartnerCredits should return remaining credits', () => {
      const store = usePartnerStore()
      store.selectedPartner = { id: 1, remainingCredits: 750 }

      expect(store.selectedPartnerCredits).toBe(750)
    })

    it('selectedPartnerCredits should return 0 if no partner selected', () => {
      const store = usePartnerStore()
      store.selectedPartner = null

      expect(store.selectedPartnerCredits).toBe(0)
    })
  })

  describe('reset', () => {
    it('should clear all store data', () => {
      const store = usePartnerStore()
      store.partners = [{ id: 1 }]
      store.selectedPartner = { id: 1 }
      store.error = 'Some error'

      store.reset()

      expect(store.partners).toEqual([])
      expect(store.selectedPartner).toBeNull()
      expect(store.error).toBeNull()
    })
  })
})
