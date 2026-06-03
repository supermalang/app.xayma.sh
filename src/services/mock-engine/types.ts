export type Engine = 'workflow' | 'deployment' | 'container'

/**
 * Supabase client typed loosely. We intentionally don't bind it to the
 * project's generated Database types here so mock handlers can be used
 * with either the xayma_app-schema-bound singleton from services/supabase.ts
 * or a vitest-style fake (vi.fn()) in tests.
 */
// Loose, chainable type so mocks can call .select().eq().single() etc.
// without committing to the project's generated Database types or to
// vitest's mock shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockSupabaseClient = { from: (table: string) => any }

export interface MockContext {
  supabase: MockSupabaseClient
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
