import { describe, it, expect } from 'vitest'
import {
  calculateAcquisitionBonus,
  calculateRenewalCommission,
  calculateYTDRenewalCommission,
  calculateTotalCommission,
  useCommissions,
} from './useCommissions'

describe('Commission Calculations', () => {
  describe('calculateAcquisitionBonus', () => {
    it('calculates acquisition bonus correctly: 10% × planPrice × 3 months', () => {
      const planPrice = 1000
      const result = calculateAcquisitionBonus(planPrice)
      // 10% of 1000 = 100, × 3 months = 300
      expect(result).toBe(300)
    })

    it('calculates acquisition bonus with custom months parameter', () => {
      const planPrice = 1000
      const result = calculateAcquisitionBonus(planPrice, 6)
      // 10% of 1000 = 100, × 6 months = 600
      expect(result).toBe(600)
    })

    it('works with zero plan price', () => {
      const result = calculateAcquisitionBonus(0)
      expect(result).toBe(0)
    })

    it('handles negative plan price gracefully', () => {
      const result = calculateAcquisitionBonus(-1000)
      expect(result).toBe(0)
    })

    it('handles negative months gracefully', () => {
      const result = calculateAcquisitionBonus(1000, -1)
      expect(result).toBe(0)
    })

    it('works with large plan prices', () => {
      const planPrice = 500000
      const result = calculateAcquisitionBonus(planPrice)
      expect(result).toBe(150000)
    })

    it('works with decimal plan prices', () => {
      const planPrice = 1000.50
      const result = calculateAcquisitionBonus(planPrice)
      // 10% of 1000.50 × 3 = 300.15
      expect(result).toBeCloseTo(300.15, 2)
    })

    it('uses 3 months as default parameter', () => {
      const planPrice = 1000
      const explicit = calculateAcquisitionBonus(planPrice, 3)
      const implicit = calculateAcquisitionBonus(planPrice)
      expect(explicit).toBe(implicit)
    })
  })

  describe('calculateRenewalCommission', () => {
    it('calculates monthly renewal commission correctly: 5% × planPrice', () => {
      const planPrice = 1000
      const result = calculateRenewalCommission(planPrice)
      // 5% of 1000 = 50
      expect(result).toBe(50)
    })

    it('works with zero plan price', () => {
      const result = calculateRenewalCommission(0)
      expect(result).toBe(0)
    })

    it('handles negative plan price gracefully', () => {
      const result = calculateRenewalCommission(-1000)
      expect(result).toBe(0)
    })

    it('works with large plan prices', () => {
      const planPrice = 500000
      const result = calculateRenewalCommission(planPrice)
      expect(result).toBe(25000)
    })

    it('works with decimal plan prices', () => {
      const planPrice = 1000.50
      const result = calculateRenewalCommission(planPrice)
      expect(result).toBeCloseTo(50.025, 2)
    })
  })

  describe('calculateYTDRenewalCommission', () => {
    it('calculates YTD renewal correctly: monthly × months active', () => {
      const planPrice = 1000
      const monthsActive = 6
      const result = calculateYTDRenewalCommission(planPrice, monthsActive)
      // Monthly renewal: 5% of 1000 = 50
      // YTD: 50 × 6 = 300
      expect(result).toBe(300)
    })

    it('works with one month active', () => {
      const planPrice = 1000
      const result = calculateYTDRenewalCommission(planPrice, 1)
      expect(result).toBe(50)
    })

    it('works with zero months active', () => {
      const planPrice = 1000
      const result = calculateYTDRenewalCommission(planPrice, 0)
      expect(result).toBe(0)
    })

    it('handles negative months gracefully', () => {
      const result = calculateYTDRenewalCommission(1000, -1)
      expect(result).toBe(0)
    })

    it('handles negative plan price gracefully', () => {
      const result = calculateYTDRenewalCommission(-1000, 6)
      expect(result).toBe(0)
    })

    it('works with 12 months (full year)', () => {
      const planPrice = 1000
      const result = calculateYTDRenewalCommission(planPrice, 12)
      // 5% of 1000 × 12 = 50 × 12 = 600
      expect(result).toBe(600)
    })

    it('works with large plan prices', () => {
      const planPrice = 500000
      const monthsActive = 6
      const result = calculateYTDRenewalCommission(planPrice, monthsActive)
      // 5% of 500000 = 25000, × 6 = 150000
      expect(result).toBe(150000)
    })
  })

  describe('calculateTotalCommission', () => {
    it('calculates total commission: acquisition + YTD renewal', () => {
      const planPrice = 1000
      const monthsActive = 6
      const result = calculateTotalCommission(planPrice, monthsActive)
      // Acquisition: 10% × 1000 × 3 = 300
      // YTD Renewal: 5% × 1000 × 6 = 300
      // Total: 600
      expect(result).toBe(600)
    })

    it('excludes acquisition bonus when includeAcquisition is false', () => {
      const planPrice = 1000
      const monthsActive = 6
      const result = calculateTotalCommission(planPrice, monthsActive, false)
      // YTD Renewal only: 5% × 1000 × 6 = 300
      expect(result).toBe(300)
    })

    it('includes acquisition bonus by default', () => {
      const planPrice = 1000
      const monthsActive = 6
      const withDefault = calculateTotalCommission(planPrice, monthsActive)
      const withExplicit = calculateTotalCommission(planPrice, monthsActive, true)
      expect(withDefault).toBe(withExplicit)
    })

    it('works when customer just signed up (0 months active)', () => {
      const planPrice = 1000
      const result = calculateTotalCommission(planPrice, 0)
      // Only acquisition bonus: 300
      expect(result).toBe(300)
    })

    it('works with all plan types correctly', () => {
      const plans = [
        { name: 'Starter', price: 100 },
        { name: 'Pro', price: 500 },
        { name: 'Enterprise', price: 2000 },
      ]

      plans.forEach((plan) => {
        const acquisition = calculateAcquisitionBonus(plan.price)
        const renewal = calculateRenewalCommission(plan.price)
        const ytd = calculateYTDRenewalCommission(plan.price, 6)
        const total = calculateTotalCommission(plan.price, 6)

        expect(acquisition).toBeGreaterThan(0)
        expect(renewal).toBeGreaterThan(0)
        expect(ytd).toBeGreaterThan(0)
        expect(total).toBe(acquisition + ytd)
      })
    })
  })

  describe('Commission ratios', () => {
    it('renewal commission is half of acquisition bonus rate', () => {
      const planPrice = 1000
      const acquisition = calculateAcquisitionBonus(planPrice, 1) // 10% for 1 month
      const renewal = calculateRenewalCommission(planPrice) // 5%
      expect(renewal).toBe(acquisition / 2)
    })

    it('acquisition bonus (for 3 months) is 6x monthly renewal', () => {
      const planPrice = 1000
      const acquisition = calculateAcquisitionBonus(planPrice) // 10% × 3 months = 300
      const monthlyRenewal = calculateRenewalCommission(planPrice) // 5% = 50
      // Acquisition (300) is 6x the monthly renewal (50)
      expect(acquisition).toBe(monthlyRenewal * 6)
    })
  })
})

describe('useCommissions composable', () => {
  it('initializes with empty commissions array', () => {
    const { commissions } = useCommissions()
    expect(commissions.value).toEqual([])
  })

  it('adds commission records', () => {
    const { commissions, addCommission } = useCommissions()

    addCommission('customer-1', 1000, 6)
    expect(commissions.value).toHaveLength(1)
    expect(commissions.value[0].customerId).toBe('customer-1')
  })

  it('calculates total earned correctly', () => {
    const { addCommission, totalEarned } = useCommissions()

    addCommission('customer-1', 1000, 6)
    addCommission('customer-2', 500, 6)

    // Customer 1: (10% × 1000 × 3) + (5% × 1000 × 6) = 300 + 300 = 600
    // Customer 2: (10% × 500 × 3) + (5% × 500 × 6) = 150 + 150 = 300
    // Total: 900
    expect(totalEarned.value).toBe(900)
  })

  it('calculates total pending correctly', () => {
    const { addCommission, totalPending } = useCommissions()

    addCommission('customer-1', 1000, 6)
    addCommission('customer-2', 500, 6)

    // Pending is sum of acquisition bonuses
    // Customer 1: 10% × 1000 × 3 = 300
    // Customer 2: 10% × 500 × 3 = 150
    // Total: 450
    expect(totalPending.value).toBe(450)
  })

  it('calculates total renewal correctly', () => {
    const { addCommission, totalRenewal } = useCommissions()

    addCommission('customer-1', 1000, 6)
    addCommission('customer-2', 500, 6)

    // Total renewal (YTD) is sum of YTD renewals
    // Customer 1: 5% × 1000 × 6 = 300
    // Customer 2: 5% × 500 × 6 = 150
    // Total: 450
    expect(totalRenewal.value).toBe(450)
  })

  it('generates unique IDs if not provided', async () => {
    const { commissions, addCommission } = useCommissions()

    addCommission('customer-1', 1000, 6)
    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 1))
    addCommission('customer-2', 1000, 6)

    expect(commissions.value[0].id).not.toBe(commissions.value[1].id)
  })

  it('uses provided IDs for commission records', () => {
    const { commissions, addCommission } = useCommissions()

    addCommission('customer-1', 1000, 6, 'custom-id-1')
    expect(commissions.value[0].id).toBe('custom-id-1')
  })

  it('exports calculation functions from composable', () => {
    const {
      calculateAcquisitionBonus: compAcq,
      calculateRenewalCommission: compRen,
      calculateYTDRenewalCommission: compYTD,
      calculateTotalCommission: compTotal,
    } = useCommissions()

    expect(compAcq(1000)).toBe(300)
    expect(compRen(1000)).toBe(50)
    expect(compYTD(1000, 6)).toBe(300)
    expect(compTotal(1000, 6)).toBe(600)
  })

  it('reactively updates totals when commissions are added', () => {
    const { addCommission, totalEarned, commissions } = useCommissions()

    expect(totalEarned.value).toBe(0)

    addCommission('customer-1', 1000, 6)
    expect(totalEarned.value).toBe(600)

    addCommission('customer-2', 1000, 6)
    expect(totalEarned.value).toBe(1200)
  })
})
