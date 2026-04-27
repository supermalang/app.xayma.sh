import { defineStore } from 'pinia'
import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { supabaseFrom } from '@/services/supabase'
import { useNotificationStore } from '@/stores/notifications.store'
import { useI18n } from 'vue-i18n'
import { DASHBOARD_CACHE_TTL_MS } from '@/stores/constants'

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

export const useActivityLogStore = defineStore('activityLog', () => {
  const { t } = useI18n()
  const notificationStore = useNotificationStore()

  const auditEntries = ref<AuditEntry[]>([])
  const isLoading = ref(true)
  const isRefreshing = ref(false)
  const fetchedAt = ref<number | null>(null)

  async function fetchActivityLog(companyId: MaybeRefOrGetter<string> | null, limit = 5) {
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
      isRefreshing.value = false
      return
    }

    auditEntries.value = ((data ?? []) as unknown as AuditEntry[]).map(row => ({
      audit_id: row.audit_id,
      action: row.action,
      description: row.description,
      table_name: row.table_name,
      created: row.created,
      firstname: row.firstname,
      lastname: row.lastname,
      user_role: row.user_role,
    }))

    fetchedAt.value = Date.now()
    isLoading.value = false
    isRefreshing.value = false
  }

  async function loadWithCache(companyId: MaybeRefOrGetter<string> | null, limit = 5) {
    const cached = fetchedAt.value !== null && Date.now() - fetchedAt.value < DASHBOARD_CACHE_TTL_MS
    if (cached) {
      isRefreshing.value = true
      fetchActivityLog(companyId, limit)
      return
    }
    isLoading.value = true
    await fetchActivityLog(companyId, limit)
  }

  function $reset() {
    auditEntries.value = []
    isLoading.value = true
    isRefreshing.value = false
    fetchedAt.value = null
  }

  return {
    auditEntries, isLoading, isRefreshing, fetchedAt,
    fetchActivityLog, loadWithCache, $reset,
  }
})
