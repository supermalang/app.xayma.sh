import { onMounted, type MaybeRefOrGetter } from 'vue'
import { useActivityLogStore } from '@/stores/activity-log.store'
export type { AuditEntry } from '@/stores/activity-log.store'

export function useActivityLog(companyId: MaybeRefOrGetter<string> | null, limit = 5) {
  const store = useActivityLogStore()
  onMounted(() => store.loadWithCache(companyId, limit))
  return {
    auditEntries: store.auditEntries,
    isLoading: store.isLoading,
    isRefreshing: store.isRefreshing,
    refresh: () => store.fetchActivityLog(companyId, limit),
  }
}
