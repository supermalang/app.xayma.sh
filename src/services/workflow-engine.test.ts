import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as workflowEngineService from '@/services/workflow-engine'

const WORKFLOW_URL = 'https://workflow.example.com/webhook/abc'
const WORKFLOW_TOKEN = 'wf-token-123'
const DEPLOYMENT_URL = 'https://deploy.example.com/webhook/xyz'
const DEPLOYMENT_TOKEN = 'dep-token-456'

// Mock the settings service so engine config lookups don't hit Supabase.
vi.mock('@/services/settings', () => ({
  getSetting: vi.fn((key: string) => {
    switch (key) {
      case 'WORKFLOW_ENGINE_URL':   return Promise.resolve(WORKFLOW_URL)
      case 'WORKFLOW_ENGINE_API_KEY': return Promise.resolve(WORKFLOW_TOKEN)
      case 'DEPLOYMENT_ENGINE_URL': return Promise.resolve(DEPLOYMENT_URL)
      case 'DEPLOYMENT_ENGINE_API_KEY': return Promise.resolve(DEPLOYMENT_TOKEN)
      default: return Promise.resolve(null)
    }
  }),
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('Workflow Engine Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockClear()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('callWorkflowEngineWebhook', () => {
    it('POSTs to the workflow URL with ?operation=<name> and Bearer auth', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true, status: 200 })

      const payload = { deploymentId: 1, partnerId: 1 }
      await workflowEngineService.callWorkflowEngineWebhook('testOperation', payload)

      expect(global.fetch).toHaveBeenCalledWith(
        `${WORKFLOW_URL}?operation=testOperation`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${WORKFLOW_TOKEN}`,
          }),
          body: JSON.stringify(payload),
        })
      )
    })

    it('throws WorkflowEngineError on 4xx client error (no retry)', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      })

      await expect(
        workflowEngineService.callWorkflowEngineWebhook('testOperation', { invalid: 'data' })
      ).rejects.toThrow(workflowEngineService.WorkflowEngineError)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('retries up to 3 times on 5xx error', async () => {
      vi.useFakeTimers()
      ;(global.fetch as any)
        .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Internal server error' })
        .mockResolvedValueOnce({ ok: false, status: 502, text: async () => 'Bad gateway' })
        .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'Service unavailable' })
        .mockResolvedValueOnce({ ok: true, status: 200 })

      const successPromise = workflowEngineService.callWorkflowEngineWebhook('testOperation', { deploymentId: 1 })
      await vi.runAllTimersAsync()
      await successPromise

      // 1 initial + 3 retries
      expect(global.fetch).toHaveBeenCalledTimes(4)
    })

    it('throws WorkflowEngineError after max retries exceeded', async () => {
      vi.useFakeTimers()
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service unavailable',
      })

      const rejectAssertion = expect(
        workflowEngineService.callWorkflowEngineWebhook('testOperation', { deploymentId: 1 })
      ).rejects.toThrow(workflowEngineService.WorkflowEngineError)
      await vi.runAllTimersAsync()
      await rejectAssertion

      expect(global.fetch).toHaveBeenCalledTimes(4)
    })

    it('does not retry on 404 (client error)', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      })

      await expect(
        workflowEngineService.callWorkflowEngineWebhook('testOperation', { deploymentId: 1 })
      ).rejects.toThrow(workflowEngineService.WorkflowEngineError)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('does not retry on network errors', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      await expect(
        workflowEngineService.callWorkflowEngineWebhook('testOperation', { deploymentId: 1 })
      ).rejects.toThrow()
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('merges &operation= when the configured URL already has a query string', async () => {
      // Override the mock for this case
      const { getSetting } = await import('@/services/settings')
      ;(getSetting as any).mockImplementationOnce((key: string) => {
        return key === 'WORKFLOW_ENGINE_URL'
          ? Promise.resolve(`${WORKFLOW_URL}?tenant=acme`)
          : Promise.resolve(WORKFLOW_TOKEN)
      })
      ;(getSetting as any).mockImplementationOnce(() => Promise.resolve(WORKFLOW_TOKEN))
      ;(global.fetch as any).mockResolvedValue({ ok: true, status: 200 })

      await workflowEngineService.callWorkflowEngineWebhook('testOperation', {})

      expect(global.fetch).toHaveBeenCalledWith(
        `${WORKFLOW_URL}?tenant=acme&operation=testOperation`,
        expect.any(Object)
      )
    })
  })

  describe('Deployment engine routing', () => {
    it('createDeployment hits the deployment engine URL with ?operation=createDeployment', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true, status: 200 })

      const payload: any = {
        deploymentId: 1,
        partnerId: 1,
        serviceId: 1,
        planSlug: 'starter',
        serviceVersion: '15.0',
        domainNames: ['odoo.example.com'],
        label: 'My Odoo Instance',
      }
      await workflowEngineService.createDeployment(payload)

      expect(global.fetch).toHaveBeenCalledWith(
        `${DEPLOYMENT_URL}?operation=createDeployment`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${DEPLOYMENT_TOKEN}`,
          }),
          body: JSON.stringify(payload),
        })
      )
    })

    it('performDeploymentAction hits the deployment engine', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true, status: 200 })

      await workflowEngineService.performDeploymentAction({ deploymentId: 1, action: 'stop' })

      expect(global.fetch).toHaveBeenCalledWith(
        `${DEPLOYMENT_URL}?operation=deploymentAction`,
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: `Bearer ${DEPLOYMENT_TOKEN}` }),
        })
      )
    })

    it('terminateDeployment hits the deployment engine', async () => {
      ;(global.fetch as any).mockResolvedValue({ ok: true, status: 200 })

      await workflowEngineService.terminateDeployment({ deploymentId: 1 })

      expect(global.fetch).toHaveBeenCalledWith(
        `${DEPLOYMENT_URL}?operation=terminateDeployment`,
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: `Bearer ${DEPLOYMENT_TOKEN}` }),
        })
      )
    })
  })

  describe('WorkflowEngineError', () => {
    it('exposes statusCode and originalError', () => {
      const error = new workflowEngineService.WorkflowEngineError(500, 'Internal server error')
      expect(error).toBeInstanceOf(Error)
      expect(error.statusCode).toBe(500)
      expect(error.originalError).toBe('Internal server error')
      expect(error.message).toContain('500')
    })

    it('can be constructed without a status code', () => {
      const error = new workflowEngineService.WorkflowEngineError(undefined, new Error('Network failed'))
      expect(error.statusCode).toBeUndefined()
      expect(error.originalError).toBeInstanceOf(Error)
    })
  })

  describe('Error handling', () => {
    it('normalizes network errors to WorkflowEngineError', async () => {
      ;(global.fetch as any).mockRejectedValue(new TypeError('fetch failed'))

      await expect(
        workflowEngineService.callWorkflowEngineWebhook('testOperation', {})
      ).rejects.toThrow(workflowEngineService.WorkflowEngineError)
    })

    it('preserves status code on 4xx', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => 'Unprocessable entity details',
      })

      try {
        await workflowEngineService.callWorkflowEngineWebhook('testOperation', {})
      } catch (error) {
        expect(error).toBeInstanceOf(workflowEngineService.WorkflowEngineError)
        expect((error as workflowEngineService.WorkflowEngineError).statusCode).toBe(422)
      }
    })
  })

  describe('testEngineConnection', () => {
    const targetUrl = 'https://n8n.example.com/webhook/ping'
    const apiKey = 'test-api-key-123'

    const mockHttp = (status: number, body: unknown) =>
      (global.fetch as any).mockResolvedValue({
        status,
        json: async () => {
          if (body instanceof Error) throw body
          return body
        },
      })

    it('returns ok=true on HTTP 200 with { success: true } and forwards URL + Bearer token', async () => {
      mockHttp(200, { success: true })

      const result = await workflowEngineService.testEngineConnection(targetUrl, apiKey)

      expect(result).toEqual({ ok: true })
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        targetUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          }),
          body: '{}',
        })
      )
    })

    it('returns ok=false when HTTP 200 but body is { success: false }', async () => {
      mockHttp(200, { success: false })
      expect(await workflowEngineService.testEngineConnection(targetUrl, apiKey)).toEqual({ ok: false })
    })

    it('returns ok=false when HTTP 200 but body is not JSON', async () => {
      mockHttp(200, new SyntaxError('Unexpected token'))
      expect(await workflowEngineService.testEngineConnection(targetUrl, apiKey)).toEqual({ ok: false })
    })

    it('returns ok=false on HTTP 500', async () => {
      mockHttp(500, { success: true })
      expect(await workflowEngineService.testEngineConnection(targetUrl, apiKey)).toEqual({ ok: false })
    })

    it('returns ok=false on network error / abort', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('network down'))
      expect(await workflowEngineService.testEngineConnection(targetUrl, apiKey)).toEqual({ ok: false })
    })

    it('returns ok=false and skips fetch when URL or token is empty or whitespace-only', async () => {
      const a = await workflowEngineService.testEngineConnection('', apiKey)
      const b = await workflowEngineService.testEngineConnection(targetUrl, '')
      const c = await workflowEngineService.testEngineConnection('   ', '   ')

      expect(a).toEqual({ ok: false })
      expect(b).toEqual({ ok: false })
      expect(c).toEqual({ ok: false })
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})
