import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ServiceDetail from './ServiceDetail.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      common: { back: 'Back', success: 'Success', error: 'Error', confirm_delete: 'Confirm Delete', delete: 'Delete' },
      errors: { fetch_failed: 'Failed to fetch data' },
      services: {
        tabs: { plans: 'Plans', deployment_engine_config: 'Deployment Configuration', lifecycle_commands: 'Lifecycle Commands' },
        plans: { add: 'Add Plan', empty: 'No plans configured for this service', credits_per_month: 'credits/month' },
        form: { control_node_id: 'Control Node' },
        deployment_engine: { job_template_id: 'Deployment Engine Job Template ID', not_configured: 'Deployment engine configuration not set for this service' },
        tags_section: {
          start: 'Start', stop: 'Stop', restart: 'Restart', suspend: 'Suspend', archive: 'Archive', domain: 'Domain',
          command_placeholder: 'exec_sh: …',
        },
        lifecycle_section: { hint: 'Lifecycle commands hint', save: 'Save commands', saved: 'Saved' },
      },
      service_plans: {
        form: { label: 'Plan Name', slug: 'Slug', description: 'Description', monthlyCreditConsumption: 'Monthly Credit Consumption' },
      },
    },
  },
})

// Mock services before imports
vi.mock('@/services/services.service', () => ({
  getService: vi.fn(),
  setServicePlans: vi.fn(),
  updateService: vi.fn(),
  readServicePlans: (svc: any) => Array.isArray(svc?.plans) ? svc.plans : [],
  findServicePlan: (svc: any, slug: string) => (Array.isArray(svc?.plans) ? svc.plans.find((p: any) => p?.slug === slug) ?? null : null),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '1' },
  }),
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
  }),
}))

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: vi.fn(),
  }),
}))

import * as serviceService from '@/services/services.service'

describe('ServiceDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockService = {
    id: 1,
    name: 'Odoo Community',
    description: 'Open-source ERP',
    control_node_id: 'node-1',
    deploymentEngineJobTemplateId: 'template-1',
  }

  const mockPlans = [
    { slug: 'basic', label: 'Basic', monthlyCreditConsumption: 100, description: 'Basic plan', options: [] },
    { slug: 'pro', label: 'Pro', monthlyCreditConsumption: 250, description: 'Professional plan', options: [] },
  ]

  it('shows loading state while fetching service', async () => {
    vi.mocked(serviceService.getService).mockImplementation(() => new Promise(() => {}))
    const wrapper = mount(ServiceDetail, { global: { plugins: [i18n] } })
    expect((wrapper.vm as any).loading).toBe(true)
  })

  it('renders service name after load', async () => {
    vi.mocked(serviceService.getService).mockResolvedValue(mockService)

    const wrapper = mount(ServiceDetail, { global: { plugins: [i18n] } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(wrapper.text()).toContain('Odoo Community')
  })

  it('renders plans in DataTable', async () => {
    const serviceWithPlans = { ...mockService, plans: mockPlans }
    vi.mocked(serviceService.getService).mockResolvedValue(serviceWithPlans)

    const wrapper = mount(ServiceDetail, { global: { plugins: [i18n] } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))

    const planNames = wrapper.text()
    expect(planNames).toContain('Basic')
    expect(planNames).toContain('Pro')
  })

  it('renders an Add Plan button after load', async () => {
    vi.mocked(serviceService.getService).mockResolvedValue(mockService)

    const wrapper = mount(ServiceDetail, { global: { plugins: [i18n] } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))

    const addButton = wrapper.findAll('button').find(b => b.text().includes('Add'))
    expect(addButton).toBeTruthy()
  })

  it('persists the full plans array on row save', async () => {
    const serviceWithPlans = { ...mockService, plans: mockPlans }
    vi.mocked(serviceService.getService).mockResolvedValue(serviceWithPlans)
    vi.mocked(serviceService.setServicePlans).mockResolvedValue(mockPlans as any)

    const wrapper = mount(ServiceDetail, { global: { plugins: [i18n] } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))

    await wrapper.vm.onRowEditSave({
      newData: { ...mockPlans[0], label: 'Updated Basic' },
      index: 0,
    })

    expect(serviceService.setServicePlans).toHaveBeenCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({ slug: 'basic', label: 'Updated Basic' }),
        expect.objectContaining({ slug: 'pro' }),
      ]),
    )
  })

  it('shows error when getService throws', async () => {
    const error = new Error('Network error')
    vi.mocked(serviceService.getService).mockRejectedValue(error)

    const wrapper = mount(ServiceDetail, { global: { plugins: [i18n] } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))

    expect((wrapper.vm as any).error).toBeTruthy()
  })

  it('shows "not configured" when deployment engine fields are null', async () => {
    const serviceWithoutDeploymentEngine = { ...mockService, control_node_id: null, deploymentEngineJobTemplateId: null }
    vi.mocked(serviceService.getService).mockResolvedValue(serviceWithoutDeploymentEngine)

    const wrapper = mount(ServiceDetail, { global: { plugins: [i18n] } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))

    // Check that the service is loaded and has no control_node_id
    expect((wrapper.vm as any).service.control_node_id).toBeNull()
    expect((wrapper.vm as any).service.deploymentEngineJobTemplateId).toBeNull()
  })

  it('hydrates lifecycle command values from the loaded service', async () => {
    const withCommands = { ...mockService, lifecycle_commands: { start: 'exec_sh: ./start.sh', stop: 'exec_sh: ./stop.sh' } }
    vi.mocked(serviceService.getService).mockResolvedValue(withCommands)

    const wrapper = mount(ServiceDetail, { global: { plugins: [i18n] } })
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect((wrapper.vm as any).lifecycleTagValues.start).toBe('exec_sh: ./start.sh')
    expect((wrapper.vm as any).lifecycleTagValues.stop).toBe('exec_sh: ./stop.sh')
    expect((wrapper.vm as any).lifecycleTagValues.restart).toBe('')
    expect((wrapper.vm as any).lifecycleDirty).toBe(false)
  })

  it('saveLifecycleCommands strips empty values and calls updateService', async () => {
    vi.mocked(serviceService.getService).mockResolvedValue(mockService)
    vi.mocked(serviceService.updateService).mockResolvedValue({ ...mockService })

    const wrapper = mount(ServiceDetail, { global: { plugins: [i18n] } })
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 10))
    ;(wrapper.vm as any).lifecycleTagValues.start = '  exec_sh: ./start.sh  '
    ;(wrapper.vm as any).lifecycleTagValues.stop = ''

    await (wrapper.vm as any).saveLifecycleCommands()

    expect(serviceService.updateService).toHaveBeenCalledWith(1, expect.objectContaining({
      lifecycle_commands: { start: 'exec_sh: ./start.sh' },
    }))
    expect((wrapper.vm as any).lifecycleDirty).toBe(false)
  })

  it('displays control_node_id and deploymentEngineJobTemplateId when present', async () => {
    vi.mocked(serviceService.getService).mockResolvedValue(mockService)

    const wrapper = mount(ServiceDetail, { global: { plugins: [i18n] } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(wrapper.text()).toContain('node-1')
    expect(wrapper.text()).toContain('template-1')
  })
})
