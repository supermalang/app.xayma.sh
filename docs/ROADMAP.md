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
