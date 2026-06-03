import { WorkflowEngineError } from '../../workflow-engine'
import { registerMock } from '../index'
import type { MockHandler } from '../types'

interface Payload {
  partnerId: number
  userId?: string
  type: string
  payload: Record<string, unknown>
  locale: string
}

export const sendNotificationMock: MockHandler<Payload, void> = async (p, ctx) => {
  const { error } = await ctx.supabase.from('xayma_app.notifications').insert([
    {
      partner_id: p.partnerId,
      user_id: p.userId ?? null,
      type: p.type,
      payload: p.payload,
      locale: p.locale,
      read: false,
      created_at: new Date().toISOString(),
    },
  ])
  if (error) throw new WorkflowEngineError(500, error.message)
}

registerMock('workflow', 'sendNotification', sendNotificationMock)
