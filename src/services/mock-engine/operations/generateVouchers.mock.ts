import { WorkflowEngineError } from '../../workflow-engine'
import { registerMock } from '../index'
import type { MockHandler } from '../types'

interface Payload {
  quantity: number
  credits: number
  maxUses?: number
  expiresAt?: string | null
  partnerType?: string[] | null
  specificPartnerId?: number | null
}

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no I, O, 1, 0

function randomCode(): string {
  const pick = (n: number) =>
    Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
  return `XAYMA-${pick(4)}-${pick(4)}`
}

export const generateVouchersMock: MockHandler<Payload, void> = async (p, ctx) => {
  if (!Number.isInteger(p.quantity) || p.quantity < 1 || p.quantity > 100) {
    throw new WorkflowEngineError(400, 'Quantity must be an integer between 1 and 100')
  }
  if (!Number.isInteger(p.credits) || p.credits <= 0) {
    throw new WorkflowEngineError(400, 'Credits must be a positive integer')
  }

  const rows = Array.from({ length: p.quantity }, () => ({
    code: randomCode(),
    credits: p.credits,
    max_uses: p.maxUses ?? 1,
    uses_count: 0,
    expires_at: p.expiresAt ?? null,
    partner_type: p.partnerType && p.partnerType.length > 0 ? p.partnerType : null,
    partner_id: p.specificPartnerId ?? null,
    status: 'active',
  }))

  const { error } = await ctx.supabase.from('xayma_app.vouchers').insert(rows)
  if (error) throw new WorkflowEngineError(500, error.message)
}

registerMock('workflow', 'generateVouchers', generateVouchersMock)
