<template>
  <Card class="chart-card">
    <template #header>
      <div class="p-4">
        <h3 class="text-base font-semibold text-on-surface">{{ title }}</h3>
      </div>
    </template>

    <template #content>
      <div v-if="isLoading" class="w-full h-96 flex items-center justify-center">
        <div class="space-y-4 w-full px-4">
          <Skeleton height="2rem" />
          <Skeleton height="10rem" />
          <Skeleton height="2rem" />
        </div>
      </div>
      <div v-else-if="data.every(d => d.value === 0)" class="w-full h-96 flex items-center justify-center text-on-surface-variant">
        <p>{{ $t('common.no_data') }}</p>
      </div>
      <div v-else class="w-full h-96 chart-content">
        <VChart :option="option" autoresize />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from 'primevue/card'
import Skeleton from 'primevue/skeleton'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart as ELineChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'

use([CanvasRenderer, ELineChart, TooltipComponent, GridComponent])

interface DataPoint {
  name: string
  value: number
}

interface Props {
  title: string
  data: DataPoint[]
  xAxisLabel?: string
  yAxisLabel?: string
  color?: string
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  xAxisLabel: 'Time',
  yAxisLabel: 'Value',
  color: '#00288e',
  isLoading: false,
})

/**
 * Computed: ECharts configuration
 */
const option = computed<EChartsOption>(() => ({
  color: [props.color],
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '5%',
    containLabel: true,
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(26, 27, 31, 0.9)',
    borderColor: '#79747e',
    textStyle: {
      color: '#ffffff',
    },
  },
  xAxis: {
    type: 'category',
    data: props.data.map((d) => d.name),
    axisLine: {
      lineStyle: {
        color: '#cac4d0',
      },
    },
    axisLabel: {
      color: '#49454e',
      fontSize: 12,
    },
  },
  yAxis: {
    type: 'value',
    axisLine: {
      show: false,
    },
    axisTick: {
      show: false,
    },
    axisLabel: {
      color: '#49454e',
      fontSize: 12,
    },
    splitLine: {
      lineStyle: {
        color: '#eff4ff',
      },
    },
  },
  series: [
    {
      data: props.data.map((d) => d.value),
      type: 'line',
      smooth: true,
      symbolSize: 6,
      itemStyle: {
        color: props.color,
      },
      areaStyle: {
        color: `${props.color}15`,
      },
      lineStyle: {
        width: 2,
        color: props.color,
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
</style>
