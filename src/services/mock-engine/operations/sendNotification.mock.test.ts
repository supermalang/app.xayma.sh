import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendNotificationMock, recordNotification } from './sendNotification.mock'

const insert = vi.fn().mockResolvedValue({ error: null })
const from = vi.fn().mockReturnValue({ insert })

beforeEach(() => {
  insert.mockClear()
  from.mockClear()
  insert.mockResolvedValue({ error: null })
})

describe('sendNotification mock', () => {
  it('inserts a notification row using the explicit userId', async () => {
    await sendNotificationMock(
      { userId: 'user-1', type: 'CREDIT_TOPUP', title: 'Credits added', message: '5000 credits added' },
      { supabase: { from } as never, authUserId: null, partnerId: 42 },
    )
    expect(from).toHaveBeenCalledWith('xayma_app.notifications')
    const row = insert.mock.calls[0][0][0]
    expect(row).toMatchObject({
      user_id: 'user-1',
      type: 'CREDIT_TOPUP',
      title: 'Credits added',
      message: '5000 credits added',
    })
  })

  it('falls back to the authenticated user when userId is missing', async () => {
    await sendNotificationMock(
      { type: 'CREDIT_TOPUP', title: 't', message: 'm' },
      { supabase: { from } as never, authUserId: 'auth-user', partnerId: 1 },
    )
    expect(insert.mock.calls[0][0][0].user_id).toBe('auth-user')
  })

  it('throws when no userId can be resolved', async () => {
    await expect(
      sendNotificationMock(
        { type: 't', title: 'x', message: 'y' },
        { supabase: { from } as never, authUserId: null, partnerId: null },
      ),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws WorkflowEngineError on supabase error', async () => {
    insert.mockResolvedValueOnce({ error: { message: 'rls denied' } })
    await expect(
      sendNotificationMock(
        { userId: 'u', type: 't', title: 'x', message: 'y' },
        { supabase: { from } as never, authUserId: 'u', partnerId: 42 },
      ),
    ).rejects.toThrow()
  })
})

describe('recordNotification', () => {
  it('inserts silently and does not throw on error', async () => {
    insert.mockResolvedValueOnce({ error: { message: 'fail' } })
    await expect(
      recordNotification(
        { supabase: { from } as never, authUserId: 'u', partnerId: 1 },
        { type: 't', title: 'a', message: 'b' },
      ),
    ).resolves.toBeUndefined()
  })

  it('skips when no userId is available', async () => {
    await recordNotification(
      { supabase: { from } as never, authUserId: null, partnerId: null },
      { type: 't', title: 'a', message: 'b' },
    )
    expect(insert).not.toHaveBeenCalled()
  })
})
