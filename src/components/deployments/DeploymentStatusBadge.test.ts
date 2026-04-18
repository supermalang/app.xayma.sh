import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeploymentStatusBadge from './DeploymentStatusBadge.vue'
import { createI18n } from 'vue-i18n'
import Tag from 'primevue/tag'

// Create i18n mock
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
      },
    },
  },
})

describe('DeploymentStatusBadge', () => {
  it('should render badge for active status with success severity', () => {
    const wrapper = mount(DeploymentStatusBadge, {
      props: { status: 'active' },
      global: {
        plugins: [i18n],
        components: { Tag },
      },
    })

    expect(wrapper.text()).toContain('Active')
    // Check Tag component has correct severity prop
    const tagComponent = wrapper.findComponent(Tag)
    expect(tagComponent.props('severity')).toBe('success')
  })

  it('should render badge for pending_deployment status with warning severity', () => {
    const wrapper = mount(DeploymentStatusBadge, {
      props: { status: 'pending_deployment' },
      global: {
        plugins: [i18n],
        components: { Tag },
      },
    })

    expect(wrapper.text()).toContain('Pending')
    const tagComponent = wrapper.findComponent(Tag)
    expect(tagComponent.props('severity')).toBe('warning')
  })

  it('should render badge for deploying status with info severity', () => {
    const wrapper = mount(DeploymentStatusBadge, {
      props: { status: 'deploying' },
      global: {
        plugins: [i18n],
        components: { Tag },
      },
    })

    expect(wrapper.text()).toContain('Deploying')
    const tagComponent = wrapper.findComponent(Tag)
    expect(tagComponent.props('severity')).toBe('info')
  })

  it('should render badge for failed status with danger severity', () => {
    const wrapper = mount(DeploymentStatusBadge, {
      props: { status: 'failed' },
      global: {
        plugins: [i18n],
        components: { Tag },
      },
    })

    expect(wrapper.text()).toContain('Failed')
    const tagComponent = wrapper.findComponent(Tag)
    expect(tagComponent.props('severity')).toBe('danger')
  })

  it('should render badge for stopped status with secondary severity', () => {
    const wrapper = mount(DeploymentStatusBadge, {
      props: { status: 'stopped' },
      global: {
        plugins: [i18n],
        components: { Tag },
      },
    })

    expect(wrapper.text()).toContain('Stopped')
    const tagComponent = wrapper.findComponent(Tag)
    expect(tagComponent.props('severity')).toBe('secondary')
  })

  it('should render badge for suspended status with warning severity', () => {
    const wrapper = mount(DeploymentStatusBadge, {
      props: { status: 'suspended' },
      global: {
        plugins: [i18n],
        components: { Tag },
      },
    })

    expect(wrapper.text()).toContain('Suspended')
    const tagComponent = wrapper.findComponent(Tag)
    expect(tagComponent.props('severity')).toBe('warning')
  })

  it('should render badge for archived status with secondary severity', () => {
    const wrapper = mount(DeploymentStatusBadge, {
      props: { status: 'archived' },
      global: {
        plugins: [i18n],
        components: { Tag },
      },
    })

    expect(wrapper.text()).toContain('Archived')
    const tagComponent = wrapper.findComponent(Tag)
    expect(tagComponent.props('severity')).toBe('secondary')
  })

  it('should render badge for pending_deletion status with danger severity', () => {
    const wrapper = mount(DeploymentStatusBadge, {
      props: { status: 'pending_deletion' },
      global: {
        plugins: [i18n],
        components: { Tag },
      },
    })

    expect(wrapper.text()).toContain('Pending Deletion')
    const tagComponent = wrapper.findComponent(Tag)
    expect(tagComponent.props('severity')).toBe('danger')
  })

  it('should handle unknown status gracefully', () => {
    const wrapper = mount(DeploymentStatusBadge, {
      props: { status: 'unknown_status' },
      global: {
        plugins: [i18n],
        components: { Tag },
      },
    })

    // Should render the status as-is
    expect(wrapper.text()).toContain('unknown_status')
    // Default to info severity
    const tagComponent = wrapper.findComponent(Tag)
    expect(tagComponent.props('severity')).toBe('info')
  })

  it('should have whitespace-nowrap class to prevent wrapping', () => {
    const wrapper = mount(DeploymentStatusBadge, {
      props: { status: 'active' },
      global: {
        plugins: [i18n],
        components: { Tag },
      },
    })

    expect(wrapper.classes()).toContain('whitespace-nowrap')
  })

  it('should react to prop changes', async () => {
    const wrapper = mount(DeploymentStatusBadge, {
      props: { status: 'active' },
      global: {
        plugins: [i18n],
        components: { Tag },
      },
    })

    let tagComponent = wrapper.findComponent(Tag)
    expect(tagComponent.props('severity')).toBe('success')

    await wrapper.setProps({ status: 'failed' })

    tagComponent = wrapper.findComponent(Tag)
    expect(tagComponent.props('severity')).toBe('danger')
  })

  describe('Status to Severity Mapping', () => {
    const statusSeverityMap: Record<string, string> = {
      pending_deployment: 'warning',
      deploying: 'info',
      active: 'success',
      stopped: 'secondary',
      suspended: 'warning',
      failed: 'danger',
      archived: 'secondary',
      pending_deletion: 'danger',
    }

    Object.entries(statusSeverityMap).forEach(([status, severity]) => {
      it(`should map ${status} to ${severity} severity`, () => {
        const wrapper = mount(DeploymentStatusBadge, {
          props: { status },
          global: {
            plugins: [i18n],
            components: { Tag },
          },
        })

        const tagComponent = wrapper.findComponent(Tag)
        expect(tagComponent.props('severity')).toBe(severity)
      })
    })
  })
})
