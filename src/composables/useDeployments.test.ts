/**
 * useDeployments tests
 * Tests for deployment actions: stop, start, restart, terminate, create
 * Covers XAYMA-100: correlationId present and correct in all webhook payloads
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDeployments } from './useDeployments'
import * as workflowEngineService from '@/services/workflow-engine'
import * as deploymentService from '@/services/deployments.service'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@/services/workflow-engine', () => ({
  performDeploymentAction: vi.fn(),
  createDeployment: vi.fn(),
  terminateDeployment: vi.fn(),
}))

vi.mock('@/stores/notifications.store', () => ({
  useNotificationStore: () => ({
    addSuccess: vi.fn(),
    addError: vi.fn(),
  }),
}))

vi.mock('@/services/supabase', () => ({
  supabase: {
    removeChannel: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
    })),
  },
}))

vi.mock('@/services/deployments.service', () => ({
  listDeployments: vi.fn(),
  getDeployment: vi.fn(),
  createDeployment: vi.fn(),
  isDeploymentSlugUnique: vi.fn(() => Promise.resolve(true)),
  hasPartnerSufficientCredits: vi.fn(() => Promise.resolve(true)),
}))

const MOCK_DEPLOYMENT = {
  id: 42,
  slug: 'my-app-xayma',
  label: 'My App',
  status: 'active',
  partner_id: 1,
  service_id: 1,
  plan_slug: 'starter',
  domainNames: ['my-app-xayma.xayma.sh'],
  created: new Date().toISOString(),
  modified: null,
}

async function loadDeployment(composable: ReturnType<typeof useDeployments>) {
  ;(deploymentService.listDeployments as any).mockResolvedValueOnce({
    data: [MOCK_DEPLOYMENT],
    count: 1,
    page: 1,
    pageSize: 100,
    totalPages: 1,
  })
  await composable.loadDeployments(1)
}

describe('useDeployments', () => {
  let composable: ReturnType<typeof useDeployments>

  beforeEach(() => {
    setActivePinia(createPinia())
    composable = useDeployments()
    vi.clearAllMocks()
  })

  // ─── performDeploymentAction ───────────────────────────────────────────────

  describe('performDeploymentAction — correlationId from loaded deployment', () => {
    it('includes slug as correlationId when deployment is loaded', async () => {
      await loadDeployment(composable)
      await composable.performDeploymentAction(MOCK_DEPLOYMENT.id, 'stop')

      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId: MOCK_DEPLOYMENT.id,
        correlationId: MOCK_DEPLOYMENT.slug,
        action: 'stop',
      })
    })

    it('includes slug as correlationId for start action', async () => {
      await loadDeployment(composable)
      await composable.performDeploymentAction(MOCK_DEPLOYMENT.id, 'start')

      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId: MOCK_DEPLOYMENT.id,
        correlationId: MOCK_DEPLOYMENT.slug,
        action: 'start',
      })
    })

    it('includes slug as correlationId for restart action', async () => {
      await loadDeployment(composable)
      await composable.performDeploymentAction(MOCK_DEPLOYMENT.id, 'restart')

      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId: MOCK_DEPLOYMENT.id,
        correlationId: MOCK_DEPLOYMENT.slug,
        action: 'restart',
      })
    })
  })

  describe('performDeploymentAction — correlationId fallback when deployment not in list', () => {
    it('falls back to String(deploymentId) when deployment not found', async () => {
      const unknownId = 999
      await composable.performDeploymentAction(unknownId, 'stop')

      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId: unknownId,
        correlationId: String(unknownId),
        action: 'stop',
      })
    })

    it('handles errors without throwing', async () => {
      ;(workflowEngineService.performDeploymentAction as any).mockRejectedValueOnce(
        new Error('webhook failed'),
      )
      await expect(composable.performDeploymentAction(1, 'stop')).resolves.toBeUndefined()
    })
  })

  // ─── stopDeployment / startDeployment / restartDeployment ─────────────────

  describe('stopDeployment', () => {
    it('calls performDeploymentAction with stop and fallback correlationId', async () => {
      await composable.stopDeployment(1)
      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId: 1,
        correlationId: '1',
        action: 'stop',
      })
    })

    it('handles errors without throwing', async () => {
      ;(workflowEngineService.performDeploymentAction as any).mockRejectedValueOnce(
        new Error('failed'),
      )
      await expect(composable.stopDeployment(1)).resolves.toBeUndefined()
    })
  })

  describe('startDeployment', () => {
    it('calls performDeploymentAction with start and fallback correlationId', async () => {
      await composable.startDeployment(2)
      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId: 2,
        correlationId: '2',
        action: 'start',
      })
    })

    it('handles errors without throwing', async () => {
      ;(workflowEngineService.performDeploymentAction as any).mockRejectedValueOnce(
        new Error('failed'),
      )
      await expect(composable.startDeployment(2)).resolves.toBeUndefined()
    })
  })

  describe('restartDeployment', () => {
    it('calls performDeploymentAction with restart and fallback correlationId', async () => {
      await composable.restartDeployment(3)
      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId: 3,
        correlationId: '3',
        action: 'restart',
      })
    })

    it('handles errors without throwing', async () => {
      ;(workflowEngineService.performDeploymentAction as any).mockRejectedValueOnce(
        new Error('failed'),
      )
      await expect(composable.restartDeployment(3)).resolves.toBeUndefined()
    })
  })

  // ─── terminateDeployment ──────────────────────────────────────────────────

  describe('terminateDeployment', () => {
    it('includes slug as correlationId when deployment is loaded', async () => {
      await loadDeployment(composable)
      await composable.terminateDeployment(MOCK_DEPLOYMENT.id)

      expect(workflowEngineService.terminateDeployment).toHaveBeenCalledWith({
        deploymentId: MOCK_DEPLOYMENT.id,
        correlationId: MOCK_DEPLOYMENT.slug,
      })
    })

    it('falls back to String(deploymentId) when deployment not in list', async () => {
      const unknownId = 77
      await composable.terminateDeployment(unknownId)

      expect(workflowEngineService.terminateDeployment).toHaveBeenCalledWith({
        deploymentId: unknownId,
        correlationId: String(unknownId),
      })
    })

    it('handles errors without throwing', async () => {
      ;(workflowEngineService.terminateDeployment as any).mockRejectedValueOnce(
        new Error('failed'),
      )
      await expect(composable.terminateDeployment(1)).resolves.toBeUndefined()
    })
  })

  // ─── createDeployment ─────────────────────────────────────────────────────

  describe('createDeployment', () => {
    const formData = {
      serviceId: 1,
      planSlug: 'starter',
      label: 'My App',
      domainNames: ['my-app-xayma.xayma.sh'],
      slug: 'my-app-xayma',
    }

    beforeEach(() => {
      ;(deploymentService.createDeployment as any).mockResolvedValue({
        id: 99,
        slug: 'my-app-xayma',
        label: 'My App',
        status: 'pending_deployment',
      })
    })

    it('includes slug as correlationId in the webhook payload', async () => {
      await composable.createDeployment(formData, 1, 10)

      expect(workflowEngineService.createDeployment).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'my-app-xayma',
          deploymentId: 99,
        }),
      )
    })

    it('returns null and does not call webhook when credits are insufficient', async () => {
      ;(deploymentService.hasPartnerSufficientCredits as any).mockResolvedValueOnce(false)

      const result = await composable.createDeployment(formData, 1, 10)

      expect(result).toBeNull()
      expect(workflowEngineService.createDeployment).not.toHaveBeenCalled()
    })
  })
})
