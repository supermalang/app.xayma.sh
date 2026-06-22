---
name: start-task
description: Declare the active roadmap task before coding starts. Validates DoR, writes .current-task, and sets up the feature branch. Run this before touching any source, test, or schema file.
---

# /start-task — Start Task

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions.

## Permissions

✅ CAN read    : `docs/ROADMAP.md` · all project files (for context)
✅ CAN write   : `.current-task` only
✅ CAN run     : `git` branch commands (`git switch -c`, `git switch`, `git branch`)
❌ CANNOT      : write to source, test, schema, or documentation files
❌ CANNOT      : create or modify task definitions in `docs/ROADMAP.md` (that's `/planner`)
❌ CANNOT      : mark a task `[x]`, run migrations, or open PRs

## When to use

Before writing any code, test, or migration for a planned task. Any hook that guards source directories will block Edit/Write operations as long as `.current-task` is not set.

## Argument

```
/start-task <TASK-ID>
```

Examples: `/start-task 10.3`, `/start-task INF-9`, `/start-task SP3-E`

---

## Step-by-step

### 1 — Find the task

Read `docs/ROADMAP.md` and locate the block for `<TASK-ID>`.

- If the task **does not exist** → stop. Tell the user to add the task using the template at the top of `docs/ROADMAP.md` before continuing.
- If the task is already `[x]` (done) → warn the user and ask for confirmation before continuing.

### 2 — Verify the Definition of Ready (DoR)

Read the DoR section at the top of `docs/ROADMAP.md`. For each item, check the task block satisfies it:

| DoR item | What to look for in the block |
|---|---|
| All template fields filled | Description, User value, Acceptance criteria, Impact, Risk present and non-empty |
| Unambiguous acceptance criteria | At least one concrete and verifiable criterion |
| Schema impact declared | `Migration` or `None` present |
| Dependencies identified | Mentioned or explicitly absent |
| Wireframe if UI | Present or marked N/A |
| Risk declared | `Low`, `Medium`, or `High` present |

If a DoR item is **missing** → list the missing items, ask the user to fill them in the roadmap, and **do not write `.current-task`**. The task is not ready.

### 3 — Write `.current-task`

If all DoR items are satisfied, write the file `.current-task` at the project root:

```
<TASK-ID>
<short task title>
```

Example:
```
10.3
Add conditional start gate for step X
```

### 4 — Verify the branch

Read the current git branch (`git rev-parse --abbrev-ref HEAD`).

- If the branch is the integration branch or main → suggest the branch creation command:
  ```bash
  git switch <integration-branch> && git switch -c feature/<task-id-kebab>
  ```
  [PROJECT CONVENTION — see .claude/context.md for the integration branch name and allowed branch prefixes]
- If already on a feature/fix branch → confirm it is the right branch for this task.

### 5 — Final report

```
✅ Active task : <TASK-ID> — <title>
📁 Branch      : <branch-name>
📋 DoR         : all conditions satisfied
🚀 You can now edit source files, tests, and the schema
```

---

## Switching tasks mid-session

To move to a different task, re-run `/start-task <NEW-ID>`. The `.current-task` file will be overwritten with the new ID.

## End of task

When the task is complete (DoD satisfied, PR merged), remove `.current-task`:

```bash
rm .current-task
```

`/pr-reviewer` does this automatically as its final step.
