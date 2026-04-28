import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PaymentGateway } from '@/types'

const mockUpsert = vi.fn()
const mockSelect = vi.fn()

vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(() => ({
    select: mockSelect,
    upsert: mockUpsert,
  })),
}))

import {
  getPaymentGateways,
  updatePaymentGateways,
  invalidateSettingCache,
} from './settings'

const SAMPLE_GATEWAY: PaymentGateway = {
  id: '00000000-0000-0000-0000-000000000001',
  provider: 'wave' as PaymentGateway['provider'],
  mode: 'sandbox' as PaymentGateway['mode'],
  apiKey: 'k',
  secretKey: 's',
  ipnUrl: 'https://example.test/ipn',
  successUrl: 'https://example.test/ok',
  cancelUrl: 'https://example.test/cancel',
  currency: 'XOF',
}

beforeEach(() => {
  vi.clearAllMocks()
  invalidateSettingCache()
})

describe('getPaymentGateways', () => {
  it('returns parsed array when row exists', async () => {
    mockSelect.mockReturnValueOnce({
      eq: () => ({
        single: () => Promise.resolve({
          data: { value: JSON.stringify([SAMPLE_GATEWAY]) },
          error: null,
        }),
      }),
    })
    const result = await getPaymentGateways()
    expect(result).toEqual([SAMPLE_GATEWAY])
  })

  it('returns [] when row missing', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSelect.mockReturnValueOnce({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
      }),
    })
    const result = await getPaymentGateways()
    expect(result).toEqual([])
    errSpy.mockRestore()
  })

  it('returns [] and logs on malformed JSON', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSelect.mockReturnValueOnce({
      eq: () => ({
        single: () => Promise.resolve({ data: { value: '{not json' }, error: null }),
      }),
    })
    const result = await getPaymentGateways()
    expect(result).toEqual([])
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})

describe('updatePaymentGateways', () => {
  it('upserts JSON-stringified array under PAYMENT_GATEWAYS key', async () => {
    mockUpsert.mockResolvedValueOnce({ error: null })
    await updatePaymentGateways([SAMPLE_GATEWAY])
    expect(mockUpsert).toHaveBeenCalledWith(
      { key: 'PAYMENT_GATEWAYS', value: JSON.stringify([SAMPLE_GATEWAY]) },
      { onConflict: 'key' }
    )
  })

  it('throws when supabase returns an error', async () => {
    mockUpsert.mockResolvedValueOnce({ error: new Error('boom') })
    await expect(updatePaymentGateways([])).rejects.toThrow('boom')
  })
})
