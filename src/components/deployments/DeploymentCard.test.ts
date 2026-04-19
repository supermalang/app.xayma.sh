import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import Card from 'primevue/card'
import SplitButton from 'primevue/splitbutton'
import ProgressBar from 'primevue/progressbar'
import DeploymentCard from './DeploymentCard.vue'
import DeploymentStatusBadge from './DeploymentStatusBadge.vue'

// Mock router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Create i18n mock with all required keys
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      deployments: {
        status: {
          pending_deployment: 'Pending',
          deploying: 'Deploying',
          active: 'Active',
          stopped: 'Stopped',
          suspended: 'Suspended',
          failed: 'Failed',
          archived: 'Archived',
          pending_deletion: 'Pending Deletion',
        },
        actions: {
          stop: 'Stop',
          start: 'Start',
          restart: 'Restart',
          view_details: 'View Details',
        },
        card: {
          monthly_cost: 'Monthly Cost',
        },
      },
      common: {
        view: 'View',
        delete: 'Delete',
      },
    },
  },
})

// Global config for all tests
const globalConfig = {
  plugins: [i18n],
  components: {
    Card,
    SplitButton,
    ProgressBar,
    DeploymentStatusBadge,
  },
}

// Factory function to create a deployment object with sensible defaults
function makeDeployment(overrides = {}) {
  return {
    id: 1,
    label: 'My Odoo Instance',
    status: 'active',
    domainNames: ['example.xayma.sh'],
    service: {
      name: 'Odoo Community',
    },
    serviceplan: {
      label: 'Small',
      monthlyCreditConsumption: 500,
    },
    partner: {
      remainingCredits: 5000,
    },
    ...overrides,
  }
}

describe('DeploymentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Task 2: Rendering tests
  describe('Rendering', () => {
    it('displays the deployment label', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment() },
        global: globalConfig,
      })

      expect(wrapper.text()).toContain('My Odoo Instance')
    })

    it('displays the service name', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment() },
        global: globalConfig,
      })

      expect(wrapper.text()).toContain('Odoo Community')
    })

    it('displays the plan label', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment() },
        global: globalConfig,
      })

      expect(wrapper.text()).toContain('Small')
    })

    it('displays the deployment id prefixed with #', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ id: 42 }) },
        global: globalConfig,
      })

      expect(wrapper.text()).toContain('#42')
    })
  })

  // Task 3: Domain link tests
  describe('Domain links', () => {
    it('shows domain link when status is active and domainNames is non-empty', () => {
      const wrapper = mount(DeploymentCard, {
        props: {
          deployment: makeDeployment({
            status: 'active',
            domainNames: ['example.xayma.sh'],
          }),
        },
        global: globalConfig,
      })

      const link = wrapper.find('a[href="https://example.xayma.sh"]')
      expect(link.exists()).toBe(true)
      expect(link.text()).toContain('example.xayma.sh')
    })

    it('hides domain links when status is not active', () => {
      const wrapper = mount(DeploymentCard, {
        props: {
          deployment: makeDeployment({
            status: 'stopped',
            domainNames: ['example.xayma.sh'],
          }),
        },
        global: globalConfig,
      })

      const link = wrapper.find('a[href="https://example.xayma.sh"]')
      expect(link.exists()).toBe(false)
    })

    it('hides domain links when domainNames is an empty array', () => {
      const wrapper = mount(DeploymentCard, {
        props: {
          deployment: makeDeployment({
            status: 'active',
            domainNames: [],
          }),
        },
        global: globalConfig,
      })

      const links = wrapper.findAll('a[target="_blank"]')
      expect(links.length).toBe(0)
    })

    it('renders one link per domain when multiple domains provided', () => {
      const wrapper = mount(DeploymentCard, {
        props: {
          deployment: makeDeployment({
            status: 'active',
            domainNames: ['example.xayma.sh', 'app.xayma.sh', 'api.xayma.sh'],
          }),
        },
        global: globalConfig,
      })

      const links = wrapper.findAll('a[target="_blank"]')
      expect(links.length).toBe(3)
      expect(links[0].text()).toContain('example.xayma.sh')
      expect(links[1].text()).toContain('app.xayma.sh')
      expect(links[2].text()).toContain('api.xayma.sh')
    })
  })

  // Task 4: Credit meter tests
  describe('Credit meter', () => {
    it('shows ProgressBar and monthly cost label when monthlyCreditConsumption > 0', () => {
      const wrapper = mount(DeploymentCard, {
        props: {
          deployment: makeDeployment({
            serviceplan: {
              label: 'Small',
              monthlyCreditConsumption: 500,
            },
          }),
        },
        global: globalConfig,
      })

      expect(wrapper.text()).toContain('Monthly Cost')
      expect(wrapper.text()).toContain('500')
      const progressBar = wrapper.findComponent(ProgressBar)
      expect(progressBar.exists()).toBe(true)
    })

    it('hides ProgressBar when monthlyCreditConsumption is 0', () => {
      const wrapper = mount(DeploymentCard, {
        props: {
          deployment: makeDeployment({
            serviceplan: {
              label: 'Free',
              monthlyCreditConsumption: 0,
            },
          }),
        },
        global: globalConfig,
      })

      const progressBar = wrapper.findComponent(ProgressBar)
      expect(progressBar.exists()).toBe(false)
    })

    it('hides ProgressBar when partner is undefined', () => {
      const wrapper = mount(DeploymentCard, {
        props: {
          deployment: makeDeployment({
            partner: undefined,
            serviceplan: {
              label: 'Small',
              monthlyCreditConsumption: 500,
            },
          }),
        },
        global: globalConfig,
      })

      const progressBar = wrapper.findComponent(ProgressBar)
      expect(progressBar.exists()).toBe(false)
    })

    it('passes creditPercent to ProgressBar, capped at 100 when cost exceeds balance', () => {
      const wrapper = mount(DeploymentCard, {
        props: {
          deployment: makeDeployment({
            serviceplan: {
              label: 'Expensive',
              monthlyCreditConsumption: 5000,
            },
            partner: {
              remainingCredits: 1000,
            },
          }),
        },
        global: globalConfig,
      })

      const progressBar = wrapper.findComponent(ProgressBar)
      // 5000 / 1000 * 100 = 500%, capped at 100
      expect(progressBar.props('value')).toBe(100)
    })

    it('passes correct creditPercent when cost is a fraction of balance', () => {
      const wrapper = mount(DeploymentCard, {
        props: {
          deployment: makeDeployment({
            serviceplan: {
              label: 'Small',
              monthlyCreditConsumption: 1250,
            },
            partner: {
              remainingCredits: 5000,
            },
          }),
        },
        global: globalConfig,
      })

      const progressBar = wrapper.findComponent(ProgressBar)
      // 1250 / 5000 * 100 = 25%
      expect(progressBar.props('value')).toBe(25)
    })
  })

  // Task 5: SplitButton state tests
  describe('SplitButton state', () => {
    it('shows "Stop" with warn severity when active', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ status: 'active' }) },
        global: globalConfig,
      })

      const splitButton = wrapper.findComponent(SplitButton)
      expect(splitButton.props('label')).toBe('Stop')
      expect(splitButton.props('severity')).toBe('warn')
    })

    it('shows "Start" with success severity when stopped', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ status: 'stopped' }) },
        global: globalConfig,
      })

      const splitButton = wrapper.findComponent(SplitButton)
      expect(splitButton.props('label')).toBe('Start')
      expect(splitButton.props('severity')).toBe('success')
    })

    it('shows "View" with secondary severity when deploying', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ status: 'deploying' }) },
        global: globalConfig,
      })

      const splitButton = wrapper.findComponent(SplitButton)
      expect(splitButton.props('label')).toBe('View')
      expect(splitButton.props('severity')).toBe('secondary')
    })

    it.each([
      'deploying',
      'pending_deployment',
      'pending_deletion',
    ])('disables button when status is %s', (status) => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ status }) },
        global: globalConfig,
      })

      const splitButton = wrapper.findComponent(SplitButton)
      expect(splitButton.props('disabled')).toBe(true)
    })

    it.each([
      'active',
      'stopped',
      'suspended',
      'failed',
    ])('button is NOT disabled when status is %s', (status) => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ status }) },
        global: globalConfig,
      })

      const splitButton = wrapper.findComponent(SplitButton)
      expect(splitButton.props('disabled')).toBe(false)
    })
  })

  // Task 6: Primary action emits/navigation tests
  describe('Primary action', () => {
    it('emits "stop" with deployment id when primary action invoked on active deployment', async () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ id: 7, status: 'active' }) },
        global: globalConfig,
      })

      const vm = wrapper.vm as any
      vm.onPrimaryAction()

      expect(wrapper.emitted('stop')).toEqual([[7]])
    })

    it('emits "start" with deployment id when primary action invoked on stopped deployment', async () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ id: 12, status: 'stopped' }) },
        global: globalConfig,
      })

      const vm = wrapper.vm as any
      vm.onPrimaryAction()

      expect(wrapper.emitted('start')).toEqual([[12]])
    })

    it('navigates to deployment detail when primary action invoked on transitioning status', async () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ id: 25, status: 'deploying' }) },
        global: globalConfig,
      })

      const vm = wrapper.vm as any
      vm.onPrimaryAction()

      expect(mockPush).toHaveBeenCalledWith('/app/deployments/25')
    })
  })

  // Task 7: Dropdown menu item tests
  describe('Dropdown menu items', () => {
    it('includes Restart in menu when status is active', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ status: 'active' }) },
        global: globalConfig,
      })

      const splitButton = wrapper.findComponent(SplitButton)
      const model = splitButton.props('model')
      const restartItem = model.find((item: any) => item.label === 'Restart')
      expect(restartItem).toBeDefined()
    })

    it('excludes Restart in menu when status is stopped', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ status: 'stopped' }) },
        global: globalConfig,
      })

      const splitButton = wrapper.findComponent(SplitButton)
      const model = splitButton.props('model')
      const restartItem = model.find((item: any) => item.label === 'Restart')
      expect(restartItem).toBeUndefined()
    })

    it('always includes View Details and Delete in the menu', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ status: 'failed' }) },
        global: globalConfig,
      })

      const splitButton = wrapper.findComponent(SplitButton)
      const model = splitButton.props('model')
      const viewDetailsItem = model.find((item: any) => item.label === 'View Details')
      const deleteItem = model.find((item: any) => item.label === 'Delete')
      expect(viewDetailsItem).toBeDefined()
      expect(deleteItem).toBeDefined()
    })

    it('emits "restart" when Restart menu command is called', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ id: 99, status: 'active' }) },
        global: globalConfig,
      })

      const splitButton = wrapper.findComponent(SplitButton)
      const model = splitButton.props('model')
      const restartItem = model.find((item: any) => item.label === 'Restart')
      restartItem.command()

      expect(wrapper.emitted('restart')).toEqual([[99]])
    })

    it('emits "delete" when Delete menu command is called', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ id: 88, status: 'active' }) },
        global: globalConfig,
      })

      const splitButton = wrapper.findComponent(SplitButton)
      const model = splitButton.props('model')
      const deleteItem = model.find((item: any) => item.label === 'Delete')
      deleteItem.command()

      expect(wrapper.emitted('delete')).toEqual([[88]])
    })

    it('navigates to deployment detail when View Details menu command is called', () => {
      const wrapper = mount(DeploymentCard, {
        props: { deployment: makeDeployment({ id: 77, status: 'active' }) },
        global: globalConfig,
      })

      const splitButton = wrapper.findComponent(SplitButton)
      const model = splitButton.props('model')
      const viewDetailsItem = model.find((item: any) => item.label === 'View Details')
      viewDetailsItem.command()

      expect(mockPush).toHaveBeenCalledWith('/app/deployments/77')
    })
  })
})
