import { ref, onMounted, toValue, type MaybeRefOrGetter } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'
import { useI18n } from 'vue-i18n'

export interface AuditEntry {
  audit_id: number
  action: string | null
  description: string | null
  table_name: string | null
  created: string | null
  firstname: string | null
  lastname: string | null
  user_role: string | null
}

export function useActivityLog(companyId: MaybeRefOrGetter<string> | null, limit = 5) {
  const { t } = useI18n()
  const notificationStore = useNotificationStore()

  const auditEntries = ref<AuditEntry[]>([])
  const isLoading = ref(true)

  async function fetchActivityLog() {
    isLoading.value = true

    let query = supabaseFrom('general_audit')
      .select('audit_id, action, description, table_name, created, firstname, lastname, user_role')
      .order('created', { ascending: false })
      .limit(limit)

    const resolvedId = companyId !== null ? toValue(companyId) : null
    if (resolvedId) {
      query = query.eq('company_id', resolvedId)
    }

    const { data, error } = await query

    if (error) {
      notificationStore.addError(t('errors.fetch_failed'))
      isLoading.value = false
      return
    }

    const rows = (data ?? []) as unknown as AuditEntry[]
    auditEntries.value = rows.map(row => ({
      audit_id: row.audit_id,
      action: row.action,
      description: row.description,
      table_name: row.table_name,
      created: row.created,
      firstname: row.firstname,
      lastname: row.lastname,
      user_role: row.user_role,
    }))

    isLoading.value = false
  }

  onMounted(fetchActivityLog)

  return {
    auditEntries,
    isLoading,
    refresh: fetchActivityLog,
  }
}
