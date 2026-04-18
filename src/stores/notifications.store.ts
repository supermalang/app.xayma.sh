/**
 * Notifications store
 * Manages app notifications (toast messages, alerts)
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])

  function addNotification(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration = 5000
  ) {
    const id = Math.random().toString(36).slice(2)
    const notification: Notification = { id, type, message, duration }

    notifications.value.push(notification)

    if (duration) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }

  function addSuccess(message: string, duration?: number) {
    return addNotification(message, 'success', duration)
  }

  function addError(message: string, duration?: number) {
    return addNotification(message, 'error', duration)
  }

  function addInfo(message: string, duration?: number) {
    return addNotification(message, 'info', duration)
  }

  function addWarning(message: string, duration?: number) {
    return addNotification(message, 'warning', duration)
  }

  function removeNotification(id: string) {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  function clearAll() {
    notifications.value = []
  }

  return {
    notifications,
    addNotification,
    addSuccess,
    addError,
    addInfo,
    addWarning,
    removeNotification,
    clearAll,
  }
})
