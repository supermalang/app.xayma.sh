/**
 * useDeployments tests
 * Tests for deployment actions: stop, start, restart
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDeployments } from './useDeployments'
import * as workflowEngineService from '@/services/workflow-engine'

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

// Mock workflow engine
vi.mock('@/services/workflow-engine', () => ({
  performDeploymentAction: vi.fn(),
}))

// Mock notifications store
vi.mock('@/stores/notifications.store', () => ({
  useNotificationStore: () => ({
    addSuccess: vi.fn(),
    addError: vi.fn(),
  }),
}))

// Mock supabase
vi.mock('@/services/supabase', () => ({
  supabase: {
    removeChannel: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
  },
}))

// Mock deployment service
vi.mock('@/services/deployments.service', () => ({
  listDeployments: vi.fn(),
  getDeployment: vi.fn(),
  hasPartnerSufficientCredits: vi.fn(() => Promise.resolve(true)),
}))

describe('useDeployments', () => {
  let deployments: ReturnType<typeof useDeployments>

  beforeEach(() => {
    setActivePinia(createPinia())
    deployments = useDeployments()
    vi.clearAllMocks()
  })

  describe('stopDeployment', () => {
    it('should call workflow engine with stop action', async () => {
      const deploymentId = 1
      await deployments.stopDeployment(deploymentId)

      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId,
        action: 'stop',
      })
    })

    it('should handle workflow engine errors gracefully', async () => {
      const deploymentId = 1
      const mockError = new Error('workflow failed')
      ;(workflowEngineService.performDeploymentAction as any).mockRejectedValueOnce(mockError)

      // Should not throw
      await expect(deployments.stopDeployment(deploymentId)).resolves.toBeUndefined()
    })
  })

  describe('startDeployment', () => {
    it('should call workflow engine with start action', async () => {
      const deploymentId = 2
      await deployments.startDeployment(deploymentId)

      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId,
        action: 'start',
      })
    })

    it('should handle workflow engine errors gracefully', async () => {
      const deploymentId = 2
      const mockError = new Error('workflow failed')
      ;(workflowEngineService.performDeploymentAction as any).mockRejectedValueOnce(mockError)

      // Should not throw
      await expect(deployments.startDeployment(deploymentId)).resolves.toBeUndefined()
    })
  })

  describe('restartDeployment', () => {
    it('should call workflow engine with restart action', async () => {
      const deploymentId = 3
      await deployments.restartDeployment(deploymentId)

      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId,
        action: 'restart',
      })
    })

    it('should handle workflow engine errors gracefully', async () => {
      const deploymentId = 3
      const mockError = new Error('workflow failed')
      ;(workflowEngineService.performDeploymentAction as any).mockRejectedValueOnce(mockError)

      // Should not throw
      await expect(deployments.restartDeployment(deploymentId)).resolves.toBeUndefined()
    })
  })

  describe('performDeploymentAction', () => {
    it('should call workflow engine with correct payload for stop', async () => {
      const deploymentId = 5
      await deployments.performDeploymentAction(deploymentId, 'stop')

      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId,
        action: 'stop',
      })
    })

    it('should call workflow engine with correct payload for start', async () => {
      const deploymentId = 5
      await deployments.performDeploymentAction(deploymentId, 'start')

      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId,
        action: 'start',
      })
    })

    it('should call workflow engine with correct payload for restart', async () => {
      const deploymentId = 5
      await deployments.performDeploymentAction(deploymentId, 'restart')

      expect(workflowEngineService.performDeploymentAction).toHaveBeenCalledWith({
        deploymentId,
        action: 'restart',
      })
    })

    it('should handle errors without throwing', async () => {
      const deploymentId = 5
      const mockError = new Error('workflow failed')
      ;(workflowEngineService.performDeploymentAction as any).mockRejectedValueOnce(mockError)

      // Should not throw
      await expect(deployments.performDeploymentAction(deploymentId, 'stop')).resolves.toBeUndefined()
    })
  })
})
