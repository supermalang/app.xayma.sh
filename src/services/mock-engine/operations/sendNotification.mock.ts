import { WorkflowEngineError } from '../../workflow-engine'
import { registerMock } from '../index'
import type { MockHandler, MockContext } from '../types'

interface Payload {
  partnerId?: number
  userId?: string
  type: string
  title: string
  message: string
}

/**
 * Inserts a single in-app notification row.
 *
 * Notifications are user-scoped in the DB (`user_id` is required).
 * If the payload doesn't include `userId`, we fall back to the current
 * authenticated user. In real n8n the workflow queries users-by-partner
 * and fans out one row per user; mock keeps it simple.
 */
export const sendNotificationMock: MockHandler<Payload, void> = async (p, ctx) => {
  const userId = p.userId ?? ctx.authUserId
  if (!userId) {
    throw new WorkflowEngineError(400, 'sendNotification: userId or authenticated user required')
  }
  const { error } = await ctx.supabase.from('notifications').insert([
    {
      user_id: userId,
      type: p.type,
      title: p.title,
      message: p.message,
    },
  ])
  if (error) throw new WorkflowEngineError(500, error.message)
}

/**
 * Helper for other mocks that want to record a notification side-effect.
 * Swallows errors so a notification failure doesn't break the top-up flow.
 */
export async function recordNotification(
  ctx: MockContext,
  args: { userId?: string; type: string; title: string; message: string },
): Promise<void> {
  const userId = args.userId ?? ctx.authUserId
  if (!userId) return
  try {
    await ctx.supabase.from('notifications').insert([
      { user_id: userId, type: args.type, title: args.title, message: args.message },
    ])
  } catch (err) {
    console.warn('[mock-engine] recordNotification failed (ignored):', err)
  }
}

registerMock('workflow', 'sendNotification', sendNotificationMock)
