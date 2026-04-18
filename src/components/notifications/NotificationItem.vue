<template>
  <div
    class="flex items-start gap-3 p-3 rounded-md transition-colors"
    :class="[
      notification.is_read
        ? 'bg-surface-container-low hover:bg-surface-container-high'
        : 'bg-surface-container-highest border-l-4 border-primary hover:bg-surface-container-high',
    ]"
  >
    <!-- Icon -->
    <div class="flex-shrink-0 mt-1">
      <i
        :class="getIconClass(notification.type)"
        class="text-lg"
        :style="{ color: getIconColor(notification.type) }"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Title -->
      <div class="font-medium text-on-surface truncate">
        {{ $t(`notifications.type.${notification.type}`) }}
      </div>

      <!-- Message -->
      <div class="text-sm text-on-surface-variant mt-1 line-clamp-2">
        {{ notification.message }}
      </div>

      <!-- Timestamp -->
      <div class="text-xs text-on-surface-variant mt-2 font-mono">
        {{ formatDate(notification.created_at) }}
      </div>

      <!-- Action Link (if provided) -->
      <div v-if="notification.action_url" class="mt-2">
        <router-link
          :to="notification.action_url"
          class="text-xs font-medium text-primary hover:text-primary-container transition-colors"
        >
          {{ $t(`notifications.action.${notification.action_type || 'view'}`) }}
          <i class="pi pi-arrow-right ml-1" style="font-size: 0.625rem" />
        </router-link>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex-shrink-0 flex gap-2">
      <!-- Mark as read/unread -->
      <button
        v-if="!notification.is_read"
        class="p-1 hover:bg-surface-container-high rounded transition-colors"
        :title="$t('notifications.mark_as_read')"
        @click="emit('mark-read')"
      >
        <i class="pi pi-check text-sm text-primary" />
      </button>

      <!-- Delete -->
      <button
        class="p-1 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant hover:text-error"
        :title="$t('notifications.delete')"
        @click="emit('delete')"
      >
        <i class="pi pi-trash text-sm" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Notification } from '@/services/notifications.service'

defineProps<{
  notification: Notification
}>()

const emit = defineEmits<{
  'mark-read': []
  delete: []
}>()

useI18n()

/**
 * Format date to ISO 8601 format
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Get icon class based on notification type
 */
function getIconClass(type: string): string {
  const icons: Record<string, string> = {
    credit_low: 'pi pi-exclamation-circle',
    credit_critical: 'pi pi-alert-circle',
    deployment_created: 'pi pi-check-circle',
    deployment_failed: 'pi pi-times-circle',
    deployment_suspended: 'pi pi-pause-circle',
    topup_success: 'pi pi-check-circle',
    topup_failed: 'pi pi-times-circle',
    refund: 'pi pi-undo',
    general: 'pi pi-bell',
  }

  return icons[type] || icons.general
}

/**
 * Get icon color based on notification type
 */
function getIconColor(type: string): string {
  if (type.includes('critical') || type.includes('failed') || type.includes('suspended')) {
    return '#ba1a1a' // error color
  }
  if (type.includes('low')) {
    return '#9d4300' // secondary color
  }
  if (type.includes('success') || type.includes('created')) {
    return '#003d28' // tertiary color
  }
  return '#00288e' // primary color
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
