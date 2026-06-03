import type { MockContext } from '../types'

/**
 * After a top-up succeeds, find suspended deployments for the partner
 * and flip them back to active. Mirrors what n8n's deployment.resume
 * consumer will do.
 */
export async function resumeAfterTopup(ctx: MockContext): Promise<void> {
  if (!ctx.partnerId) return
  const { data, error } = await ctx.supabase
    .from('xayma_app.deployments')
    .select('id')
    .eq('partner_id', ctx.partnerId)
    .eq('status', 'suspended')

  if (error || !data || data.length === 0) return

  const ids = (data as Array<{ id: number }>).map((d) => d.id)
  await ctx.supabase
    .from('xayma_app.deployments')
    .update({ status: 'active' })
    .in('id', ids)
}
