<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold text-on-surface">{{ $t('nav.audit') }}</h1>

    <!-- Filters -->
    <div class="flex gap-4 flex-wrap">
      <InputText
        v-model="filters.table_name"
        :placeholder="$t('audit.table_name')"
        class="w-40"
        @input="applyFilters"
      />
      <Dropdown
        v-model="filters.action"
        :options="actionOptions"
        option-label="label"
        option-value="value"
        :placeholder="$t('audit.action')"
        class="w-40"
        show-clear
        @change="applyFilters"
      />
      <Calendar
        v-model="filters.dateRange"
        selection-mode="range"
        :placeholder="$t('audit.date_range')"
        @date-select="applyFilters"
      />
    </div>

    <!-- DataTable -->
    <DataTable
      :value="auditEntries"
      :loading="isLoading"
      striped-rows
      responsive-layout="scroll"
      class="p-datatable-striped"
    >
      <Column field="created" :header="$t('audit.created')">
        <template #body="{ data }">
          {{ formatDate(data.created) }}
        </template>
      </Column>
      <Column field="table_name" :header="$t('audit.table_name')" />
      <Column field="action" :header="$t('audit.action')">
        <template #body="{ data }">
          <Tag :value="data.action" :severity="getActionSeverity(data.action)" />
        </template>
      </Column>
      <Column field="email" :header="$t('audit.user')" />
      <Column field="description" :header="$t('audit.description')" />

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
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'

const { t } = useI18n()

// State
const isLoading = ref(false)
const auditEntries = ref<any[]>([])

const filters = ref({
  table_name: '',
  action: '',
  dateRange: null,
})

// Options
const actionOptions = [
  { label: 'INSERT', value: 'INSERT' },
  { label: 'UPDATE', value: 'UPDATE' },
  { label: 'DELETE', value: 'DELETE' },
]

// Helpers
const formatDate = (date: string) => {
  return new Date(date).toLocaleString()
}

const getActionSeverity = (action: string) => {
  const severityMap: Record<string, string> = {
    INSERT: 'success',
    UPDATE: 'info',
    DELETE: 'danger',
  }
  return severityMap[action] || 'secondary'
}

// Load audit entries (placeholder - will be implemented with actual API)
const loadAuditEntries = async () => {
  try {
    isLoading.value = true
    // TODO: Implement actual audit log loading from Supabase
    auditEntries.value = []
  } catch (error) {
    console.error('Failed to load audit entries:', error)
  } finally {
    isLoading.value = false
  }
}

// Apply filters
const applyFilters = () => {
  loadAuditEntries()
}

// Lifecycle
onMounted(() => {
  loadAuditEntries()
})
</script>

<style scoped>
:deep(.p-datatable) {
  --p-datatable-border-color: var(--outline-variant);
}
</style>
