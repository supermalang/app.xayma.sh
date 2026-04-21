import { describe, it, expect } from 'vitest'

function shouldSuspend(
  remainingCredits: number,
  allowCreditDebt: boolean,
  creditDebtThreshold: number
): boolean {
  if (remainingCredits > 0) return false
  if (allowCreditDebt && Math.abs(remainingCredits) < creditDebtThreshold) return false
  return true
}

describe('Suspension Logic', () => {
  it('suspends when credits reach 0 and no debt allowed', () => {
    expect(shouldSuspend(0, false, 0)).toBe(true)
  })

  it('does NOT suspend when credits = 0, debt allowed, threshold not hit', () => {
    expect(shouldSuspend(0, true, 500)).toBe(false)
  })

  it('suspends when credits go negative beyond debt threshold', () => {
    expect(shouldSuspend(-600, true, 500)).toBe(true)
  })

  it('does NOT suspend when credits are positive', () => {
    expect(shouldSuspend(100, false, 0)).toBe(false)
  })

  it('suspends at exactly the debt threshold boundary', () => {
    expect(shouldSuspend(-500, true, 500)).toBe(true)
  })

  it('does NOT suspend when debt < threshold', () => {
    expect(shouldSuspend(-499, true, 500)).toBe(false)
  })
})
