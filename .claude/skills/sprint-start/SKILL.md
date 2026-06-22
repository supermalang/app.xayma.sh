---
name: sprint-start
description: Sprint kickoff ritual. Verifies every planned task satisfies the Definition of Ready before the sprint begins. Blocks the sprint if any task has unfilled template fields. Use when a new sprint is about to start.
---

# /sprint-start — Sprint Kickoff Agent

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions.

## Permissions

✅ CAN read    : `docs/ROADMAP.md` · all project files (for context)
✅ CAN write   : `docs/ROADMAP.md` (sprint heading rename only, DoR gap notes)
✅ CAN run     : read-only git commands
❌ CANNOT      : write to source files, tests, or schema files
❌ CANNOT      : create or modify task definitions (delegate to `/planner`)
❌ CANNOT      : mark tasks `[x]`

## Argument (optional)

```
/sprint-start          # Targets the next unstarted sprint
/sprint-start 4        # Targets Sprint 4 explicitly
```

---

## Step-by-step

### 1 — Identify the target sprint

Read `docs/ROADMAP.md`. Find the sprint section to start:
- Without argument: the first sprint that is not complete and not already in progress
- With argument: the sprint matching the provided number

List all tasks planned for that sprint (all unchecked items in the section).

### 2 — DoR audit for every task

For each planned task, check every item from the Definition of Ready (at the top of the roadmap):

| Task ID | All fields filled | Criteria ≥ 3 | Schema impact | Dependencies | Wireframe if UI | Risk declared |
|---|---|---|---|---|---|---|
| X.1 | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ |

A task is **Ready** only if every column is ✅.

### 3 — Report

```
Sprint N — DoR Audit
─────────────────────────────────────────
✅ Ready      : X tasks
❌ Not ready  : Y tasks

Not ready:
  Task 10.3 — missing: User value, Risk
  Task 10.4 — missing: Wireframe (UI task — required)
```

### 4 — Decision gate

**If all tasks are Ready:**
- Rename the sprint heading in `docs/ROADMAP.md` to mark it as in progress (follow the heading convention already used in the roadmap)
- Report:
  ```
  ✅ Sprint N started — all X tasks satisfy DoR
  ➡️  Pick the first task and run /start-task <ID>
  ```

**If any task is NOT Ready:**
- Do not rename the heading
- Report the gap list clearly
- For each not-ready task, output the exact fields to fill
- Report:
  ```
  ⛔ Sprint N cannot start — Y tasks have unmet DoR items
  Fix the tasks above (run /planner <ID> to update each one), then re-run /sprint-start
  ```

### 5 — Sprint capacity check (informational)

After the DoR audit, provide a quick capacity note:
- Count of tasks: implementation + unit tests + E2E tests + golden path (if applicable)
- Reminder of the DoD requirements each task must satisfy before `[x]`
- Reference to previous sprint velocity (count of tasks delivered in the last sprint)

```
📊 Sprint N capacity
   Tasks planned    : X implementation + Y unit test + Z E2E
   Last sprint      : N-1 delivered A/B tasks
   Recommended      : confirm scope is realistic before proceeding
```

This is informational only — the sprint proceeds regardless.
