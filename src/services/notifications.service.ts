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
    query = query.eq('partner_id', partnerId)
  }

  if (isRead !== undefined) {
    query = query.eq('is_read', isRead)
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
    .eq('is_read', false)

  if (error) throw error

  return count || 0
}

/**
 * Mark a notification as read
 */
export async function markAsRead(id: string) {
  const { error } = await supabaseFrom('notifications')
    .eq('id', id)
    .update({ is_read: true, read_at: new Date().toISOString() })

  if (error) throw error

  return true
}

/**
 * Mark all notifications as read for a partner
 */
export async function markAllAsRead(partnerId: string) {
  const { error } = await supabaseFrom('notifications')
    .eq('partner_id', partnerId)
    .eq('is_read', false)
    .update({ is_read: true, read_at: new Date().toISOString() })

  if (error) throw error

  return true
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string) {
  const { error } = await supabaseFrom('notifications')
    .eq('id', id)
    .delete()

  if (error) throw error

  return true
}

/**
 * Delete all read notifications for a partner
 */
export async function deleteReadNotifications(partnerId: string) {
  const { error } = await supabaseFrom('notifications')
    .eq('partner_id', partnerId)
    .eq('is_read', true)
    .delete()

  if (error) throw error

  return true
}
