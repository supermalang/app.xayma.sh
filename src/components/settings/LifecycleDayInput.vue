<template>
  <div>
    <label :for="inputId" class="text-xs font-semibold block mb-2">{{ label }}</label>
    <div class="flex items-center gap-2">
      <InputNumber
        :model-value="modelValue"
        :input-id="inputId"
        :min="0"
        :input-class="'w-20 font-mono text-sm'"
        @update:model-value="(value) => emit('update:modelValue', typeof value === 'number' ? value : 0)"
      />
      <span class="text-xs text-on-surface-variant">{{ unit }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InputNumber from 'primevue/inputnumber'

const props = defineProps<{
  label: string
  modelValue: number
  unit: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const inputId = computed(() =>
  `lifecycle-${props.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
)
</script>
