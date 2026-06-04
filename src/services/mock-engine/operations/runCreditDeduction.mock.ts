import type { MockContext } from '../types'
import { findServicePlan } from '../../services.service'
import { recordNotification } from './sendNotification.mock'

const PER_15_MIN_DIVISOR = 30 * 24 * 4 // 30 days × 24 hours × 4 quarters

export interface DeductionSummary {
  deploymentsProcessed: number
  totalDebited: number
  suspended: number[]
}

interface DeploymentRow {
  id: number
  partner_id: number
  plan_slug: string
  service: { plans?: unknown } | null
  status: string | null
}

interface PartnerRow {
  id: number
  remainingCredits: number | null
  allowCreditDebt: boolean | null
  creditDebtThreshold: number | null
}

/**
 * Manually-triggered mock of the n8n 15-minute credit deduction cron.
 *
 * Reads all active deployments, calculates each plan's per-15-min debit
 * (monthlyCreditConsumption / (30 * 24 * 4)), deducts from the partner
 * balance, writes a DEBIT credit_transactions row, and suspends any
 * deployment whose partner balance dropped to ≤ 0 (respecting
 * allowCreditDebt / creditDebtThreshold).
 *
 * NOT registered as a webhook handler — exported and called directly
 * from the Settings dev tools button.
 */
export async function runCreditDeductionMock(ctx: MockContext): Promise<DeductionSummary> {
  const { data: deployments, error: dErr } = await ctx.supabase
    .from('deployments')
    .select('id, partner_id, plan_slug, status, service:services(plans)')
    .eq('status', 'active')
  if (dErr || !deployments || deployments.length === 0) {
    return { deploymentsProcessed: 0, totalDebited: 0, suspended: [] }
  }

  const debitPerPartner = new Map<number, number>()
  const deploymentsByPartner = new Map<number, number[]>()
  for (const raw of deployments as unknown as DeploymentRow[]) {
    const plan = findServicePlan(raw.service, raw.plan_slug)
    const monthly = plan?.monthlyCreditConsumption ?? 0
    const debit = Math.max(1, Math.ceil(monthly / PER_15_MIN_DIVISOR))
    debitPerPartner.set(raw.partner_id, (debitPerPartner.get(raw.partner_id) ?? 0) + debit)
    const list = deploymentsByPartner.get(raw.partner_id) ?? []
    list.push(raw.id)
    deploymentsByPartner.set(raw.partner_id, list)
    await ctx.supabase.from('credit_transactions').insert([
      {
        partner_id: raw.partner_id,
        transactionType: 'debit',
        status: 'completed',
        creditsUsed: debit,
        amountPaid: 0,
        paymentMethod: 'system',
      },
    ])
  }

  const partnerIds = Array.from(debitPerPartner.keys())
  const { data: partnersData } = await ctx.supabase
    .from('partners')
    .select('id, remainingCredits, allowCreditDebt, creditDebtThreshold')
    .in('id', partnerIds)
  const partners = (partnersData ?? []) as PartnerRow[]

  const suspended: number[] = []
  for (const partner of partners) {
    const debit = debitPerPartner.get(partner.id) ?? 0
    const nextBalance = (partner.remainingCredits ?? 0) - debit
    await ctx.supabase
      .from('partners')
      .update({ remainingCredits: nextBalance })
      .eq('id', partner.id)

    const debtFloor = partner.allowCreditDebt ? -(partner.creditDebtThreshold ?? 0) : 0
    if (nextBalance <= debtFloor) {
      const affected = deploymentsByPartner.get(partner.id) ?? []
      for (const depId of affected) {
        await ctx.supabase
          .from('deployments')
          .update({ status: 'suspended' })
          .eq('id', depId)
        await recordNotification(ctx, {
          type: 'DEPLOYMENT_STATUS',
          title: 'Deployment suspended',
          message: `Deployment #${depId} suspended due to insufficient credits.`,
        })
        suspended.push(depId)
      }
    }
  }

  const totalDebited = Array.from(debitPerPartner.values()).reduce((a, b) => a + b, 0)
  return { deploymentsProcessed: deployments.length, totalDebited, suspended }
}
