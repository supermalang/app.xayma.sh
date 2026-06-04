<template>
  <AppPage>
    <AppPageHeader :title="$t('nav.audit')" />

    <AppDataTable
      :rows="auditEntries"
      :columns="columns"
      :loading="isLoading"
      :total-records="auditEntries.length"
      export-filename="audit-log"
      :empty-title="$t('audit.empty.title')"
      :empty-description="$t('audit.empty.description')"
      empty-icon="pi-history"
    >
      <template #filter>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ $t('audit.table_name') }}
          </label>
          <InputText
            v-model="filterInputs.table_name"
            :placeholder="$t('audit.table_name')"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ $t('audit.action') }}
          </label>
          <Dropdown
            v-model="filterInputs.action"
            :options="actionOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('audit.action')"
            class="w-full"
            show-clear
          />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ $t('audit.date_range') }}
          </label>
          <Calendar
            v-model="filterInputs.dateRange"
            selection-mode="range"
            :placeholder="$t('audit.date_range')"
            class="w-full"
          />
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-outline-variant/40">
          <Button
            :label="$t('common.reset')"
            severity="secondary"
            text
            size="small"
            @click="resetFilters"
          />
          <Button
            :label="$t('common.apply')"
            size="small"
            @click="applyFilters"
          />
        </div>
      </template>

      <template #body-created_at="{ data }">
        {{ formatDate((data as AuditEntry).created_at) }}
      </template>

      <template #body-operation="{ data }">
        <Tag :value="(data as AuditEntry).operation" :severity="getActionSeverity((data as AuditEntry).operation)" />
      </template>
    </AppDataTable>
  </AppPage>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import AppPage from '@/components/common/AppPage.vue'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import AppDataTable, { type AppTableColumn } from '@/components/common/AppDataTable.vue'
import { supabaseFrom } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'

interface AuditEntry {
  created_at: string
  table_name: string
  operation: string
  email: string
  description: string
}

const { t } = useI18n()
const notificationStore = useNotificationStore()

// State
const isLoading = ref(false)
const auditEntries = ref<AuditEntry[]>([])

const filters = ref<{ table_name: string; action: string; dateRange: Date[] | null }>({
  table_name: '',
  action: '',
  dateRange: null,
})

// Draft filter state (only applied on Apply click)
const filterInputs = ref<{ table_name: string; action: string; dateRange: Date[] | null }>({
  table_name: '',
  action: '',
  dateRange: null,
})

const columns: AppTableColumn[] = [
  { field: 'created_at', header: 'audit.created' },
  { field: 'table_name', header: 'audit.table_name' },
  { field: 'operation', header: 'audit.action' },
  { field: 'email', header: 'audit.user' },
  { field: 'description', header: 'audit.description' },
]

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

// Load audit entries from Supabase
const loadAuditEntries = async () => {
  try {
    isLoading.value = true

    let query = supabaseFrom('general_audit').select('*')

    // Apply table_name filter
    if (filters.value.table_name) {
      query = query.eq('table_name', filters.value.table_name)
    }

    // Apply action filter
    if (filters.value.action) {
      query = query.eq('action', filters.value.action as unknown as 'create')
    }

    // Apply date range filter
    if (filters.value.dateRange && Array.isArray(filters.value.dateRange) && filters.value.dateRange.length === 2) {
      const [startDate, endDate] = filters.value.dateRange
      query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
    }

    // Order by creation date (newest first)
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error loading audit entries:', error)
      notificationStore.addError(t('errors.fetch_failed'))
      auditEntries.value = []
      return
    }

    auditEntries.value = (data as unknown as AuditEntry[]) || []
  } catch (error) {
    console.error('Failed to load audit entries:', error)
    notificationStore.addError(t('errors.fetch_failed'))
  } finally {
    isLoading.value = false
  }
}

// Apply filters
const applyFilters = () => {
  filters.value = { ...filterInputs.value }
  loadAuditEntries()
}

const resetFilters = () => {
  filterInputs.value = { table_name: '', action: '', dateRange: null }
  filters.value = { table_name: '', action: '', dateRange: null }
  loadAuditEntries()
}

// Lifecycle
onMounted(() => {
  loadAuditEntries()
})
</script>
