<template>
  <Popover ref="op" class="w-96">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant">
      <h3 class="text-base font-semibold text-on-surface">
        {{ $t('notifications.title') }}
      </h3>
      <span
        v-if="unreadCount > 0"
        class="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white rounded-full"
        :style="{ backgroundColor: '#00288e' }"
      >
        {{ unreadCount }}
      </span>
    </div>

    <!-- Content -->
    <div class="max-h-96 overflow-y-auto">
      <!-- Empty State -->
      <div v-if="notifications.length === 0" class="p-4 text-center text-on-surface-variant">
        <i class="pi pi-inbox text-3xl mb-2 block opacity-50" />
        <p class="text-sm">{{ $t('notifications.empty') }}</p>
      </div>

      <!-- Notifications List -->
      <div v-else class="space-y-2 p-2">
        <NotificationItem
          v-for="notification in notifications"
          :key="notification.id"
          :notification="notification"
          @mark-read="readNotification(notification.id)"
          @delete="removeNotification(notification.id)"
        />
      </div>
    </div>

    <!-- Footer -->
    <div v-if="unreadCount > 0" class="flex gap-2 pt-4 mt-4 border-t border-outline-variant">
      <Button
        outlined
        size="small"
        class="flex-1"
        :label="$t('notifications.mark_all_read')"
        @click="readAll"
      />
      <Button
        :label="$t('notifications.view_all')"
        size="small"
        class="flex-1"
        @click="navigateToNotifications"
      />
    </div>
  </Popover>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Popover from 'primevue/popover'
import Button from 'primevue/button'
import NotificationItem from './NotificationItem.vue'
import { useNotifications } from '@/composables/useNotifications'

const router = useRouter()
const op = ref<InstanceType<typeof Popover>>()

const { notifications, unreadCount, readNotification, readAll, removeNotification } = useNotifications()

/**
 * Toggle feed visibility
 */
function toggle(event: Event) {
  op.value?.toggle(event)
}

/**
 * Navigate to full notifications page
 */
function navigateToNotifications() {
  op.value?.hide()
  router.push('/notifications')
}

defineExpose({ toggle })
</script>

<style scoped>
:deep(.p-popover) {
  min-width: 360px;
}

:deep(.p-popover-content) {
  padding: 0;
}
</style>
