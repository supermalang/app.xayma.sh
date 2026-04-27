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
  useAuthStore: () => ({ isInitialized: true, profile: null }),
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

import { supabaseFrom } from '@/services/supabase'
import { useAdminDashboardStore } from './admin-dashboard.store'

function makeQueryMock(data: unknown, count: number | null = null) {
  const chain: Record<string, unknown> = {}
  const terminal = { data, error: null, count }
  const methods = ['select', 'eq', 'neq', 'gte', 'in', 'order', 'limit', 'single']
  methods.forEach(m => { chain[m] = () => chain })
  Object.assign(chain, terminal)
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve)
  return chain
}

describe('useAdminDashboardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(supabaseFrom).mockReturnValue(makeQueryMock([], 0) as ReturnType<typeof supabaseFrom>)
  })

  it('sets isLoading=false and fetchedAt after first fetch', async () => {
    const store = useAdminDashboardStore()
    expect(store.fetchedAt).toBeNull()
    await store.fetchAll()
    expect(store.isLoading).toBe(false)
    expect(store.fetchedAt).not.toBeNull()
  })

  it('returns cached data without re-fetching when within TTL', () => {
    const store = useAdminDashboardStore()
    store.fetchedAt = Date.now()
    store.stats.totalPartners = 42
    const isCached = store.fetchedAt !== null && Date.now() - store.fetchedAt < DASHBOARD_CACHE_TTL_MS
    expect(isCached).toBe(true)
    expect(store.stats.totalPartners).toBe(42)
  })

  it('clears isRefreshing after background refresh completes', async () => {
    const store = useAdminDashboardStore()
    store.fetchedAt = Date.now()
    store.isRefreshing = true
    await store.fetchAll()
    expect(store.isRefreshing).toBe(false)
  })

  it('resets to initial state after $reset()', () => {
    const store = useAdminDashboardStore()
    store.fetchedAt = Date.now()
    store.stats.totalPartners = 99
    store.$reset()
    expect(store.fetchedAt).toBeNull()
    expect(store.stats.totalPartners).toBe(0)
  })
})
