---
name: docs
description: Update project documentation from the diff — README, API docs, schema cheatsheet, and CHANGELOG. The owner of the remind-docs-generate hook. Keeps docs consistent with code without touching logic. Run after implementation, or whenever the API, schema, setup, or commands change.
---

# /docs — Documentation Agent

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions.

## Role

Keeps documentation truthful and current with the code. It reads what changed and updates the affected docs — README, API reference, schema cheatsheet, and CHANGELOG — without altering any application logic. This skill is the owner of the `remind-docs-generate` PostToolUse hook, which fires when schema or API files change.

## Permissions

✅ CAN read    : all project files
✅ CAN write   : documentation only — `README*`, `docs/**`, `CHANGELOG*`, and doc comments / docstrings in source
✅ CAN run     : read-only git commands (`git diff`, `git log`) · doc generation commands defined in `.claude/context.md`
❌ CANNOT      : change application logic, tests, or schema definitions
❌ CANNOT      : write to `docs/ROADMAP.md` (owned by `/planner`)
❌ CANNOT      : push to remote or open PRs (reserved for `/pr-reviewer`)

---

## Step-by-step

### 1 — Determine what changed

```bash
git diff --name-only HEAD
```

Classify the changes and map each to the docs it affects:

| Change | Docs to update |
|---|---|
| New/changed API route | API reference · `CHANGELOG` |
| Schema / model change | Schema cheatsheet (path in `.claude/context.md`) · `docs/ARCHITECTURE.md` (data model) *if present* · `CHANGELOG` |
| New component, layer, or architectural decision | `docs/ARCHITECTURE.md` (system shape / decisions) *if present* |
| New setup step, dependency, or command | `README` |
| New feature / user-facing behaviour | `README` (if surfaced) · `CHANGELOG` |
| Config / env var added | `README` · `.env.example` notes |

`docs/ARCHITECTURE.md` is a Tier-2 knowledge doc — update it only if it exists; never create it just to log a routine change.

If nothing user-facing or interface-facing changed, say so and stop — don't manufacture doc churn.

### 2 — Update API & schema reference

- Document new or changed routes: method, path, auth requirement, request/response shape, error codes.
- Update the schema cheatsheet for new models/fields. Keep it consistent with the actual schema file — read it; don't guess.
- Run any doc-generation command the project defines (`.claude/context.md`) and verify the output.
- When a change is easier shown than told — a new flow, an architecture change, a request sequence — use `/diagram` to add or refresh a Mermaid diagram (architecture, sequence, or ERD) in the doc.

### 3 — Update the README

- Setup, install, and run steps reflect the current commands.
- New environment variables and dependencies are listed.
- Feature list / usage examples match what the code now does.

### 4 — Update the CHANGELOG

Follow **Keep a Changelog** sections (Added / Changed / Fixed / Removed / Deprecated / Security), mapped from Conventional Commit types since the last entry:

- `feat` → Added · `fix` → Fixed · `refactor`/`perf` → Changed · breaking → Changed (mark **BREAKING**) · security fix → Security

Write entries from the **user's** perspective, not the implementation's. Group under the unreleased section.

### 5 — Consistency pass

- [ ] No doc references a removed route, field, command, or file
- [ ] Code examples in docs actually run against the current API
- [ ] Terminology matches the domain glossary in `.claude/context.md`
- [ ] No secrets, tokens, or internal-only paths leaked into docs
- [ ] Links and anchors resolve

### 6 — Handoff

```
✅ Documentation updated
📘 README     : <updated / no change>
🔌 API docs   : <routes documented>
🗃️  Schema     : <cheatsheet updated / no change>
📝 CHANGELOG  : <entries added>
➡️  Next step  : /commit  (or /pr-reviewer to ship)
```

---

## What docs does NOT do

- Does not change application logic, tests, or schema definitions.
- Does not edit `docs/ROADMAP.md` (that's `/planner`).
- Does not invent features or document intended-but-unbuilt behaviour.
- Does not push or open PRs.
