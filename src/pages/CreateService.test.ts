import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import en from '@/i18n/en'
import CreateService from './CreateService.vue'
import * as servicesService from '@/services/services.service'

const pushMock = vi.fn()
const backMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
}))

vi.mock('@/services/services.service', () => ({
  createService: vi.fn(),
  uploadServiceLogo: vi.fn(),
}))

const fetchTemplatesMock = vi.fn()
vi.mock('@/services/workflow-engine', () => ({
  fetchDeploymentTemplates: (...args: unknown[]) => fetchTemplatesMock(...args),
}))

const loadSettingsMock = vi.fn()
const settingsRef = { value: {} as Record<string, string> }
vi.mock('@/composables/useSettings', () => ({
  useSettings: () => ({ settings: settingsRef, loadSettings: loadSettingsMock }),
}))

const toastAdd = vi.fn()
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAdd }),
}))

function makeWrapper() {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en: en as any },
  })
  setActivePinia(createPinia())
  return mount(CreateService, {
    global: {
      plugins: [i18n, PrimeVue, ToastService],
    },
  })
}

describe('CreateService.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    settingsRef.value = {
      DEPLOYMENT_ENGINE_URL: 'https://engine.example/webhook/x',
      DEPLOYMENT_ENGINE_API_KEY: 'tok',
    }
    fetchTemplatesMock.mockResolvedValue([])
  })

  it('renders the four mockup sections', () => {
    const w = makeWrapper()
    expect(w.text()).toContain('Create New Service')
    expect(w.text()).toContain('01.')
    expect(w.text()).toContain('Basic Info')
    expect(w.text()).toContain('02.')
    expect(w.text()).toContain('Service Plans')
    expect(w.text()).toContain('03.')
    expect(w.text()).toContain('Versions')
    expect(w.text()).toContain('04.')
    expect(w.text()).toContain('Technical Tags')
  })

  it('auto-generates the slug from the name', async () => {
    const w = makeWrapper()
    const nameInput = w.find('[data-test="service-name"] input')
    await nameInput.setValue('Odoo Enterprise v16')
    expect(w.find('[data-test="service-slug"]').text()).toContain('odoo-enterprise-v16')
  })

  it('disables Save until name is non-empty', async () => {
    const w = makeWrapper()
    const save = w.find('button[data-test="save-service"]')
    expect(save.attributes('disabled')).toBeDefined()
    await w.find('[data-test="service-name"] input').setValue('My Service')
    expect(save.attributes('disabled')).toBeUndefined()
  })

  it('adds and removes a plan tier draft', async () => {
    const w = makeWrapper()
    await w.find('button[data-test="add-tier"]').trigger('click')
    expect(w.findAll('[data-test="tier-card"]').length).toBe(1)
    await w.find('button[data-test="remove-tier-0"]').trigger('click')
    expect(w.findAll('[data-test="tier-card"]').length).toBe(0)
  })

  it('submits service with inline plans and navigates to detail', async () => {
    ;(servicesService.createService as any).mockResolvedValue({ id: 42, name: 'X', slug: 'x' })
    const w = makeWrapper()
    await w.find('[data-test="service-name"] input').setValue('My Service')
    await w.find('button[data-test="add-tier"]').trigger('click')
    await w.find('[data-test="tier-label-0"] input').setValue('Starter')
    const creditsInput = w.find('[data-test="tier-credits-0"] input')
    await creditsInput.setValue('15000')
    await creditsInput.trigger('blur')
    await w.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(servicesService.createService).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Service',
        slug: 'my-service',
        plans: [
          expect.objectContaining({ slug: 'starter', label: 'Starter', monthlyCreditConsumption: 15000 }),
        ],
      })
    )
    expect(pushMock).toHaveBeenCalledWith('/services/42')
  })

  it('fetches deployment templates with the configured engine URL + token', async () => {
    fetchTemplatesMock.mockResolvedValue([
      { id: 23, url: '/api/v2/job_templates/23/', name: 'Deploy Mautic' },
    ])
    makeWrapper()
    await flushPromises()
    expect(fetchTemplatesMock).toHaveBeenCalledWith(
      'https://engine.example/webhook/x',
      'tok',
    )
  })

  it('persists the selected deployment template (id, url, name) on save', async () => {
    fetchTemplatesMock.mockResolvedValue([
      { id: 9, url: '/api/v2/job_templates/9/', name: 'Deploy Odoo' },
    ])
    ;(servicesService.createService as any).mockResolvedValue({ id: 7, name: 'X', slug: 'x' })
    const w = makeWrapper()
    await flushPromises()
    await w.find('[data-test="service-name"] input').setValue('My Service')
    ;(w.vm as any).form.deployment_template = {
      id: 9,
      url: '/api/v2/job_templates/9/',
      name: 'Deploy Odoo',
    }
    await w.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(servicesService.createService).toHaveBeenCalledWith(
      expect.objectContaining({
        deployment_template: {
          id: 9,
          url: '/api/v2/job_templates/9/',
          name: 'Deploy Odoo',
        },
      }),
    )
  })

  it('saves deployment_template as null when nothing was picked', async () => {
    ;(servicesService.createService as any).mockResolvedValue({ id: 1, name: 'X', slug: 'x' })
    const w = makeWrapper()
    await flushPromises()
    await w.find('[data-test="service-name"] input').setValue('My Service')
    await w.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(servicesService.createService).toHaveBeenCalledWith(
      expect.objectContaining({ deployment_template: null }),
    )
  })

  it('shows error toast and stays on page when createService fails', async () => {
    ;(servicesService.createService as any).mockRejectedValue(new Error('boom'))
    const w = makeWrapper()
    await w.find('[data-test="service-name"] input').setValue('My Service')
    await w.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }))
    expect(pushMock).not.toHaveBeenCalled()
  })
})
