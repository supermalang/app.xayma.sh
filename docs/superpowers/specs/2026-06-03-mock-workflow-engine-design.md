# Mock Workflow-Engine Harness Design

**Date:** 2026-06-03
**Scope:** Dev-runtime mock layer that simulates the workflow-engine (n8n) and the side-effects of its workflows on Supabase, so the Vue app can be finished and demoed end-to-end before the external n8n team ships.
**Goal:** Unblock UI completion. Mocks become the executable contract that n8n must satisfy later.

---

## Executive Summary

Currently, every async user-visible flow — paying for credits, redeeming a voucher, getting suspended at zero balance, receiving a notification — depends on n8n workflows that don't exist yet. The Vue app's HTTP calls to the workflow engine succeed (network 200) but nothing happens downstream: no `credit_transactions.status = COMPLETED`, no balance bump, no Realtime event. The UI looks wired but isn't, and we can't tell which UI bugs are real until the backend exists.

This design introduces a **dev-runtime mock layer** at `src/services/mock-engine/`. When `VITE_MOCK_WORKFLOW_ENGINE=true`, calls to `callWorkflowEngineWebhook` and friends are routed through registered mock handlers. Each handler does two things:

1. Returns the same envelope shape the real workflow engine would.
2. Writes the same Supabase side-effects the real n8n workflow would (insert/update `credit_transactions`, bump `partners.remainingCredits`, insert `notifications`, etc.).

Because the side-effects hit Supabase directly, the Realtime subscriptions already wired in `Success.vue`, `partner.store.ts`, and `useDeployments.ts` fire naturally — the UI does not know it's in mock mode.

A mock payment-gateway page at `/credits/_mock-gateway` plays the role of PayTech in dev: Approve / Reject buttons that trigger the side-effects, mirroring the real redirect flow.

The mock layer **hard-fails at module init in production builds** if the flag is true. No silent fallback.

---

## Affected Scope

### New Files
- `src/services/mock-engine/index.ts` — dispatcher, `isMockEnabled()`, `registerMock()`
- `src/services/mock-engine/types.ts` — `MockHandler<TPayload, TResponse>`, registry types
- `src/services/mock-engine/registry.ts` — registers all handlers at module load
- `src/services/mock-engine/operations/initiateCheckout.mock.ts`
- `src/services/mock-engine/operations/handlePaymentCallback.mock.ts`
- `src/services/mock-engine/operations/redeemVoucher.mock.ts`
- `src/services/mock-engine/operations/generateVouchers.mock.ts`
- `src/services/mock-engine/operations/sendNotification.mock.ts`
- `src/services/mock-engine/operations/runCreditDeduction.mock.ts` — manually triggered
- `src/services/mock-engine/operations/resumeAfterTopup.mock.ts` — internal helper, called from `initiateCheckout` and `redeemVoucher` side-effects
- `src/services/mock-engine/README.md`
- `src/pages/Credits/MockGateway.vue` — simulated payment gateway page
- `src/components/credits/RedeemVoucherDialog.vue` — voucher redemption UI (also needed for real n8n; built here as part of finishing the UI)

### Files with Substantial Changes
- `src/services/workflow-engine.ts` — `callEngineInternal` calls the mock dispatcher first; if no handler registered, falls through to real HTTP
- `src/pages/Credits/Buy.vue` — add "Have a voucher code?" trigger that opens `RedeemVoucherDialog.vue`
- `src/pages/Settings.vue` — admin-only "Dev tools" section with mock-mode toggle and "Run credit deduction now" button (gated by `import.meta.env.DEV || isMockEnabled()`)
- `src/router/index.ts` — add `/credits/_mock-gateway` route
- `.env.example` — add `VITE_MOCK_WORKFLOW_ENGINE=` with comment
- `src/i18n/en.ts`, `src/i18n/fr.ts` — keys for `RedeemVoucherDialog`, `MockGateway`, Settings dev tools

### Files with Minor Changes
- None expected. Existing realtime subscriptions and pages stay untouched — they get DB events from the mocks the same way they would from real n8n.

---

## Architecture & Design

### Single Interception Point

`callEngineInternal` in `src/services/workflow-engine.ts` is the only chokepoint. Sketch:

```typescript
async function callEngineInternal<T>(engine, operation, payload, parseResponse, retryCount) {
  // NEW: mock dispatch
  if (isMockEnabled()) {
    const handler = lookupMockHandler(engine, operation)
    if (handler) {
      return handler(payload) as Promise<T>
    }
    // No registered handler → fall through to real HTTP (allows partial mocking)
  }
  // ... existing fetch + retry logic
}
```

Production guard at the top of `src/services/mock-engine/index.ts`:

```typescript
if (import.meta.env.PROD && import.meta.env.VITE_MOCK_WORKFLOW_ENGINE === 'true') {
  throw new Error('Mock workflow engine MUST NOT be enabled in production builds')
}
```

### Mock Toggle Resolution

Resolution order, highest priority first:

1. **localStorage** `xayma:mock-workflow-engine` = `'true'` | `'false'` (set by admin toggle in Settings, persists across reloads, can be flipped without restart)
2. **env** `VITE_MOCK_WORKFLOW_ENGINE` = `'true'` | `'false'`
3. **default** `false`

`isMockEnabled()` is a pure function that reads these on every call (no caching) so the Settings toggle flips behavior immediately.

### Mock Handler Contract

```typescript
// src/services/mock-engine/types.ts
export interface MockContext {
  supabase: SupabaseClient
  authUserId: string | null
  partnerId: number | null
}

export type MockHandler<TPayload = unknown, TResponse = unknown> =
  (payload: TPayload, ctx: MockContext) => Promise<TResponse>

export interface RegisteredMock {
  engine: 'workflow' | 'deployment' | 'container'
  operation: string
  handler: MockHandler
}
```

Each handler:
- Receives the typed payload (cast inside the handler)
- Receives a context with the supabase client and the current auth user/partner
- Returns a response **shaped exactly like the real workflow-engine envelope** (so the typed wrapper functions in `workflow-engine.ts` continue to unwrap correctly)
- Performs Supabase side-effects synchronously OR schedules them with `setTimeout` to simulate async (for the IPN flow)

### Side-Effect Strategy

Mocks use the same `supabase` JS client as the rest of the app. RLS still applies. This is intentional: in dev, the mock-auth admin user has full RLS access; in tests, we mock auth to admin too. **If a side-effect requires service-role privileges (e.g. inserting into another partner's records for a system event), document the constraint in the handler comment and rely on the dev project having permissive policies in dev.**

For operations that are inherently async (IPN, voucher redemption side-effects), the handler **does not delay the HTTP response**. It returns the envelope immediately and either:

- Performs side-effects inline (voucher redeem — atomic, sync-feeling),
- Or schedules side-effects via `setTimeout(..., 1500–3000ms)` to feel like a real async callback (IPN-style flows after the mock gateway page).

### Mock Gateway Page

Route: `/credits/_mock-gateway`. Query params: `transactionId`, `amount`, `bundleLabel`.

Visual: a clearly-labelled "MOCK GATEWAY — Development only" banner; transaction summary card; Approve / Reject buttons; auto-approve countdown (5s).

Flow:

```
Buy.vue
  → initiateCheckout (mock handler)
    → INSERT credit_transactions (status='PENDING')
    → returns paymentUrl = '/credits/_mock-gateway?transactionId=X&amount=Y&bundleLabel=Z'
  → window.location.href = paymentUrl
MockGateway.vue
  → on Approve:
    UPDATE credit_transactions SET status='COMPLETED'
    UPDATE partners SET remainingCredits = remainingCredits + amount
    INSERT notifications (type='credit.topup', ...)
    call resumeAfterTopup helper → check suspended deployments → flip to active
    → redirect /credits/success?transactionId=X
  → on Reject:
    UPDATE credit_transactions SET status='FAILED'
    → redirect /credits/cancel?transactionId=X
```

Success.vue is unchanged — its Realtime sub on `credit_transactions.id` will catch the COMPLETED update.

### RedeemVoucherDialog Component

Triggered from a "Have a voucher code?" link on the Buy page header.

PrimeVue `Dialog` with: `InputText` for code, `Button` redeem, error `Message` for validation failures.

On submit → calls `redeemVoucher` via `workflow-engine.ts` (which returns `Promise<void>` — the wrapper is fire-and-forget). In mock mode the handler:

1. `validateVoucher(code, partner.type)` (already exists in `vouchers.service.ts`)
2. If invalid → throw `WorkflowEngineError(400, reasonKey)` → dialog catches and shows i18n error
3. If valid → increment `vouchers.uses_count` (read-then-write via existing `incrementVoucherUsage` helper; not strictly atomic, but acceptable in mock — flag in handler comment so n8n implementation uses a SQL function instead), update status if fully redeemed, insert `credit_transactions` (paymentMethod='voucher'), bump `partners.remainingCredits`, insert notification, call `resumeAfterTopup`.
4. Resolve void. Dialog shows success toast and closes. The new balance reaches the CreditMeter via the existing `partner.store` Realtime sub on `partners.remainingCredits`.

When n8n is wired later, the dialog stays unchanged — only the mock handler goes away and the real webhook does the same work.

### Manual Credit Deduction Trigger

In a real deployment, n8n runs a 15-minute cron that decrements every active deployment's partner balance. For the mock, we expose a button in Settings → Dev tools: "Run credit deduction now".

Handler `runCreditDeduction.mock.ts` is **not** dispatched via webhook — it's called directly from the Settings page button when mock mode is on. Logic:

1. Load active deployments + service plans.
2. For each: calculate `monthlyCreditConsumption / (30 * 24 * 4)` (per-15-min portion).
3. Decrement `partners.remainingCredits`, insert `credit_transactions` (type='DEBIT'), check if balance ≤ 0 → flip deployment status to 'suspended', insert notification.

Stretch: if user wants automatic 15-min interval in mock mode, add a `setInterval` started from Settings toggle. Defer to v2.

### Suspension / Resumption

Suspension happens as a side-effect of `runCreditDeduction.mock.ts` when balance hits 0 (above).

Resumption happens as a side-effect of `initiateCheckout` and `redeemVoucher` mocks — both call the internal `resumeAfterTopup` helper after bumping balance. That helper:

1. Finds deployments for the partner with `status='suspended'`.
2. Flips each to `status='active'`.
3. Inserts a resumption notification per deployment.

### Notification Fan-Out

`sendNotification.mock.ts` accepts a payload like `{ partnerId, userId, type, payload, locale }` and inserts into `xayma_app.notifications`. The four real channels (in-app, WhatsApp, Email, SMS) collapse to just the in-app insert in mock mode — the others are externally observable only, so simulating them adds nothing for UI testing.

### Settings Page Dev Tools

Admin-only `Accordion` section, visible only when `import.meta.env.DEV` or `isMockEnabled()` is true. Contains:

- Toggle: "Mock workflow engine" (writes `xayma:mock-workflow-engine` to localStorage).
- Button: "Run credit deduction now" (calls `runCreditDeduction.mock.ts` directly).
- Display: current resolution (env vs localStorage vs default) so admins know why the toggle is in its current state.

---

## Data Flow

### Buy Credits (mock mode)

```
Buy.vue [Complete Purchase]
  └─ initiateCheckout({ bundleId, partnerId, paymentGatewayId })
     └─ callEngineInternal('workflow', 'initiateCheckout', payload)
        └─ MOCK: handler creates pending credit_transactions
        └─ returns envelope { success: true, results: { SUCCESS: true, PAYMENT_URL: '/credits/_mock-gateway?...', TRANSACTION_ID, REFERENCE } }
     └─ wrapper unwraps envelope → { paymentUrl, transactionId, reference }
  └─ window.location.href = paymentUrl
MockGateway.vue [Approve]
  └─ supabase.update credit_transactions, partners; insert notifications; resumeAfterTopup
  └─ router.push('/credits/success?transactionId=X')
Success.vue
  └─ Realtime sub on credit_transactions fires (from mock's UPDATE)
  └─ shows "Payment successful" state
```

### Redeem Voucher (mock mode)

```
Buy.vue → "Have a voucher code?" link → RedeemVoucherDialog opens
Dialog [Redeem]
  └─ redeemVoucher({ voucherCode, partnerId })
     └─ MOCK: validate → increment uses_count → insert credit_transactions(voucher) → bump balance → notification → resumeAfterTopup
     └─ resolves void (wrapper is fire-and-forget)
  └─ Dialog shows success toast, closes
partner.store realtime sub on partners → balance updates in CreditMeter
```

### Run Credit Deduction (mock mode, manual)

```
Settings → Dev tools → "Run credit deduction now"
  └─ runCreditDeduction({}) [called directly, not via webhook]
     └─ for each active deployment:
        - decrement partners.remainingCredits
        - insert credit_transactions(DEBIT)
        - if balance ≤ 0: update deployments.status='suspended', insert notification
     └─ toast: "Deducted credits for N deployments"
Deployment views update via existing Realtime subs.
```

---

## Error Handling

- Mock handlers throw `WorkflowEngineError(statusCode, message)` on simulated failure — same exception type the real `callEngineInternal` throws on 4xx — so existing callers handle errors identically.
- Validation failures (e.g., expired voucher) → throw `WorkflowEngineError(400, reasonKey)` where `reasonKey` is an i18n key the dialog can render.
- Production guard at module init blocks accidental deploy.
- Missing handler → fall through to real HTTP (so partial mocking is safe; user can mock just the unimplemented ops).

---

## Testing

Per CLAUDE.md / `testing.md`:

- **Unit tests** colocated:
  - `initiateCheckout.mock.test.ts` — creates pending transaction, returns expected payment URL.
  - `redeemVoucher.mock.test.ts` — happy path + each validation failure (invalid / expired / wrong type / already redeemed).
  - `generateVouchers.mock.test.ts` — generates correct quantity, codes match `XAYMA-XXXX-XXXX`.
  - `runCreditDeduction.mock.test.ts` — debit math correct, suspension triggers at zero, idempotent re-runs.
  - `sendNotification.mock.test.ts` — inserts row with correct shape.
  - `resumeAfterTopup.test.ts` — flips suspended deployments only.
  - `mock-engine/index.test.ts` — `isMockEnabled` resolution order (env vs localStorage), dispatch lookup, production guard.

- **E2E test** (Sprint 5 / Sprint 4 gates): existing `credits.spec.ts` and `vouchers.spec.ts` already mock the workflow engine via Vitest. New mock-mode E2E that drives the real UI end-to-end (mock gateway page, redeem dialog) is added: `tests/e2e/mock-flows.spec.ts`.

- **Visual check** for new UI: `RedeemVoucherDialog`, `MockGateway` page (per `ui-design.md` rule — check `docs/mockups/` first; redeem dialog has no mockup, so model on existing `Dialog` patterns).

---

## Non-Goals

- **No** real Kafka / RapidPro / Brevo / Africa's Talking integration in mocks. Channels collapse to in-app insert.
- **No** credit expiry cron mock (deferred — UI rarely surfaces it).
- **No** 20% / 10% threshold-alert mock (deferred — UI just listens to notification inserts; we can manually insert one for QA if needed).
- **No** automatic 15-min credit-deduction interval (Settings button only; auto-interval is optional v2).
- **No** dev tooling to spoof RLS — mocks operate within whatever the current user can do.
- **No** changes to the workflow-engine HTTP retry/error logic — mocks bypass it entirely.

---

## Migration / Rollback

- Flipping `VITE_MOCK_WORKFLOW_ENGINE=false` (or unset) reverts to real HTTP for every operation.
- Per-operation rollback: delete the file in `mock-engine/operations/`. Dispatcher falls through to real HTTP for missing handlers, so individual operations can be migrated to n8n one at a time.
- When n8n ships an operation, the corresponding mock file becomes dead code — delete the file and its registry entry. Tests against the contract (envelope shape, side-effect description) stay valuable; rewrite them as workflow-engine integration tests if useful.

---

## Open Questions (deferred — autonomous mode, user away)

1. **Dev project RLS**: does the current Supabase dev project allow the mock-admin user to UPDATE `partners.remainingCredits` and INSERT `credit_transactions` directly? If not, mocks won't work without a small migration. **Will verify during implementation; if RLS blocks, will report rather than loosen policies silently.**
2. **Mockup for `RedeemVoucherDialog`**: none in `docs/mockups/`. Will model on existing `GenerateVouchersDialog` and existing Dialog patterns. Flag for visual review on user return.
3. **Auto-interval for credit deduction**: button-only for now. If user wants `setInterval` driven by mock mode, add later — small change.
