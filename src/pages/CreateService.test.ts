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
  createServicePlan: vi.fn(),
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

  it('submits service then plans and navigates to detail', async () => {
    ;(servicesService.createService as any).mockResolvedValue({ id: 42, name: 'X', slug: 'x' })
    ;(servicesService.createServicePlan as any).mockResolvedValue({ id: 1 })
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
      expect.objectContaining({ name: 'My Service', slug: 'my-service' })
    )
    expect(servicesService.createServicePlan).toHaveBeenCalledWith(
      expect.objectContaining({ service_id: 42, label: 'Starter', monthlyCreditConsumption: 15000 })
    )
    expect(pushMock).toHaveBeenCalledWith('/services/42')
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
