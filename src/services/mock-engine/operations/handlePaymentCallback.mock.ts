import { WorkflowEngineError } from '../../workflow-engine'
import { registerMock } from '../index'
import type { MockHandler } from '../types'
import { resumeAfterTopup } from './resumeAfterTopup'
import { recordNotification } from './sendNotification.mock'

interface Payload {
  reference?: string
  transactionId?: string | number
  status: string // 'sale_complete' | 'sale_canceled'
}

/**
 * Mock IPN handler — called from MockGateway.vue after Approve/Reject.
 *
 * Supports lookup by reference OR transactionId. The mock initiateCheckout
 * embeds the transactionId in the gateway URL; the mock gateway forwards it
 * here. Real n8n will look up by reference (gateway-provided ref_command).
 *
 * Idempotent: re-running on an already-finalized transaction is a no-op.
 */
export const handlePaymentCallbackMock: MockHandler<Payload, void> = async (p, ctx) => {
  if (!p.reference && !p.transactionId) {
    throw new WorkflowEngineError(400, 'reference or transactionId required')
  }

  let txnQuery = ctx.supabase
    .from('credit_transactions')
    .select('id, partner_id, creditsPurchased, status')
  if (p.transactionId !== undefined) {
    txnQuery = txnQuery.eq('id', Number(p.transactionId))
  } else if (p.reference) {
    // Real n8n stores reference; mock can't, so we treat MOCK-<n> as MOCK-<id>
    const m = /^MOCK-(\d+)$/.exec(p.reference)
    if (!m) throw new WorkflowEngineError(404, 'Transaction not found')
    txnQuery = txnQuery.eq('id', Number(m[1]))
  }

  const { data: txn, error: fetchErr } = await txnQuery.single()
  if (fetchErr || !txn) {
    throw new WorkflowEngineError(404, 'Transaction not found')
  }
  const t = txn as { id: number; partner_id: number; creditsPurchased: number | null; status: string | null }
  if (t.status === 'completed' || t.status === 'failed') {
    return
  }

  if (p.status === 'sale_complete') {
    await ctx.supabase
      .from('credit_transactions')
      .update({ status: 'completed' })
      .eq('id', t.id)

    const { data: partner } = await ctx.supabase
      .from('partners')
      .select('id, remainingCredits')
      .eq('id', t.partner_id)
      .single()
    if (partner) {
      const credits = t.creditsPurchased ?? 0
      const nextBalance = ((partner as { remainingCredits: number | null }).remainingCredits ?? 0) + credits
      await ctx.supabase
        .from('partners')
        .update({ remainingCredits: nextBalance })
        .eq('id', t.partner_id)
    }

    await recordNotification(ctx, {
      type: 'CREDIT_TOPUP',
      title: 'Credits added',
      message: `${t.creditsPurchased ?? 0} credits have been added to your account.`,
    })

    await resumeAfterTopup({ ...ctx, partnerId: t.partner_id })
  } else {
    await ctx.supabase
      .from('credit_transactions')
      .update({ status: 'failed' })
      .eq('id', t.id)
  }
}

registerMock('workflow', 'paymentCallback', handlePaymentCallbackMock)
