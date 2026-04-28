import { onMounted, type MaybeRefOrGetter } from 'vue'
import { storeToRefs } from 'pinia'
import { useActivityLogStore } from '@/stores/activity-log.store'
export type { AuditEntry } from '@/stores/activity-log.store'

export function useActivityLog(companyId: MaybeRefOrGetter<string> | null, limit = 5) {
  const store = useActivityLogStore()
  const { auditEntries, isLoading, isRefreshing } = storeToRefs(store)
  onMounted(() => store.loadWithCache(companyId, limit))
  return {
    auditEntries,
    isLoading,
    isRefreshing,
    refresh: () => store.fetchActivityLog(companyId, limit),
  }
}
