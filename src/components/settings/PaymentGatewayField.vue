<template>
  <div>
    <label :for="`gw-${name}-${uid}`" class="block text-sm font-medium text-on-surface mb-2">
      {{ label }}
      <span v-if="required" class="text-error">*</span>
    </label>
    <Field
      :id="`gw-${name}-${uid}`"
      v-slot="{ field, meta }"
      :name="name"
      as="div"
    >
      <InputText
        v-bind="field"
        :type="type ?? 'text'"
        class="w-full font-mono text-sm"
        :class="{ 'ng-invalid ng-touched': meta.touched && !meta.valid }"
      />
      <ErrorMessage :name="name" class="block text-sm text-error mt-1" />
    </Field>
  </div>
</template>

<script setup lang="ts">
import { Field, ErrorMessage } from 'vee-validate'
import InputText from 'primevue/inputtext'

defineProps<{
  name: string
  label: string
  required?: boolean
  type?: 'text' | 'password' | 'url'
}>()

const uid = Math.random().toString(36).substring(7)
</script>
