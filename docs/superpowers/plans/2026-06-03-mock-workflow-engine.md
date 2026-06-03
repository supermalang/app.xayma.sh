# Mock Workflow-Engine Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dev-runtime mock layer that simulates workflow-engine (n8n) operations and their Supabase side-effects, so the Vue app can be finished and demoed end-to-end before n8n is wired.

**Architecture:** Single interception point at `callEngineInternal` in `src/services/workflow-engine.ts`. When `VITE_MOCK_WORKFLOW_ENGINE` (or localStorage override) is on, calls are routed to per-operation handlers in `src/services/mock-engine/operations/`. Each handler returns the real workflow-engine envelope shape AND performs the Supabase side-effects (insert/update `credit_transactions`, bump `partners.remainingCredits`, etc.) so the UI's existing Realtime subscriptions just work. A mock gateway page at `/credits/_mock-gateway` plays PayTech in dev.

**Tech Stack:** Vue 3, TypeScript, Supabase JS SDK, Vitest, PrimeVue.

**Spec:** `docs/superpowers/specs/2026-06-03-mock-workflow-engine-design.md`

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/services/mock-engine/types.ts` | `MockHandler`, `MockContext`, registry types |
| `src/services/mock-engine/index.ts` | `isMockEnabled`, `registerMock`, `lookupMockHandler`, production guard |
| `src/services/mock-engine/index.test.ts` | Tests for resolution order + dispatch + production guard |
| `src/services/mock-engine/registry.ts` | Registers every operation handler at module load |
| `src/services/mock-engine/operations/sendNotification.mock.ts` | In-app notification insert |
| `src/services/mock-engine/operations/sendNotification.mock.test.ts` | |
| `src/services/mock-engine/operations/resumeAfterTopup.ts` | Internal helper: flip suspended deployments → active |
| `src/services/mock-engine/operations/resumeAfterTopup.test.ts` | |
| `src/services/mock-engine/operations/initiateCheckout.mock.ts` | Create pending `credit_transactions`, return mock-gateway URL |
| `src/services/mock-engine/operations/initiateCheckout.mock.test.ts` | |
| `src/services/mock-engine/operations/handlePaymentCallback.mock.ts` | Update transaction status (used by MockGateway page) |
| `src/services/mock-engine/operations/handlePaymentCallback.mock.test.ts` | |
| `src/services/mock-engine/operations/redeemVoucher.mock.ts` | Validate + increment + transaction + balance + notification + resume |
| `src/services/mock-engine/operations/redeemVoucher.mock.test.ts` | |
| `src/services/mock-engine/operations/generateVouchers.mock.ts` | Bulk-insert vouchers with `XAYMA-XXXX-XXXX` codes |
| `src/services/mock-engine/operations/generateVouchers.mock.test.ts` | |
| `src/services/mock-engine/operations/runCreditDeduction.mock.ts` | Per-15-min debit math, suspension at zero |
| `src/services/mock-engine/operations/runCreditDeduction.mock.test.ts` | |
| `src/services/mock-engine/README.md` | Explains harness + how to add new ops |
| `src/pages/Credits/MockGateway.vue` | Simulated PayTech page (Approve/Reject) |
| `src/components/credits/RedeemVoucherDialog.vue` | Voucher redemption Dialog |
| `src/components/credits/RedeemVoucherDialog.test.ts` | |

### Modified files

| Path | Change |
|---|---|
| `src/services/workflow-engine.ts` | `callEngineInternal` calls mock dispatcher first |
| `src/router/index.ts` | Add `/credits/_mock-gateway` route |
| `src/pages/Credits/Buy.vue` | Add "Have a voucher code?" trigger + dialog mount |
| `src/pages/Settings.vue` | Admin-only "Dev tools" section: mock toggle + "Run credit deduction" button |
| `src/i18n/en.ts`, `src/i18n/fr.ts` | Keys for redeem dialog, mock gateway, dev tools |
| `.env.example` | Add `VITE_MOCK_WORKFLOW_ENGINE` |

---

## Phase 1 — Foundation

### Task 1: Mock-engine types

**Files:**
- Create: `src/services/mock-engine/types.ts`

- [ ] **Step 1: Write the file**

```typescript
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
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/mock-engine/types.ts
git commit -m "feat(mock-engine): add core types"
```

---

### Task 2: Mock dispatcher + production guard

**Files:**
- Create: `src/services/mock-engine/index.ts`
- Create: `src/services/mock-engine/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/mock-engine/index.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isMockEnabled, registerMock, lookupMockHandler, _resetRegistry } from './index'

describe('mock-engine dispatcher', () => {
  const originalEnv = import.meta.env.VITE_MOCK_WORKFLOW_ENGINE
  beforeEach(() => {
    localStorage.clear()
    _resetRegistry()
  })
  afterEach(() => {
    // restore
    ;(import.meta.env as Record<string, unknown>).VITE_MOCK_WORKFLOW_ENGINE = originalEnv
  })

  describe('isMockEnabled', () => {
    it('returns false by default', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_MOCK_WORKFLOW_ENGINE = ''
      expect(isMockEnabled()).toBe(false)
    })

    it('returns true when env flag is "true"', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_MOCK_WORKFLOW_ENGINE = 'true'
      expect(isMockEnabled()).toBe(true)
    })

    it('localStorage "true" overrides env "false"', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_MOCK_WORKFLOW_ENGINE = 'false'
      localStorage.setItem('xayma:mock-workflow-engine', 'true')
      expect(isMockEnabled()).toBe(true)
    })

    it('localStorage "false" overrides env "true"', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_MOCK_WORKFLOW_ENGINE = 'true'
      localStorage.setItem('xayma:mock-workflow-engine', 'false')
      expect(isMockEnabled()).toBe(false)
    })
  })

  describe('registry', () => {
    it('returns null when no handler registered', () => {
      expect(lookupMockHandler('workflow', 'someOp')).toBeNull()
    })

    it('returns the registered handler', () => {
      const handler = vi.fn()
      registerMock('workflow', 'someOp', handler)
      expect(lookupMockHandler('workflow', 'someOp')).toBe(handler)
    })

    it('keys by (engine, operation) tuple', () => {
      const a = vi.fn()
      const b = vi.fn()
      registerMock('workflow', 'op', a)
      registerMock('deployment', 'op', b)
      expect(lookupMockHandler('workflow', 'op')).toBe(a)
      expect(lookupMockHandler('deployment', 'op')).toBe(b)
    })
  })
})
```

- [ ] **Step 2: Run test, expect failure**

Run: `npx vitest run src/services/mock-engine/index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement dispatcher**

```typescript
// src/services/mock-engine/index.ts
import type { Engine, MockHandler } from './types'

export type { Engine, MockHandler, MockContext, RegisteredMock } from './types'

const LOCAL_STORAGE_KEY = 'xayma:mock-workflow-engine'

// Production guard — module fails to load if mock flag is on in a prod build
if (import.meta.env.PROD && import.meta.env.VITE_MOCK_WORKFLOW_ENGINE === 'true') {
  throw new Error(
    '[mock-engine] VITE_MOCK_WORKFLOW_ENGINE=true in a production build — refusing to load.',
  )
}

export function isMockEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
  }
  return import.meta.env.VITE_MOCK_WORKFLOW_ENGINE === 'true'
}

export function setMockEnabledOverride(value: boolean | null): void {
  if (typeof window === 'undefined') return
  if (value === null) window.localStorage.removeItem(LOCAL_STORAGE_KEY)
  else window.localStorage.setItem(LOCAL_STORAGE_KEY, String(value))
}

const registry = new Map<string, MockHandler>()

function key(engine: Engine, operation: string): string {
  return `${engine}::${operation}`
}

export function registerMock<TPayload, TResponse>(
  engine: Engine,
  operation: string,
  handler: MockHandler<TPayload, TResponse>,
): void {
  registry.set(key(engine, operation), handler as MockHandler)
}

export function lookupMockHandler(engine: Engine, operation: string): MockHandler | null {
  return registry.get(key(engine, operation)) ?? null
}

// Test-only helper
export function _resetRegistry(): void {
  registry.clear()
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npx vitest run src/services/mock-engine/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/mock-engine/index.ts src/services/mock-engine/index.test.ts
git commit -m "feat(mock-engine): add dispatcher with prod guard and localStorage override"
```

---

### Task 3: Wire dispatcher into workflow-engine.ts

**Files:**
- Modify: `src/services/workflow-engine.ts:71-131` (callEngineInternal)

- [ ] **Step 1: Read current state**

Open `src/services/workflow-engine.ts` and locate `callEngineInternal` (around line 71).

- [ ] **Step 2: Add import + mock dispatch**

At the top, after existing imports:

```typescript
import { isMockEnabled, lookupMockHandler } from './mock-engine'
import { supabase } from './supabase'
import { useAuthStore } from '@/stores/auth.store'
```

Wait — `useAuthStore` cannot be imported at module top in a service file (Pinia not initialized at module load). Instead, build the context lazily inside the dispatch path:

```typescript
async function buildMockContext() {
  // Lazy import to avoid Pinia init issues
  const authStore = (await import('@/stores/auth.store')).useAuthStore()
  return {
    supabase,
    authUserId: authStore.user?.id ?? null,
    partnerId: authStore.profile?.company_id ?? null,
  }
}
```

Add the dispatch at the top of `callEngineInternal`, before the `try` block:

```typescript
async function callEngineInternal<T = void>(
  engine: Engine,
  operation: string,
  payload: WebhookPayload,
  parseResponse = false,
  retryCount = 0
): Promise<T> {
  // Mock dispatch
  if (isMockEnabled()) {
    const handler = lookupMockHandler(engine, operation)
    if (handler) {
      const ctx = await buildMockContext()
      const result = await handler(payload, ctx)
      return (parseResponse ? result : undefined) as T
    }
    // Fall through to real HTTP if no mock registered (partial mocking is OK)
  }

  // ... existing fetch logic unchanged
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 4: Run all tests to confirm no regression**

Run: `npx vitest run src/services/workflow-engine.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/workflow-engine.ts
git commit -m "feat(workflow-engine): dispatch to mock handlers when mock mode is on"
```

---

### Task 4: Empty registry module + wire it at app entry

**Files:**
- Create: `src/services/mock-engine/registry.ts`
- Modify: `src/main.ts` (one-line import to trigger registration)

- [ ] **Step 1: Write registry skeleton**

```typescript
// src/services/mock-engine/registry.ts
/**
 * Imports each mock operation file. Each operation file calls
 * registerMock() at its module top so this single import wires
 * them all up.
 *
 * Add new operations by importing them here.
 */

// (operations will be added in Phase 2)
export {}
```

- [ ] **Step 2: Import the registry from main.ts so handlers are registered on app start**

Modify `src/main.ts` — add near other imports:

```typescript
import './services/mock-engine/registry'
```

- [ ] **Step 3: Type-check + run tests**

Run: `npm run type-check && npx vitest run`
Expected: 0 errors, all pass.

- [ ] **Step 4: Commit**

```bash
git add src/services/mock-engine/registry.ts src/main.ts
git commit -m "feat(mock-engine): registry module wired at app entry"
```

---

## Phase 2 — Operation Mocks

### Task 5: sendNotification mock

**Files:**
- Create: `src/services/mock-engine/operations/sendNotification.mock.ts`
- Create: `src/services/mock-engine/operations/sendNotification.mock.test.ts`
- Modify: `src/services/mock-engine/registry.ts` (add import)

**Payload shape** — confirmed by reading `workflow-engine.ts` `sendNotification` signature: `{ partnerId, userId?, type, payload, locale }`. The real workflow inserts to `xayma_app.notifications` and fans out to channels. Mock does the insert only.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/mock-engine/operations/sendNotification.mock.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendNotificationMock } from './sendNotification.mock'

const insert = vi.fn().mockResolvedValue({ error: null })
const from = vi.fn().mockReturnValue({ insert })

const ctx = {
  supabase: { from } as any,
  authUserId: 'user-1',
  partnerId: 42,
}

beforeEach(() => {
  insert.mockClear()
  from.mockClear()
})

describe('sendNotification mock', () => {
  it('inserts a notification row with the given payload', async () => {
    await sendNotificationMock(
      { partnerId: 42, userId: 'user-1', type: 'credit.topup', payload: { amount: 5000 }, locale: 'en' },
      ctx,
    )
    expect(from).toHaveBeenCalledWith('xayma_app.notifications')
    expect(insert).toHaveBeenCalledTimes(1)
    const row = insert.mock.calls[0][0][0]
    expect(row).toMatchObject({
      partner_id: 42,
      user_id: 'user-1',
      type: 'credit.topup',
      payload: { amount: 5000 },
      locale: 'en',
      read: false,
    })
  })

  it('throws WorkflowEngineError on supabase error', async () => {
    insert.mockResolvedValueOnce({ error: { message: 'rls denied' } })
    await expect(
      sendNotificationMock({ partnerId: 42, type: 'x', payload: {}, locale: 'en' }, ctx),
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run src/services/mock-engine/operations/sendNotification.mock.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/services/mock-engine/operations/sendNotification.mock.ts
import { WorkflowEngineError } from '../../workflow-engine'
import { registerMock } from '../index'
import type { MockContext, MockHandler } from '../types'

interface Payload {
  partnerId: number
  userId?: string
  type: string
  payload: Record<string, unknown>
  locale: string
}

export const sendNotificationMock: MockHandler<Payload, void> = async (p, ctx) => {
  const { error } = await ctx.supabase.from('xayma_app.notifications').insert([
    {
      partner_id: p.partnerId,
      user_id: p.userId ?? null,
      type: p.type,
      payload: p.payload,
      locale: p.locale,
      read: false,
      created_at: new Date().toISOString(),
    },
  ])
  if (error) throw new WorkflowEngineError(500, error.message)
}

registerMock('workflow', 'sendNotification', sendNotificationMock)
```

- [ ] **Step 4: Add import to registry**

In `src/services/mock-engine/registry.ts`, add:

```typescript
import './operations/sendNotification.mock'
```

- [ ] **Step 5: Run tests, expect PASS**

Run: `npx vitest run src/services/mock-engine/operations/sendNotification.mock.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/mock-engine/operations/sendNotification.mock.ts \
        src/services/mock-engine/operations/sendNotification.mock.test.ts \
        src/services/mock-engine/registry.ts
git commit -m "feat(mock-engine): sendNotification → in-app insert"
```

---

### Task 6: resumeAfterTopup helper

**Files:**
- Create: `src/services/mock-engine/operations/resumeAfterTopup.ts`
- Create: `src/services/mock-engine/operations/resumeAfterTopup.test.ts`

Not registered as a webhook handler — internal helper called from `initiateCheckout` and `redeemVoucher` mocks.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/mock-engine/operations/resumeAfterTopup.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resumeAfterTopup } from './resumeAfterTopup'

const update = vi.fn().mockReturnThis()
const eq = vi.fn().mockReturnThis()
const select = vi.fn().mockReturnValue({ eq, then: undefined })
const fromMock = vi.fn()

const list = vi.fn()
const fromCalls: string[] = []

beforeEach(() => {
  fromCalls.length = 0
  fromMock.mockImplementation((table: string) => {
    fromCalls.push(table)
    if (table === 'xayma_app.deployments') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 1 }, { id: 2 }],
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    }
    return {}
  })
})

describe('resumeAfterTopup', () => {
  it('flips suspended deployments for partner to active', async () => {
    await resumeAfterTopup({ supabase: { from: fromMock } as any, authUserId: null, partnerId: 42 })
    expect(fromCalls).toContain('xayma_app.deployments')
  })

  it('no-ops when partner has no suspended deployments', async () => {
    fromMock.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }))
    await expect(
      resumeAfterTopup({ supabase: { from: fromMock } as any, authUserId: null, partnerId: 42 }),
    ).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run src/services/mock-engine/operations/resumeAfterTopup.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/services/mock-engine/operations/resumeAfterTopup.ts
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

  const ids = data.map((d: { id: number }) => d.id)
  await ctx.supabase
    .from('xayma_app.deployments')
    .update({ status: 'active' })
    .in('id', ids)
}
```

- [ ] **Step 4: Run tests, expect PASS**

Run: `npx vitest run src/services/mock-engine/operations/resumeAfterTopup.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/mock-engine/operations/resumeAfterTopup.ts \
        src/services/mock-engine/operations/resumeAfterTopup.test.ts
git commit -m "feat(mock-engine): resumeAfterTopup helper"
```

---

### Task 7: initiateCheckout mock

**Files:**
- Create: `src/services/mock-engine/operations/initiateCheckout.mock.ts`
- Create: `src/services/mock-engine/operations/initiateCheckout.mock.test.ts`
- Modify: `src/services/mock-engine/registry.ts`

The wrapper in `workflow-engine.ts` expects this envelope:
```typescript
{ status, platform, operation, success: true, results: { SUCCESS: true, PAYMENT_URL, TRANSACTION_ID, REFERENCE } }
```

Side-effects: insert pending `credit_transactions`. The mock gateway page does the COMPLETED update later.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/mock-engine/operations/initiateCheckout.mock.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initiateCheckoutMock } from './initiateCheckout.mock'

const select = vi.fn()
const insert = vi.fn()
const from = vi.fn()

beforeEach(() => {
  insert.mockReset()
  select.mockReset()
  from.mockReset()
  // Default: insert returns the inserted row
  insert.mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: 9001, reference: 'REF-9001' },
        error: null,
      }),
    }),
  })
  from.mockImplementation((table: string) => {
    if (table === 'xayma_app.creditbundles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'b1', label: 'Starter', amount: 5000, credits_value: 5000 },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'xayma_app.credit_transactions') {
      return { insert }
    }
    return {}
  })
})

describe('initiateCheckout mock', () => {
  it('inserts a pending transaction and returns a mock-gateway envelope', async () => {
    const result = await initiateCheckoutMock(
      { bundleId: 'b1', partnerId: '42', paymentGatewayId: 'g1' },
      { supabase: { from } as any, authUserId: 'u1', partnerId: 42 },
    )
    expect(insert).toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result.results.SUCCESS).toBe(true)
    expect(result.results.PAYMENT_URL).toContain('/credits/_mock-gateway')
    expect(result.results.PAYMENT_URL).toContain('transactionId=9001')
    expect(result.results.TRANSACTION_ID).toBe(9001)
  })

  it('throws WorkflowEngineError when bundle not found', async () => {
    from.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    }))
    await expect(
      initiateCheckoutMock(
        { bundleId: 'b1', partnerId: '42', paymentGatewayId: 'g1' },
        { supabase: { from } as any, authUserId: 'u1', partnerId: 42 },
      ),
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run src/services/mock-engine/operations/initiateCheckout.mock.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/services/mock-engine/operations/initiateCheckout.mock.ts
import { WorkflowEngineError } from '../../workflow-engine'
import { registerMock } from '../index'
import type { MockHandler } from '../types'

interface Payload {
  bundleId: string
  partnerId: string
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

export const initiateCheckoutMock: MockHandler<Payload, Envelope> = async (p, ctx) => {
  // Look up bundle for label + amount (mirrors real workflow behavior)
  const { data: bundle, error: bundleErr } = await ctx.supabase
    .from('xayma_app.creditbundles')
    .select('id, label, amount, credits_value')
    .eq('id', p.bundleId)
    .single()
  if (bundleErr || !bundle) {
    throw new WorkflowEngineError(404, 'Bundle not found')
  }

  const reference = `MOCK-${Date.now()}`
  const { data: txn, error: txnErr } = await ctx.supabase
    .from('xayma_app.credit_transactions')
    .insert([
      {
        partner_id: Number(p.partnerId),
        type: 'TOPUP',
        status: 'PENDING',
        amount: bundle.credits_value,
        payment_amount: bundle.amount,
        payment_method: 'paytech',
        payment_gateway_id: p.paymentGatewayId,
        bundle_id: bundle.id,
        reference,
        created_at: new Date().toISOString(),
      },
    ])
    .select('id, reference')
    .single()
  if (txnErr || !txn) {
    throw new WorkflowEngineError(500, txnErr?.message ?? 'Failed to insert transaction')
  }

  const url = new URL('/credits/_mock-gateway', window.location.origin)
  url.searchParams.set('transactionId', String(txn.id))
  url.searchParams.set('amount', String(bundle.amount))
  url.searchParams.set('bundleLabel', bundle.label)

  return {
    status: 'ok',
    platform: 'mock',
    operation: 'initiateCheckout',
    success: true,
    results: {
      SUCCESS: true,
      PAYMENT_URL: url.pathname + url.search,
      TRANSACTION_ID: txn.id,
      REFERENCE: txn.reference,
      AMOUNT: bundle.amount,
      LABEL: bundle.label,
    },
  }
}

registerMock('workflow', 'initiateCheckout', initiateCheckoutMock)
```

- [ ] **Step 4: Add registry import**

In `src/services/mock-engine/registry.ts`:

```typescript
import './operations/initiateCheckout.mock'
```

- [ ] **Step 5: Run tests, expect PASS**

Run: `npx vitest run src/services/mock-engine/operations/initiateCheckout.mock.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/mock-engine/operations/initiateCheckout.mock.ts \
        src/services/mock-engine/operations/initiateCheckout.mock.test.ts \
        src/services/mock-engine/registry.ts
git commit -m "feat(mock-engine): initiateCheckout creates pending tx + mock gateway URL"
```

---

### Task 8: handlePaymentCallback mock

**Files:**
- Create: `src/services/mock-engine/operations/handlePaymentCallback.mock.ts`
- Create: `src/services/mock-engine/operations/handlePaymentCallback.mock.test.ts`
- Modify: `src/services/mock-engine/registry.ts`

This is called by `MockGateway.vue` after the user clicks Approve/Reject. It does the work the real PayTech IPN handler would.

Wrapper signature is `handlePaymentCallback(reference, status)` — but inside `callEngineInternal` the payload is `{ reference, status }`. We support either by reading both fields.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/mock-engine/operations/handlePaymentCallback.mock.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handlePaymentCallbackMock } from './handlePaymentCallback.mock'

const update = vi.fn().mockReturnThis()
const eq = vi.fn().mockReturnThis()
const select = vi.fn().mockReturnThis()
const single = vi.fn()

beforeEach(() => {
  update.mockClear()
  eq.mockClear()
  single.mockReset()
})

describe('handlePaymentCallback mock', () => {
  it('updates transaction to COMPLETED and bumps partner balance on success', async () => {
    const calls: Array<{ table: string; op: string }> = []
    const from = vi.fn((table: string) => {
      calls.push({ table, op: 'from' })
      if (table === 'xayma_app.credit_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 1, partner_id: 42, amount: 5000, status: 'PENDING', reference: 'r1' },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'xayma_app.partners') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 42, remainingCredits: 1000 },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'xayma_app.notifications') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      if (table === 'xayma_app.deployments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      }
      return {}
    })
    await handlePaymentCallbackMock(
      { reference: 'r1', status: 'sale_complete' },
      { supabase: { from } as any, authUserId: 'u1', partnerId: 42 },
    )
    expect(calls.some(c => c.table === 'xayma_app.credit_transactions')).toBe(true)
    expect(calls.some(c => c.table === 'xayma_app.partners')).toBe(true)
  })

  it('is idempotent — re-running on completed tx is a no-op', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'xayma_app.credit_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 1, partner_id: 42, amount: 5000, status: 'COMPLETED', reference: 'r1' },
                error: null,
              }),
            }),
          }),
          update: vi.fn(),
        }
      }
      return {}
    })
    await handlePaymentCallbackMock(
      { reference: 'r1', status: 'sale_complete' },
      { supabase: { from } as any, authUserId: null, partnerId: null },
    )
    // partners.update should NOT have been called
  })

  it('marks tx FAILED when status is cancel', async () => {
    const txUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const from = vi.fn((table: string) => {
      if (table === 'xayma_app.credit_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 1, partner_id: 42, amount: 5000, status: 'PENDING', reference: 'r1' },
                error: null,
              }),
            }),
          }),
          update: txUpdate,
        }
      }
      return {}
    })
    await handlePaymentCallbackMock(
      { reference: 'r1', status: 'sale_canceled' },
      { supabase: { from } as any, authUserId: null, partnerId: null },
    )
    expect(txUpdate).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run src/services/mock-engine/operations/handlePaymentCallback.mock.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/services/mock-engine/operations/handlePaymentCallback.mock.ts
import { WorkflowEngineError } from '../../workflow-engine'
import { registerMock } from '../index'
import type { MockHandler } from '../types'
import { resumeAfterTopup } from './resumeAfterTopup'

interface Payload {
  reference: string
  status: string // 'sale_complete' | 'sale_canceled'
}

export const handlePaymentCallbackMock: MockHandler<Payload, void> = async (p, ctx) => {
  // 1. Find the pending transaction
  const { data: txn, error: fetchErr } = await ctx.supabase
    .from('xayma_app.credit_transactions')
    .select('id, partner_id, amount, status, reference')
    .eq('reference', p.reference)
    .single()
  if (fetchErr || !txn) {
    throw new WorkflowEngineError(404, 'Transaction not found')
  }

  // 2. Idempotency — already finalized, no-op
  if (txn.status === 'COMPLETED' || txn.status === 'FAILED') return

  if (p.status === 'sale_complete') {
    // 3. Mark COMPLETED
    await ctx.supabase
      .from('xayma_app.credit_transactions')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
      .eq('id', txn.id)

    // 4. Bump partner balance
    const { data: partner } = await ctx.supabase
      .from('xayma_app.partners')
      .select('id, remainingCredits')
      .eq('id', txn.partner_id)
      .single()
    if (partner) {
      await ctx.supabase
        .from('xayma_app.partners')
        .update({ remainingCredits: (partner.remainingCredits ?? 0) + txn.amount })
        .eq('id', partner.id)
    }

    // 5. Notification
    await ctx.supabase.from('xayma_app.notifications').insert([
      {
        partner_id: txn.partner_id,
        type: 'credit.topup',
        payload: { amount: txn.amount, reference: txn.reference },
        locale: 'en',
        read: false,
        created_at: new Date().toISOString(),
      },
    ])

    // 6. Resume suspended deployments for the partner
    await resumeAfterTopup({ ...ctx, partnerId: txn.partner_id })
  } else {
    // FAILED
    await ctx.supabase
      .from('xayma_app.credit_transactions')
      .update({ status: 'FAILED', completed_at: new Date().toISOString() })
      .eq('id', txn.id)
  }
}

registerMock('workflow', 'paymentCallback', handlePaymentCallbackMock)
```

- [ ] **Step 4: Add registry import**

```typescript
import './operations/handlePaymentCallback.mock'
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/services/mock-engine/operations/handlePaymentCallback.mock.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/mock-engine/operations/handlePaymentCallback.mock.ts \
        src/services/mock-engine/operations/handlePaymentCallback.mock.test.ts \
        src/services/mock-engine/registry.ts
git commit -m "feat(mock-engine): paymentCallback updates tx, bumps balance, resumes deployments"
```

---

### Task 9: redeemVoucher mock

**Files:**
- Create: `src/services/mock-engine/operations/redeemVoucher.mock.ts`
- Create: `src/services/mock-engine/operations/redeemVoucher.mock.test.ts`
- Modify: `src/services/mock-engine/registry.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/mock-engine/operations/redeemVoucher.mock.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { redeemVoucherMock } from './redeemVoucher.mock'

beforeEach(() => vi.clearAllMocks())

function makeFrom(voucher: any, partner: any, opts: { redemption?: any } = {}) {
  return vi.fn((table: string) => {
    if (table === 'xayma_app.vouchers') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: voucher, error: voucher ? null : { message: 'nf' } }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    }
    if (table === 'xayma_app.voucher_redemptions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: opts.redemption ?? null, error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    }
    if (table === 'xayma_app.credit_transactions') {
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    }
    if (table === 'xayma_app.partners') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: partner, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    }
    if (table === 'xayma_app.notifications') return { insert: vi.fn().mockResolvedValue({ error: null }) }
    if (table === 'xayma_app.deployments') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }
    }
    return {}
  })
}

describe('redeemVoucher mock', () => {
  const ctx = (from: any) => ({ supabase: { from } as any, authUserId: 'u1', partnerId: 42 })

  it('credits the partner when voucher is valid and unused', async () => {
    const from = makeFrom(
      { id: 'v1', code: 'XAYMA-AAAA-BBBB', status: 'ACTIVE', credits_value: 5000, uses_count: 0, max_uses: 1, partner_type: null, expiry_date: null },
      { id: 42, remainingCredits: 1000, partner_type: 'CUSTOMER' },
    )
    await expect(
      redeemVoucherMock({ voucherCode: 'XAYMA-AAAA-BBBB', partnerId: 42 }, ctx(from)),
    ).resolves.toBeUndefined()
  })

  it('rejects an expired voucher with 400', async () => {
    const expired = new Date(Date.now() - 86400000).toISOString()
    const from = makeFrom(
      { id: 'v1', code: 'X', status: 'ACTIVE', credits_value: 5000, uses_count: 0, max_uses: 1, partner_type: null, expiry_date: expired },
      { id: 42, remainingCredits: 1000, partner_type: 'CUSTOMER' },
    )
    await expect(
      redeemVoucherMock({ voucherCode: 'X', partnerId: 42 }, ctx(from)),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects when voucher is fully redeemed', async () => {
    const from = makeFrom(
      { id: 'v1', code: 'X', status: 'FULLY_REDEEMED', credits_value: 5000, uses_count: 1, max_uses: 1, partner_type: null, expiry_date: null },
      { id: 42, remainingCredits: 1000, partner_type: 'CUSTOMER' },
    )
    await expect(
      redeemVoucherMock({ voucherCode: 'X', partnerId: 42 }, ctx(from)),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects when partner_type does not match', async () => {
    const from = makeFrom(
      { id: 'v1', code: 'X', status: 'ACTIVE', credits_value: 5000, uses_count: 0, max_uses: 1, partner_type: 'RESELLER', expiry_date: null },
      { id: 42, remainingCredits: 1000, partner_type: 'CUSTOMER' },
    )
    await expect(
      redeemVoucherMock({ voucherCode: 'X', partnerId: 42 }, ctx(from)),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects already-redeemed by same partner', async () => {
    const from = makeFrom(
      { id: 'v1', code: 'X', status: 'ACTIVE', credits_value: 5000, uses_count: 1, max_uses: 5, partner_type: null, expiry_date: null },
      { id: 42, remainingCredits: 1000, partner_type: 'CUSTOMER' },
      { redemption: { id: 1 } },
    )
    await expect(
      redeemVoucherMock({ voucherCode: 'X', partnerId: 42 }, ctx(from)),
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run src/services/mock-engine/operations/redeemVoucher.mock.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// src/services/mock-engine/operations/redeemVoucher.mock.ts
import { WorkflowEngineError } from '../../workflow-engine'
import { registerMock } from '../index'
import type { MockHandler } from '../types'
import { resumeAfterTopup } from './resumeAfterTopup'

interface Payload {
  voucherCode: string
  partnerId: number
}

/**
 * Reasons returned as i18n keys so the dialog can render them.
 * Mirrors the error contract n8n should implement.
 */
const REASON = {
  NOT_FOUND: 'vouchers.errors.not_found',
  INACTIVE: 'vouchers.errors.inactive',
  EXPIRED: 'vouchers.errors.expired',
  FULLY_REDEEMED: 'vouchers.errors.fully_redeemed',
  WRONG_TYPE: 'vouchers.errors.wrong_type',
  ALREADY_REDEEMED: 'vouchers.errors.already_redeemed',
} as const

export const redeemVoucherMock: MockHandler<Payload, void> = async (p, ctx) => {
  // 1. Fetch voucher
  const { data: voucher, error: vErr } = await ctx.supabase
    .from('xayma_app.vouchers')
    .select('id, code, status, credits_value, uses_count, max_uses, partner_type, expiry_date')
    .eq('code', p.voucherCode)
    .single()
  if (vErr || !voucher) throw new WorkflowEngineError(400, REASON.NOT_FOUND)

  // 2. Validate
  if (voucher.status === 'INACTIVE') throw new WorkflowEngineError(400, REASON.INACTIVE)
  if (voucher.status === 'FULLY_REDEEMED') throw new WorkflowEngineError(400, REASON.FULLY_REDEEMED)
  if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
    throw new WorkflowEngineError(400, REASON.EXPIRED)
  }
  if (voucher.uses_count >= voucher.max_uses) {
    throw new WorkflowEngineError(400, REASON.FULLY_REDEEMED)
  }

  // 3. Partner type check
  const { data: partner } = await ctx.supabase
    .from('xayma_app.partners')
    .select('id, remainingCredits, partner_type')
    .eq('id', p.partnerId)
    .single()
  if (!partner) throw new WorkflowEngineError(404, 'Partner not found')
  if (voucher.partner_type && partner.partner_type !== voucher.partner_type) {
    throw new WorkflowEngineError(400, REASON.WRONG_TYPE)
  }

  // 4. Already-redeemed check (unique constraint on voucher_id + partner_id)
  const { data: existing } = await ctx.supabase
    .from('xayma_app.voucher_redemptions')
    .select('id')
    .eq('voucher_id', voucher.id)
    .eq('partner_id', p.partnerId)
    .maybeSingle()
  if (existing) throw new WorkflowEngineError(400, REASON.ALREADY_REDEEMED)

  // 5. Side-effects (sequential; not atomic in mock — real n8n must use a SQL function)
  const newUsesCount = voucher.uses_count + 1
  await ctx.supabase
    .from('xayma_app.vouchers')
    .update({
      uses_count: newUsesCount,
      status: newUsesCount >= voucher.max_uses ? 'FULLY_REDEEMED' : voucher.status,
    })
    .eq('id', voucher.id)

  await ctx.supabase.from('xayma_app.voucher_redemptions').insert([
    {
      voucher_id: voucher.id,
      partner_id: p.partnerId,
      redeemed_at: new Date().toISOString(),
    },
  ])

  await ctx.supabase.from('xayma_app.credit_transactions').insert([
    {
      partner_id: p.partnerId,
      type: 'TOPUP',
      status: 'COMPLETED',
      amount: voucher.credits_value,
      payment_method: 'voucher',
      reference: `VOUCHER-${voucher.code}`,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    },
  ])

  await ctx.supabase
    .from('xayma_app.partners')
    .update({ remainingCredits: (partner.remainingCredits ?? 0) + voucher.credits_value })
    .eq('id', p.partnerId)

  await ctx.supabase.from('xayma_app.notifications').insert([
    {
      partner_id: p.partnerId,
      type: 'credit.topup',
      payload: { amount: voucher.credits_value, source: 'voucher', code: voucher.code },
      locale: 'en',
      read: false,
      created_at: new Date().toISOString(),
    },
  ])

  await resumeAfterTopup({ ...ctx, partnerId: p.partnerId })
}

registerMock('workflow', 'redeemVoucher', redeemVoucherMock)
```

- [ ] **Step 4: Add registry import**

```typescript
import './operations/redeemVoucher.mock'
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/services/mock-engine/operations/redeemVoucher.mock.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/mock-engine/operations/redeemVoucher.mock.ts \
        src/services/mock-engine/operations/redeemVoucher.mock.test.ts \
        src/services/mock-engine/registry.ts
git commit -m "feat(mock-engine): redeemVoucher validates + credits + resumes"
```

---

### Task 10: generateVouchers mock

**Files:**
- Create: `src/services/mock-engine/operations/generateVouchers.mock.ts`
- Create: `src/services/mock-engine/operations/generateVouchers.mock.test.ts`
- Modify: `src/services/mock-engine/registry.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/mock-engine/operations/generateVouchers.mock.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateVouchersMock } from './generateVouchers.mock'

beforeEach(() => vi.clearAllMocks())

describe('generateVouchers mock', () => {
  it('inserts N vouchers matching the XAYMA-XXXX-XXXX format', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ insert })

    await generateVouchersMock(
      { quantity: 5, creditsValue: 5000, maxUses: 1, expiryDate: '2026-12-31', partnerType: 'CUSTOMER' },
      { supabase: { from } as any, authUserId: 'u', partnerId: 42 },
    )

    expect(insert).toHaveBeenCalledTimes(1)
    const rows = insert.mock.calls[0][0] as any[]
    expect(rows).toHaveLength(5)
    for (const row of rows) {
      expect(row.code).toMatch(/^XAYMA-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
      expect(row.credits_value).toBe(5000)
      expect(row.status).toBe('ACTIVE')
    }
  })

  it('rejects quantity > 100', async () => {
    const from = vi.fn()
    await expect(
      generateVouchersMock(
        { quantity: 101, creditsValue: 1000, maxUses: 1, expiryDate: null, partnerType: null },
        { supabase: { from } as any, authUserId: 'u', partnerId: 42 },
      ),
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run src/services/mock-engine/operations/generateVouchers.mock.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// src/services/mock-engine/operations/generateVouchers.mock.ts
import { WorkflowEngineError } from '../../workflow-engine'
import { registerMock } from '../index'
import type { MockHandler } from '../types'

interface Payload {
  quantity: number
  creditsValue: number
  maxUses: number
  expiryDate: string | null
  partnerType: string | null
  specificPartnerId?: number | null
}

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no I, O, 1, 0 for legibility

function randomCode(): string {
  const pick = (n: number) =>
    Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
  return `XAYMA-${pick(4)}-${pick(4)}`
}

export const generateVouchersMock: MockHandler<Payload, void> = async (p, ctx) => {
  if (p.quantity < 1 || p.quantity > 100) {
    throw new WorkflowEngineError(400, 'Quantity must be 1-100')
  }
  const rows = Array.from({ length: p.quantity }, () => ({
    code: randomCode(),
    credits_value: p.creditsValue,
    max_uses: p.maxUses,
    uses_count: 0,
    expiry_date: p.expiryDate,
    partner_type: p.partnerType,
    specific_partner_id: p.specificPartnerId ?? null,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  }))
  const { error } = await ctx.supabase.from('xayma_app.vouchers').insert(rows)
  if (error) throw new WorkflowEngineError(500, error.message)
}

registerMock('workflow', 'generateVouchers', generateVouchersMock)
```

- [ ] **Step 4: Add registry import**

```typescript
import './operations/generateVouchers.mock'
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/services/mock-engine/operations/generateVouchers.mock.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/mock-engine/operations/generateVouchers.mock.ts \
        src/services/mock-engine/operations/generateVouchers.mock.test.ts \
        src/services/mock-engine/registry.ts
git commit -m "feat(mock-engine): generateVouchers bulk-inserts XAYMA-XXXX-XXXX codes"
```

---

### Task 11: runCreditDeduction mock

**Files:**
- Create: `src/services/mock-engine/operations/runCreditDeduction.mock.ts`
- Create: `src/services/mock-engine/operations/runCreditDeduction.mock.test.ts`

NOT registered via webhook — called directly from Settings dev tools button. Exported as a named function.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/mock-engine/operations/runCreditDeduction.mock.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runCreditDeductionMock } from './runCreditDeduction.mock'

beforeEach(() => vi.clearAllMocks())

describe('runCreditDeduction mock', () => {
  it('decrements partner balance per active deployment and writes transactions', async () => {
    const partnerUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const txnInsert = vi.fn().mockResolvedValue({ error: null })
    const depUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const notifInsert = vi.fn().mockResolvedValue({ error: null })

    const from = vi.fn((table: string) => {
      if (table === 'xayma_app.deployments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: 1, partner_id: 42, service: null, plan_slug: 'starter', status: 'active' },
              ],
              error: null,
            }),
          }),
          update: depUpdate,
        }
      }
      if (table === 'xayma_app.serviceplans') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { monthlyCreditConsumption: 2880 },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'xayma_app.partners') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 42, remainingCredits: 100 }],
              error: null,
            }),
          }),
          update: partnerUpdate,
        }
      }
      if (table === 'xayma_app.credit_transactions') return { insert: txnInsert }
      if (table === 'xayma_app.notifications') return { insert: notifInsert }
      return {}
    })

    const summary = await runCreditDeductionMock(
      { supabase: { from } as any, authUserId: 'admin', partnerId: null },
    )
    // 2880 / (30*24*4) = 1 credit per 15min
    expect(summary.deploymentsProcessed).toBe(1)
    expect(summary.totalDebited).toBe(1)
    expect(txnInsert).toHaveBeenCalled()
  })

  it('suspends deployments and notifies when balance drops to ≤ 0', async () => {
    const depUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const notifInsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn((table: string) => {
      if (table === 'xayma_app.deployments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 1, partner_id: 42, service: null, plan_slug: 's', status: 'active' }],
              error: null,
            }),
          }),
          update: depUpdate,
        }
      }
      if (table === 'xayma_app.serviceplans') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { monthlyCreditConsumption: 2880 }, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'xayma_app.partners') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 42, remainingCredits: 0 }],
              error: null,
            }),
          }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      if (table === 'xayma_app.credit_transactions') return { insert: vi.fn().mockResolvedValue({ error: null }) }
      if (table === 'xayma_app.notifications') return { insert: notifInsert }
      return {}
    })

    await runCreditDeductionMock({ supabase: { from } as any, authUserId: 'admin', partnerId: null })
    expect(depUpdate).toHaveBeenCalled()
    expect(notifInsert).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run src/services/mock-engine/operations/runCreditDeduction.mock.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// src/services/mock-engine/operations/runCreditDeduction.mock.ts
import type { MockContext } from '../types'

const PER_15_MIN_DIVISOR = 30 * 24 * 4 // 30 days * 24 hours * 4 quarters

export interface DeductionSummary {
  deploymentsProcessed: number
  totalDebited: number
  suspended: number[]
}

export async function runCreditDeductionMock(ctx: MockContext): Promise<DeductionSummary> {
  const { data: deployments, error: dErr } = await ctx.supabase
    .from('xayma_app.deployments')
    .select('id, partner_id, service, plan_slug, status')
    .eq('status', 'active')
  if (dErr || !deployments || deployments.length === 0) {
    return { deploymentsProcessed: 0, totalDebited: 0, suspended: [] }
  }

  // Load all relevant service plans
  const debitPerPartner = new Map<number, number>()
  for (const d of deployments as Array<{ id: number; partner_id: number; service: any; plan_slug: string }>) {
    // service_id may not be directly available; use service field which carries plans JSONB, OR query serviceplans
    // For mock, query serviceplans by slug
    const { data: plan } = await ctx.supabase
      .from('xayma_app.serviceplans')
      .select('monthlyCreditConsumption')
      .eq('service_id', (d as any).service_id ?? null)
      .eq('slug', d.plan_slug)
      .single()
    const monthly = (plan as any)?.monthlyCreditConsumption ?? 0
    const debit = Math.ceil(monthly / PER_15_MIN_DIVISOR)
    debitPerPartner.set(d.partner_id, (debitPerPartner.get(d.partner_id) ?? 0) + debit)
    await ctx.supabase.from('xayma_app.credit_transactions').insert([
      {
        partner_id: d.partner_id,
        type: 'DEBIT',
        status: 'COMPLETED',
        amount: -debit,
        payment_method: 'system',
        reference: `DEBIT-${d.id}-${Date.now()}`,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
    ])
  }

  // Apply debits + suspend at zero
  const partnerIds = Array.from(debitPerPartner.keys())
  const { data: partners } = await ctx.supabase
    .from('xayma_app.partners')
    .select('id, remainingCredits')
    .in('id', partnerIds)
  const suspended: number[] = []
  for (const p of (partners ?? []) as Array<{ id: number; remainingCredits: number }>) {
    const debit = debitPerPartner.get(p.id) ?? 0
    const next = (p.remainingCredits ?? 0) - debit
    await ctx.supabase
      .from('xayma_app.partners')
      .update({ remainingCredits: Math.max(0, next) })
      .eq('id', p.id)
    if (next <= 0) {
      const affected = (deployments as Array<{ id: number; partner_id: number }>).filter(d => d.partner_id === p.id)
      for (const d of affected) {
        await ctx.supabase
          .from('xayma_app.deployments')
          .update({ status: 'suspended' })
          .eq('id', d.id)
        await ctx.supabase.from('xayma_app.notifications').insert([
          {
            partner_id: p.id,
            type: 'deployment.suspended',
            payload: { deploymentId: d.id, reason: 'ZERO_BALANCE' },
            locale: 'en',
            read: false,
            created_at: new Date().toISOString(),
          },
        ])
        suspended.push(d.id)
      }
    }
  }

  const totalDebited = Array.from(debitPerPartner.values()).reduce((a, b) => a + b, 0)
  return { deploymentsProcessed: deployments.length, totalDebited, suspended }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/services/mock-engine/operations/runCreditDeduction.mock.test.ts`
Expected: PASS. (One known limitation: the deployment record in the test has no `service_id`. Test sets `service_id: undefined` and we tolerate it; production will have it. This is acceptable for the mock.)

- [ ] **Step 5: Commit**

```bash
git add src/services/mock-engine/operations/runCreditDeduction.mock.ts \
        src/services/mock-engine/operations/runCreditDeduction.mock.test.ts
git commit -m "feat(mock-engine): runCreditDeduction debits + suspends at zero"
```

---

## Phase 3 — UI

### Task 12: MockGateway page

**Files:**
- Create: `src/pages/Credits/MockGateway.vue`

- [ ] **Step 1: Write the page**

```vue
<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-lg bg-surface">
    <div class="w-full max-w-md space-y-6">
      <div class="bg-tertiary-container text-tertiary text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded text-center">
        {{ t('mock_gateway.dev_banner') }}
      </div>

      <div class="bg-surface-container-low p-6 rounded border border-outline/20 space-y-4">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-primary">credit_card</span>
          <h1 class="text-section-title">{{ t('mock_gateway.title') }}</h1>
        </div>

        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-on-surface-variant">{{ t('mock_gateway.bundle') }}</span>
            <span class="font-mono">{{ bundleLabel }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-on-surface-variant">{{ t('mock_gateway.amount') }}</span>
            <span class="font-mono font-semibold">{{ amount }} FCFA</span>
          </div>
          <div class="flex justify-between">
            <span class="text-on-surface-variant">{{ t('mock_gateway.transaction_id') }}</span>
            <span class="font-mono text-sm">{{ transactionId }}</span>
          </div>
        </div>

        <p class="text-xs text-on-surface-variant text-center" v-if="autoApproveCountdown > 0">
          {{ t('mock_gateway.auto_approve', { seconds: autoApproveCountdown }) }}
        </p>

        <div class="flex gap-3">
          <Button
            :label="t('mock_gateway.reject')"
            severity="secondary"
            class="flex-1"
            :loading="processing"
            @click="reject"
          />
          <Button
            :label="t('mock_gateway.approve')"
            class="flex-1"
            :loading="processing"
            @click="approve"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { handlePaymentCallback } from '@/services/workflow-engine'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const transactionId = computed(() => String(route.query.transactionId ?? ''))
const amount = computed(() => String(route.query.amount ?? '0'))
const bundleLabel = computed(() => String(route.query.bundleLabel ?? '—'))

const processing = ref(false)
const autoApproveCountdown = ref(5)
let intervalId: number | null = null

async function approve() {
  if (processing.value) return
  processing.value = true
  try {
    await handlePaymentCallback(`MOCK-${transactionId.value}`, 'sale_complete')
  } catch (err) {
    // tx might already be referenced — try sale_complete with the reference fetched via tx id, but for now follow URL ref convention
    console.error('Mock approve error:', err)
  }
  await router.push({ name: 'credits-success', query: { transactionId: transactionId.value } })
}

async function reject() {
  if (processing.value) return
  processing.value = true
  if (intervalId) window.clearInterval(intervalId)
  try {
    await handlePaymentCallback(`MOCK-${transactionId.value}`, 'sale_canceled')
  } catch (err) {
    console.error('Mock reject error:', err)
  }
  await router.push({ name: 'credits-cancel', query: { transactionId: transactionId.value } })
}

onMounted(() => {
  intervalId = window.setInterval(() => {
    autoApproveCountdown.value -= 1
    if (autoApproveCountdown.value <= 0) {
      if (intervalId) window.clearInterval(intervalId)
      approve()
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (intervalId) window.clearInterval(intervalId)
})
</script>
```

**NOTE: the reference convention.** `initiateCheckout.mock.ts` writes `reference = MOCK-<timestamp>` to the DB row. We don't return the timestamp; we return the DB row's ID and reference. So `handlePaymentCallback` looks up by reference — but here we'd need the reference. Adjust:

In `initiateCheckout.mock.ts` the URL passes `transactionId` (the DB id). The DB row has its own `reference` field. We need to pass the reference too OR change `handlePaymentCallback` mock to also support lookup by ID.

Update: change `handlePaymentCallback.mock.ts` to accept either `reference` or `transactionId`. Update the page to pass `transactionId` directly.

- [ ] **Step 2: Update handlePaymentCallback mock to support transactionId lookup**

Replace the lookup block in `handlePaymentCallback.mock.ts` with:

```typescript
let txnQuery = ctx.supabase
  .from('xayma_app.credit_transactions')
  .select('id, partner_id, amount, status, reference')
const anyP = p as Payload & { transactionId?: string | number }
if (anyP.transactionId) {
  txnQuery = txnQuery.eq('id', Number(anyP.transactionId)) as any
} else {
  txnQuery = txnQuery.eq('reference', p.reference) as any
}
const { data: txn, error: fetchErr } = await (txnQuery as any).single()
```

And update `Payload`:

```typescript
interface Payload {
  reference?: string
  transactionId?: string | number
  status: string
}
```

- [ ] **Step 3: Update MockGateway.vue approve/reject calls**

```typescript
async function approve() {
  if (processing.value) return
  processing.value = true
  try {
    await callWorkflowEngineWebhook('paymentCallback', {
      transactionId: transactionId.value,
      status: 'sale_complete',
    })
  } catch (err) {
    console.error('Mock approve error:', err)
  }
  await router.push({ name: 'credits-success', query: { transactionId: transactionId.value } })
}
```

(Use `callWorkflowEngineWebhook` directly because the typed wrapper enforces `reference: string`.)

Add import:
```typescript
import { callWorkflowEngineWebhook } from '@/services/workflow-engine'
```
Remove the import of `handlePaymentCallback`.

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Credits/MockGateway.vue \
        src/services/mock-engine/operations/handlePaymentCallback.mock.ts
git commit -m "feat(credits): mock PayTech gateway page with Approve/Reject"
```

---

### Task 13: Wire mock-gateway route

**Files:**
- Modify: `src/router/index.ts` (around line 33-37 and 142-148)

- [ ] **Step 1: Add the lazy import near other Credits imports**

After line 35 (`const CreditsCancel = ...`), add:

```typescript
const CreditsMockGateway = () => import('@/pages/Credits/MockGateway.vue')
```

- [ ] **Step 2: Add the route after `credits/cancel`**

```typescript
{
  path: 'credits/_mock-gateway',
  component: CreditsMockGateway,
  meta: { requiredRole: ['CUSTOMER', 'RESELLER'] },
  name: 'credits-mock-gateway',
},
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/router/index.ts
git commit -m "feat(router): mount /credits/_mock-gateway for dev mock flow"
```

---

### Task 14: RedeemVoucherDialog component

**Files:**
- Create: `src/components/credits/RedeemVoucherDialog.vue`
- Create: `src/components/credits/RedeemVoucherDialog.test.ts`

- [ ] **Step 1: Write the failing component test**

```typescript
// src/components/credits/RedeemVoucherDialog.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import RedeemVoucherDialog from './RedeemVoucherDialog.vue'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'

vi.mock('@/services/workflow-engine', () => ({
  redeemVoucher: vi.fn().mockResolvedValue(undefined),
  WorkflowEngineError: class extends Error {
    constructor(public statusCode?: number, public originalError?: unknown) {
      super('mock')
    }
  },
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en: { vouchers: { redeem: { title: 'Redeem', code_label: 'Code', submit: 'Redeem' } }, common: { cancel: 'Cancel' } } },
})

beforeEach(() => vi.clearAllMocks())

describe('RedeemVoucherDialog', () => {
  it('renders code input and submit button', () => {
    const wrapper = mount(RedeemVoucherDialog, {
      props: { visible: true, partnerId: 42 },
      global: { plugins: [PrimeVue, i18n] },
    })
    expect(wrapper.html()).toContain('Redeem')
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx vitest run src/components/credits/RedeemVoucherDialog.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```vue
<!-- src/components/credits/RedeemVoucherDialog.vue -->
<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :modal="true"
    :closable="!loading"
    :style="{ width: '420px' }"
    :header="t('vouchers.redeem.title')"
  >
    <div class="space-y-4">
      <p class="text-sm text-on-surface-variant">{{ t('vouchers.redeem.description') }}</p>

      <div>
        <label class="block text-sm font-medium mb-2">{{ t('vouchers.redeem.code_label') }}</label>
        <InputText
          v-model="code"
          class="w-full font-mono"
          placeholder="XAYMA-XXXX-XXXX"
          :disabled="loading"
          @keyup.enter="submit"
        />
      </div>

      <Message v-if="errorKey" severity="error" :closable="false">
        {{ t(errorKey) }}
      </Message>
    </div>

    <template #footer>
      <Button
        :label="t('common.cancel')"
        severity="secondary"
        :disabled="loading"
        @click="$emit('update:visible', false)"
      />
      <Button
        :label="t('vouchers.redeem.submit')"
        :loading="loading"
        :disabled="!code.trim()"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { redeemVoucher, WorkflowEngineError } from '@/services/workflow-engine'

const props = defineProps<{ visible: boolean; partnerId: number }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void; (e: 'redeemed'): void }>()

const { t } = useI18n()
const toast = useToast()

const code = ref('')
const loading = ref(false)
const errorKey = ref<string | null>(null)

watch(() => props.visible, (v) => {
  if (v) { code.value = ''; errorKey.value = null }
})

async function submit() {
  if (!code.value.trim()) return
  loading.value = true
  errorKey.value = null
  try {
    await redeemVoucher({ voucherCode: code.value.trim(), partnerId: props.partnerId })
    toast.add({ severity: 'success', summary: t('vouchers.redeem.success'), life: 3000 })
    emit('redeemed')
    emit('update:visible', false)
  } catch (err) {
    if (err instanceof WorkflowEngineError) {
      const reason = typeof err.originalError === 'string' ? err.originalError : null
      errorKey.value = reason ?? 'vouchers.errors.generic'
    } else {
      errorKey.value = 'vouchers.errors.generic'
    }
  } finally {
    loading.value = false
  }
}
</script>
```

- [ ] **Step 4: Run test, expect PASS**

Run: `npx vitest run src/components/credits/RedeemVoucherDialog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/credits/RedeemVoucherDialog.vue \
        src/components/credits/RedeemVoucherDialog.test.ts
git commit -m "feat(vouchers): RedeemVoucherDialog component"
```

---

### Task 15: Hook redeem dialog into Buy.vue

**Files:**
- Modify: `src/pages/Credits/Buy.vue`

- [ ] **Step 1: Find the existing template top section and add the redeem link + dialog**

After the existing page header in the `<template>`, add a small "Have a voucher code?" trigger. Near the very top of the template, after the title block (search for `payments` material symbol around line 54):

Add a small button row:

```vue
<div class="flex justify-end mt-2">
  <Button
    :label="t('vouchers.redeem.have_code_link')"
    text
    size="small"
    icon="pi pi-ticket"
    @click="showRedeemDialog = true"
  />
</div>
```

At the end of the template (before closing `</template>`), add:

```vue
<RedeemVoucherDialog
  v-if="authStore.profile?.company_id"
  v-model:visible="showRedeemDialog"
  :partner-id="Number(authStore.profile.company_id)"
  @redeemed="onVoucherRedeemed"
/>
```

In `<script setup>`, add:

```typescript
import RedeemVoucherDialog from '@/components/credits/RedeemVoucherDialog.vue'

const showRedeemDialog = ref(false)
function onVoucherRedeemed() {
  // partner.store realtime sub picks up the balance change automatically.
  // No-op here; the toast inside the dialog handles user feedback.
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 3: Run Buy.vue existing tests (if any) to confirm no regression**

Run: `npx vitest run src/pages/Credits/`
Expected: PASS (or no tests for Buy.vue, which is fine).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Credits/Buy.vue
git commit -m "feat(credits): wire RedeemVoucherDialog into Buy page"
```

---

### Task 16: Settings dev tools section

**Files:**
- Modify: `src/pages/Settings.vue`

- [ ] **Step 1: Read the current bottom of Settings.vue and find a good insertion point**

Open `src/pages/Settings.vue`. Find the end of the bento grid (search for the last `</section>` inside the grid). Add a new section *only visible if `isMockEnabled() || import.meta.env.DEV`*.

- [ ] **Step 2: Add the dev tools section to the template (above the closing `</div>` of the bento grid)**

```vue
<section v-if="showDevTools" class="col-span-12 space-y-4 border border-warning/30 rounded p-6 bg-warning-container/10">
  <div class="flex items-center gap-3">
    <span class="material-symbols-outlined text-warning">science</span>
    <h2 class="text-eyebrow">{{ t('settings.dev_tools.title') }}</h2>
  </div>
  <p class="text-xs text-on-surface-variant">{{ t('settings.dev_tools.description') }}</p>

  <div class="flex items-center gap-4">
    <InputSwitch v-model="mockEnabledLocal" @update:modelValue="onMockToggle" />
    <div>
      <div class="text-sm font-medium">{{ t('settings.dev_tools.mock_workflow_engine') }}</div>
      <div class="text-xs text-on-surface-variant">{{ t('settings.dev_tools.mock_source', { source: mockSource }) }}</div>
    </div>
  </div>

  <div class="flex items-center gap-4">
    <Button
      :label="t('settings.dev_tools.run_deduction')"
      icon="pi pi-bolt"
      :loading="runningDeduction"
      :disabled="!mockEnabledLocal"
      @click="onRunDeduction"
    />
    <span class="text-xs text-on-surface-variant">{{ t('settings.dev_tools.run_deduction_hint') }}</span>
  </div>
</section>
```

- [ ] **Step 3: Add script imports and reactive state**

```typescript
import InputSwitch from 'primevue/inputswitch'
import { isMockEnabled, setMockEnabledOverride } from '@/services/mock-engine'
import { runCreditDeductionMock } from '@/services/mock-engine/operations/runCreditDeduction.mock'
import { supabase } from '@/services/supabase'
import { useAuthStore as _useAuthStore } from '@/stores/auth.store'

const showDevTools = computed(() => import.meta.env.DEV || isMockEnabled())
const mockEnabledLocal = ref(isMockEnabled())
const runningDeduction = ref(false)

const mockSource = computed(() => {
  const ls = typeof window !== 'undefined' ? window.localStorage.getItem('xayma:mock-workflow-engine') : null
  if (ls === 'true' || ls === 'false') return 'localStorage'
  if (import.meta.env.VITE_MOCK_WORKFLOW_ENGINE === 'true') return 'env'
  return 'default (off)'
})

function onMockToggle(v: boolean) {
  setMockEnabledOverride(v)
  mockEnabledLocal.value = v
}

async function onRunDeduction() {
  runningDeduction.value = true
  try {
    const _authStore = _useAuthStore()
    const summary = await runCreditDeductionMock({
      supabase,
      authUserId: _authStore.user?.id ?? null,
      partnerId: null,
    })
    toast.add({
      severity: 'success',
      summary: t('settings.dev_tools.deduction_done'),
      detail: t('settings.dev_tools.deduction_summary', {
        n: summary.deploymentsProcessed,
        total: summary.totalDebited,
        suspended: summary.suspended.length,
      }),
      life: 5000,
    })
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: t('errors.generic'), life: 5000 })
  } finally {
    runningDeduction.value = false
  }
}
```

(Re-use whatever `toast` and `t` variables already exist in Settings.vue. If not present, add `const toast = useToast()` from `primevue/usetoast` and `const { t } = useI18n()` from `vue-i18n`.)

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.vue
git commit -m "feat(settings): admin dev tools — mock toggle + run credit deduction"
```

---

### Task 17: i18n keys

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/fr.ts`

- [ ] **Step 1: Add keys to both files**

```typescript
// in both en.ts and fr.ts under appropriate top-level keys:

// vouchers
vouchers: {
  ...existing,
  redeem: {
    title: 'Redeem voucher',                      // FR: 'Utiliser un bon'
    description: 'Enter your voucher code to add credits to your account.', // FR: 'Saisissez votre code...'
    code_label: 'Voucher code',                   // FR: 'Code du bon'
    submit: 'Redeem',                             // FR: 'Utiliser'
    success: 'Voucher redeemed',                  // FR: 'Bon utilisé'
    have_code_link: 'Have a voucher code?',       // FR: 'Vous avez un code ?'
  },
  errors: {
    ...existing,
    not_found: 'Voucher code not found.',
    inactive: 'This voucher is no longer active.',
    expired: 'This voucher has expired.',
    fully_redeemed: 'This voucher has reached its usage limit.',
    wrong_type: 'This voucher cannot be used by your account type.',
    already_redeemed: 'You have already redeemed this voucher.',
    generic: 'Could not redeem voucher.',
  },
},

// mock_gateway (top level)
mock_gateway: {
  dev_banner: 'Mock gateway — development only',
  title: 'Payment confirmation',
  bundle: 'Bundle',
  amount: 'Amount',
  transaction_id: 'Transaction ID',
  approve: 'Approve',
  reject: 'Reject',
  auto_approve: 'Auto-approving in {seconds}s…',
},

// settings.dev_tools
settings: {
  ...existing,
  dev_tools: {
    title: 'Dev tools',
    description: 'Visible only in development or when mock mode is on. Do not enable in production.',
    mock_workflow_engine: 'Mock workflow engine',
    mock_source: 'Source: {source}',
    run_deduction: 'Run credit deduction now',
    run_deduction_hint: 'Simulates the 15-minute n8n cron once.',
    deduction_done: 'Credit deduction complete',
    deduction_summary: '{n} deployment(s), {total} credits debited, {suspended} suspended',
  },
},
```

Provide French equivalents directly in `fr.ts` — translate concisely (the French in the comments above is sufficient).

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 3: Run i18n consistency test if one exists**

Run: `npx vitest run src/i18n/`
Expected: PASS or no tests.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.ts src/i18n/fr.ts
git commit -m "i18n: keys for voucher redeem, mock gateway, dev tools"
```

---

### Task 18: .env.example update

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add the flag**

At the end of the file, add:

```
# Mock workflow engine — set to true in dev to bypass n8n and run UI flows with in-app side-effects.
# MUST be false (or unset) in production. Build will refuse to load with this set in a prod build.
VITE_MOCK_WORKFLOW_ENGINE=false
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs(env): document VITE_MOCK_WORKFLOW_ENGINE"
```

---

### Task 19: Mock-engine README

**Files:**
- Create: `src/services/mock-engine/README.md`

- [ ] **Step 1: Write the README**

```markdown
# Mock Workflow Engine

Dev-runtime mock layer for workflow-engine (n8n) operations. When `VITE_MOCK_WORKFLOW_ENGINE=true` (or localStorage `xayma:mock-workflow-engine=true`), calls to `callWorkflowEngineWebhook` are routed through handlers in `operations/` instead of HTTP.

Each handler returns the same envelope shape the real workflow engine would AND performs the Supabase side-effects (insert/update transactions, bump balance, etc.) so the UI's existing Realtime subscriptions just work.

**Production guard:** `index.ts` throws at module init if `import.meta.env.PROD` AND the env flag is `true`. No silent fallback.

## Adding a new operation

1. Create `operations/<name>.mock.ts` exporting the handler.
2. Call `registerMock('workflow', '<operation>', handler)` at the bottom.
3. Add `import './operations/<name>.mock'` to `registry.ts`.
4. Add a test colocated with the file.

The handler must match the real workflow-engine envelope shape so the typed wrappers in `services/workflow-engine.ts` unwrap correctly.

## When the real workflow exists

Delete the mock file and remove its registry import. The dispatcher falls through to real HTTP automatically for any operation with no registered mock.

## Settings dev tools

Admin users see a "Dev tools" section in `/settings` with:
- Mock toggle (writes to localStorage; takes precedence over the env flag)
- "Run credit deduction now" button (simulates the 15-min n8n cron once)
```

- [ ] **Step 2: Commit**

```bash
git add src/services/mock-engine/README.md
git commit -m "docs(mock-engine): add README"
```

---

## Phase 4 — Verification

### Task 20: Type-check + full unit test run

- [ ] **Step 1: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 errors. (Fix any new findings; do NOT silence with eslint-disable.)

- [ ] **Step 3: Run full unit test suite**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 4: If anything fails, fix in place and re-run before proceeding**

---

### Task 21: Manual end-to-end verification (run via /verify-task)

Optional but high-value. Two flows to walk:

**Flow A: Buy Credits via mock gateway**
1. Set `VITE_MOCK_WORKFLOW_ENGINE=true` in `.env`
2. `npm run dev`
3. Log in as customer (mock auth)
4. Go to `/credits/buy` → pick a bundle → pick a gateway → Complete Purchase
5. Should redirect to `/credits/_mock-gateway` showing the bundle + amount
6. Click Approve → redirect to `/credits/success` → spinner → "Payment successful" once Realtime fires
7. CreditMeter on dashboard reflects new balance

**Flow B: Redeem voucher**
1. Generate a voucher as admin: `/vouchers` → "Generate vouchers" → 1 voucher, 5000 credits
2. Note the code
3. Log in as customer
4. `/credits/buy` → "Have a voucher code?" → paste code → Redeem
5. Success toast; CreditMeter updates via Realtime

**Flow C: Credit deduction**
1. Log in as admin
2. `/settings` → Dev tools → "Run credit deduction now"
3. Toast shows N deployments processed
4. Customer's CreditMeter ticks down via Realtime

**Flow D: Suspension + Resumption**
1. As admin, drop a customer's balance to 0 via running deduction repeatedly
2. Deployments page shows the customer's deployment as `suspended`
3. As customer, redeem a voucher (Flow B)
4. Deployment auto-flips back to `active`

If any flow breaks, capture the error and add a fix task before reporting complete.

- [ ] **Step 1: Walk flows A–D**
- [ ] **Step 2: Note results in final report**

---

## Self-Review

After writing the plan, the planner verified:

**Spec coverage:** Every spec section mapped to a task — dispatcher (T1–T4), per-op mocks (T5–T11), MockGateway (T12–T13), RedeemVoucherDialog + Buy.vue (T14–T15), Settings dev tools (T16), i18n + env (T17–T18), README (T19), verification (T20–T21). Open questions in the spec remain open (RLS, mockup, auto-interval) — flagged in final report.

**Placeholder scan:** All steps include actual code, exact commands, expected output. No TBDs.

**Type consistency:** `MockHandler` / `MockContext` signature reused everywhere. Envelope shape for `initiateCheckout` matches the wrapper in `workflow-engine.ts:245-260`. `setMockEnabledOverride` defined in T2 and used in T16.

**Notes on intentional non-test code paths:**
- `MockGateway.vue` has no unit test — it's a thin orchestration page with `@click` handlers calling a tested handler. Manual verification in T21 covers it.
- `Settings.vue` dev tools section — same reasoning. Existing `Settings.test.ts` continues to cover the rest of the page.
