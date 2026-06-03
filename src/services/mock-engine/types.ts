import type { XaymaSupabase } from '../supabase'

export type Engine = 'workflow' | 'deployment' | 'container'

/**
 * Mocks receive the xayma_app-schema-bound Supabase client (same one
 * `supabaseFrom()` uses internally). This gives full type checking on
 * table + column names from the generated Database types — wrong table
 * name or column typo is a compile error in the handler.
 *
 * Tests cast Vitest fakes to this type at the boundary (`as unknown as
 * XaymaSupabase`); handlers themselves are checked tightly.
 */
export interface MockContext {
  supabase: XaymaSupabase
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
