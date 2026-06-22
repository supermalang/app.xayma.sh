---
name: roadmap-status
description: Navigate and execute tasks from the project roadmap (docs/ROADMAP.md). Use when the user asks what's next, picks up a task, wants to mark progress, or asks if a feature is done.
---

# /roadmap-status — Roadmap Progress Tracker

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions.

## Permissions

✅ CAN read    : `docs/ROADMAP.md` · all project files (for context)
✅ CAN write   : `docs/ROADMAP.md` (marking tasks `[x]`, updating sprint/global status tables)
✅ CAN run     : read-only git and build commands
❌ CANNOT      : write to source files, tests, or schema files
❌ CANNOT      : create or modify task definitions (use `/planner` for that)
❌ CANNOT      : start implementation work directly — use `/start-task <ID>` first

> Note: for new work, prefer the full agent pipeline (`/planner` → `/start-task` → `/coder` → …). This skill is primarily for checking progress, marking tasks done, and navigating the roadmap.

---

Active work is tracked in [docs/ROADMAP.md](../../../docs/ROADMAP.md). Trigger when the user asks "what's next", "picks up task X", "is feature Y done", or "mark this complete".

## Before starting any task

1. Read `docs/ROADMAP.md` directly — this skill is guidance, the file is authoritative.
2. Read the task's **acceptance criteria** in full before writing any code.
3. Check **schema impact** — if it says `Migration`, run the migration command first (see `schema-agent` skill).
4. Check task dependencies in the roadmap — do not start a dependent task before its prerequisite is done.

## What "done" means

A task is done only when ALL of the following are complete:

| Component | Location | Gate |
|---|---|---|
| Implementation | Source files | All acceptance criteria met |
| Unit tests | Test files | All cases pass |
| E2E tests | E2E test files | All scenarios pass |

Never mark `[x]` if tests are failing or missing. E2E tests may ship within 24 h of implementation if the E2E environment is not available — but this must be explicitly noted as pending.

## Marking tasks done in the roadmap

When completing any task, update `docs/ROADMAP.md`:
- Change `- [ ]` to `- [x]` for each completed sub-task, unit test item, and E2E item
- Update the sprint summary table (row by row)
- Update the global status table at the top
- Update the last-edited date

## Infrastructure tasks

Tasks outside sprints (often prefixed `INF-`) are not part of sprint velocity but may be prerequisites for sprint tasks. When completing an infrastructure task, mark it `[x]` and update the Infrastructure row in the global status table.

## Sprint structure

Each sprint has:
1. A closed sprint section (marked complete) with a summary table.
2. An open sprint section (in-progress or not started) with selected tasks.
3. Optionally a golden path E2E task at the end of the sprint section.

When planning a new sprint, add a new sprint section below the last closed sprint. Select tasks from the product backlog. When the sprint is done, rename the heading to mark it complete.

## Adding an implementation task

```markdown
- [ ] **X.Y — Short task title**
  One-sentence description of what the task accomplishes.

  **Schema impact:** None — [justification] OR Migration — [detail of the change]

  **Acceptance criteria**
  - Measurable criterion 1 (observable in the UI or via the API)
  - Measurable criterion 2
  - Rejection criterion (error case handled)
```

Rules:
- Place under the correct domain/feature heading.
- Number sequentially within the domain (X.1, X.2 …).
- `**Schema impact:**` must be `None`, `Migration — [detail]`, or `To confirm`.

## Adding a unit test task

```markdown
- [ ] **X-T — Unit tests**
  **File:** `src/lib/<module>/<file>.test.ts`

  | Function | Cases |
  |---|---|
  | `functionName(arg)` | nominal case → expected result |
  | | edge case → expected result |
  | | invalid argument → expected result |

  ```bash
  # Run command from .claude/context.md
  ```
```

## Adding an E2E test task

The E2E format is optimised for agent execution. Every field must be concrete — no vague criteria.

```markdown
- [ ] **X-E — E2E tests**
  **File:** `tests/e2e/<feature>.spec.ts`

  **Setup:**
  ```ts
  // Helpers to reach the starting state
  ```

  **Scenarios:**
  | # | Initial state | Action | Assertion |
  |---|---|---|---|
  | 1 | [concrete state] | [concrete UI action] | [exact text / selector / HTTP status] |
  | 2 | … | … | … |
```

Rules:
- Setup must use helper functions from the E2E helpers directory.
- Assertions must reference exact UI text, accessible role/label selectors, or HTTP status codes — never "verify it works".
- Always include a cleanup step.

## Cross-references

- Schema migrations: `schema-agent` skill.
- New API routes: `api-route` skill (if present).
- New pages: `next-page` skill (if present).
- E2E test writing: `playwright` skill (if present).
- Absolute rules: `domain-rules` skill (if present).
- Pre-push gate: `pr-reviewer` skill (audit mode for a read-only check).
