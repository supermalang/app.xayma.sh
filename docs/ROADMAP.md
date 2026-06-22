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
| [Domain A] | 0 | 0 | 0 |
| [Domain B] | 0 | 0 | 0 |

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
