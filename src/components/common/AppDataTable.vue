<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <!-- Search -->
      <span class="p-input-icon-left flex-1 w-full sm:w-auto sm:min-w-64">
        <i class="pi pi-search" />
        <InputText
          v-model="localSearch"
          :placeholder="$t('common.search')"
          class="w-full"
          @input="handleSearch"
        />
      </span>

      <!-- Toolbar actions -->
      <div class="flex gap-2 w-full sm:w-auto">
        <!-- Column toggle -->
        <MultiSelect
          v-model="visibleColumns"
          :options="columns"
          option-label="header"
          option-value="field"
          :placeholder="$t('common.columns')"
          class="flex-1 sm:w-64"
          @change="handleColumnChange"
        />

        <!-- CSV Export -->
        <Button
          icon="pi pi-download"
          class="p-button-outlined"
          severity="secondary"
          @click="exportCSV"
          :title="$t('common.export')"
          :aria-label="$t('aria.export_csv')"
        />
      </div>
    </div>

    <!-- DataTable -->
    <DataTable
      ref="dt"
      :value="rows"
      :loading="loading"
      :paginator="paginator"
      :rows="pageSize"
      :total-records="totalRecords"
      :lazy="lazy"
      :first="first"
      striped-rows
      responsive-layout="stack"
      breakpoint="768px"
      class="p-datatable-striped"
      @page="handlePageChange"
    >
      <!-- Dynamic columns -->
      <Column
        v-for="col in visibleColumns"
        :key="col"
        :field="col"
        :header="getColumnHeader(col)"
      >
        <template #body="{ data }">
          <slot :name="`body-${col}`" :data="data">
            {{ getNestedValue(data, col) }}
          </slot>
        </template>
      </Column>

      <!-- Custom slot for row actions -->
      <Column v-if="$slots.actions" class="w-20">
        <template #header>{{ $t('common.actions') }}</template>
        <template #body="{ data }">
          <slot name="actions" :data="data" />
        </template>
      </Column>

      <!-- Empty state -->
      <template #empty>
        <div class="text-center text-on-surface-variant py-8">
          {{ $t('common.no_data') }}
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'

interface ColumnDef {
  field: string
  header: string
}

interface Props {
  rows: any[]
  columns: ColumnDef[]
  loading?: boolean
  paginator?: boolean
  pageSize?: number
  totalRecords?: number
  lazy?: boolean
  modelValue?: {
    search?: string
    visibleColumns?: string[]
    page?: number
  }
}

interface Emits {
  (e: 'update:modelValue', value: any): void
  (e: 'search', value: string): void
  (e: 'page-change', value: { first: number; rows: number }): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  paginator: true,
  pageSize: 20,
  totalRecords: 0,
  lazy: false,
})

const emit = defineEmits<Emits>()

const { t } = useI18n()
const dt = ref()

const localSearch = ref(props.modelValue?.search || '')
const visibleColumns = ref<string[]>(
  props.modelValue?.visibleColumns || props.columns.map((c) => c.field)
)
const first = ref(props.modelValue?.page || 0)

const getColumnHeader = (field: string) => {
  const col = props.columns.find((c) => c.field === field)
  return col ? t(`${col.header}`) : field
}

const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj)
}

const handleSearch = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  localSearch.value = value
  emit('search', value)
  emit('update:modelValue', {
    search: value,
    visibleColumns: visibleColumns.value,
    page: first.value,
  })
}

const handleColumnChange = () => {
  emit('update:modelValue', {
    search: localSearch.value,
    visibleColumns: visibleColumns.value,
    page: first.value,
  })
}

const handlePageChange = (event: any) => {
  first.value = event.first
  emit('page-change', { first: event.first, rows: event.rows })
  emit('update:modelValue', {
    search: localSearch.value,
    visibleColumns: visibleColumns.value,
    page: event.first,
  })
}

function exportCSV(): void {
  if (!props.rows || props.rows.length === 0) {
    // Export headers only if no data
    const csvHeaders = visibleColumns.value
      .map((col) => {
        const column = props.columns.find((c) => c.field === col)
        return column ? `"${t(`${column.header}`)}"` : `"${col}"`
      })
      .join(',')
    const csv = csvHeaders
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    downloadCSV(blob)
    return
  }

  // Get visible column headers with i18n translations
  const csvHeaders = visibleColumns.value
    .map((col) => {
      const column = props.columns.find((c) => c.field === col)
      return column ? `"${t(`${column.header}`)}"` : `"${col}"`
    })
    .join(',')

  // Build CSV rows with proper RFC 4180 escaping
  const csvRows = props.rows.map((row: any) =>
    visibleColumns.value
      .map((col) => {
        const value = getNestedValue(row, col)
        if (value === null || value === undefined) return '""'

        const stringValue = String(value)
        // Escape quotes by doubling them, replace newlines with space
        const escaped = stringValue
          .replace(/"/g, '""')
          .replace(/\n/g, ' ')
        return `"${escaped}"`
      })
      .join(',')
  )

  // Combine headers and rows
  const csv = [csvHeaders, ...csvRows].join('\n')

  // Create and download blob
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadCSV(blob)
}

function downloadCSV(blob: Blob): void {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().split('T')[0]

  link.setAttribute('href', url)
  link.setAttribute('download', `export-${date}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  URL.revokeObjectURL(url)
}

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue?.search) localSearch.value = newValue.search
    if (newValue?.visibleColumns) visibleColumns.value = newValue.visibleColumns
    if (newValue?.page !== undefined) first.value = newValue.page
  },
  { deep: true }
)
</script>

<style scoped>
:deep(.p-datatable) {
  --p-datatable-border-color: var(--outline-variant);
  --p-datatable-row-bg: var(--surface);
  --p-datatable-row-border-color: var(--outline-variant);
  --p-datatable-row-hover-bg: var(--surface-container-low);
}

:deep(.p-input-icon-left) {
  display: flex;
  align-items: center;
}

:deep(.p-input-icon-left > i) {
  left: 1rem;
  color: var(--on-surface-variant);
}

:deep(.p-input-icon-left > input) {
  padding-left: 2.5rem;
}
</style>
