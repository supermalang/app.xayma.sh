/**
 * LifecycleDayInput tests — verifies v-model behavior and label/unit rendering.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LifecycleDayInput from './LifecycleDayInput.vue'

const stubs = {
  InputNumber: {
    props: ['modelValue', 'inputId', 'min', 'inputClass'],
    template: '<input :id="inputId" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
}

describe('LifecycleDayInput', () => {
  it('renders the label and unit', () => {
    const wrapper = mount(LifecycleDayInput, {
      props: { label: 'Archive Deployments', modelValue: 30, unit: 'Days' },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('Archive Deployments')
    expect(wrapper.text()).toContain('Days')
  })

  it('emits update:modelValue with a number when the inner input changes', async () => {
    const wrapper = mount(LifecycleDayInput, {
      props: { label: 'Delete Deployments', modelValue: 90, unit: 'Days' },
      global: { stubs },
    })
    const input = wrapper.find('input')
    await input.setValue('45')
    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    expect(events?.[0]).toEqual([45])
  })

  it('coerces a non-numeric emit to 0', async () => {
    const wrapper = mount(LifecycleDayInput, {
      props: { label: 'Archive Organizations', modelValue: 180, unit: 'Days' },
      global: {
        stubs: {
          InputNumber: {
            template: '<button @click="$emit(\'update:modelValue\', null)">trigger</button>',
          },
        },
      },
    })
    await wrapper.find('button').trigger('click')
    const events = wrapper.emitted('update:modelValue')
    expect(events?.[0]).toEqual([0])
  })
})
