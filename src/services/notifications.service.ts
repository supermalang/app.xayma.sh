import { supabaseFrom } from './supabase'
import type { Database } from '@/types/supabase'

export type Notification = Database['xayma_app']['Tables']['notifications']['Row']

interface ListNotificationsFilter {
  partnerId?: string
  isRead?: boolean
  page?: number
  pageSize?: number
}

/**
 * Fetch notifications with pagination and filtering
 */
export async function listNotifications(filters: ListNotificationsFilter = {}) {
  const { partnerId, isRead, page = 1, pageSize = 20 } = filters

  let query = supabaseFrom('notifications').select('*', { count: 'exact' })

  if (partnerId) {
    query = query.eq('user_id', partnerId)
  }

  if (isRead !== undefined) {
    if (isRead) {
      query = query.not('read_at', 'is', null)
    } else {
      query = query.is('read_at', null)
    }
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  return { data: data || [], count: count || 0 }
}

/**
 * Fetch a single notification by ID
 */
export async function getNotification(id: string) {
  const { data, error } = await supabaseFrom('notifications')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  return data
}

/**
 * Count unread notifications for a partner
 */
export async function getUnreadCount(partnerId: string): Promise<number> {
  const { count, error } = await supabaseFrom('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .is('read_at', null)

  if (error) throw error

  return count || 0
}

/**
 * Mark a notification as read
 */
export async function markAsRead(id: string) {
  const { error } = await supabaseFrom('notifications')
    .eq('id', parseInt(id))
    .update({ read_at: new Date().toISOString() })

  if (error) throw error

  return true
}

/**
 * Mark all notifications as read for a partner
 */
export async function markAllAsRead(partnerId: string) {
  const { error } = await supabaseFrom('notifications')
    .eq('user_id', partnerId)
    .is('read_at', null)
    .update({ read_at: new Date().toISOString() })

  if (error) throw error

  return true
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string) {
  const { error } = await supabaseFrom('notifications')
    .eq('id', parseInt(id))
    .delete()

  if (error) throw error

  return true
}

/**
 * Delete all read notifications for a partner
 */
export async function deleteReadNotifications(partnerId: string) {
  const { error } = await supabaseFrom('notifications')
    .eq('user_id', partnerId)
    .not('read_at', 'is', null)
    .delete()

  if (error) throw error

  return true
}
