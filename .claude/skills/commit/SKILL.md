---
name: commit
description: Prepare and create a Conventional Commits-compliant commit tied to the active sprint task. Runs lint, analyses staged changes, proposes a message, and commits.
---

# /commit — Commit Agent

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions.

## Permissions

✅ CAN read    : staged files · `docs/ROADMAP.md` · `.current-task`
✅ CAN run     : `git status` · `git diff --cached` · lint · `git commit`
❌ CANNOT      : write to any project file
❌ CANNOT      : push to remote or open PRs (reserved for `/pr-reviewer`)
❌ CANNOT      : commit if lint fails or absolute rule violations are detected
❌ CANNOT      : skip the `Co-Authored-By` trailer [PROJECT CONVENTION — see .claude/context.md]

---

Trigger when the user asks to commit, "save progress", or "make a commit".

**Commit message language:** [PROJECT CONVENTION — see .claude/context.md for the required language for commit messages]

---

## Step 1 — Pre-flight checks

Run in parallel:

```bash
git status --short
git diff --cached --stat
# Run the lint command defined in .claude/context.md
```

If lint fails, **stop and report errors**. Do not proceed until lint is clean.

Also check the staged diff for absolute rule violations as defined in `.claude/context.md`. If a violation is found, block the commit and report it.

---

## Step 2 — Identify the sprint task

Read the active sprint from `docs/ROADMAP.md` (the current sprint table).

- Match the staged diff to the corresponding sprint task.
- If multiple tasks are plausible, ask the user which one.
- If the work is cross-cutting tooling (hook, skill, doc) with no matching sprint task, skip this step.

The identified sprint task will be included in the commit body for **agile traceability** (commit ↔ backlog).

---

## Step 3 — Build the commit message

### Format

```
type(scope): short description

Optional context or technical details for larger changes.

Value  : [copy the "User value" field from the ROADMAP task]
Task   : Sprint N / X.Y — Task title
```

The subject (first line) is **required**. The body is **required for large tasks**, optional for small/medium ones.

---

### Type selection

| Staged content | Type |
|---|---|
| New feature or behaviour | `feat` |
| Bug fix | `fix` |
| Schema or migration | `feat` or `fix` (never `chore`) |
| Refactoring without behaviour change | `refactor` |
| Adding or fixing tests | `test` |
| Documentation, ROADMAP | `docs` |
| Hooks, skills, config, tooling | `chore` |
| CI/CD pipeline | `ci` |
| Performance | `perf` |
| Code style only | `style` |

---

### Scope selection

Use the shortest module name derived from the primary modified path. [PROJECT CONVENTION — see .claude/context.md for the scope mapping for this project's directory structure]

Common generic scopes:
- Cross-cutting changes with no dominant path → omit the scope

---

### Writing rules

- **Language**: follow the commit message language defined in `.claude/context.md`
- Imperative mood, lower-case, no trailing period
- Subject ≤ 72 characters
- The body explains the **why** (decision, constraint, domain rule), not the "what" — the diff already shows the what
- The `Value:` line quotes word-for-word the **User value** field from the ROADMAP task — this is the agile business value traceability link
- The `Task:` line quotes the exact sprint task number and title

**Correct examples:**

```
feat(api): add pagination to item list endpoint

Prevents unbounded queries on large datasets. Required for production
stability at scale.

Value : Users get fast list views regardless of dataset size.
Task  : Sprint 3 / 5.2 — Paginate item list
```

```
chore(tooling): add commit skill with agile traceability
```

**Incorrect examples:**

```
Added pagination          ← wrong tense
fix: bug fix              ← non-descriptive
feat: WIP                 ← never WIP
```

---

## Step 4 — Propose and confirm

Show the full proposed message to the user. Wait for approval or correction. Then commit using a HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
feat(api): add pagination to item list endpoint

Prevents unbounded queries on large datasets.

Value : Users get fast list views regardless of dataset size.
Task  : Sprint 3 / 5.2 — Paginate item list

Co-Authored-By: Author Name <author@example.com>
EOF
)"
```

Always use a HEREDOC for multi-line messages to avoid quoting issues.

[PROJECT CONVENTION — see .claude/context.md for the Co-Authored-By trailer value]

---

## Step 5 — After committing

- Report the commit hash and subject.
- If the commit satisfies the acceptance criteria of a sprint task, prompt: *"Should I mark task X.Y as done in the ROADMAP?"* — never mark it done automatically without confirmation.
- Do not push (`git push`) unless the user explicitly asks.
