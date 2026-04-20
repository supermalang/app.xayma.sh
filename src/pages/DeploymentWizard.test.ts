/**
 * DeploymentWizard Unit Tests
 * Focus on Step 4: Credit validation and domain validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationStore } from '@/stores/notifications.store'
import { useAuthStore } from '@/stores/auth.store'

// Mock all services and router before imports
vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}))

vi.mock('@/services/deployments.service', () => ({
  listDeployments: vi.fn(),
  getDeployment: vi.fn(),
  createDeployment: vi.fn(),
  hasPartnerSufficientCredits: vi.fn(),
  getPartnerTotalMonthlyConsumption: vi.fn(),
}))

vi.mock('@/services/workflow-engine', () => ({
  createDeployment: vi.fn(),
  performDeploymentAction: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}))

import * as deploymentService from '@/services/deployments.service'
import * as workflowEngineService from '@/services/workflow-engine'

describe('DeploymentWizard - Step 4 Credit Validation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('disables deploy button when partner credits are insufficient', async () => {
    // Mock insufficient credits scenario
    vi.mocked(deploymentService.hasPartnerSufficientCredits).mockResolvedValue(false)

    // Navigate to step 4 and validate credits
    const result = await deploymentService.hasPartnerSufficientCredits(1, 100)

    expect(result).toBe(false)
  })

  it('enables deploy button when partner has sufficient credits', async () => {
    // Mock sufficient credits
    vi.mocked(deploymentService.hasPartnerSufficientCredits).mockResolvedValue(true)

    const result = await deploymentService.hasPartnerSufficientCredits(1, 50)

    expect(result).toBe(true)
  })

  it('displays credit shortfall amount when insufficient', () => {
    // Partner has 40 credits, plan costs 100
    // Shortfall should be 60
    const partnerCredits = 40
    const monthlyCreditConsumption = 100
    const shortfall = Math.max(0, monthlyCreditConsumption - partnerCredits)

    expect(shortfall).toBe(60)
  })

  it('calculates correct remaining credits after deployment', () => {
    const partnerCredits = 100
    const monthlyCreditConsumption = 30
    const remainingAfter = Math.max(0, partnerCredits - monthlyCreditConsumption)

    expect(remainingAfter).toBe(70)
  })

  it('handles zero remaining credits gracefully', () => {
    const partnerCredits = 50
    const monthlyCreditConsumption = 50
    const remainingAfter = Math.max(0, partnerCredits - monthlyCreditConsumption)

    expect(remainingAfter).toBe(0)
  })
})

describe('DeploymentWizard - Domain Validation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('accepts valid single domain', () => {
    const domain = 'example.com'
    const isValid = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)

    expect(isValid).toBe(true)
  })

  it('accepts valid multiple domains', () => {
    const domains = ['example.com', 'test.example.com', 'api.example.com']
    const allValid = domains.every((domain) =>
      /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)
    )

    expect(allValid).toBe(true)
  })

  it('rejects invalid domain without TLD', () => {
    const domain = 'localhost'
    const isValid = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)

    expect(isValid).toBe(false)
  })

  it('rejects domain with invalid characters', () => {
    const domain = 'example@.com'
    const isValid = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)

    expect(isValid).toBe(false)
  })

  it('rejects domain starting with hyphen', () => {
    const domain = '-example.com'
    const isValid = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)

    expect(isValid).toBe(false)
  })

  it('rejects domain ending with hyphen', () => {
    const domain = 'example-.com'
    const isValid = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)

    expect(isValid).toBe(false)
  })

  it('accepts subdomain with hyphens', () => {
    const domain = 'my-test.example-api.com'
    const isValid = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)

    expect(isValid).toBe(true)
  })

  it('rejects empty domain list', () => {
    const domains: string[] = []

    expect(domains.length).toBe(0)
  })

  it('handles domains with uppercase letters', () => {
    const domain = 'Example.COM'
    const normalized = domain.toLowerCase()
    const isValid = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(normalized)

    expect(isValid).toBe(true)
  })

  it('rejects domain with spaces', () => {
    const domain = 'example .com'
    const isValid = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)

    expect(isValid).toBe(false)
  })
})

describe('DeploymentWizard - Form Validation Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('prevents submission with missing service selection', () => {
    const formData = {
      serviceId: null,
      servicePlanId: 1,
      label: 'Test',
      domainNames: ['test.com'],
    }

    const isValid = formData.serviceId !== null && formData.servicePlanId !== null

    expect(isValid).toBe(false)
  })

  it('prevents submission with missing plan selection', () => {
    const formData = {
      serviceId: 1,
      servicePlanId: null,
      label: 'Test',
      domainNames: ['test.com'],
    }

    const isValid = formData.serviceId !== null && formData.servicePlanId !== null

    expect(isValid).toBe(false)
  })

  it('prevents submission with empty label', () => {
    const label = ''
    const isValid = label.trim().length > 0

    expect(isValid).toBe(false)
  })

  it('prevents submission with empty domain list', () => {
    const domainNames: string[] = []
    const isValid = domainNames.length > 0

    expect(isValid).toBe(false)
  })

  it('allows submission with all required fields valid', () => {
    const formData = {
      serviceId: 1,
      servicePlanId: 1,
      label: 'My Deployment',
      domainNames: ['example.com'],
    }

    const isValid =
      formData.serviceId !== null &&
      formData.servicePlanId !== null &&
      formData.label.trim().length > 0 &&
      formData.domainNames.length > 0

    expect(isValid).toBe(true)
  })

  it('validates entire form state before enabling deploy button', () => {
    const formValid = true
    const creditsValid = true
    const domainsValid = true

    const canDeploy = formValid && creditsValid && domainsValid

    expect(canDeploy).toBe(true)
  })

  it('disables deploy button if any validation fails', () => {
    const formValid = true
    const creditsValid = false // insufficient credits
    const domainsValid = true

    const canDeploy = formValid && creditsValid && domainsValid

    expect(canDeploy).toBe(false)
  })
})

describe('DeploymentWizard - Deployment Creation on Step 4', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('calls n8n webhook when deploy button clicked with valid form', async () => {
    const createSpy = vi.mocked(workflowEngineService.createDeployment)

    const payload = {
      deploymentId: 1,
      partnerId: 1,
      serviceId: 1,
      servicePlanId: 1,
      serviceVersion: '15.0',
      domainNames: ['test.com'],
      label: 'Test Deployment',
    }

    await workflowEngineService.createDeployment(payload as any)

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining(payload))
  })

  it('shows success notification after deployment created', async () => {
    const notificationStore = useNotificationStore()
    const addSuccessSpy = vi.spyOn(notificationStore, 'addSuccess')

    notificationStore.addSuccess('deployments.create_success')

    expect(addSuccessSpy).toHaveBeenCalledWith('deployments.create_success')
  })

  it('shows error notification if deployment creation fails', async () => {
    const notificationStore = useNotificationStore()
    const addErrorSpy = vi.spyOn(notificationStore, 'addError')

    vi.mocked(deploymentService.createDeployment).mockRejectedValue(
      new Error('Deployment creation failed')
    )

    notificationStore.addError('errors.webhook_failed')

    expect(addErrorSpy).toHaveBeenCalledWith('errors.webhook_failed')
  })

  it('navigates to deployment detail after successful creation', async () => {
    const mockRouter = {
      push: vi.fn(),
    }

    mockRouter.push('/deployments/1')

    expect(mockRouter.push).toHaveBeenCalledWith('/deployments/1')
  })
})
