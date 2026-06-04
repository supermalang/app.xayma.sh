import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isMockEnabled, registerMock, lookupMockHandler, _resetRegistry } from './index'

const setEnvFlag = (value: string) => {
  ;(import.meta.env as Record<string, unknown>).VITE_MOCK_WORKFLOW_ENGINE = value
}

describe('mock-engine dispatcher', () => {
  beforeEach(() => {
    localStorage.clear()
    _resetRegistry()
    setEnvFlag('')
  })

  describe('isMockEnabled', () => {
    it('returns false by default', () => {
      expect(isMockEnabled()).toBe(false)
    })

    it('returns true when env flag is "true"', () => {
      setEnvFlag('true')
      expect(isMockEnabled()).toBe(true)
    })

    it('localStorage "true" overrides env "false"', () => {
      setEnvFlag('false')
      localStorage.setItem('xayma:mock-workflow-engine', 'true')
      expect(isMockEnabled()).toBe(true)
    })

    it('localStorage "false" overrides env "true"', () => {
      setEnvFlag('true')
      localStorage.setItem('xayma:mock-workflow-engine', 'false')
      expect(isMockEnabled()).toBe(false)
    })
  })

  describe('registry', () => {
    it('returns null when no handler registered', () => {
      expect(lookupMockHandler('workflow', 'someOp')).toBeNull()
    })

    it('returns the registered handler', () => {
      const handler = vi.fn()
      registerMock('workflow', 'someOp', handler)
      expect(lookupMockHandler('workflow', 'someOp')).toBe(handler)
    })

    it('keys by (engine, operation) tuple', () => {
      const a = vi.fn()
      const b = vi.fn()
      registerMock('workflow', 'op', a)
      registerMock('deployment', 'op', b)
      expect(lookupMockHandler('workflow', 'op')).toBe(a)
      expect(lookupMockHandler('deployment', 'op')).toBe(b)
    })
  })
})
