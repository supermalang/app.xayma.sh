import type { SupabaseClient } from '@supabase/supabase-js'

export type Engine = 'workflow' | 'deployment' | 'container'

export interface MockContext {
  supabase: SupabaseClient
  authUserId: string | null
  partnerId: number | null
}

export type MockHandler<TPayload = unknown, TResponse = unknown> = (
  payload: TPayload,
  ctx: MockContext,
) => Promise<TResponse>

export interface RegisteredMock {
  engine: Engine
  operation: string
  handler: MockHandler
}
