import { describe, it, expect } from 'vitest'
import { DASHBOARD_CACHE_TTL_MS } from './constants'

describe('DASHBOARD_CACHE_TTL_MS', () => {
  it('equals 10 minutes in milliseconds', () => {
    expect(DASHBOARD_CACHE_TTL_MS).toBe(10 * 60 * 1000)
  })
})
