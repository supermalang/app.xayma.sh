<template>
  <Card class="chart-card">
    <template #header>
      <div class="p-4">
        <h3 class="text-base font-semibold text-on-surface">{{ title }}</h3>
      </div>
    </template>

    <div class="w-full h-80 chart-content">
      <VChart :option="option" autoresize />
    </div>

    <!-- Legend Below Chart -->
    <div class="mt-4 grid grid-cols-2 gap-2 text-xs legend-items">
      <div v-for="(item, index) in data" :key="item.name" class="flex items-center gap-2">
        <div
          class="w-3 h-3 rounded-full"
          :style="{ backgroundColor: colors[index % colors.length] }"
        />
        <span class="text-on-surface-variant">{{ item.name }}</span>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from 'primevue/card'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'

interface DataItem {
  name: string
  value: number
}

interface Props {
  title: string
  data: DataItem[]
}

const props = defineProps<Props>()

const colors = ['#00288e', '#fd761a', '#003d28', '#ba1a1a', '#1e40af', '#9d4300', '#fbb340']

const option = computed<EChartsOption>(() => ({
  color: colors,
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(26, 27, 31, 0.9)',
    borderColor: '#79747e',
    textStyle: {
      color: '#ffffff',
    },
    formatter: '{b}: {c} ({d}%)',
  },
  series: [
    {
      name: '',
      type: 'pie',
      radius: ['40%', '70%'],
      data: props.data,
      itemStyle: {
        borderColor: '#f8f9ff',
        borderWidth: 2,
      },
      label: {
        show: false,
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
  ],
}))
</script>

<style scoped>
:deep(.p-card) {
  border: 1px solid var(--outline-variant);
  background: var(--surface-container-low);
  box-shadow: none;
  transition: var(--transition-smooth);
}

:deep(.p-card-header) {
  border-bottom: 1px solid var(--outline-variant);
}

:deep(.echarts) {
  width: 100% !important;
  height: 100% !important;
}

.chart-card {
  transition: var(--transition-smooth);
}

.chart-card:hover :deep(.p-card) {
  border-color: var(--primary);
  box-shadow: 0 2px 4px rgba(0, 40, 142, 0.06);
}

.chart-content {
  animation: chart-data-reveal 400ms var(--easing-standard);
}

.legend-items {
  animation: legend-reveal var(--duration-standard) var(--easing-standard) 150ms backwards;
}
</style>
