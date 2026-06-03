import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendNotificationMock } from './sendNotification.mock'

const insert = vi.fn().mockResolvedValue({ error: null })
const from = vi.fn().mockReturnValue({ insert })

const ctx = {
  supabase: { from } as never,
  authUserId: 'user-1',
  partnerId: 42,
}

beforeEach(() => {
  insert.mockClear()
  from.mockClear()
  insert.mockResolvedValue({ error: null })
})

describe('sendNotification mock', () => {
  it('inserts a notification row with the given payload', async () => {
    await sendNotificationMock(
      { partnerId: 42, userId: 'user-1', type: 'credit.topup', payload: { amount: 5000 }, locale: 'en' },
      ctx,
    )
    expect(from).toHaveBeenCalledWith('xayma_app.notifications')
    expect(insert).toHaveBeenCalledTimes(1)
    const rows = insert.mock.calls[0][0]
    const row = rows[0]
    expect(row).toMatchObject({
      partner_id: 42,
      user_id: 'user-1',
      type: 'credit.topup',
      payload: { amount: 5000 },
      locale: 'en',
      read: false,
    })
  })

  it('throws WorkflowEngineError on supabase error', async () => {
    insert.mockResolvedValueOnce({ error: { message: 'rls denied' } })
    await expect(
      sendNotificationMock({ partnerId: 42, type: 'x', payload: {}, locale: 'en' }, ctx),
    ).rejects.toThrow()
  })
})
