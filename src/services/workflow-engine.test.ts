import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as workflowEngineService from '@/services/workflow-engine'

// Mock fetch globally
global.fetch = vi.fn()

describe('Workflow Engine Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment
    ;(global.fetch as any).mockClear()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('callWorkflowEngineWebhook', () => {
    it('should successfully call webhook on 2xx response', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const payload = { deploymentId: 1, partnerId: 1 }

      await workflowEngineService.callWorkflowEngineWebhook('/webhook/test', payload)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhook/test'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      )
    })

    it('should throw WorkflowEngineError on 4xx client error (no retry)', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      })

      const payload = { invalid: 'data' }

      await expect(workflowEngineService.callWorkflowEngineWebhook('/webhook/test', payload)).rejects.toThrow(
        workflowEngineService.WorkflowEngineError
      )

      // Fetch should only be called once (no retry for 4xx)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should retry on 5xx error (server error)', async () => {
      vi.useFakeTimers()

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          text: async () => 'Bad gateway',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => 'Service unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })

      const payload = { deploymentId: 1 }

      const successPromise = workflowEngineService.callWorkflowEngineWebhook('/webhook/test', payload)
      await vi.runAllTimersAsync()
      await successPromise

      // Should have been called 4 times (1 initial + 3 retries)
      expect(global.fetch).toHaveBeenCalledTimes(4)
    })

    it('should throw WorkflowEngineError after max retries exceeded', async () => {
      vi.useFakeTimers()

      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service unavailable',
      })

      const payload = { deploymentId: 1 }

      // Attach rejection handler immediately to prevent unhandled rejection during timer advancement
      const rejectAssertion = expect(
        workflowEngineService.callWorkflowEngineWebhook('/webhook/test', payload)
      ).rejects.toThrow(workflowEngineService.WorkflowEngineError)
      await vi.runAllTimersAsync()
      await rejectAssertion

      // Should have been called MAX_RETRIES + 1 times
      expect(global.fetch).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
    })

    it('should not retry on 404 (client error)', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      })

      const payload = { deploymentId: 1 }

      await expect(workflowEngineService.callWorkflowEngineWebhook('/webhook/test', payload)).rejects.toThrow(
        workflowEngineService.WorkflowEngineError
      )

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should handle network errors (no retry)', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const payload = { deploymentId: 1 }

      await expect(workflowEngineService.callWorkflowEngineWebhook('/webhook/test', payload)).rejects.toThrow()

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('createDeployment', () => {
    it('should call webhook with deployment payload', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      })

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
        expect.stringContaining('/webhook/create-deployment'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      )
    })
  })

  describe('performDeploymentAction', () => {
    it('should call webhook with action payload', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const payload: any = {
        deploymentId: 1,
        action: 'stop',
      }

      await workflowEngineService.performDeploymentAction(payload)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhook/deployment-action'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      )
    })

    it('should handle start action', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const payload: any = {
        deploymentId: 1,
        action: 'start',
      }

      await workflowEngineService.performDeploymentAction(payload)

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should handle restart action', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const payload: any = {
        deploymentId: 1,
        action: 'restart',
      }

      await workflowEngineService.performDeploymentAction(payload)

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('terminateDeployment', () => {
    it('should call terminate webhook', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const payload: any = {
        deploymentId: 1,
      }

      await workflowEngineService.terminateDeployment(payload)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhook/terminate-deployment'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      )
    })
  })

  describe('WorkflowEngineError', () => {
    it('should create error with status code', () => {
      const error = new workflowEngineService.WorkflowEngineError(500, 'Internal server error')

      expect(error).toBeInstanceOf(Error)
      expect(error.statusCode).toBe(500)
      expect(error.originalError).toBe('Internal server error')
      expect(error.message).toContain('500')
    })

    it('should create error without status code', () => {
      const error = new workflowEngineService.WorkflowEngineError(undefined, new Error('Network failed'))

      expect(error.statusCode).toBeUndefined()
      expect(error.originalError).toBeInstanceOf(Error)
    })
  })

  describe('Error handling', () => {
    it('should normalize network errors to WorkflowEngineError', async () => {
      ;(global.fetch as any).mockRejectedValue(new TypeError('fetch failed'))

      await expect(workflowEngineService.callWorkflowEngineWebhook('/webhook/test', {})).rejects.toThrow(
        workflowEngineService.WorkflowEngineError
      )
    })

    it('should preserve error details in WorkflowEngineError', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => 'Unprocessable entity details',
      })

      try {
        await workflowEngineService.callWorkflowEngineWebhook('/webhook/test', {})
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
