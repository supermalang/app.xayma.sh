# ROADMAP

*Dernière mise à jour : [DATE]*

---

## Definition of Ready (DoR)

A task must satisfy **all** of the following before any code is written. The pipeline hard-stops if any item is missing.

- [ ] All template fields filled and non-empty
- [ ] Acceptance criteria: at least 3, concrete and verifiable
- [ ] Schema impact declared (`Migration` or `None`)
- [ ] Dependencies identified (or explicitly `None`)
- [ ] Wireframe or mockup referenced (or `N/A` with justification for non-UI tasks)
- [ ] Risk level declared (`Low` / `Medium` / `High`)

> **Hard stop:** the `guard-roadmap-gate.sh` hook blocks all edits to `src/`, `tests/`, and the schema file if `.current-task` is not set or the task ID is not found in this file.

---

## Definition of Done (DoD)

A task is done only when **all** of the following are true:

- [ ] All acceptance criteria verifiably met
- [ ] Unit tests written and passing (`test:coverage` above thresholds)
- [ ] E2E tests written and passing
- [ ] No lint errors (`npm run lint`)
- [ ] Code reviewed (security, performance, UX if applicable)
- [ ] Roadmap task marked `[x]` with completion date
- [ ] PR/MR opened and linked

---

## Task Template

Copy this block when creating a new task via `/planner`.

```markdown
### [ID] — [Short task title]

**Sprint:** Sprint N
**Write date:** YYYY-MM-DD
**Planned date:** YYYY-MM-DD
**Completion date:** —
**Risk:** Low | Medium | High

**Description**
One paragraph — what this task does, not how.

**User value**
As a [persona], I want [action] so that [benefit].

**Acceptance criteria**
- [ ] Criterion 1 — concrete and verifiable
- [ ] Criterion 2 — nominal case
- [ ] Criterion 3 — edge or error case

**Schema impact:** None — [reason] | Migration — `supabase/migrations/...` [what changes]

**Components:** `src/pages/...` · `src/components/...` · `src/stores/...`
**Services:** `src/services/...` · workflow-engine webhook(s)

**Code tasks**
1. [Implementation sub-task]
2. [Implementation sub-task]

**Unit tests**
File: `src/<area>/[file].test.ts`
| Function | Cases |
|---|---|
| `functionName` | nominal · edge · error |

**E2E tests**
File: `tests/e2e/[feature].spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | [state] | [action] | [expected result] |

**UAT:** [What the user sees or does in the browser to verify this works]
**QA:** — (to be signed off)
**Delivery:** —
```

---

## Global status

| Domain | Planned | In progress | Done |
|--------|---------|-------------|------|
| Deployments | 6 | 0 | 0 |
| Credits / Payments | 2 | 0 | 0 |
| Resilience (DLQ) | 1 | 0 | 0 |
| Codebase health | 1 | 0 | 1 |

---

## 🏃 Sprint 1 — Critical path to first paying customer

| Task | Status | Delivered |
|------|--------|-----------|
| XAYMA-100 Add correlationId to deployment webhook payloads | ✓ | 2026-06-29 |
| XAYMA-101 n8n: Central Notification Workflow (deployments) | ⬜ | — |
| XAYMA-102 n8n: Create Deployment consumer + AWX callback | ⬜ | — |
| XAYMA-103 n8n: initiateCheckout workflow (payment gateway) | ⬜ | — |
| XAYMA-104 n8n: Payment IPN handler + credits.topup Kafka flow | ⬜ | — |

---

### XAYMA-100 — Add correlationId to deployment webhook payloads

**Sprint:** Sprint 1
**Write date:** 2026-06-29
**Planned date:** 2026-07-06
**Completion date:** —
**Risk:** Low

**Description**
Add a `correlationId` field (equal to the deployment slug) to the three deployment webhook payloads sent by `workflow-engine.ts` — create, action (start/stop/restart), and terminate. The n8n central notification workflow uses this field as the idempotency key when writing back to Supabase.

**User value**
As a developer, I want every deployment webhook call to carry a stable, unique `correlationId` so that n8n consumer workflows can detect and skip duplicate messages without double-acting.

**Acceptance criteria**
- [ ] `CreateDeploymentPayload` in `workflow-engine.ts` includes `correlationId: string`; `useDeployments.createDeployment()` sets it to the generated deployment slug before calling the webhook.
- [ ] `DeploymentActionPayload` includes `correlationId: string`; `useDeployments.performDeploymentAction()` resolves the slug from the loaded deployments list and passes it.
- [ ] `TerminateDeploymentPayload` includes `correlationId: string`; `useDeployments.terminateDeployment()` resolves the slug from the loaded deployments list and passes it.
- [ ] If the deployment slug cannot be resolved for an action/terminate call, the function logs a warning and falls back to `String(deploymentId)` — it does not silently omit the field.
- [ ] All existing unit tests pass; new tests for `useDeployments` verify that `correlationId` is present and correct in each payload.

**Schema impact:** None — payload shape change only, no DB change.

**Components:** `src/services/workflow-engine.ts` · `src/composables/useDeployments.ts`
**Services:** workflow-engine.ts

**Code tasks**
1. Add `correlationId: string` to `CreateDeploymentPayload`, `DeploymentActionPayload`, `TerminateDeploymentPayload` in `workflow-engine.ts`.
2. In `useDeployments.createDeployment()`: pass `correlationId: slug` (the slug already computed at that point).
3. In `useDeployments.performDeploymentAction()`: resolve `deployment.slug` from `deployments.value`, pass as `correlationId`; fallback to `String(deploymentId)` with a warning if not found.
4. In `useDeployments.terminateDeployment()`: same slug resolution as above.

**Unit tests**
File: `src/composables/useDeployments.test.ts`
| Function | Cases |
|---|---|
| `createDeployment` | payload includes `correlationId` equal to the deployment slug |
| `performDeploymentAction` | payload includes `correlationId` when deployment is in the loaded list |
| `performDeploymentAction` | falls back to `String(deploymentId)` when deployment not in list |
| `terminateDeployment` | payload includes `correlationId` equal to the deployment slug |

**E2E tests**
File: `tests/e2e/deployment-correlationid.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | Wizard on step 4, plan selected | Submit wizard | Network request to deployment engine includes `correlationId` matching the prefixed domain slug |

**UAT:** Submit the deployment wizard; open DevTools → Network and confirm the POST to `DEPLOYMENT_ENGINE_URL` includes `"correlationId": "<slug>"` in the request body.
**QA:** — (to be signed off)
**Delivery:**
- Commit : cb23272
- PR     : #59
- Delivered on : 2026-06-29

---

### XAYMA-101 — n8n: Central Notification Workflow

**Sprint:** Sprint 1
**Write date:** 2026-06-29
**Planned date:** 2026-07-06
**Completion date:** —
**Risk:** Medium

**Description**
Build the single n8n entry-point webhook workflow that acts as the deployment operations router. It receives all deployment POSTs from the app (via `DEPLOYMENT_ENGINE_URL`), reads the `operation` query parameter (and `action` body field for `deploymentAction`), and publishes the message to the correct Kafka topic. It contains no business logic — routing only.

**User value**
As a platform operator, I want all deployment commands to flow through one routing point so that I can add logging, auth checks, or new operations in one place without touching consumer workflows.

**Acceptance criteria**
- [ ] The workflow exposes a single webhook URL that the app POSTs to with `?operation=<name>`.
- [ ] `createDeployment` → publishes to `xayma.deployments.create.request` with full payload + `correlationId` + `timestamp`.
- [ ] `deploymentAction` with `action=start` → `xayma.deployments.start.request`; `action=stop` → `xayma.deployments.stop.request`; `action=restart` → `xayma.deployments.restart.request`.
- [ ] `terminateDeployment` → publishes to `xayma.deployments.terminate.request`.
- [ ] Unknown `operation` values return HTTP 400 with `{ "error": "unknown operation" }`.
- [ ] All published Kafka messages include `correlationId`, `operation`, original payload, and ISO timestamp.
- [ ] The workflow is documented with a description and node notes in n8n explaining the routing logic.

**Schema impact:** None — n8n workflow only, no DB or src/ changes.

**Components:** n8n workflow (Central Notification Workflow) · Kafka topics per registry in `docs/ARCHITECTURE.md`
**Services:** n8n · Kafka (KRaft)

**Code tasks**
1. Create the n8n webhook workflow with a `Webhook` trigger node (POST, path: `deployment-router`).
2. Add a `Switch` node routing on `{{ $json.query.operation }}`.
3. For `deploymentAction`: add a nested `Switch` on `{{ $json.body.action }}` to fan out to start/stop/restart topics.
4. Add a Kafka producer node per route, publishing to the correct topic with the enriched payload.
5. Add a fallback branch returning HTTP 400 for unknown operations.
6. Set `DEPLOYMENT_ENGINE_URL` in Admin Settings to the new webhook URL.

**Unit tests**
N/A — n8n workflow; tested via integration test below.

**E2E tests**
File: `tests/e2e/central-notif-workflow.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | n8n running, Kafka broker up | POST `?operation=createDeployment` with valid payload | Message appears on `xayma.deployments.create.request` Kafka topic |
| 2 | n8n running | POST `?operation=deploymentAction` with `action=stop` | Message on `xayma.deployments.stop.request` |
| 3 | n8n running | POST `?operation=unknownOp` | HTTP 400 response |

**UAT:** In Admin → Settings, set `DEPLOYMENT_ENGINE_URL` to the new n8n webhook URL. Submit a test deployment from the wizard; confirm the message lands on the `xayma.deployments.create.request` Kafka topic via the Kafka UI or n8n execution log.
**QA:** — (to be signed off)
**Delivery:** —

---

### XAYMA-102 — n8n: Create Deployment consumer + AWX callback

**Sprint:** Sprint 1
**Write date:** 2026-06-29
**Planned date:** 2026-07-13
**Completion date:** —
**Risk:** Medium

**Description**
Build two n8n workflows that complete the create-deployment vertical slice: (1) a Kafka consumer that picks up `xayma.deployments.create.request` messages, performs the idempotency check, and triggers the AWX job template; (2) a callback workflow that AWX notifies on job completion, which writes the final status (`active` or `failed`) back to Supabase — triggering the Realtime subscription in the Vue app.

**User value**
As a customer, I want to submit the deployment wizard and see my deployment transition from "Pending" to "Running" (or "Failed") automatically so that I know the platform is working without manually refreshing.

**Acceptance criteria**
- [ ] Consumer workflow subscribes to `xayma.deployments.create.request`; on receipt it queries Supabase for the deployment row by `correlationId` (slug) and skips (re-emits result) if status is not `pending_deployment`.
- [ ] Consumer calls the AWX job template ID stored on the service's `deployment_template.id`; passes `deploymentId`, `slug`, `domainNames`, `planSlug`, and `partnerId` as extra variables.
- [ ] AWX is configured with a notification template that POSTs to the n8n callback workflow URL on job success and failure.
- [ ] Callback workflow on success: updates `deployments.status` to `active` in Supabase (via service-role key).
- [ ] Callback workflow on failure: updates `deployments.status` to `failed` in Supabase.
- [ ] Consumer on failure after 3 retries: publishes to `xayma.deployments.create.dlq`; DLQ handler updates status to `failed` and sends an alert notification.
- [ ] After the Supabase write, the Vue app's Realtime subscription picks up the status change without a page reload.

**Schema impact:** None — `deployments.status` column and all required values (`pending_deployment`, `active`, `failed`) already exist.

**Components:** n8n (Create Deployment consumer WF + AWX Callback WF + DLQ handler WF) · AWX notification template
**Services:** n8n · Kafka (KRaft) · AWX · Supabase (service-role key in n8n env)
**Dependencies:** XAYMA-100 (correlationId in payload) · XAYMA-101 (Kafka topics provisioned by central notif WF)

**Manual prerequisite (operator — not tracked here)**
Configure the AWX notification template to POST to the n8n callback webhook URL on job success and failure. The URL is the webhook exposed by the callback workflow built in step 2 below.

**Code tasks**
1. Create Kafka consumer workflow: trigger on `xayma.deployments.create.request`, idempotency check via Supabase read, call AWX job template via HTTP Request node.
2. Create AWX Callback workflow: webhook trigger (POST), read `correlationId` + job status from AWX notification body, update Supabase `deployments` row accordingly.
3. Create DLQ handler workflow: consumer on `xayma.deployments.create.dlq`, update Supabase status to `failed`, call `sendNotification` for alerting.
4. Store callback webhook URL in n8n environment variable (not hardcoded in the workflow).

**Unit tests**
N/A — n8n workflows; verified via E2E and UAT.

**E2E tests**
File: `tests/e2e/create-deployment-flow.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | Partner with sufficient credits, wizard completed | Submit wizard | Deployment row status = `pending_deployment` immediately after submit |
| 2 | AWX mock returns success | AWX callback fires with `status=success` | Deployment row status transitions to `active`; Vue UI reflects change via Realtime without reload |
| 3 | AWX mock returns failure | AWX callback fires with `status=failed` | Deployment row status = `failed`; error state visible in Vue UI |
| 4 | Consumer receives duplicate message (same `correlationId`, status already `active`) | Re-send Kafka message | No Supabase write; consumer logs idempotent skip |

**UAT:** Complete the deployment wizard end-to-end in a staging environment; observe the deployment card transition from "Pending" → "Deploying" → "Running" (or "Failed") live in the deployments list without a page refresh.
**QA:** — (to be signed off)
**Delivery:** —

---

### XAYMA-103 — n8n: initiateCheckout workflow (payment gateway integration)

**Sprint:** Sprint 1
**Write date:** 2026-06-29
**Planned date:** 2026-07-13
**Completion date:** —
**Risk:** High

**Description**
Build the n8n workflow that handles payment checkout initiation. Unlike all other operations, this one is **synchronous** — the app awaits a `{ paymentUrl, transactionId, reference }` response. The workflow receives the request, creates a pending transaction record in Supabase, calls the Wave/Orange Money payment gateway API, and returns the checkout URL to the app, which then redirects the user.

**User value**
As a customer, I want to click "Complete Purchase" and be redirected to Wave or Orange Money to pay so that I can add credits to my account without needing a bank card.

**Acceptance criteria**
- [ ] n8n workflow receives POST to `WORKFLOW_ENGINE_URL?operation=initiateCheckout` with `{ bundleId, partnerId, paymentGatewayId }` and returns HTTP 200 with `{ paymentUrl, transactionId, reference }`.
- [ ] Before calling the payment gateway, the workflow creates a `credit_transactions` row in Supabase with `status = PENDING`, `partner_id`, `bundleId`, and `reference` — so the Success page can subscribe to it via Realtime.
- [ ] The workflow reads payment gateway credentials (API key, callback URL, success URL, cancel URL) from the `payment_gateways` table in Supabase (via service-role key) — never hardcoded.
- [ ] If the payment gateway API returns an error, the workflow returns HTTP 500 and the pending transaction row is marked `FAILED`.
- [ ] The `reference` field (from the gateway response) becomes the `correlationId` for the entire payment lifecycle — it is stored on the transaction row.
- [ ] `Credits/Buy.vue` `completePurchase()` receives `paymentUrl` and redirects without modification (already implemented).

**Schema impact:** None — `credit_transactions` table already exists.

**Components:** n8n (initiateCheckout WF) · `Credits/Buy.vue` (already implemented — no changes needed) · `Credits/Success.vue` (already implemented — no changes needed)
**Services:** n8n · Supabase (service-role key) · Wave/Orange Money payment gateway API
**Dependencies:** None

**Manual prerequisite (operator — not tracked here)**
Configure Wave/Orange Money API credentials (API key, callback URL, success URL, cancel URL) in Admin → Settings → Payment Gateways before the workflow can run.

**Code tasks**
1. Create n8n webhook workflow at `WORKFLOW_ENGINE_URL` for `operation=initiateCheckout`.
2. Add Supabase HTTP Request node: look up bundle price from `settings` (credit_bundles) and gateway config from `payment_gateways` by `paymentGatewayId`.
3. Add Supabase HTTP Request node: insert `credit_transactions` row with `status = PENDING` and store the generated `reference`.
4. Add HTTP Request node: call gateway API (Wave or Orange Money) with amount, reference, callback URL, success/cancel URLs.
5. On gateway success: return `{ paymentUrl, transactionId, reference }` as HTTP 200 JSON.
6. On gateway error: update transaction status to `FAILED`, return HTTP 500.

**Unit tests**
N/A — n8n workflow; verified via E2E below.

**E2E tests**
File: `tests/e2e/checkout-flow.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | Bundle + gateway selected in Credits/Buy.vue | Click "Complete Purchase" | HTTP 200 response with `paymentUrl` received; browser redirects to payment gateway URL |
| 2 | Supabase queried after checkout call | — | `credit_transactions` row exists with `status = PENDING` and matching `reference` |
| 3 | Gateway API returns error | Click "Complete Purchase" | HTTP 500 response; error message shown in UI; transaction row status = `FAILED` |

**UAT:** On the Credits → Buy page, select a bundle and a payment method, click "Complete Purchase" — browser should redirect to the Wave or Orange Money payment page. Check Supabase `credit_transactions` to confirm a PENDING row was created with the correct reference.
**QA:** — (to be signed off)
**Delivery:** —

---

### XAYMA-104 — n8n: Payment IPN handler + credits.topup Kafka flow

**Sprint:** Sprint 1
**Write date:** 2026-06-29
**Planned date:** 2026-07-20
**Completion date:** —
**Risk:** High

**Description**
Build the two-part n8n flow that completes the payment lifecycle: (1) an IPN webhook workflow that receives the server-to-server callback from the payment provider, performs the idempotency check, and publishes to the `xayma.credits.topup.request` Kafka topic; (2) a Kafka consumer workflow that updates the transaction status and partner credit balance in Supabase, triggering the Realtime subscription in `Credits/Success.vue`. The app also calls `handlePaymentCallback` on redirect back — this routes through the same Kafka flow and is handled idempotently.

**User value**
As a customer, I want my credit balance to update automatically after payment so that I can start deploying immediately without waiting for a manual top-up.

**Acceptance criteria**
- [ ] IPN webhook workflow receives payment provider callback, reads `reference` and `status` from the body, and checks the current `credit_transactions` row status in Supabase before acting (idempotency: if already `COMPLETED`, return 200 with no further action).
- [ ] On successful IPN (`status = success`): publishes to `xayma.credits.topup.request` with `{ correlationId: reference, partnerId, bundleId, amount }`.
- [ ] Kafka consumer updates `credit_transactions.status` to `COMPLETED` and adds `creditsPurchased` to `partners.remainingCredits` in Supabase via service-role key.
- [ ] Supabase Realtime fires on the `credit_transactions` row update — `Credits/Success.vue` transitions from "Processing" to "Payment successful" without a page reload.
- [ ] `handlePaymentCallback(reference, status)` from the app (called on redirect back) routes through `WORKFLOW_ENGINE_URL?operation=paymentCallback` → same Kafka topic → same consumer — idempotency prevents double-crediting.
- [ ] On IPN with `status = failed`: transaction row updated to `FAILED`; Realtime fires; `Credits/Success.vue` shows error state.
- [ ] Consumer failure after 3 retries: message published to `xayma.credits.topup.dlq`; DLQ handler marks transaction `FAILED` and sends an alert.

**Schema impact:** None — `credit_transactions` and `partners` tables already exist with required columns.

**Components:** n8n (IPN WF + credits.topup consumer WF + DLQ handler WF) · `Credits/Success.vue` (already implemented — no changes needed) · `Credits/Cancel.vue` (static — no changes needed)
**Services:** n8n · Kafka (KRaft) · Supabase (service-role key)
**Dependencies:** XAYMA-103 (transaction row created during checkout — IPN needs it to exist)

**Manual prerequisite (operator — not tracked here)**
Configure the payment gateway's IPN/notification URL to point to the n8n IPN webhook URL. This is set in the payment gateway admin panel.

**Code tasks**
1. Create IPN webhook workflow: reads `reference` + `status` from provider body, idempotency check via Supabase, publishes to `xayma.credits.topup.request` on success or updates to `FAILED` on failure.
2. Wire `paymentCallback` operation in the central notification workflow (`WORKFLOW_ENGINE_URL`) to also route to `xayma.credits.topup.request` — so the app-side callback converges with the IPN path.
3. Create Kafka consumer workflow: subscribes to `xayma.credits.topup.request`, updates `credit_transactions.status = COMPLETED`, updates `partners.remainingCredits`.
4. Create DLQ handler: consumer on `xayma.credits.topup.dlq`, marks transaction `FAILED`, sends alert notification.
5. Store IPN webhook URL in n8n environment variable (not hardcoded).

**Unit tests**
N/A — n8n workflows; verified via E2E below.

**E2E tests**
File: `tests/e2e/payment-ipn-flow.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | PENDING transaction in Supabase, user on Success page | Simulate IPN POST with `status=success` | Transaction status → `COMPLETED`; partner `remainingCredits` increased; Success.vue shows success state |
| 2 | COMPLETED transaction in Supabase | Simulate second IPN POST (duplicate) | No additional credit added; Supabase `remainingCredits` unchanged |
| 3 | PENDING transaction | Simulate IPN POST with `status=failed` | Transaction status → `FAILED`; Success.vue shows error state |
| 4 | PENDING transaction | App calls `handlePaymentCallback(reference, 'success')` after redirect | Same result as scenario 1 — idempotent if IPN already processed |

**UAT:** Complete a payment flow end-to-end in staging. After payment provider redirects back to `/credits/success`, the page should show "Payment successful" and the credit balance in the top nav should increase — all without a page reload. Confirm `credit_transactions` row shows `COMPLETED` and `partners.remainingCredits` is updated in Supabase.
**QA:** — (to be signed off)
**Delivery:** —

---

## 🏃 Sprint 2 — Deployment lifecycle + suspend/resume + resilience

| Task | Status | Delivered |
|------|--------|-----------|
| XAYMA-200 n8n: Deployment lifecycle consumers (stop/start/restart/terminate) | ⬜ | — |
| XAYMA-201 n8n: Deployment suspend/resume + grace period | ⬜ | — |
| XAYMA-202 n8n: DLQ handler (cross-cutting dead-letter processor) | ⬜ | — |

---

### XAYMA-200 — n8n: Deployment lifecycle consumers (stop/start/restart/terminate)

**Sprint:** Sprint 2
**Write date:** 2026-06-29
**Planned date:** 2026-07-27
**Completion date:** —
**Risk:** Medium

**Description**
Build four n8n Kafka consumer workflows that handle the full deployment lifecycle beyond creation: stop, start, restart, and terminate. Each consumer performs an idempotency check (skip if already in the target state), calls the AWX job template with the appropriate lifecycle tag, and receives an AWX callback to write the final status back to Supabase — triggering the Realtime subscription in the Vue app. The UI buttons in `DeploymentDetail.vue` already fire the correct payloads; this task builds the n8n side that actually acts on them.

**User value**
As a customer, I want to stop, start, restart, and terminate my deployments from the dashboard so that I can control my infrastructure without waiting for manual admin intervention.

**Acceptance criteria**
- [ ] Stop consumer subscribes to `xayma.deployments.stop.request`; idempotency check skips if status ≠ `active`; calls AWX stop lifecycle tag; on AWX success sets `deployments.status = 'stopped'`.
- [ ] Start consumer subscribes to `xayma.deployments.start.request`; idempotency check skips if status ≠ `stopped`; calls AWX start lifecycle tag; on AWX success sets `deployments.status = 'active'`.
- [ ] Restart consumer subscribes to `xayma.deployments.restart.request`; idempotency check skips if status ≠ `active`; calls AWX restart lifecycle tag; sets status to `deploying` on dispatch, `active` on AWX success.
- [ ] Terminate consumer subscribes to `xayma.deployments.terminate.request`; works from any non-terminal state; calls AWX teardown tag; on success sets `deployments.status = 'archived'`.
- [ ] Each consumer has a paired AWX callback webhook workflow that writes the final status result (success or failed) back to Supabase using the `correlationId` (deployment slug) to identify the row.
- [ ] On AWX callback failure: status set to `failed`; consumer publishes to the respective `.dlq` topic after 3 retries.
- [ ] After each Supabase write, Realtime fires and `DeploymentDetail.vue` reflects the new status without a page reload.
- [ ] AWX lifecycle tags are read from `services.lifecycle_commands` (already stored per service) — not hardcoded in the workflow.

**Schema impact:** None — all required `deployment_status` enum values (`stopped`, `active`, `deploying`, `failed`, `archived`, `pending_deletion`) already exist.

**Components:** n8n (4 consumer WFs + 4 AWX callback WFs) · `src/pages/DeploymentDetail.vue` · `src/composables/useDeployments.ts`
**Services:** n8n · Kafka (KRaft) · AWX · Supabase (service-role key in n8n env)
**Dependencies:** XAYMA-100 (correlationId in payloads) · XAYMA-101 (central notif WF routing to lifecycle topics) · XAYMA-102 (AWX callback pattern established)

**Manual prerequisite (operator — not tracked here)**
AWX notification templates for each lifecycle job type must POST to the respective n8n callback webhook URLs on job success and failure.

**Code tasks**
1. Create stop consumer WF: Kafka trigger on `xayma.deployments.stop.request`, idempotency check, HTTP Request to AWX with stop lifecycle command from `services.lifecycle_commands`.
2. Create AWX stop callback WF: webhook trigger, update `deployments.status = 'stopped'` (success) or `'failed'` (failure) by `correlationId`.
3. Repeat steps 1–2 for start (`xayma.deployments.start.request` → `active`).
4. Repeat steps 1–2 for restart (`xayma.deployments.restart.request` → `deploying` on dispatch → `active` on callback).
5. Repeat steps 1–2 for terminate (`xayma.deployments.terminate.request` → `archived`).
6. Add `.dlq` publish on 3rd retry failure to all four consumers.
7. Verify `DeploymentDetail.vue` Realtime subscription handles all new status values correctly (no frontend changes expected — status display already uses a badge component).

**Unit tests**
File: `src/composables/useDeployments.test.ts`
| Function | Cases |
|---|---|
| `performDeploymentAction('stop')` | payload sent to engine; optimistic status set to `stopped` |
| `performDeploymentAction('start')` | payload sent; optimistic status set to `deploying` |
| `performDeploymentAction('restart')` | payload sent; optimistic status set to `deploying` |
| `terminateDeployment` | payload sent; optimistic status set to `pending_deletion` |

**E2E tests**
File: `tests/e2e/deployment-lifecycle.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | Deployment status = `active` | Click "Stop" in DeploymentDetail | Status transitions to `stopped` via Realtime without page reload |
| 2 | Deployment status = `stopped` | Click "Start" | Status transitions to `active` |
| 3 | Deployment status = `active` | Click "Restart" | Status goes `deploying` then `active` |
| 4 | Deployment status = `active` | Click "Terminate" → confirm | Status transitions to `archived`; deployment removed from active list |
| 5 | AWX mock returns failure on stop | Click "Stop" | Status transitions to `failed`; error state visible in UI |

**UAT:** In DeploymentDetail, click Stop — the status badge changes to "Stopped" within seconds. Click Start — badge returns to "Active". Click Restart — badge briefly shows "Deploying" then "Active". Click Terminate and confirm — deployment disappears from the active list. All transitions happen without a page reload.
**QA:** — (to be signed off)
**Delivery:** —

---

### XAYMA-201 — n8n: Deployment suspend/resume + grace period

**Sprint:** Sprint 2
**Write date:** 2026-06-29
**Planned date:** 2026-07-27
**Completion date:** —
**Risk:** Medium

**Description**
Build the n8n workflows and minimal Vue changes that implement the credit-based suspension lifecycle: when a partner's credits reach zero (triggered by the Sprint 3 debit cron via `xayma.deployments.suspend.request`), all their active deployments are suspended — containers stopped, status set to `suspended`, grace period end date recorded. When credits are topped up (the XAYMA-104 consumer already runs), it publishes `xayma.deployments.resume.request` for each suspended deployment, which resumes them. The Vue app surfaces the grace period countdown on suspended deployments.

**User value**
As a customer, I want my deployment to be automatically suspended when I run out of credits and immediately resume when I top up so that I don't lose data and can get back online without contacting support.

**Acceptance criteria**
- [ ] Suspend consumer subscribes to `xayma.deployments.suspend.request`; reads all `active` deployments for the given `partnerId`; calls AWX stop tag for each; sets each `deployments.status = 'suspended'`; sets `partners.grace_period_end` to `now + grace_days` (5 days for `customer`, 10 days for `reseller`/`pro_reseller`).
- [ ] Resume consumer subscribes to `xayma.deployments.resume.request`; reads all `suspended` deployments for `partnerId`; calls AWX start tag for each; sets each `deployments.status = 'active'`; clears `partners.grace_period_end` (set to NULL).
- [ ] XAYMA-104's `credits.topup` consumer (already planned) publishes one `xayma.deployments.resume.request` message per partner after crediting — this task adds that publish step to XAYMA-104's consumer workflow.
- [ ] `DeploymentDetail.vue` shows a grace period countdown banner when `deployment.status === 'suspended'`, reading `partner.grace_period_end`; the banner links to `/credits/buy`.
- [ ] `DeploymentCard.vue` shows a "Suspended" badge with days remaining when status is `suspended`.
- [ ] Grace period end is stored on the `partners` row (not computed in Vue) so n8n can also read it for expiry alerts (Sprint 3).
- [ ] Realtime fires on both the `deployments` and `partners` rows after the n8n writes — Vue updates without a page reload.

**Schema impact:** Migration — add `grace_period_end: timestamptz | null` to `xayma_app.partners`. Default `NULL`; set by suspend consumer; cleared by resume consumer.

**Components:** n8n (suspend consumer WF + resume consumer WF) · `src/pages/DeploymentDetail.vue` · `src/components/deployments/DeploymentCard.vue` · `src/composables/useDeployments.ts`
**Services:** n8n · Kafka (KRaft) · AWX · Supabase (service-role key in n8n env)
**Dependencies:** XAYMA-101 (Kafka topics) · XAYMA-104 (credits.topup consumer must publish resume message — this task amends it)

**Code tasks**
1. Write migration: `ALTER TABLE xayma_app.partners ADD COLUMN grace_period_end timestamptz NULL`.
2. Create suspend consumer WF: Kafka trigger on `xayma.deployments.suspend.request`, query all `active` deployments by `partnerId`, call AWX stop for each, batch-update `deployments.status = 'suspended'`, set `partners.grace_period_end`.
3. Create resume consumer WF: Kafka trigger on `xayma.deployments.resume.request`, query all `suspended` deployments by `partnerId`, call AWX start for each, batch-update `deployments.status = 'active'`, clear `partners.grace_period_end`.
4. Amend XAYMA-104 credits.topup consumer: after crediting, publish `xayma.deployments.resume.request` with `{ partnerId }` if partner had `remainingCredits = 0` before the top-up.
5. Update `DeploymentDetail.vue`: when `status === 'suspended'`, show grace period banner using `partner.grace_period_end` (fetch partner row alongside deployment).
6. Update `DeploymentCard.vue`: show "Suspended — N days remaining" badge when `status === 'suspended'`.
7. Run `npm run supabase:types` to regenerate `src/types/supabase.ts` after migration.

**Unit tests**
File: `src/pages/DeploymentDetail.test.ts` · `src/components/deployments/DeploymentCard.test.ts`
| Component | Cases |
|---|---|
| `DeploymentDetail` | shows grace period banner when status = `suspended` and `grace_period_end` is set |
| `DeploymentDetail` | hides banner when status ≠ `suspended` |
| `DeploymentCard` | renders "Suspended" badge with days remaining when status = `suspended` |
| `DeploymentCard` | renders "Active" badge when status = `active` |

**E2E tests**
File: `tests/e2e/deployment-suspend-resume.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | Partner `remainingCredits = 0`, deployment `active` | Simulate `xayma.deployments.suspend.request` | Deployment status → `suspended`; `partners.grace_period_end` set; banner visible in DeploymentDetail |
| 2 | Deployment `suspended` | Simulate `xayma.credits.topup` IPN → topup consumer runs | Deployment status → `active`; `partners.grace_period_end` NULL; banner gone |
| 3 | `grace_period_end` set to 3 days from now | Visit DeploymentCard | Badge shows "Suspended — 3 days remaining" |

**UAT:** With a partner at zero credits, trigger the suspend flow. The deployment card should show "Suspended — N days remaining". Top up credits. Within seconds, the card should return to "Active" without a page reload.
**QA:** — (to be signed off)
**Delivery:** —

---

### XAYMA-202 — n8n: DLQ handler (cross-cutting dead-letter processor)

**Sprint:** Sprint 2
**Write date:** 2026-06-29
**Planned date:** 2026-08-03
**Completion date:** —
**Risk:** Low

**Description**
Build a single n8n workflow that acts as the platform-wide dead-letter queue handler. It subscribes to all `.dlq` topics, reads the `correlationId` and `operation` from the failed message, determines the affected Supabase entity (deployment or credit transaction), marks it as `failed`, and sends an admin alert email. All consumers from Sprint 1 (XAYMA-102, XAYMA-104) and Sprint 2 (XAYMA-200, XAYMA-201) already publish to `.dlq` topics after 3 retries — this task closes the loop.

**User value**
As a platform operator, I want failed messages to be detected and surfaced automatically so that stuck deployments or missed credit events are caught immediately rather than silently left in an unknown state.

**Acceptance criteria**
- [ ] DLQ handler workflow subscribes to all `xayma.*.*.dlq` topics (or enumerates known DLQ topics: `xayma.deployments.create.dlq`, `xayma.deployments.stop.dlq`, `xayma.deployments.start.dlq`, `xayma.deployments.restart.dlq`, `xayma.deployments.terminate.dlq`, `xayma.deployments.suspend.dlq`, `xayma.deployments.resume.dlq`, `xayma.credits.topup.dlq`).
- [ ] For deployment DLQ messages: queries Supabase for the deployment by `correlationId` (slug); if status is not already a terminal state (`failed`, `archived`), sets `deployments.status = 'failed'`.
- [ ] For credit DLQ messages: queries Supabase for the `credit_transactions` row by `correlationId` (reference); if status ≠ `FAILED` or `COMPLETED`, sets `credit_transactions.status = 'FAILED'`.
- [ ] Sends an admin alert email (via n8n built-in Email node — no dependency on G-05 `sendNotification` WF) with: topic name, `correlationId`, `operation`, failure reason, timestamp.
- [ ] The handler is idempotent: if the Supabase row is already in a terminal state, it skips the write and still logs the event.
- [ ] All DLQ processing events are appended to the `general_audit` log via a Supabase insert (using service-role key).

**Schema impact:** None — `deployments.status = 'failed'` and `credit_transactions.status = 'FAILED'` are already valid enum values; `general_audit` trigger handles audit writes automatically.

**Components:** n8n (DLQ handler WF)
**Services:** n8n · Kafka (KRaft) · Supabase (service-role key) · SMTP (n8n built-in email node for admin alert)
**Dependencies:** XAYMA-102 (publishes to `xayma.deployments.create.dlq`) · XAYMA-104 (publishes to `xayma.credits.topup.dlq`) · XAYMA-200 (publishes to lifecycle `.dlq` topics) · XAYMA-201 (publishes to suspend/resume `.dlq` topics)

**Code tasks**
1. Create DLQ handler WF with Kafka triggers for each known `.dlq` topic (or use a topic pattern if the Kafka node supports it).
2. Add Switch node routing on `operation` field: deployment ops → query `deployments` by `correlationId`; credit ops → query `credit_transactions` by `correlationId`.
3. Add Supabase HTTP Request node: set `status = 'failed'` / `'FAILED'` if not already terminal.
4. Add n8n Email node: send structured alert to admin email address (read from n8n env variable `ADMIN_ALERT_EMAIL`).
5. Add Supabase HTTP Request node: insert row into `general_audit` with `{ table: 'dlq', operation: 'failed', new_value: { topic, correlationId, reason } }`.
6. Store `ADMIN_ALERT_EMAIL` in n8n environment variables (not hardcoded).

**Unit tests**
N/A — n8n workflow; verified via E2E below.

**E2E tests**
File: `tests/e2e/dlq-handler.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | Deployment `pending_deployment`, deployment consumer fails 3×  | Publish to `xayma.deployments.create.dlq` | `deployments.status = 'failed'`; admin receives alert email; `general_audit` row created |
| 2 | Credit transaction `PENDING`, topup consumer fails 3× | Publish to `xayma.credits.topup.dlq` | `credit_transactions.status = 'FAILED'`; admin alert sent |
| 3 | Deployment already `failed` | Publish duplicate to `.dlq` | No Supabase write; `general_audit` row created with "skipped: already terminal" note |

**UAT:** Manually publish a test message to `xayma.deployments.create.dlq` in the Kafka UI. Within 30 seconds, the targeted deployment row should show `status = failed` in Supabase, the admin should receive an alert email, and a row should appear in the `general_audit` table.
**QA:** — (to be signed off)
**Delivery:** —

---

## 🏃 Sprint 0 — Codebase health

### XAYMA-002 — Fix pre-existing unit test failures

**Sprint:** Sprint 0
**Write date:** 2026-06-29
**Planned date:** 2026-06-29
**Completion date:** 2026-06-29
**Risk:** Low

**Description**
Fix 43 pre-existing unit test failures across 7 files before sprint work begins. No new features — only align tests with actual service implementations and add two missing service functions (`createTransaction`, `updateTransactionStatus`) that tests reference.

**User value**
As a developer, I want a green test suite so that I can trust CI signals when shipping real features.

**Acceptance criteria**
- [x] All 43 currently-failing unit tests pass.
- [x] No previously-passing tests are broken.
- [x] `npm run test:run` (unit only, excluding e2e) exits 0.

**Schema impact:** None

**Components:** `src/services/credits.service.ts` · `src/services/vouchers.service.ts` · `src/services/workflow-engine.ts` · `src/components/deployments/DeploymentCard.vue` · `src/pages/Settings.vue` · `src/pages/CreateService.vue` · `src/pages/DeploymentWizard.vue`
**Services:** credits.service · vouchers.service · workflow-engine

**UAT:** `npm run test:run` passes with 0 failures on unit tests.
**QA:** —
**Delivery:** —

---

## 🏃 Sprint 5 — Pipeline bring-up

### XAY-0 — Pipeline smoke task

**Sprint:** Sprint 5
**Write date:** 2026-06-22
**Planned date:** 2026-06-22
**Completion date:** —
**Risk:** Low

**Description**
A no-op task used to dry-run the AI pipeline orchestrator end to end — Definition of Ready gate, branch creation, agent routing, and Definition of Done checks — without touching application code, schema, or UI. It exists solely to confirm the pipeline wiring is correct before the first real Sprint 5 task is picked up.

**User value**
As a maintainer, I want a harmless smoke task so that I can verify the orchestrator runs through its full lifecycle before trusting it with real work.

**Acceptance criteria**
- [ ] The orchestrator picks up `XAY-0`, passes the DoR gate, and creates a feature branch.
- [ ] The pipeline runs through its agent routing without modifying any file under `src/` or `supabase/`.
- [ ] The run completes its DoD checks and reports success without opening a production-affecting change.

**Schema impact:** None — smoke test only

**Components:** — · workflow-engine webhook(s): none
**Services:** — (no service changes)

**UAT:** Maintainer triggers the orchestrator on `XAY-0` and observes a clean full-lifecycle run in the logs.
**QA:** — (to be signed off)
**Delivery:** —

[ ]
