import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from './useAuth'
import { listNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '@/services/notifications.service'
import { supabase } from '@/services/supabase'
import type { Notification } from '@/services/notifications.service'

export function useNotifications() {
  const { user } = useAuth()

  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  let channel: ReturnType<typeof supabase.channel> | null = null

  /**
   * Fetch notifications with optional filters
   */
  async function fetchNotifications(page = 1, pageSize = 20) {
    if (!user.value?.id) return

    try {
      loading.value = true
      error.value = null

      const result = await listNotifications({
        partnerId: user.value.id,
        page,
        pageSize,
      })

      notifications.value = result.data
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to fetch notifications')
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch unread count
   */
  async function fetchUnreadCount() {
    if (!user.value?.id) return

    try {
      const count = await getUnreadCount(user.value.id)
      unreadCount.value = count
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }

  /**
   * Mark notification as read
   */
  async function readNotification(id: string) {
    try {
      await markAsRead(id)
      const notification = notifications.value.find((n) => n.id === parseInt(id))
      if (notification) {
        notification.read_at = new Date().toISOString()
      }
      if (unreadCount.value > 0) {
        unreadCount.value--
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  /**
   * Mark all notifications as read
   */
  async function readAll() {
    if (!user.value?.id) return

    try {
      await markAllAsRead(user.value.id)
      notifications.value.forEach((n) => {
        n.read_at = new Date().toISOString()
      })
      unreadCount.value = 0
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  /**
   * Delete a notification
   */
  async function removeNotification(id: string) {
    try {
      await deleteNotification(id)
      const index = notifications.value.findIndex((n) => n.id === parseInt(id))
      if (index > -1) {
        const notification = notifications.value[index]
        if (!notification.read_at) {
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
        notifications.value.splice(index, 1)
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  /**
   * Subscribe to notification updates via Realtime
   */
  function subscribeToUpdates() {
    if (!user.value?.id) return

    channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'xayma_app',
          table: 'notifications',
          filter: `partner_id=eq.${user.value.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          notifications.value.unshift(newNotification)
          if (!newNotification.read_at) {
            unreadCount.value++
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'xayma_app',
          table: 'notifications',
          filter: `partner_id=eq.${user.value.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification
          const index = notifications.value.findIndex((n) => n.id === updatedNotification.id)
          if (index > -1) {
            const oldNotification = notifications.value[index]
            if (!oldNotification.read_at && updatedNotification.read_at) {
              unreadCount.value = Math.max(0, unreadCount.value - 1)
            } else if (oldNotification.read_at && !updatedNotification.read_at) {
              unreadCount.value++
            }
            notifications.value[index] = updatedNotification
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'xayma_app',
          table: 'notifications',
          filter: `partner_id=eq.${user.value.id}`,
        },
        (payload) => {
          const deletedId = payload.old.id
          const index = notifications.value.findIndex((n) => n.id === deletedId)
          if (index > -1) {
            const notification = notifications.value[index]
            if (!notification.read_at) {
              unreadCount.value = Math.max(0, unreadCount.value - 1)
            }
            notifications.value.splice(index, 1)
          }
        }
      )
      .subscribe()
  }

  /**
   * Unsubscribe from updates
   */
  function unsubscribe() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }

  /**
   * Initialize: fetch data and subscribe
   */
  async function initialize() {
    await fetchNotifications(1, 20)
    await fetchUnreadCount()
    subscribeToUpdates()
  }

  /**
   * Computed: filtered unread notifications
   */
  const unreadNotifications = computed(() => notifications.value.filter((n) => !n.read_at))

  /**
   * Computed: grouped notifications by date
   */
  const groupedByDate = computed(() => {
    const groups: Record<string, Notification[]> = {}

    notifications.value.forEach((notification) => {
      const date = new Date(notification.created).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })

      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(notification)
    })

    return groups
  })

  // Auto-initialize on mount
  onMounted(() => {
    initialize()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe()
  })

  return {
    // State
    notifications,
    unreadCount,
    loading,
    error,

    // Computed
    unreadNotifications,
    groupedByDate,

    // Actions
    fetchNotifications,
    fetchUnreadCount,
    readNotification,
    readAll,
    removeNotification,
    subscribeToUpdates,
    unsubscribe,
    initialize,
  }
}
