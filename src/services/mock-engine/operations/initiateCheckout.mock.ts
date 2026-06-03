import { WorkflowEngineError } from '../../workflow-engine'
import { getCreditBundles } from '../../settings'
import { registerMock } from '../index'
import type { MockHandler } from '../types'

interface Payload {
  bundleId: string
  partnerId: string | number
  paymentGatewayId: string
}

interface Envelope {
  status: string
  platform: string
  operation: string
  success: boolean
  results: {
    SUCCESS: boolean
    PAYMENT_URL: string
    TRANSACTION_ID: number
    REFERENCE: string
    AMOUNT: number
    LABEL: string
  }
}

/**
 * Looks up the bundle (stored as JSON in xayma_app.settings), inserts a
 * PENDING credit_transactions row, and returns a mock-gateway URL.
 *
 * The mock gateway page does the COMPLETED update via paymentCallback.
 * Real n8n inserts the transaction and calls PayTech; PayTech IPN later
 * does the COMPLETED update. Side-effect shape is identical.
 */
export const initiateCheckoutMock: MockHandler<Payload, Envelope> = async (p, ctx) => {
  const bundles = await getCreditBundles()
  const bundle = bundles.find((b) => b.id === p.bundleId)
  if (!bundle) {
    throw new WorkflowEngineError(404, 'Bundle not found')
  }

  const { data: txn, error: txnErr } = await ctx.supabase
    .from('xayma_app.credit_transactions')
    .insert([
      {
        partner_id: Number(p.partnerId),
        transactionType: 'credit',
        status: 'pending',
        creditsPurchased: bundle.creditsAmount,
        amountPaid: bundle.priceXOF,
        paymentMethod: 'paytech',
      },
    ])
    .select('id')
    .single()

  if (txnErr || !txn) {
    throw new WorkflowEngineError(500, txnErr?.message ?? 'Failed to insert transaction')
  }

  const transactionId = (txn as { id: number }).id
  const params = new URLSearchParams({
    transactionId: String(transactionId),
    amount: String(bundle.priceXOF),
    bundleLabel: bundle.label,
  })
  const paymentUrl = `/credits/_mock-gateway?${params.toString()}`

  return {
    status: 'ok',
    platform: 'mock',
    operation: 'initiateCheckout',
    success: true,
    results: {
      SUCCESS: true,
      PAYMENT_URL: paymentUrl,
      TRANSACTION_ID: transactionId,
      REFERENCE: `MOCK-${transactionId}`,
      AMOUNT: bundle.priceXOF,
      LABEL: bundle.label,
    },
  }
}

registerMock('workflow', 'initiateCheckout', initiateCheckoutMock)
