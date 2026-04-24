/**
 * useSettings composable
 * Load and update platform-wide configuration settings
 */

import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { supabaseFrom } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'

const settings = ref<Record<string, string>>({})
const loading = ref(false)

export function useSettings() {
  const { t } = useI18n()
  const notificationStore = useNotificationStore()

  async function loadSettings(): Promise<void> {
    loading.value = true
    try {
      const { data, error } = await supabaseFrom('xayma_app.settings').select('key, value')

      if (error) throw error

      settings.value = (data || []).reduce(
        (acc: Record<string, string>, record: any) => {
          acc[record.key] = record.value
          return acc
        },
        {}
      )
    } catch (err) {
      console.error('Error loading settings:', err)
      notificationStore.addError(t('settings.error_loading'))
    } finally {
      loading.value = false
    }
  }

  async function updateSetting(key: string, value: string): Promise<void> {
    try {
      const { error } = await supabaseFrom('xayma_app.settings').upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )

      if (error) throw error

      settings.value[key] = value
      notificationStore.addSuccess(t('settings.saved'))
    } catch (err) {
      console.error('Error updating setting:', err)
      notificationStore.addError(t('settings.error_saving'))
    }
  }

  return {
    settings,
    loading,
    loadSettings,
    updateSetting,
  }
}
