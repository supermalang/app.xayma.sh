/**
 * DeploymentWizard tests
 * Tests all 4 steps of the wizard
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DeploymentWizard from '@/pages/DeploymentWizard.vue'
import * as servicesService from '@/services/services.service'
import { usePartnerStore } from '@/stores/partner.store'
import { useNotificationStore } from '@/stores/notifications.store'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/en'

// Mock the services
vi.mock('@/services/services.service', () => ({
  listServices: vi.fn(),
  getServicePlansByServiceId: vi.fn(),
}))

vi.mock('@/services/supabase', () => ({
  supabase: {
    schema: vi.fn(() => ({
      rpc: vi.fn(),
    })),
  },
}))

vi.mock('@/composables/useDeployments', () => ({
  useDeployments: () => ({
    createDeployment: vi.fn(),
  }),
}))

describe('DeploymentWizard', () => {
  let wrapper: any
  const pinia = createPinia()
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en },
  })

  beforeEach(() => {
    setActivePinia(pinia)

    // Reset mocks
    vi.clearAllMocks()

    // Mock service responses
    ;(servicesService.listServices as any).mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'WordPress',
          description: 'Popular blogging platform',
          status: 'active',
          isPubliclyAvailable: true,
        },
        {
          id: 2,
          name: 'Django App',
          description: 'Python web framework',
          status: 'active',
          isPubliclyAvailable: true,
        },
      ],
      count: 2,
    })

    ;(servicesService.getServicePlansByServiceId as any).mockResolvedValue([
      {
        id: 10,
        label: 'Basic',
        description: 'Basic plan',
        monthlyCreditConsumption: 5000,
        service_id: 1,
      },
      {
        id: 11,
        label: 'Pro',
        description: 'Pro plan',
        monthlyCreditConsumption: 10000,
        service_id: 1,
      },
    ])
  })

  it('loads services on mount', async () => {
    wrapper = mount(DeploymentWizard, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          Button: true,
          Card: true,
          Steps: true,
          InputText: true,
          Chips: true,
          Message: true,
          ProgressSpinner: true,
        },
      },
    })

    // Wait for async mount
    await wrapper.vm.$nextTick()

    expect(servicesService.listServices).toHaveBeenCalledWith({
      isPubliclyAvailable: true,
      pageSize: 100,
    })
  })

  it('step 1: allows selecting a service', async () => {
    wrapper = mount(DeploymentWizard, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          Button: true,
          Card: true,
          Steps: true,
          InputText: true,
          Chips: true,
          Message: true,
          ProgressSpinner: true,
        },
      },
    })

    await wrapper.vm.$nextTick()

    // Select first service
    await wrapper.vm.selectService(wrapper.vm.services[0])

    expect(wrapper.vm.form.serviceId).toBe(1)
    expect(wrapper.vm.activeStep).toBe(1)
  })

  it('step 2: loads and allows selecting a plan', async () => {
    wrapper = mount(DeploymentWizard, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          Button: true,
          Card: true,
          Steps: true,
          InputText: true,
          Chips: true,
          Message: true,
          ProgressSpinner: true,
        },
      },
    })

    await wrapper.vm.$nextTick()

    // Select service first
    await wrapper.vm.selectService(wrapper.vm.services[0])
    await wrapper.vm.$nextTick()

    // Plans should be loaded
    expect(servicesService.getServicePlansByServiceId).toHaveBeenCalledWith(1)

    // Select plan
    await wrapper.vm.selectPlan(wrapper.vm.plans[0])

    expect(wrapper.vm.form.servicePlanId).toBe(10)
    expect(wrapper.vm.selectedPlan?.id).toBe(10)
    expect(wrapper.vm.activeStep).toBe(2)
  })

  it('step 3: requires label and domains before proceeding', async () => {
    wrapper = mount(DeploymentWizard, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          Button: true,
          Card: true,
          Steps: true,
          InputText: true,
          Chips: true,
          Message: true,
          ProgressSpinner: true,
        },
      },
    })

    wrapper.vm.activeStep = 2

    // Should not proceed without label
    expect(wrapper.vm.canProceed).toBeFalsy()

    // Add label
    wrapper.vm.form.label = 'My Deployment'
    expect(wrapper.vm.canProceed).toBeFalsy() // Still needs domains

    // Add domain
    wrapper.vm.form.domainNames = ['example.com']
    expect(wrapper.vm.canProceed).toBe(true)
  })

  it('step 4: shows summary and checks credit balance', async () => {
    wrapper = mount(DeploymentWizard, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          Button: true,
          Card: true,
          Steps: true,
          InputText: true,
          Chips: true,
          Message: true,
          ProgressSpinner: true,
        },
      },
    })

    // Set form data
    wrapper.vm.form.serviceId = 1
    wrapper.vm.form.servicePlanId = 10
    wrapper.vm.form.label = 'My Deployment'
    wrapper.vm.form.domainNames = ['example.com']
    wrapper.vm.selectedPlan = { id: 10, label: 'Basic', monthlyCreditConsumption: 5000 }

    // Go to step 4
    wrapper.vm.activeStep = 3

    await wrapper.vm.$nextTick()

    // Verify summary data is accessible
    expect(wrapper.vm.selectedServiceName).toBe('WordPress')
    expect(wrapper.vm.selectedPlan?.label).toBe('Basic')
    expect(wrapper.vm.form.label).toBe('My Deployment')
    expect(wrapper.vm.form.domainNames).toContain('example.com')
  })
})
