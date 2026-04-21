import { describe, it, expect } from 'vitest'

// Constants
const MONTHLY_MINUTES = 43200
const INTERVAL_MINUTES = 15
const intervalRatio = INTERVAL_MINUTES / MONTHLY_MINUTES

function computeDebit(monthlyCreditConsumption: number): number {
  return parseFloat((monthlyCreditConsumption * intervalRatio).toFixed(6))
}

describe('Credit Deduction Math', () => {
  it('Starter plan (10 cr/30d): per-15-min debit ≈ 0.003472', () => {
    expect(computeDebit(10)).toBeCloseTo(0.003472, 4)
  })

  it('Pro plan (20 cr/30d): per-15-min debit ≈ 0.006944', () => {
    expect(computeDebit(20)).toBeCloseTo(0.006944, 4)
  })

  it('Enterprise plan (50 cr/30d): per-15-min debit ≈ 0.017361', () => {
    expect(computeDebit(50)).toBeCloseTo(0.017361, 4)
  })

  it('30 days of 15-min debits for Pro plan totals exactly 20 credits', () => {
    const totalIntervals = (30 * 24 * 60) / 15 // 2880
    const total = computeDebit(20) * totalIntervals
    expect(total).toBeCloseTo(20, 1)
  })

  it('daily debit for Starter is 1/30 of monthly consumption', () => {
    const dailyIntervals = (24 * 60) / 15 // 96
    const dailyTotal = computeDebit(10) * dailyIntervals
    expect(dailyTotal).toBeCloseTo(10 / 30, 4)
  })
})
