<template>
  <AppPageHeader
    :title="$t('notifications.page_title')"
    :description="$t('notifications.page_description')"
    icon="pi-bell"
  />

  <div class="grid grid-cols-1 gap-6">
    <!-- Action Bar -->
    <div class="flex items-center justify-between gap-4">
      <!-- Filters -->
      <div class="flex items-center gap-4 flex-1">
        <Dropdown
          v-model="selectedStatus"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          class="w-48"
          @change="applyFilters"
        />
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <Button
          v-if="unreadCount > 0"
          text
          :label="$t('notifications.mark_all_read')"
          icon="pi pi-check"
          @click="markAllAsRead"
        />
        <Button
          v-if="hasReadNotifications"
          text
          severity="secondary"
          :label="$t('notifications.clear_read')"
          icon="pi pi-trash"
          @click="deleteAllRead"
        />
      </div>
    </div>

    <!-- Notifications List -->
    <Card>
      <!-- Empty State -->
      <template v-if="filteredNotifications.length === 0">
        <div class="text-center py-12">
          <i class="pi pi-inbox text-4xl mb-4 block text-on-surface-variant opacity-50" />
          <p class="text-on-surface-variant">{{ $t('notifications.empty') }}</p>
        </div>
      </template>

      <!-- Grouped by Date -->
      <template v-else>
        <div v-for="(group, date) in groupedByDate" :key="date" class="mb-6 last:mb-0">
          <!-- Date Header -->
          <div class="sticky top-0 bg-surface-container-low px-4 py-2 mb-2 text-xs font-bold text-on-surface-variant">
            {{ date }}
          </div>

          <!-- Items -->
          <div class="space-y-2">
            <NotificationItem
              v-for="notification in group"
              :key="notification.id"
              :notification="notification"
              @mark-read="readNotification(notification.id)"
              @delete="removeNotification(notification.id)"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Pagination -->
    <div v-if="totalCount > pageSize" class="flex justify-center">
      <Paginator
        :rows="pageSize"
        :total-records="totalCount"
        :rows-per-page-options="[20, 50, 100]"
        @page="onPageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Paginator from 'primevue/paginator'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import NotificationItem from '@/components/notifications/NotificationItem.vue'
import { useNotifications } from '@/composables/useNotifications'
import { deleteReadNotifications } from '@/services/notifications.service'

const { t } = useI18n()

const {
  notifications,
  unreadCount,
  groupedByDate,
  fetchNotifications,
  readNotification,
  readAll,
  removeNotification,
} = useNotifications()

const selectedStatus = ref<string | null>(null)
const pageSize = ref(20)
const totalCount = ref(0)
const currentPage = ref(1)

/**
 * Status filter options
 */
const statusOptions = [
  { label: t('notifications.all'), value: null },
  { label: t('notifications.unread_only'), value: 'unread' },
  { label: t('notifications.read_only'), value: 'read' },
]

/**
 * Computed: filtered notifications based on status
 */
const filteredNotifications = computed(() => {
  if (selectedStatus.value === 'unread') {
    return notifications.value.filter((n) => !n.is_read)
  }
  if (selectedStatus.value === 'read') {
    return notifications.value.filter((n) => n.is_read)
  }
  return notifications.value
})

/**
 * Computed: check if there are read notifications
 */
const hasReadNotifications = computed(() => notifications.value.some((n) => n.is_read))

/**
 * Apply filters and refresh
 */
async function applyFilters() {
  currentPage.value = 1
  await fetchNotifications(1, pageSize.value)
}

/**
 * Handle page change
 */
async function onPageChange(event: { page: number }) {
  currentPage.value = event.page + 1
  await fetchNotifications(currentPage.value, pageSize.value)
}

/**
 * Mark all as read
 */
async function markAllAsRead() {
  await readAll()
}

/**
 * Delete all read notifications
 */
async function deleteAllRead() {
  try {
    await deleteReadNotifications(notifications.value[0]?.partner_id || '')
    await applyFilters()
  } catch (error) {
    console.error('Failed to delete read notifications:', error)
  }
}

// Initialize
onMounted(async () => {
  await fetchNotifications(1, pageSize.value)
  // In a real app, totalCount would come from the API response
  totalCount.value = notifications.value.length
})
</script>

<style scoped>
:deep(.p-paginator) {
  justify-content: center;
}
</style>
