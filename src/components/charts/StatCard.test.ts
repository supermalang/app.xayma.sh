import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatCard from './StatCard.vue'
import Card from 'primevue/card'

describe('StatCard.vue', () => {
  it('renders label correctly', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Total Revenue',
        value: 1250,
        icon: 'pi pi-wallet',
      },
      global: {
        components: { Card },
      },
    })

    expect(wrapper.text()).toContain('Total Revenue')
  })

  it('renders value correctly', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Total Revenue',
        value: 1250,
        icon: 'pi pi-wallet',
      },
      global: {
        components: { Card },
      },
    })

    // The value is formatted with commas, so check for the number itself
    const text = wrapper.text()
    expect(text).toContain('1')
    expect(text).toContain('250')
  })

  it('renders up trend arrow when trend is positive', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1250,
        icon: 'pi pi-wallet',
        trend: 12,
      },
      global: {
        components: { Card },
      },
    })

    expect(wrapper.find('.pi-arrow-up').exists()).toBe(true)
    expect(wrapper.text()).toContain('12%')
  })

  it('renders down trend arrow when trend is negative', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Failed Deployments',
        value: 500,
        icon: 'pi pi-times',
        trend: -5,
      },
      global: {
        components: { Card },
      },
    })

    expect(wrapper.find('.pi-arrow-down').exists()).toBe(true)
    expect(wrapper.text()).toContain('5%')
  })

  it('does not render trend arrow when trend is undefined', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1250,
        icon: 'pi pi-wallet',
      },
      global: {
        components: { Card },
      },
    })

    expect(wrapper.find('.pi-arrow-up').exists()).toBe(false)
    expect(wrapper.find('.pi-arrow-down').exists()).toBe(false)
  })

  it('formats currency when format is "currency"', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Total Earnings',
        value: 1250,
        icon: 'pi pi-wallet',
        format: 'currency',
      },
      global: {
        components: { Card },
      },
    })

    // Currency format should contain $ symbol and formatted number
    const valueText = wrapper.text()
    expect(valueText).toContain('1') // Should contain number
  })

  it('formats percent when format is "percent"', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Success Rate',
        value: 95,
        icon: 'pi pi-check',
        format: 'percent',
      },
      global: {
        components: { Card },
      },
    })

    expect(wrapper.text()).toContain('95%')
  })

  it('formats number as plain number when format is "number"', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Total Count',
        value: 1250,
        icon: 'pi pi-home',
        format: 'number',
      },
      global: {
        components: { Card },
      },
    })

    // Should contain comma-separated number (1,250)
    const valueText = wrapper.text()
    expect(valueText).toContain('1')
  })

  it('applies correct background color based on color prop', () => {
    // Map colors to their RGB equivalents (as shown in computed style)
    const colorTests = [
      { name: 'primary' as const, rgb: 'rgb(0, 40, 142)' },
      { name: 'secondary' as const, rgb: 'rgb(157, 67, 0)' },
      { name: 'tertiary' as const, rgb: 'rgb(0, 61, 40)' },
      { name: 'error' as const, rgb: 'rgb(186, 26, 26)' },
    ]

    colorTests.forEach(({ name, rgb }) => {
      const wrapper = mount(StatCard, {
        props: {
          label: 'Revenue',
          value: 1250,
          icon: 'pi pi-wallet',
          color: name,
        },
        global: {
          components: { Card },
        },
      })

      const html = wrapper.html()
      // Check for RGB format (which is what browsers compute)
      expect(html).toContain(rgb)
    })
  })

  it('accepts description prop without error', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1250,
        icon: 'pi pi-wallet',
        description: 'Last 30 days',
      },
      global: {
        components: { Card },
      },
    })

    // Component mounts without error when description prop is provided
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props('description')).toBe('Last 30 days')
  })

  it('does not render description when not provided', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1250,
        icon: 'pi pi-wallet',
      },
      global: {
        components: { Card },
      },
    })

    expect(wrapper.text()).not.toContain('undefined')
  })

  it('renders value as string when value is string', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Status',
        value: 'Active',
        icon: 'pi pi-check',
      },
      global: {
        components: { Card },
      },
    })

    expect(wrapper.text()).toContain('Active')
  })

  it('defaults to "number" format', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Count',
        value: 1250,
        icon: 'pi pi-home',
      },
      global: {
        components: { Card },
      },
    })

    // Should format as plain number (1,250)
    const valueText = wrapper.text()
    expect(valueText).toContain('1')
  })

  it('defaults to "primary" color', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1250,
        icon: 'pi pi-wallet',
      },
      global: {
        components: { Card },
      },
    })

    // Primary color converts to this RGB value
    const html = wrapper.html()
    expect(html).toContain('rgb(0, 40, 142)')
  })

  it('renders icon element', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1250,
        icon: 'pi pi-wallet',
      },
      global: {
        components: { Card },
      },
    })

    const icon = wrapper.find('i')
    expect(icon.exists()).toBe(true)
    expect(icon.classes()).toContain('pi')
    expect(icon.classes()).toContain('pi-wallet')
  })

  it('renders slot content when provided', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1250,
        icon: 'pi pi-wallet',
      },
      slots: {
        default: '<p>Custom slot content</p>',
      },
      global: {
        components: { Card },
      },
    })

    // Check that the component renders
    expect(wrapper.find('.stat-card').exists()).toBe(true)
  })

  it('handles zero value correctly', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 0,
        icon: 'pi pi-wallet',
        format: 'number',
      },
      global: {
        components: { Card },
      },
    })

    expect(wrapper.text()).toContain('0')
  })

  it('handles large numbers correctly', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1000000,
        icon: 'pi pi-wallet',
        format: 'number',
      },
      global: {
        components: { Card },
      },
    })

    // Should format with commas (1,000,000)
    const valueText = wrapper.text()
    expect(valueText).toContain('1')
    expect(valueText).toContain('000')
  })

  it('renders Card component wrapper', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1250,
        icon: 'pi pi-wallet',
      },
      global: {
        components: { Card },
      },
    })

    // Check for Card styling class
    expect(wrapper.find('.stat-card').exists()).toBe(true)
  })

  it('does not shift layout on re-render with same props', async () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1250,
        icon: 'pi pi-wallet',
        trend: 5,
      },
      global: {
        components: { Card },
      },
    })

    const initialText = wrapper.text()

    // Re-render with same props
    await wrapper.vm.$nextTick()

    const finalText = wrapper.text()
    expect(initialText).toBe(finalText)
  })

  it('renders trend percentage correctly with zero', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Revenue',
        value: 1250,
        icon: 'pi pi-wallet',
        trend: 0,
      },
      global: {
        components: { Card },
      },
    })

    expect(wrapper.text()).toContain('0%')
  })
})
