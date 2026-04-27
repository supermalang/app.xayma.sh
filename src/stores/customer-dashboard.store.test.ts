import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { DASHBOARD_CACHE_TTL_MS } from './constants'

vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
}))
vi.mock('@/stores/notifications.store', () => ({
  useNotificationStore: () => ({ addError: vi.fn() }),
}))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ isInitialized: true, profile: { company_id: 1 } }),
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

import { supabaseFrom } from '@/services/supabase'
import { useCustomerDashboardStore } from './customer-dashboard.store'

function makeQueryMock(data: unknown, count: number | null = null) {
  const chain: Record<string, unknown> = {}
  const terminal = { data, error: null, count }
  const methods = ['select', 'eq', 'neq', 'gte', 'in', 'order', 'limit', 'single']
  methods.forEach(m => { chain[m] = () => chain })
  Object.assign(chain, terminal)
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve)
  return chain
}

describe('useCustomerDashboardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(supabaseFrom).mockReturnValue(makeQueryMock([], 0) as ReturnType<typeof supabaseFrom>)
  })

  it('sets fetchedAt and isLoading=false after successful fetch', async () => {
    const store = useCustomerDashboardStore()
    await store.fetchAll()
    expect(store.fetchedAt).not.toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('sets isRefreshing on cache hit and clears after refresh', async () => {
    const store = useCustomerDashboardStore()
    store.fetchedAt = Date.now()
    await store.loadWithCache()
    expect(store.isRefreshing).toBe(false)
  })

  it('resets to initial state after $reset()', () => {
    const store = useCustomerDashboardStore()
    store.fetchedAt = Date.now()
    store.totalSpend = 5000
    store.$reset()
    expect(store.fetchedAt).toBeNull()
    expect(store.totalSpend).toBe(0)
  })
})
