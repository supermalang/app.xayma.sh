import { ref, computed } from 'vue'

/**
 * Commission calculation composable
 * Provides utilities for calculating acquisition bonuses and renewal commissions
 *
 * Business Rules:
 * - Acquisition Bonus: 10% × plan price × 3 months (one-time bonus for new customers)
 * - Renewal Commission: 5% × plan price per month (ongoing monthly commission)
 */

const ACQUISITION_BONUS_PERCENTAGE = 10
const ACQUISITION_BONUS_MONTHS = 3
const RENEWAL_COMMISSION_PERCENTAGE = 5

/**
 * Calculate acquisition bonus for a new customer
 * Formula: 10% × planPrice × 3 months
 *
 * @param planPrice - Monthly price of the plan in FCFA
 * @param months - Number of months to calculate (default: 3)
 * @returns Acquisition bonus amount
 */
export function calculateAcquisitionBonus(planPrice: number, months: number = ACQUISITION_BONUS_MONTHS): number {
  if (planPrice < 0) return 0
  if (months < 0) return 0

  return (planPrice * ACQUISITION_BONUS_PERCENTAGE) / 100 * months
}

/**
 * Calculate monthly renewal commission
 * Formula: 5% × planPrice per month
 *
 * @param planPrice - Monthly price of the plan in FCFA
 * @returns Monthly renewal commission amount
 */
export function calculateRenewalCommission(planPrice: number): number {
  if (planPrice < 0) return 0

  return (planPrice * RENEWAL_COMMISSION_PERCENTAGE) / 100
}

/**
 * Calculate YTD (Year-to-Date) renewal commission
 * Formula: Monthly renewal × number of months since signup
 *
 * @param planPrice - Monthly price of the plan in FCFA
 * @param monthsActive - Number of months the customer has been active
 * @returns YTD renewal commission amount
 */
export function calculateYTDRenewalCommission(planPrice: number, monthsActive: number): number {
  if (planPrice < 0) return 0
  if (monthsActive < 0) return 0

  const monthlyAmount = calculateRenewalCommission(planPrice)
  return monthlyAmount * monthsActive
}

/**
 * Calculate total commission for a customer (acquisition + YTD renewal)
 *
 * @param planPrice - Monthly price of the plan in FCFA
 * @param monthsActive - Number of months the customer has been active
 * @param includeAcquisition - Whether to include acquisition bonus in total (default: true)
 * @returns Total commission amount
 */
export function calculateTotalCommission(
  planPrice: number,
  monthsActive: number,
  includeAcquisition: boolean = true
): number {
  let total = calculateYTDRenewalCommission(planPrice, monthsActive)

  if (includeAcquisition) {
    total += calculateAcquisitionBonus(planPrice)
  }

  return total
}

/**
 * Use commissions composable
 * Provides reactive commission tracking
 */
export function useCommissions() {
  const commissions = ref<Array<{
    id: string
    customerId: string
    planPrice: number
    acquisitionBonus: number
    monthlyRenewal: number
    ytdRenewal: number
    totalCommission: number
  }>>([])

  /**
   * Add commission record
   */
  const addCommission = (
    customerId: string,
    planPrice: number,
    monthsActive: number,
    id: string = `commission-${Date.now()}`
  ) => {
    const acquisitionBonus = calculateAcquisitionBonus(planPrice)
    const monthlyRenewal = calculateRenewalCommission(planPrice)
    const ytdRenewal = calculateYTDRenewalCommission(planPrice, monthsActive)

    commissions.value.push({
      id,
      customerId,
      planPrice,
      acquisitionBonus,
      monthlyRenewal,
      ytdRenewal,
      totalCommission: acquisitionBonus + ytdRenewal,
    })
  }

  /**
   * Get total earned commissions
   */
  const totalEarned = computed(() => {
    return commissions.value.reduce((sum, c) => sum + c.totalCommission, 0)
  })

  /**
   * Get total pending commissions (assumed to be unpaid acquisitions)
   */
  const totalPending = computed(() => {
    return commissions.value.reduce((sum, c) => sum + c.acquisitionBonus, 0)
  })

  /**
   * Get total renewal commissions earned
   */
  const totalRenewal = computed(() => {
    return commissions.value.reduce((sum, c) => sum + c.ytdRenewal, 0)
  })

  return {
    commissions,
    totalEarned,
    totalPending,
    totalRenewal,
    addCommission,
    calculateAcquisitionBonus,
    calculateRenewalCommission,
    calculateYTDRenewalCommission,
    calculateTotalCommission,
  }
}
