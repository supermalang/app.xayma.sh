import { WorkflowEngineError } from '../../workflow-engine'
import { registerMock } from '../index'
import type { MockHandler } from '../types'
import { resumeAfterTopup } from './resumeAfterTopup'
import { recordNotification } from './sendNotification.mock'

interface Payload {
  voucherCode: string
  partnerId: number
}

/**
 * i18n keys returned as error messages so the UI can render them directly.
 * Mirrors the error contract n8n should implement.
 */
const REASON = {
  NOT_FOUND: 'vouchers.errors.not_found',
  INACTIVE: 'vouchers.errors.inactive',
  EXPIRED: 'vouchers.errors.expired',
  FULLY_REDEEMED: 'vouchers.errors.fully_redeemed',
  WRONG_TYPE: 'vouchers.errors.wrong_type',
  ALREADY_REDEEMED: 'vouchers.errors.already_redeemed',
  PARTNER_NOT_FOUND: 'vouchers.errors.partner_not_found',
} as const

interface VoucherRow {
  id: number
  code: string
  status: 'active' | 'inactive' | 'fully_redeemed' | null
  credits: number
  uses_count: number
  max_uses: number
  partner_type: string[] | null
  expires_at: string | null
}

interface PartnerRow {
  id: number
  remainingCredits: number | null
  partner_type: string | null
}

export const redeemVoucherMock: MockHandler<Payload, void> = async (p, ctx) => {
  // 1. Fetch voucher by code
  const { data: voucher, error: vErr } = await ctx.supabase
    .from('xayma_app.vouchers')
    .select('id, code, status, credits, uses_count, max_uses, partner_type, expires_at')
    .eq('code', p.voucherCode)
    .single()
  if (vErr || !voucher) throw new WorkflowEngineError(400, REASON.NOT_FOUND)
  const v = voucher as VoucherRow

  // 2. Validate voucher state
  if (v.status === 'inactive') throw new WorkflowEngineError(400, REASON.INACTIVE)
  if (v.status === 'fully_redeemed') throw new WorkflowEngineError(400, REASON.FULLY_REDEEMED)
  if (v.expires_at && new Date(v.expires_at) < new Date()) {
    throw new WorkflowEngineError(400, REASON.EXPIRED)
  }
  if (v.uses_count >= v.max_uses) {
    throw new WorkflowEngineError(400, REASON.FULLY_REDEEMED)
  }

  // 3. Partner + type compatibility
  const { data: partner } = await ctx.supabase
    .from('xayma_app.partners')
    .select('id, remainingCredits, partner_type')
    .eq('id', p.partnerId)
    .single()
  if (!partner) throw new WorkflowEngineError(404, REASON.PARTNER_NOT_FOUND)
  const partnerRow = partner as PartnerRow
  if (v.partner_type && v.partner_type.length > 0) {
    if (!partnerRow.partner_type || !v.partner_type.includes(partnerRow.partner_type)) {
      throw new WorkflowEngineError(400, REASON.WRONG_TYPE)
    }
  }

  // 4. Already-redeemed by same partner?
  const { data: existing } = await ctx.supabase
    .from('xayma_app.voucher_redemptions')
    .select('id')
    .eq('voucher_id', v.id)
    .eq('partner_id', p.partnerId)
    .maybeSingle()
  if (existing) throw new WorkflowEngineError(400, REASON.ALREADY_REDEEMED)

  // 5. Insert credit transaction (must come first — voucher_redemptions needs the FK)
  const { data: txn, error: txnErr } = await ctx.supabase
    .from('xayma_app.credit_transactions')
    .insert([
      {
        partner_id: p.partnerId,
        transactionType: 'credit',
        status: 'completed',
        creditsPurchased: v.credits,
        amountPaid: 0,
        paymentMethod: 'voucher',
      },
    ])
    .select('id')
    .single()
  if (txnErr || !txn) throw new WorkflowEngineError(500, txnErr?.message ?? 'Failed to insert transaction')
  const txnId = (txn as { id: number }).id

  // 6. Record voucher redemption
  await ctx.supabase.from('xayma_app.voucher_redemptions').insert([
    {
      voucher_id: v.id,
      partner_id: p.partnerId,
      credit_transaction_id: txnId,
      redeemed_at: new Date().toISOString(),
      redeemed_by: ctx.authUserId,
    },
  ])

  // 7. Increment usage count + flip status if fully redeemed
  const nextUses = v.uses_count + 1
  await ctx.supabase
    .from('xayma_app.vouchers')
    .update({
      uses_count: nextUses,
      status: nextUses >= v.max_uses ? 'fully_redeemed' : v.status,
    })
    .eq('id', v.id)

  // 8. Bump partner balance
  await ctx.supabase
    .from('xayma_app.partners')
    .update({ remainingCredits: (partnerRow.remainingCredits ?? 0) + v.credits })
    .eq('id', p.partnerId)

  // 9. Notification + suspended deployment resumption
  await recordNotification(ctx, {
    type: 'CREDIT_TOPUP',
    title: 'Voucher redeemed',
    message: `${v.credits} credits have been added to your account from voucher ${v.code}.`,
  })
  await resumeAfterTopup({ ...ctx, partnerId: p.partnerId })
}

registerMock('workflow', 'redeemVoucher', redeemVoucherMock)
