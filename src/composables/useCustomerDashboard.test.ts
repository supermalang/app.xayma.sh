import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'
import { supabaseFrom } from '@/services/supabase'

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
}))

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

// Mock notification store
vi.mock('@/stores/notifications.store', () => ({
  useNotificationStore: () => ({ addError: vi.fn() }),
}))

// Capture onMounted callback instead of running it automatically
let capturedOnMounted: (() => Promise<void>) | undefined
vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    onMounted: (fn: () => Promise<void>) => {
      capturedOnMounted = fn
    },
  }
})

import { useCustomerDashboard } from '@/composables/useCustomerDashboard'

// Helper: build a chainable mock query that resolves to the given value
function makeQuery(resolved: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'in', 'gte', 'single']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  ;(chain as any).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolved).then(resolve)
  return chain
}

describe('useCustomerDashboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    capturedOnMounted = undefined
  })

  it('returns early without fetching when auth profile is missing', async () => {
    const store = useAuthStore()
    store.profile = null

    useCustomerDashboard()

    expect(capturedOnMounted).toBeDefined()
    await capturedOnMounted!()

    // No supabaseFrom calls made when profile is absent
    expect(supabaseFrom).not.toHaveBeenCalled()
  })

  it('populates stoppedSuspendedCount, archivedCount, monthlyUsageCredits, totalCostThisMonthFCFA, and partnerProfile after fetchAll', async () => {
    // Arrange: valid auth profile
    const store = useAuthStore()
    store.profile = { user_role: 'CUSTOMER', firstname: 'Test', lastname: null, company_id: 42 }

    let callIndex = 0
    ;(supabaseFrom as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callIndex++
      switch (callIndex) {
        // 1: active deployments
        case 1:
          return makeQuery({
            data: [
              { id: 1, label: 'Odoo', domainNames: ['odoo.example.com'], status: 'active', serviceplanId: 10 },
              { id: 2, label: 'ERPNext', domainNames: ['erp.example.com'], status: 'active', serviceplanId: 20 },
            ],
            error: null,
          })
        // 2: credit_transactions (all completed)
        case 2:
          return makeQuery({
            data: [
              { amountPaid: 5000, creditsUsed: 50, created: '2026-04-10T00:00:00Z' },
              { amountPaid: 10000, creditsUsed: 100, created: '2026-03-05T00:00:00Z' },
            ],
            error: null,
          })
        // 3: stopped/suspended count
        case 3:
          return makeQuery({ data: null, error: null, count: 3 })
        // 4: archived count
        case 4:
          return makeQuery({ data: null, error: null, count: 2 })
        // 5: monthly tx (FCFA this month)
        case 5:
          return makeQuery({ data: [{ amountPaid: 7500 }, { amountPaid: 2500 }], error: null })
        // 6: partners .single()
        case 6:
          return makeQuery({
            data: {
              name: 'Acme Corp',
              partner_type: 'direct',
              status: 'active',
              remainingCredits: 800,
              creditDebtThreshold: -200,
            },
            error: null,
          })
        // 7: serviceplans (second async query inside fetchAll)
        case 7:
          return makeQuery({
            data: [
              { id: 10, monthlyCreditConsumption: 100 },
              { id: 20, monthlyCreditConsumption: 150 },
            ],
            error: null,
          })
        default:
          return makeQuery({ data: [], error: null, count: 0 })
      }
    })

    // Create composable — onMounted mock captures fetchAll
    const {
      stoppedSuspendedCount,
      archivedCount,
      monthlyUsageCredits,
      totalCostThisMonthFCFA,
      partnerProfile,
      isLoading,
    } = useCustomerDashboard()

    expect(capturedOnMounted).toBeDefined()
    await capturedOnMounted!()

    expect(stoppedSuspendedCount.value).toBe(3)
    expect(archivedCount.value).toBe(2)
    expect(monthlyUsageCredits.value).toBe(250) // 100 + 150
    expect(totalCostThisMonthFCFA.value).toBe(10000) // 7500 + 2500
    expect(partnerProfile.value).toMatchObject({
      name: 'Acme Corp',
      partner_type: 'direct',
      status: 'active',
      remainingCredits: 800,
      creditDebtThreshold: -200,
    })
    expect(isLoading.value).toBe(false)
  })

  it('sets error state when a query fails', async () => {
    const store = useAuthStore()
    store.profile = { user_role: 'CUSTOMER', firstname: 'Test', lastname: null, company_id: 42 }

    ;(supabaseFrom as ReturnType<typeof vi.fn>).mockImplementation(() =>
      makeQuery({ data: null, error: { message: 'DB error' }, count: null })
    )

    const { error, isLoading } = useCustomerDashboard()

    expect(capturedOnMounted).toBeDefined()
    await capturedOnMounted!()

    expect(error.value).toBe('fetch_failed')
    expect(isLoading.value).toBe(false)
  })
})
