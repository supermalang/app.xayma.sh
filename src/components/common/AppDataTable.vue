<template>
  <section class="app-table-section">
    <!--
      Header bar — shown when there's a section title, custom actions, a filter
      popover, or an export button. Pages where the page title already serves
      as the section title can omit `title` to render only the toolbar.
    -->
    <header
      v-if="hasHeader"
      class="flex flex-col gap-3 p-6 pb-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <h2 v-if="title" class="text-section truncate">{{ title }}</h2>
      <span v-else />

      <div class="flex items-center gap-2 flex-wrap">
        <Button
          v-if="hasFilter"
          :label="t('common.filter')"
          icon="pi pi-filter"
          severity="secondary"
          outlined
          size="small"
          :aria-label="t('common.filter')"
          @click="toggleFilter"
        />
        <Button
          v-if="showExport"
          :label="t('common.export')"
          icon="pi pi-download"
          severity="secondary"
          outlined
          size="small"
          :disabled="!rows || rows.length === 0"
          :aria-label="t('common.export')"
          @click="exportCsv"
        />
        <slot name="actions" />
      </div>
    </header>

    <Popover v-if="hasFilter" ref="filterPopover" class="w-80">
      <div class="space-y-4">
        <slot name="filter" />
      </div>
    </Popover>

    <!-- States -->
    <AppErrorState
      v-if="error"
      :title="errorTitle ?? t('errors.fetch_failed')"
      :description="error"
      @retry="$emit('retry')"
    />

    <AppLoadingState
      v-else-if="loading"
      variant="skeleton-rows"
      :rows="skeletonRows"
    />

    <AppEmptyState
      v-else-if="!rows || rows.length === 0"
      :title="emptyTitle ?? t('common.no_data')"
      :description="emptyDescription"
      :icon="emptyIcon"
    >
      <template v-if="$slots.emptyAction" #action>
        <slot name="emptyAction" />
      </template>
    </AppEmptyState>

    <DataTable
      v-else
      :value="rows"
      :paginator="paginator"
      :rows="pageSize"
      :total-records="totalRecords"
      :lazy="lazy"
      :first="first"
      :row-hover="rowClickable"
      :class="rowClickable ? 'app-table--clickable' : ''"
      responsive-layout="stack"
      breakpoint="768px"
      @page="handlePageChange"
      @row-click="handleRowClick"
    >
      <Column
        v-for="col in columns"
        :key="col.field"
        :field="col.field"
        :header="resolveHeader(col)"
        :align="col.align"
        :style="col.width ? `width: ${col.width}` : undefined"
      >
        <template #body="{ data }">
          <slot :name="`body-${col.field}`" :data="data">
            {{ getNestedValue(data, col.field) }}
          </slot>
        </template>
      </Column>

      <Column
        v-if="$slots.rowActions"
        :header="t('common.actions')"
        class="app-table__row-actions"
        style="width: 7rem"
      >
        <template #body="{ data }">
          <slot name="rowActions" :data="data" />
        </template>
      </Column>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import type { DataTableRowClickEvent } from 'primevue/datatable'
import AppEmptyState from './AppEmptyState.vue'
import AppErrorState from './AppErrorState.vue'
import AppLoadingState from './AppLoadingState.vue'

export interface AppTableColumn {
  /** Property name on the row. */
  field: string
  /**
   * Either an i18n key (resolved via t()) or a literal label.
   * Strings containing a dot are treated as i18n keys.
   */
  header: string
  width?: string
  align?: 'left' | 'right' | 'center'
}

const props = withDefaults(
  defineProps<{
    rows: unknown[]
    columns: AppTableColumn[]
    loading?: boolean
    error?: string | null
    paginator?: boolean
    pageSize?: number
    totalRecords?: number
    lazy?: boolean
    first?: number
    /** Optional section title (h2). Omit when the page title is enough. */
    title?: string
    showExport?: boolean
    exportFilename?: string
    rowClickable?: boolean
    skeletonRows?: number
    /** Empty state. Falls back to common.no_data. */
    emptyTitle?: string
    emptyDescription?: string
    emptyIcon?: string
    errorTitle?: string
  }>(),
  {
    loading: false,
    paginator: true,
    pageSize: 20,
    totalRecords: 0,
    lazy: false,
    first: 0,
    showExport: true,
    rowClickable: false,
    skeletonRows: 6,
    emptyIcon: 'pi-inbox',
  },
)

const emit = defineEmits<{
  (e: 'page-change', value: { first: number; rows: number; page: number }): void
  (e: 'row-click', value: unknown): void
  (e: 'retry'): void
}>()

const { t } = useI18n()
const slots = useSlots()

const filterPopover = ref<InstanceType<typeof Popover>>()

const hasFilter = computed(() => Boolean(slots.filter))
const hasHeader = computed(
  () => Boolean(props.title) || Boolean(slots.actions) || hasFilter.value || props.showExport,
)

function resolveHeader(col: AppTableColumn): string {
  // Treat any string with a dot as an i18n key, otherwise as a literal label.
  return col.header.includes('.') ? t(col.header) : col.header
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    obj,
  )
}

function toggleFilter(event: Event) {
  filterPopover.value?.toggle(event)
}

function handlePageChange(event: { first: number; rows: number; page: number }) {
  emit('page-change', event)
}

function handleRowClick(event: DataTableRowClickEvent) {
  if (!props.rowClickable) return
  emit('row-click', event.data)
}

function exportCsv() {
  if (!props.rows || props.rows.length === 0) return

  const headers = props.columns.map((c) => `"${resolveHeader(c).replace(/"/g, '""')}"`).join(',')
  const body = props.rows
    .map((row) =>
      props.columns
        .map((c) => {
          const value = getNestedValue(row, c.field)
          if (value === null || value === undefined) return '""'
          const text = String(value).replace(/"/g, '""').replace(/\n/g, ' ')
          return `"${text}"`
        })
        .join(','),
    )
    .join('\n')
  const csv = `${headers}\n${body}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  link.download = `${props.exportFilename ?? 'export'}-${date}.csv`
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

defineExpose({ exportCsv, toggleFilter })
</script>

<style scoped>
.app-table-section {
  background: var(--surface-container-lowest);
  border: 1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent);
  border-radius: 0.5rem;
  overflow: hidden;
}

.app-table--clickable :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}

:deep(.p-datatable) {
  font-size: 0.875rem;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  background: var(--surface-container-low);
  color: var(--on-surface-variant);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
}

:deep(.p-datatable .p-datatable-tbody > tr) {
  border-bottom: 1px solid var(--outline-variant);
  background: transparent;
}

:deep(.p-datatable .p-datatable-tbody > tr:last-child) {
  border-bottom: none;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background-color: var(--surface-container-low);
}

:deep(.p-paginator) {
  background: transparent;
  border-top: 1px solid var(--outline-variant);
}
</style>
