import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resumeAfterTopup } from './resumeAfterTopup'

beforeEach(() => vi.clearAllMocks())

describe('resumeAfterTopup', () => {
  it('flips suspended deployments for partner to active', async () => {
    const updateIn = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ in: updateIn })

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'deployments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 1 }, { id: 2 }],
                error: null,
              }),
            }),
          }),
          update,
        }
      }
      return {}
    })

    await resumeAfterTopup({
      supabase: { from } as never,
      authUserId: null,
      partnerId: 42,
    })

    expect(update).toHaveBeenCalledWith({ status: 'active' })
    expect(updateIn).toHaveBeenCalledWith('id', [1, 2])
  })

  it('no-ops when partner has no suspended deployments', async () => {
    const update = vi.fn()
    const from = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update,
    }))

    await resumeAfterTopup({
      supabase: { from } as never,
      authUserId: null,
      partnerId: 42,
    })

    expect(update).not.toHaveBeenCalled()
  })

  it('no-ops when partnerId is null', async () => {
    const from = vi.fn()
    await resumeAfterTopup({
      supabase: { from } as never,
      authUserId: null,
      partnerId: null,
    })
    expect(from).not.toHaveBeenCalled()
  })
})
