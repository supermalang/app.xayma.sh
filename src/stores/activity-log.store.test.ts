import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
}))
vi.mock('@/stores/notifications.store', () => ({
  useNotificationStore: () => ({ addError: vi.fn() }),
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

import { supabaseFrom } from '@/services/supabase'
import { useActivityLogStore } from './activity-log.store'

function makeQueryMock(data: unknown) {
  const chain: Record<string, unknown> = {}
  const terminal = { data, error: null }
  const methods = ['select', 'eq', 'neq', 'gte', 'in', 'order', 'limit', 'single']
  methods.forEach(m => { chain[m] = () => chain })
  Object.assign(chain, terminal)
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve)
  return chain
}

describe('useActivityLogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(supabaseFrom).mockReturnValue(makeQueryMock([]) as ReturnType<typeof supabaseFrom>)
  })

  it('sets fetchedAt and isLoading=false after successful fetch', async () => {
    const store = useActivityLogStore()
    await store.fetchActivityLog(null, 5)
    expect(store.fetchedAt).not.toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('sets isRefreshing on cache hit and clears after refresh', async () => {
    const store = useActivityLogStore()
    store.fetchedAt = Date.now()
    await store.loadWithCache(null, 5)
    expect(store.isRefreshing).toBe(false)
  })

  it('resets to initial state after $reset()', () => {
    const store = useActivityLogStore()
    store.fetchedAt = Date.now()
    store.$reset()
    expect(store.fetchedAt).toBeNull()
    expect(store.auditEntries).toEqual([])
  })
})
