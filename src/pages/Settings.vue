<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-on-surface">{{ $t('settings.title') }}</h1>
      <p class="text-on-surface-variant mt-1">{{ $t('settings.description') }}</p>
    </div>

    <DataTable
      :value="rows"
      :loading="isLoading"
      edit-mode="row"
      data-key="key"
      striped-rows
      responsive-layout="scroll"
      @row-edit-save="onRowEditSave"
    >
      <Column field="key" :header="$t('settings.key')" class="w-1/2" />
      <Column field="value" :header="$t('settings.value')" class="w-1/2">
        <template #editor="{ data, field }">
          <InputText v-model="data[field]" class="w-full" />
        </template>
      </Column>
      <Column :row-editor="true" style="width: 8rem" body-style="text-align:center" />

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
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import { getAllSettings, updateSetting } from '@/services/settings'
import { useNotificationStore } from '@/stores/notifications.store'

const { t } = useI18n()
const notificationStore = useNotificationStore()

interface SettingRow {
  key: string
  value: string
}

const isLoading = ref(false)
const rows = ref<SettingRow[]>([])

const loadSettings = async () => {
  isLoading.value = true
  try {
    const data = await getAllSettings()
    rows.value = Object.entries(data).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }))
  } catch {
    notificationStore.addError(t('errors.fetch_failed'))
  } finally {
    isLoading.value = false
  }
}

const onRowEditSave = async (event: { newData: SettingRow }) => {
  const { key, value } = event.newData
  try {
    await updateSetting(key, value)
    const idx = rows.value.findIndex((r) => r.key === key)
    if (idx !== -1) rows.value[idx].value = value
    notificationStore.addSuccess(t('settings.save_success'))
  } catch {
    notificationStore.addError(t('errors.save_failed'))
  }
}

onMounted(loadSettings)
</script>
