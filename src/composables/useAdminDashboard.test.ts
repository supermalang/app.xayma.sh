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

import { useAdminDashboard } from '@/composables/useAdminDashboard'

// Helper: build a chainable mock query that resolves to the given value
function makeQuery(resolved: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'neq', 'in', 'gte', 'single']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  ;(chain as Record<string, unknown>).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolved).then(resolve)
  return chain
}

describe('useAdminDashboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    capturedOnMounted = undefined
  })

  it('populates archivedDeployments, suspendedDeployments, stoppedDeployments, monthlyIntakeCredits, monthlyIntakeFCFA, and globalCreditsUsed after fetchAll', async () => {
    const store = useAuthStore()
    store.isInitialized = true

    let callIndex = 0
    ;(supabaseFrom as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callIndex++
      switch (callIndex) {
        // 1: partners count
        case 1:
          return makeQuery({ data: null, error: null, count: 10 })
        // 2: active deployments count
        case 2:
          return makeQuery({ data: null, error: null, count: 5 })
        // 3: failed deployments count
        case 3:
          return makeQuery({ data: null, error: null, count: 2 })
        // 4: revenue today
        case 4:
          return makeQuery({ data: [{ amountPaid: 50000 }], error: null })
        // 5: deployments trend
        case 5:
          return makeQuery({ data: [], error: null })
        // 6: serviceplans
        case 6:
          return makeQuery({ data: [], error: null })
        // 7: active deployments serviceplanId
        case 7:
          return makeQuery({ data: [], error: null })
        // 8: revenue by type
        case 8:
          return makeQuery({ data: [], error: null })
        // 9: archived deployments count
        case 9:
          return makeQuery({ data: null, error: null, count: 7 })
        // 10: suspended deployments count
        case 10:
          return makeQuery({ data: null, error: null, count: 3 })
        // 11: stopped deployments count
        case 11:
          return makeQuery({ data: null, error: null, count: 4 })
        // 12: monthly intake (credit transactions)
        case 12:
          return makeQuery({
            data: [
              { creditsPurchased: 1000, amountPaid: 25000 },
              { creditsPurchased: 500, amountPaid: 12500 },
            ],
            error: null,
          })
        // 13: global credits used
        case 13:
          return makeQuery({
            data: [
              { creditsUsed: 200 },
              { creditsUsed: 350 },
            ],
            error: null,
          })
        // 14: partners data (for revenue by type mapping)
        default:
          return makeQuery({ data: [], error: null, count: 0 })
      }
    })

    const {
      archivedDeployments,
      suspendedDeployments,
      stoppedDeployments,
      monthlyIntakeCredits,
      monthlyIntakeFCFA,
      globalCreditsUsed,
      isLoading,
    } = useAdminDashboard()

    expect(capturedOnMounted).toBeDefined()
    await capturedOnMounted!()

    expect(archivedDeployments.value).toBe(7)
    expect(suspendedDeployments.value).toBe(3)
    expect(stoppedDeployments.value).toBe(4)
    expect(monthlyIntakeCredits.value).toBe(1500) // 1000 + 500
    expect(monthlyIntakeFCFA.value).toBe(37500) // 25000 + 12500
    expect(globalCreditsUsed.value).toBe(550) // 200 + 350
    expect(isLoading.value).toBe(false)
  })

  it('does not call console.log', async () => {
    const consoleSpy = vi.spyOn(console, 'log')

    const store = useAuthStore()
    store.isInitialized = true

    ;(supabaseFrom as ReturnType<typeof vi.fn>).mockImplementation(() =>
      makeQuery({ data: [], error: null, count: 0 })
    )

    useAdminDashboard()

    expect(capturedOnMounted).toBeDefined()
    await capturedOnMounted!()

    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('sets error state when a query fails', async () => {
    const store = useAuthStore()
    store.isInitialized = true

    ;(supabaseFrom as ReturnType<typeof vi.fn>).mockImplementation(() =>
      makeQuery({ data: null, error: { message: 'DB error' }, count: null })
    )

    const { error, isLoading } = useAdminDashboard()

    expect(capturedOnMounted).toBeDefined()
    await capturedOnMounted!()

    expect(error.value).toBe('fetch_failed')
    expect(isLoading.value).toBe(false)
  })
})
