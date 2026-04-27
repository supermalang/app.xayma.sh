import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { supabaseFrom } from '@/services/supabase'

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(),
}))

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

// Capture addError so we can assert on it
const mockAddError = vi.fn()

// Mock notification store
vi.mock('@/stores/notifications.store', () => ({
  useNotificationStore: () => ({ addError: mockAddError }),
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

import { useActivityLog } from '@/composables/useActivityLog'

// Helper: build a chainable mock query that resolves to the given value
function makeQuery(resolved: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'limit']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  ;(chain as Record<string, unknown>).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolved).then(resolve)
  return chain
}

describe('useActivityLog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    capturedOnMounted = undefined
  })

  it('calls .eq("company_id", companyId) when companyId is a non-empty string', async () => {
    const mockChain = makeQuery({ data: [], error: null })
    ;(supabaseFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain)

    useActivityLog('42')

    expect(capturedOnMounted).toBeDefined()
    await capturedOnMounted!()

    expect(mockChain.eq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('company_id', '42')
  })

  it('does NOT call .eq with company_id when companyId is null', async () => {
    const mockChain = makeQuery({ data: [], error: null })
    ;(supabaseFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain)

    useActivityLog(null)

    expect(capturedOnMounted).toBeDefined()
    await capturedOnMounted!()

    const eqMock = mockChain.eq as ReturnType<typeof vi.fn>
    const calledWithCompanyId = eqMock.mock.calls.some(
      (args: unknown[]) => args[0] === 'company_id'
    )
    expect(calledWithCompanyId).toBe(false)
  })

  it('populates auditEntries from mock data on success', async () => {
    const mockData = [
      {
        audit_id: 1,
        action: 'INSERT',
        description: 'Created deployment',
        table_name: 'deployments',
        created: '2026-04-20T10:00:00Z',
        firstname: 'Alice',
        lastname: 'Diallo',
        user_role: 'CUSTOMER',
      },
      {
        audit_id: 2,
        action: 'UPDATE',
        description: 'Updated partner',
        table_name: 'partners',
        created: '2026-04-19T08:30:00Z',
        firstname: 'Bob',
        lastname: 'Ndiaye',
        user_role: 'ADMIN',
      },
    ]

    const mockChain = makeQuery({ data: mockData, error: null })
    ;(supabaseFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain)

    const { auditEntries, isLoading } = useActivityLog(null, 10)

    expect(capturedOnMounted).toBeDefined()
    await capturedOnMounted!()

    expect(auditEntries.value).toHaveLength(2)
    expect(auditEntries.value[0]).toMatchObject({
      audit_id: 1,
      action: 'INSERT',
      description: 'Created deployment',
      table_name: 'deployments',
      created: '2026-04-20T10:00:00Z',
      firstname: 'Alice',
      lastname: 'Diallo',
      user_role: 'CUSTOMER',
    })
    expect(auditEntries.value[1]).toMatchObject({
      audit_id: 2,
      action: 'UPDATE',
      firstname: 'Bob',
    })
    expect(isLoading.value).toBe(false)
  })

  it('calls notificationStore.addError on query failure', async () => {
    const mockChain = makeQuery({ data: null, error: { message: 'DB error' } })
    ;(supabaseFrom as ReturnType<typeof vi.fn>).mockReturnValue(mockChain)

    const { auditEntries, isLoading } = useActivityLog('99')

    expect(capturedOnMounted).toBeDefined()
    await capturedOnMounted!()

    expect(mockAddError).toHaveBeenCalledWith('errors.fetch_failed')
    expect(auditEntries.value).toHaveLength(0)
    expect(isLoading.value).toBe(false)
  })
})
