import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from './useAuth'
import { listNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '@/services/notifications.service'
import { supabase } from '@/services/supabase'
import type { Notification } from '@/services/notifications.service'

// Module-level singletons — shared across all callers so only one Realtime
// channel is created regardless of how many components mount this composable.
const notifications = ref<Notification[]>([])
const unreadCount = ref(0)
const loading = ref(false)
const error = ref<Error | null>(null)
let channel: ReturnType<typeof supabase.channel> | null = null
let refCount = 0

export function useNotifications() {
  const { user } = useAuth()

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

      notifications.value = result.data as Notification[]
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to fetch notifications')
    } finally {
      loading.value = false
    }
  }

  async function fetchUnreadCount() {
    if (!user.value?.id) return

    try {
      const count = await getUnreadCount(user.value.id)
      unreadCount.value = count
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }

  async function readNotification(id: number) {
    try {
      await markAsRead(id)
      const notification = notifications.value.find((n) => n.id === id)
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

  async function removeNotification(id: number) {
    try {
      await deleteNotification(id)
      const index = notifications.value.findIndex((n) => n.id === id)
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

  function subscribeToUpdates() {
    if (!user.value?.id) return
    if (channel) return

    channel = supabase
      .channel(`notifications-${user.value.id}`)
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

  function unsubscribe() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }

  async function initialize() {
    await Promise.all([fetchNotifications(1, 20), fetchUnreadCount()])
    subscribeToUpdates()
  }

  function reset() {
    notifications.value = []
    unreadCount.value = 0
    loading.value = false
    error.value = null
    unsubscribe()
    refCount = 0
  }

  const unreadNotifications = computed(() => notifications.value.filter((n) => !n.read_at))

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

  onMounted(() => {
    refCount++
    if (refCount === 1) initialize()
  })

  onUnmounted(() => {
    refCount--
    if (refCount === 0) unsubscribe()
  })

  return {
    notifications,
    unreadCount,
    loading,
    error,
    unreadNotifications,
    groupedByDate,
    fetchNotifications,
    fetchUnreadCount,
    readNotification,
    readAll,
    removeNotification,
    subscribeToUpdates,
    unsubscribe,
    initialize,
    reset,
  }
}
