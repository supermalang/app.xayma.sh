# ROADMAP

*Dernière mise à jour : 2026-06-22*

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
| Pipeline | 1 | 0 | 0 |
| v1.1 Polish | 2 | 0 | 0 |
| Workflow backbone | 5 | 0 | 0 |

---

## 🏃 Sprint 1 — [Title]

| Task | Status | Delivered |
|------|--------|-----------|
| [ID] [Title] | ⬜ | — |

<!-- Add task blocks below using the template above -->

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

---

## 🏃 Sprint 7 — v1.1 Polish

| Task | Status | Delivered |
|------|--------|-----------|
| 7.1 Dark mode | ⬜ | — |
| 7.2 Extend CSV export to remaining list pages | ⬜ | — |

### 7.1 — Dark mode

**Sprint:** Sprint 7
**Write date:** 2026-06-22
**Planned date:** 2026-07-06
**Completion date:** —
**Risk:** Low

**Description**
Add a light/dark theme toggle to the management app. Tailwind is already configured with `darkMode: 'class'`, but the PrimeVue theme is light-only and no dark token set or theme-state exists. This task introduces dark values for the design tokens, the `.dark` CSS-variable overrides PrimeVue and Tailwind read from, a small theme composable that persists the choice and honours the OS preference, and a toggle in the app header.

**User value**
As any signed-in user, I want to switch the app to a dark theme so that I can work comfortably in low-light conditions and reduce eye strain.

**Acceptance criteria**
- [ ] A visible toggle in the app header switches the whole app between light and dark; every page renders correctly in dark with no unreadable text or surfaces.
- [ ] The chosen theme persists across reloads (localStorage) and, on first visit with no stored choice, defaults to the OS `prefers-color-scheme`.
- [ ] Dark theme meets WCAG 2.1 AA contrast on body text, surface hierarchy, and interactive/focus states.

**Schema impact:** None — client-side theming only, no data model change.
**Dependencies:** None.
**Wireframe / mockup:** N/A — reuses the existing design tokens (`src/design-system/tokens.json`); dark palette derived from them, no new screen.

**Components:** `src/assets/styles/primevue-theme.css` (add `.dark` overrides) · `src/design-system/tokens.json` (dark variants) · `src/composables/useTheme.ts` (new) · `src/components/common/AppHeader.vue` (toggle) · `src/i18n/en.ts` + `src/i18n/fr.ts` (toggle labels)
**Services:** None.

**Code tasks**
1. Add dark-mode CSS-variable overrides under a `.dark` selector in `primevue-theme.css`, mapping the same `--p-*`/token vars to dark values.
2. Add dark variants to `tokens.json` (surfaces, on-surface, borders) keeping WCAG AA contrast.
3. Create `src/composables/useTheme.ts` — `theme` ref, `toggleTheme()`, `initTheme()`; toggles the `dark` class on `<html>`, persists to localStorage, falls back to `prefers-color-scheme`.
4. Call `initTheme()` at app startup and add the toggle (PrimeVue `Button`, i18n label) to `AppHeader.vue`.
5. Add i18n keys (`common.theme_light`, `common.theme_dark`) to both `en.ts` and `fr.ts`.

**Unit tests**
File: `src/composables/useTheme.test.ts`
| Function | Cases |
|---|---|
| `useTheme` | nominal (toggle flips class + persists) · edge (first visit reads `prefers-color-scheme`) · error (corrupt/empty localStorage falls back to system) |

**E2E tests**
File: `tests/e2e/dark-mode.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | App in light mode | Click the header theme toggle | `<html>` gains `dark` class; key surfaces switch to dark |
| 2 | Dark mode active | Reload the page | Dark mode is still applied (persisted) |

**UAT:** Sign in, click the theme toggle in the header — the whole app switches to dark; reload and confirm it stays dark; toggle back to light.
**QA:** — (to be signed off)
**Delivery:** —

[ ]

### 7.2 — Extend CSV export to remaining list pages

**Sprint:** Sprint 7
**Write date:** 2026-06-22
**Planned date:** 2026-07-06
**Completion date:** —
**Risk:** Low

**Description**
CSV export already works through `AppDataTable`'s built-in `exportCsv()` (used by Partners and Portfolio) and the `src/lib/csv.ts` `downloadCsv()` helper. Two primary list pages are not yet wired: `Deployments.vue` has export explicitly disabled, and `Credits/History.vue` renders a raw PrimeVue `DataTable` without export. This task brings both pages up to the same consistent CSV-export behaviour as the rest of the app, reusing the existing mechanism (no new export library).

**User value**
As an admin or sales user, I want to export the deployments and credit-history lists to CSV so that I can analyse the data offline and share reports with partners.

**Acceptance criteria**
- [ ] The Deployments page shows a working Export button that downloads a CSV of the currently displayed (filtered/sorted) rows with correct column headers.
- [ ] The Credits/History page exports its rows to CSV with the same column set shown in the table, consistent with the other pages' format.
- [ ] Exports reflect active filters and sort order and use the existing `${name}-${date}.csv` filename convention; exporting an empty list produces a header-only CSV without error.

**Schema impact:** None — read-only client-side export.
**Dependencies:** None (reuses `AppDataTable` / `src/lib/csv.ts`).
**Wireframe / mockup:** N/A — uses the existing AppDataTable export control.

**Components:** `src/pages/Deployments.vue` (enable `:show-export` + `export-filename`) · `src/pages/Credits/History.vue` (migrate to `AppDataTable` export, or call `downloadCsv()`) · possibly `src/lib/csv.ts` (only if a shared formatting helper is extracted)
**Services:** None.

**Code tasks**
1. In `Deployments.vue`, enable AppDataTable export (`:show-export="true"`, `export-filename="deployments"`) and confirm the visible columns map to CSV headers.
2. In `Credits/History.vue`, either switch the raw `DataTable` to `AppDataTable` (preferred, for consistency) or add an Export button that builds CSV from the current rows via `downloadCsv()`.
3. Ensure exported rows honour the active filter/sort state on both pages.
4. Add/confirm i18n for the export control if any new label is introduced (`common.export` already exists).

**Unit tests**
File: `src/lib/csv.test.ts`
| Function | Cases |
|---|---|
| CSV builder / `downloadCsv` | nominal (rows → headers + quoted body) · edge (empty rows → header-only) · error (values containing commas/quotes are correctly escaped) |

**E2E tests**
File: `tests/e2e/csv-export.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | Deployments page loaded with rows | Click Export | A `deployments-<date>.csv` download is triggered |
| 2 | Credits/History with an active filter | Click Export | Downloaded CSV contains only the filtered rows |

**UAT:** Open Deployments → click Export → a CSV downloads with the on-screen columns; repeat on Credits/History with a filter applied and confirm only filtered rows are exported.
**QA:** — (to be signed off)
**Delivery:** —

[ ]

---

## 🏃 Sprint 8 — Workflow backbone (end-to-end)

> The Sprint 5–6 frontend (notifications UI, dashboards, deployment actions) fires webhooks into
> async flows that are not yet wired through. These tasks complete each flow end-to-end:
> UI trigger → `workflow-engine.ts` → n8n workflow → Kafka → consumer → Supabase → Realtime → UI.
> n8n workflow logic is built alongside (versioning location TBD with the team). Kafka topics are
> defined in [`docs/kafka.md`](kafka.md). **Audit deferred — slicing is provisional; refine at pickup.**

| Task | Status | Delivered |
|------|--------|-----------|
| 8.1 Notifications table + RLS + audit trigger | ⬜ | — |
| 8.2 Credit debit → balance + transaction (end-to-end) | ⬜ | — |
| 8.3 Top-up / expiry / suspend / resume (credit lifecycle) | ⬜ | — |
| 8.4 Deployment lifecycle workflows (create / action / terminate) | ⬜ | — |
| 8.5 Payment + voucher workflows (idempotent, end-to-end) | ⬜ | — |

### 8.1 — Notifications table + RLS + audit trigger

**Sprint:** Sprint 8
**Write date:** 2026-06-23
**Planned date:** 2026-07-13
**Completion date:** —
**Risk:** Medium

**Description**
The Sprint 5 notifications UI (service, composable, Realtime subscription, bell, feed, page) is complete but has no backing table. Create the `xayma_app.notifications` table with the columns `src/services/notifications.service.ts` expects, partner-scoped RLS, and a `general_audit` trigger, so notifications can be inserted by the workflow engine and stream to the UI via Realtime.

**User value**
As a partner, I want to receive in-app notifications so that I'm alerted to credit, deployment, and payment events without checking each page.

**Acceptance criteria**
- [ ] `xayma_app.notifications` exists with the fields `notifications.service.ts` reads (id, partner/company scope, type, title/body, read flag, created), and `getUnreadCount()` / `listNotifications()` query it successfully.
- [ ] RLS scopes rows to the requesting partner via `auth.uid()` → `company_id`; a partner cannot read another partner's notifications.
- [ ] An insert into the table fires the `general_audit` trigger, and the existing notifications UI updates live via the Realtime subscription when a row is inserted.

**Schema impact:** Migration — `supabase/migrations/...` create `xayma_app.notifications` + RLS policies + audit trigger.
**Dependencies:** None (frontend already built).
**Wireframe / mockup:** N/A — UI exists; this is the data layer.

**Components:** `src/services/notifications.service.ts` (verify against schema) · `src/composables/useNotifications.ts`
**Services:** `supabase/migrations/<new>.sql`

**Code tasks**
1. Define the `notifications` table from the fields `notifications.service.ts` selects/inserts.
2. Add RLS policies (select scoped to partner; insert reserved for service role / workflow engine).
3. Add the `general_audit` trigger (architecture rule 11).
4. Run `npm run supabase:types`; reconcile any type drift in the service/composable.

**Unit tests**
File: `src/services/notifications.service.test.ts`
| Function | Cases |
|---|---|
| `listNotifications` / `getUnreadCount` | nominal (returns partner rows) · edge (no notifications) · error (query failure surfaces) |

**E2E tests**
File: `tests/e2e/notifications.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | Partner logged in, a notification row inserted | Observe header bell | Unread count increments via Realtime |

**UAT:** Insert a notification row for the logged-in partner → the bell badge and feed update without a refresh.
**QA:** — (to be signed off)
**Delivery:** —

[ ]

### 8.2 — Credit debit → balance + transaction (end-to-end)

**Sprint:** Sprint 8
**Write date:** 2026-06-23
**Planned date:** 2026-07-13
**Completion date:** —
**Risk:** High

**Description**
Build the credit-debit flow end-to-end: a workflow-engine cron fires `credit.debit` every 15 minutes per active deployment; a consumer decrements `partners.remainingCredits` and writes a transaction record; the UI credit meter updates via Realtime. Per architecture rules 1 & 6, the balance is never written from the frontend — only by the consumer.

**User value**
As a partner, I want my credit balance to reflect real running-instance consumption so that billing is accurate and I can see what I've spent.

**Acceptance criteria**
- [ ] A `credit.debit` event decrements `partners.remainingCredits` by the correct amount exactly once per billing period per deployment (idempotent — replays do not double-debit).
- [ ] Each debit writes a transaction/ledger row attributable to the deployment and period.
- [ ] The UI credit meter reflects the new balance via Realtime, and no frontend/service code writes `remainingCredits` directly.

**Schema impact:** Migration — confirm/create the transactions/ledger table and any idempotency key column.
**Dependencies:** Kafka `credit.debit` topic (external); n8n cron + consumer (build together).
**Wireframe / mockup:** N/A — uses existing CreditMeter.

**Components:** `src/components/credits/CreditMeter.vue` · `src/composables/usePartnerCredits.ts`
**Services:** `src/services/workflow-engine.ts` (debit operation/contract) · n8n debit cron + consumer · `supabase/migrations/<new>.sql`

**Code tasks**
1. Confirm the `credit.debit` contract (payload, idempotency key) against `docs/workflow-engine/sprint5-contracts.md`.
2. Build the n8n cron (enumerate active deployments) and consumer (debit + transaction insert, idempotent).
3. Ensure `partners.remainingCredits` updates only via the consumer; UI reads via Realtime.
4. Add migration for the transaction/ledger table if absent.

**Unit tests**
File: `src/composables/usePartnerCredits.test.ts`
| Function | Cases |
|---|---|
| credits realtime handler | nominal (balance update reflects) · edge (zero balance) · error (subscription failure) |

**E2E tests**
File: `tests/e2e/credit-debit.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | Partner with active deployment + balance | Simulate a `credit.debit` event | Meter decrements once; transaction row appears |

**UAT:** With an active deployment, trigger a debit and confirm the meter drops by the expected amount and a transaction is recorded; replaying the same event does not double-debit.
**QA:** — (to be signed off)
**Delivery:** —

[ ]

### 8.3 — Top-up / expiry / suspend / resume (credit lifecycle)

**Sprint:** Sprint 8
**Write date:** 2026-06-23
**Planned date:** 2026-07-20
**Completion date:** —
**Risk:** High

**Description**
Complete the credit-lifecycle side effects: `credit.topup` raises the balance and resumes suspended deployments; `credit.expiry` suspends deployments when no active bundle remains; a balance reaching zero after a debit fires `deployment.suspend`. All state changes surface in the UI via Realtime.

**User value**
As a partner, I want my deployments to suspend when I run out of credit and resume automatically when I top up, so that service state always matches what I've paid for.

**Acceptance criteria**
- [ ] A completed `credit.topup` increases the balance and resumes any deployments suspended for low balance.
- [ ] `credit.expiry` with no remaining active bundle suspends the partner's deployments; the UI shows the suspended status via Realtime.
- [ ] Balance reaching 0 after a debit triggers `deployment.suspend`; all transitions are idempotent (duplicate events do not double-apply).

**Schema impact:** None expected (reuses partners/deployments) — confirm at pickup.
**Dependencies:** 8.2; Kafka `credit.topup` / `credit.expiry` / `deployment.suspend` topics; n8n consumers.
**Wireframe / mockup:** N/A.

**Components:** `src/composables/usePartnerCredits.ts` · `src/composables/useDeployments.ts` · `src/components/deployments/DeploymentStatusBadge.vue`
**Services:** `src/services/workflow-engine.ts` · n8n consumers · deployment engine

**Code tasks**
1. Confirm topup/expiry/suspend/resume contracts in `docs/workflow-engine/sprint5-contracts.md`.
2. Build n8n consumers for resume-on-topup, suspend-on-expiry, suspend-on-zero.
3. Verify UI status/balance update via Realtime for each transition.

**Unit tests**
File: `src/composables/useDeployments.test.ts`
| Function | Cases |
|---|---|
| status realtime handler | nominal (suspend reflects) · edge (resume reflects) · error (no active bundle) |

**E2E tests**
File: `tests/e2e/credit-lifecycle.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | Suspended deployment, zero balance | Complete a top-up | Deployment resumes; status updates in UI |

**UAT:** Drain a balance to suspend a deployment, then top up and confirm it resumes; let a bundle expire and confirm suspension.
**QA:** — (to be signed off)
**Delivery:** —

[ ]

### 8.4 — Deployment lifecycle workflows (create / action / terminate)

**Sprint:** Sprint 8
**Write date:** 2026-06-23
**Planned date:** 2026-07-20
**Completion date:** —
**Risk:** Medium

**Description**
Wire the deployment lifecycle end-to-end: `createDeployment`, `performDeploymentAction` (start/stop/restart), and `terminateDeployment` webhooks drive the deployment engine and update `deployments.status`; the UI reflects status transitions via Realtime rather than polling. The frontend triggers already exist (DeploymentWizard, Deployments, ResellerDashboard).

**User value**
As a customer or reseller, I want my deployment actions to actually provision/start/stop/terminate instances and show live status, so that the UI reflects the real state of my apps.

**Acceptance criteria**
- [ ] Creating a deployment provisions via the deployment engine and the UI shows live status transitions (e.g. pending → active) via Realtime.
- [ ] Start/stop/restart actions change `deployments.status` and reflect in the UI; terminate marks the deployment terminated.
- [ ] Status is driven by Realtime (no polling), and failed engine operations surface an error state, not a silent stale status.

**Schema impact:** None expected (uses `deployments`) — confirm at pickup.
**Dependencies:** Kafka `deployment.created` topic; deployment engine; n8n consumers.
**Wireframe / mockup:** N/A — pages exist.

**Components:** `src/pages/DeploymentWizard.vue` · `src/pages/DeploymentDetail.vue` · `src/pages/Deployments.vue` · `src/composables/useDeployments.ts` · `src/components/deployments/DeploymentStatusBadge.vue`
**Services:** `src/services/workflow-engine.ts` (createDeployment / deploymentAction / terminateDeployment) · `src/services/deployments.service.ts` · n8n consumers + deployment engine

**Code tasks**
1. Confirm deployment contracts in `docs/workflow-engine/sprint4-contracts.md`.
2. Build/verify n8n deployment workflows + status write-back to `deployments`.
3. Confirm UI status transitions via the existing Realtime subscription; add error-state handling.

**Unit tests**
File: `src/services/deployments.service.test.ts`
| Function | Cases |
|---|---|
| `updateDeploymentStatus` / action handlers | nominal (status transition) · edge (terminate) · error (engine failure → error status) |

**E2E tests**
File: `tests/e2e/deployment-lifecycle.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | Customer on wizard | Create a deployment | Status shows pending → active live |

**UAT:** Create a deployment and watch it go active; stop/start/restart and confirm status updates live; terminate and confirm it leaves the active list.
**QA:** — (to be signed off)
**Delivery:** —

[ ]

### 8.5 — Payment + voucher workflows (idempotent, end-to-end)

**Sprint:** Sprint 8
**Write date:** 2026-06-23
**Planned date:** 2026-07-27
**Completion date:** —
**Risk:** High

**Description**
Complete the money-in flows: `initiateCheckout` starts a Wave/Orange Money payment; the `paymentCallback` (IPN) idempotently tops up credits; `redeemVoucher` credits a voucher. The IPN arrives before the UI redirect, so credit application must check status first and be safe against duplicate callbacks.

**User value**
As a partner, I want my payments and vouchers to reliably add credit exactly once, so that I'm never double-charged or under-credited.

**Acceptance criteria**
- [ ] A completed payment credits the partner exactly once even when the IPN and the post-redirect call both arrive (idempotent on payment reference).
- [ ] Voucher redemption credits the partner once; a re-submitted or already-used voucher is rejected without crediting.
- [ ] A failed or duplicate payment callback does not credit/double-credit; the UI balance reflects the final state via Realtime.

**Schema impact:** Migration — confirm a payments/transactions table with a unique payment-reference constraint for idempotency.
**Dependencies:** Payment gateway (Wave/Orange Money); Kafka `credit.topup`; n8n payment consumer.
**Wireframe / mockup:** N/A — checkout/top-up UI exists.

**Components:** `src/pages/Credits/*` (buy/top-up flow)
**Services:** `src/services/workflow-engine.ts` (initiateCheckout / paymentCallback / redeemVoucher) · n8n payment workflow · `supabase/migrations/<new>.sql`

**Code tasks**
1. Confirm payment/voucher contracts in `docs/workflow-engine/sprint5-contracts.md`.
2. Add a unique constraint on payment reference for idempotency; build the n8n IPN consumer to check status before crediting.
3. Verify balance update via Realtime after a successful payment/voucher.

**Unit tests**
File: `src/services/workflow-engine.test.ts`
| Function | Cases |
|---|---|
| `handlePaymentCallback` / `redeemVoucher` | nominal (credits once) · edge (duplicate IPN no double-credit) · error (used/invalid voucher rejected) |

**E2E tests**
File: `tests/e2e/payment.spec.ts`
| # | Initial state | Action | Assertion |
|---|---|---|---|
| 1 | Partner at top-up | Complete a payment (IPN + redirect both fire) | Balance increases exactly once |

**UAT:** Complete a top-up and confirm the balance rises once even with the IPN firing before redirect; redeem a voucher once and confirm a second attempt is rejected.
**QA:** — (to be signed off)
**Delivery:** —

[ ]
