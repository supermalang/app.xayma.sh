import { describe, it, expect } from 'vitest'

// --- Constants mirrored from Commissions.vue ---
const ACQUISITION_RATE = 0.1
const RENEWAL_RATE = 0.05
const ACQUISITION_MONTHS = 3
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

// --- Types mirrored from Commissions.vue ---
interface PartnerRow {
  id: number
  name: string
  created: string
}

interface CreditTransactionRow {
  id: number
  partner_id: number
  amountPaid: number | null
  status: string | null
  created: string
}

interface CommissionResult {
  acquisitionAmount: number
  renewalYtdTotal: number
  totalCommission: number
}

/**
 * Pure commission calculation function extracted from Commissions.vue
 * buildCommissionData() inner loop — processes one partner's transactions.
 *
 * Only considers transactions where status === 'completed' and amountPaid > 0.
 * Acquisition window: partner.created to partner.created + 3 * MONTH_MS (inclusive).
 * Renewal YTD: renewal transactions on or after January 1 of the reference year.
 */
function calculatePartnerCommission(
  partner: PartnerRow,
  transactions: CreditTransactionRow[],
  referenceDate: Date = new Date()
): CommissionResult {
  const startOfYear = new Date(referenceDate.getFullYear(), 0, 1)
  const partnerCreated = new Date(partner.created)
  const acquisitionCutoff = new Date(partnerCreated.getTime() + ACQUISITION_MONTHS * MONTH_MS)

  const partnerTxs = transactions
    .filter(
      (tx) =>
        tx.partner_id === partner.id &&
        tx.status === 'completed' &&
        (tx.amountPaid ?? 0) > 0
    )
    .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())

  let acquisitionAmount = 0
  let renewalYtdTotal = 0

  for (const tx of partnerTxs) {
    const txDate = new Date(tx.created)
    const paid = tx.amountPaid ?? 0
    const isAcquisition = txDate <= acquisitionCutoff

    if (isAcquisition) {
      acquisitionAmount += paid * ACQUISITION_RATE
    } else {
      if (txDate >= startOfYear) {
        renewalYtdTotal += paid * RENEWAL_RATE
      }
    }
  }

  return {
    acquisitionAmount,
    renewalYtdTotal,
    totalCommission: acquisitionAmount + renewalYtdTotal,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns an ISO date string offset by `days` days from a base date. */
function daysFrom(base: Date, days: number): string {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Commission calculation', () => {
  const partner: PartnerRow = { id: 1, name: 'Acme', created: '2024-01-01T00:00:00Z' }

  // Reference date used to freeze "today" and "start of year" in all tests.
  // Using 2025-06-15 so "start of year" = 2025-01-01.
  const referenceDate = new Date('2025-06-15T00:00:00Z')

  it('calculates acquisition bonus at 10% for first 3 months', () => {
    // Transaction 30 days after signup — well within the 90-day window.
    const tx: CreditTransactionRow = {
      id: 1,
      partner_id: 1,
      amountPaid: 10_000,
      status: 'completed',
      created: daysFrom(new Date(partner.created), 30),
    }

    const result = calculatePartnerCommission(partner, [tx], referenceDate)

    expect(result.acquisitionAmount).toBeCloseTo(1_000) // 10% × 10 000
    expect(result.renewalYtdTotal).toBe(0)
    expect(result.totalCommission).toBeCloseTo(1_000)
  })

  it('calculates renewal commission at 5% for months beyond 3', () => {
    // Transaction 120 days after signup — past the 90-day window.
    // Partner created 2024-01-01, so 120 days later = 2024-05-01, which is
    // before our 2025 reference year → ytd = 0.
    // Use a partner created in 2025 so the renewal tx falls inside the year.
    const p2025: PartnerRow = { id: 2, name: 'Beta', created: '2025-01-01T00:00:00Z' }
    const tx: CreditTransactionRow = {
      id: 10,
      partner_id: 2,
      amountPaid: 20_000,
      status: 'completed',
      // 120 days after 2025-01-01 = 2025-05-01, inside 2025 year window
      created: daysFrom(new Date(p2025.created), 120),
    }

    const result = calculatePartnerCommission(p2025, [tx], referenceDate)

    expect(result.acquisitionAmount).toBe(0)
    expect(result.renewalYtdTotal).toBeCloseTo(1_000) // 5% × 20 000
    expect(result.totalCommission).toBeCloseTo(1_000)
  })

  it('correctly splits transactions between acquisition and renewal periods', () => {
    // Two acquisition transactions + one renewal transaction.
    const transactions: CreditTransactionRow[] = [
      {
        id: 1,
        partner_id: 1,
        amountPaid: 5_000,
        status: 'completed',
        created: daysFrom(new Date(partner.created), 10),  // acquisition
      },
      {
        id: 2,
        partner_id: 1,
        amountPaid: 5_000,
        status: 'completed',
        created: daysFrom(new Date(partner.created), 60),  // acquisition
      },
      {
        id: 3,
        partner_id: 1,
        amountPaid: 10_000,
        status: 'completed',
        // 400 days after 2024-01-01 = 2025-02-05, inside 2025 YTD window
        created: daysFrom(new Date(partner.created), 400), // renewal
      },
    ]

    const result = calculatePartnerCommission(partner, transactions, referenceDate)

    // 10% × (5 000 + 5 000) = 1 000
    expect(result.acquisitionAmount).toBeCloseTo(1_000)
    // 5% × 10 000 = 500
    expect(result.renewalYtdTotal).toBeCloseTo(500)
    expect(result.totalCommission).toBeCloseTo(1_500)
  })

  it('returns 0 for a partner with no transactions', () => {
    const result = calculatePartnerCommission(partner, [], referenceDate)

    expect(result.acquisitionAmount).toBe(0)
    expect(result.renewalYtdTotal).toBe(0)
    expect(result.totalCommission).toBe(0)
  })

  it('handles a partner with exactly 3 months of transactions (boundary case)', () => {
    // The cutoff is partner.created + 3 * MONTH_MS (inclusive: txDate <= cutoff).
    const cutoffMs = new Date(partner.created).getTime() + ACQUISITION_MONTHS * MONTH_MS
    const cutoffDate = new Date(cutoffMs)

    // Exactly at the cutoff — should be counted as acquisition.
    const txAtCutoff: CreditTransactionRow = {
      id: 20,
      partner_id: 1,
      amountPaid: 8_000,
      status: 'completed',
      created: cutoffDate.toISOString(),
    }

    // One millisecond after the cutoff — must be counted as renewal.
    const txAfterCutoff: CreditTransactionRow = {
      id: 21,
      partner_id: 1,
      amountPaid: 8_000,
      status: 'completed',
      // cutoff falls in April 2024, well before our 2025 reference year,
      // so the renewal YTD total will be 0 (correct — it's outside the year).
      created: new Date(cutoffMs + 1).toISOString(),
    }

    const resultAtCutoff = calculatePartnerCommission(partner, [txAtCutoff], referenceDate)
    expect(resultAtCutoff.acquisitionAmount).toBeCloseTo(800) // 10% × 8 000
    expect(resultAtCutoff.renewalYtdTotal).toBe(0)

    const resultAfterCutoff = calculatePartnerCommission(partner, [txAfterCutoff], referenceDate)
    expect(resultAfterCutoff.acquisitionAmount).toBe(0)
    // Renewal tx is in 2024, before our 2025 reference year → ytd stays 0
    expect(resultAfterCutoff.renewalYtdTotal).toBe(0)
  })
})
