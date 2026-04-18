<template>
  <div class="flex items-center">
    <!-- Bell Button with Badge -->
    <OverlayBadge
      :value="unreadCount > 0 ? unreadCount : undefined"
      severity="danger"
      class="cursor-pointer"
      @click="toggleFeed"
    >
      <i class="pi pi-bell text-xl text-on-surface hover:text-primary transition-colors" />
    </OverlayBadge>

    <!-- Notification Feed -->
    <NotificationFeed ref="feed" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OverlayBadge from 'primevue/overlaybadge'
import NotificationFeed from './NotificationFeed.vue'
import { useNotifications } from '@/composables/useNotifications'

const feed = ref<InstanceType<typeof NotificationFeed>>()
const { unreadCount } = useNotifications()

/**
 * Toggle feed visibility
 */
function toggleFeed(event: Event) {
  feed.value?.toggle(event)
}
</script>

<style scoped>
:deep(.p-overlay-badge) {
  display: inline-block;
}

i {
  transition: color 0.2s ease;
}

i:hover {
  color: var(--brand-primary);
}
</style>
