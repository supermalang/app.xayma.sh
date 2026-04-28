import { supabaseFrom } from './supabase'
import type { Database } from '@/types/supabase'

export type Notification = Database['xayma_app']['Tables']['notifications']['Row']

interface ListNotificationsFilter {
  partnerId?: string
  isRead?: boolean
  page?: number
  pageSize?: number
}

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
    .order('created', { ascending: false })
    .range(from, to)

  if (error) throw error

  return { data: data || [], count: count || 0 }
}

export async function getNotification(id: number) {
  const { data, error } = await supabaseFrom('notifications')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  return data
}

export async function getUnreadCount(partnerId: string): Promise<number> {
  const { count, error } = await supabaseFrom('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', partnerId)
    .is('read_at', null)

  if (error) throw error

  return count || 0
}

export async function markAsRead(id: number) {
  const { error } = await supabaseFrom('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error

  return true
}

export async function markAllAsRead(userId: string) {
  const { error } = await supabaseFrom('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw error

  return true
}

export async function deleteNotification(id: number) {
  const { error } = await supabaseFrom('notifications')
    .delete()
    .eq('id', id)

  if (error) throw error

  return true
}

export async function deleteReadNotifications(userId: string) {
  const { error } = await supabaseFrom('notifications')
    .delete()
    .eq('user_id', userId)
    .not('read_at', 'is', null)

  if (error) throw error

  return true
}
