import type { Engine, MockHandler } from './types'

export type { Engine, MockHandler, MockContext, RegisteredMock } from './types'

const LOCAL_STORAGE_KEY = 'xayma:mock-workflow-engine'

if (import.meta.env.PROD && import.meta.env.VITE_MOCK_WORKFLOW_ENGINE === 'true') {
  throw new Error(
    '[mock-engine] VITE_MOCK_WORKFLOW_ENGINE=true in a production build — refusing to load.',
  )
}

export function isMockEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
  }
  return import.meta.env.VITE_MOCK_WORKFLOW_ENGINE === 'true'
}

export function setMockEnabledOverride(value: boolean | null): void {
  if (typeof window === 'undefined') return
  if (value === null) window.localStorage.removeItem(LOCAL_STORAGE_KEY)
  else window.localStorage.setItem(LOCAL_STORAGE_KEY, String(value))
}

const registry = new Map<string, MockHandler>()

function key(engine: Engine, operation: string): string {
  return `${engine}::${operation}`
}

export function registerMock<TPayload, TResponse>(
  engine: Engine,
  operation: string,
  handler: MockHandler<TPayload, TResponse>,
): void {
  registry.set(key(engine, operation), handler as MockHandler)
}

export function lookupMockHandler(engine: Engine, operation: string): MockHandler | null {
  return registry.get(key(engine, operation)) ?? null
}

export function _resetRegistry(): void {
  registry.clear()
}
