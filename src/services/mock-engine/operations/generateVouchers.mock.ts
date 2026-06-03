import { WorkflowEngineError } from '../../workflow-engine'
import { registerMock } from '../index'
import type { MockHandler } from '../types'
import type { Database } from '@/types/supabase'

type PartnerType = Database['xayma_app']['Enums']['partner_type']
type VoucherInsert = Database['xayma_app']['Tables']['vouchers']['Insert']

const VALID_PARTNER_TYPES: PartnerType[] = ['customer', 'affiliate', 'reseller', 'pro_reseller']

interface Payload {
  quantity: number
  credits: number
  maxUses?: number
  expiresAt?: string | null
  /** Uppercase or lowercase — normalised before insert. */
  partnerType?: string[] | null
  specificPartnerId?: number | null
}

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no I, O, 1, 0

function randomCode(): string {
  const pick = (n: number) =>
    Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
  return `XAYMA-${pick(4)}-${pick(4)}`
}

function normalisePartnerTypes(input: string[] | null | undefined): PartnerType[] | null {
  if (!input || input.length === 0) return null
  const out: PartnerType[] = []
  for (const raw of input) {
    const lower = raw.toLowerCase()
    if ((VALID_PARTNER_TYPES as string[]).includes(lower)) {
      out.push(lower as PartnerType)
    } else {
      throw new WorkflowEngineError(400, `Invalid partner_type: ${raw}`)
    }
  }
  return out.length > 0 ? out : null
}

export const generateVouchersMock: MockHandler<Payload, void> = async (p, ctx) => {
  if (!Number.isInteger(p.quantity) || p.quantity < 1 || p.quantity > 100) {
    throw new WorkflowEngineError(400, 'Quantity must be an integer between 1 and 100')
  }
  if (!Number.isInteger(p.credits) || p.credits <= 0) {
    throw new WorkflowEngineError(400, 'Credits must be a positive integer')
  }

  const partnerType = normalisePartnerTypes(p.partnerType)

  const rows: VoucherInsert[] = Array.from({ length: p.quantity }, () => ({
    code: randomCode(),
    credits: p.credits,
    max_uses: p.maxUses ?? 1,
    uses_count: 0,
    expires_at: p.expiresAt ?? null,
    partner_type: partnerType,
    partner_id: p.specificPartnerId ?? null,
    status: 'active',
  }))

  const { error } = await ctx.supabase.from('vouchers').insert(rows)
  if (error) throw new WorkflowEngineError(500, error.message)
}

registerMock('workflow', 'generateVouchers', generateVouchersMock)
