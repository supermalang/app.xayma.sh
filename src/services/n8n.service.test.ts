import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as n8nService from '@/services/n8n.ts'

// Mock fetch globally
global.fetch = vi.fn()

describe('n8n Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment
    ;(global.fetch as any).mockClear()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('callN8nWebhook', () => {
    it('should successfully call webhook on 2xx response', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const payload = { deploymentId: 1, partnerId: 1 }

      await n8nService.callN8nWebhook('/webhook/test', payload)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhook/test'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      )
    })

    it('should throw N8nError on 4xx client error (no retry)', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      })

      const payload = { invalid: 'data' }

      await expect(n8nService.callN8nWebhook('/webhook/test', payload)).rejects.toThrow(
        n8nService.N8nError
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

      const successPromise = n8nService.callN8nWebhook('/webhook/test', payload)
      await vi.runAllTimersAsync()
      await successPromise

      // Should have been called 4 times (1 initial + 3 retries)
      expect(global.fetch).toHaveBeenCalledTimes(4)
    })

    it('should throw N8nError after max retries exceeded', async () => {
      vi.useFakeTimers()

      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service unavailable',
      })

      const payload = { deploymentId: 1 }

      // Attach rejection handler immediately to prevent unhandled rejection during timer advancement
      const rejectAssertion = expect(
        n8nService.callN8nWebhook('/webhook/test', payload)
      ).rejects.toThrow(n8nService.N8nError)
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

      await expect(n8nService.callN8nWebhook('/webhook/test', payload)).rejects.toThrow(
        n8nService.N8nError
      )

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should handle network errors (no retry)', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const payload = { deploymentId: 1 }

      await expect(n8nService.callN8nWebhook('/webhook/test', payload)).rejects.toThrow()

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
        servicePlanId: 1,
        serviceVersion: '15.0',
        domainNames: ['odoo.example.com'],
        label: 'My Odoo Instance',
      }

      await n8nService.createDeployment(payload)

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

      await n8nService.performDeploymentAction(payload)

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

      await n8nService.performDeploymentAction(payload)

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

      await n8nService.performDeploymentAction(payload)

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

      await n8nService.terminateDeployment(payload)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhook/terminate-deployment'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      )
    })
  })

  describe('N8nError', () => {
    it('should create error with status code', () => {
      const error = new n8nService.N8nError(500, 'Internal server error')

      expect(error).toBeInstanceOf(Error)
      expect(error.statusCode).toBe(500)
      expect(error.originalError).toBe('Internal server error')
      expect(error.message).toContain('500')
    })

    it('should create error without status code', () => {
      const error = new n8nService.N8nError(undefined, new Error('Network failed'))

      expect(error.statusCode).toBeUndefined()
      expect(error.originalError).toBeInstanceOf(Error)
    })
  })

  describe('Error handling', () => {
    it('should normalize network errors to N8nError', async () => {
      ;(global.fetch as any).mockRejectedValue(new TypeError('fetch failed'))

      await expect(n8nService.callN8nWebhook('/webhook/test', {})).rejects.toThrow(
        n8nService.N8nError
      )
    })

    it('should preserve error details in N8nError', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => 'Unprocessable entity details',
      })

      try {
        await n8nService.callN8nWebhook('/webhook/test', {})
      } catch (error) {
        expect(error).toBeInstanceOf(n8nService.N8nError)
        expect((error as n8nService.N8nError).statusCode).toBe(422)
      }
    })
  })
})
