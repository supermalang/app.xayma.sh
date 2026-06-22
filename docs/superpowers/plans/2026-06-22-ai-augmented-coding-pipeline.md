# AI-Augmented Coding Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the `supermalang/ai-augmented-coding` multi-agent pipeline into the Xayma management app, retargeted from React/Next/Prisma to Vue 3 / Vite / PrimeVue / Pinia / Supabase / n8n / vue-i18n.

**Architecture:** Skills define behavior (`.claude/skills/<name>/SKILL.md`); agents define the least-privilege tool/model envelope (`.claude/agents/<name>.md`); `/ship-task` is a fully-autonomous Workflow that chains agents and opens a PR. Stack specifics are isolated in `.claude/context.md` + `.claude/hooks/stack-profile.sh`, so the bulk of the template ports verbatim.

**Tech Stack:** Vue 3 · Vite · TypeScript · PrimeVue 4 · Tailwind · Pinia · Supabase · n8n · Vitest · Playwright · vue-i18n. Bash hooks. Claude Code skills/agents/hooks.

**Key facts established during planning (do not re-derive):**
- All **15 agent files** are stack-agnostic → copy verbatim.
- **18 of 23 skills** have zero stack coupling → copy verbatim. Only `ship-task`, `ux-review`, `perf-review`, `design-import`, `webapp-testing` need light edits.
- **11 of 13 hooks** read all stack patterns from `stack-profile.sh` via `${VAR:-default}` → copy verbatim. Only `guard-git-flow.sh` and `guard-branch.sh` hardcode `develop`/Prisma paths → small edits.
- Decisions: fully-autonomous `/ship-task`; full two-tier knowledge model; trunk-based `main` (no `develop`); template prevails except clear stack differences.

**Source of truth for ports:** the cloned template (Task 0). Always read the template file and copy/transform it — never reproduce template content from memory.

---

## Task 0: Clone the template & set up the cache

**Files:**
- Create: `/tmp/aac-template/` (clone, not committed)

- [ ] **Step 1: Clone the template**

```bash
rm -rf /tmp/aac-template
git clone --depth 1 https://github.com/supermalang/ai-augmented-coding.git /tmp/aac-template
```

- [ ] **Step 2: Verify the clone**

Run: `ls /tmp/aac-template/.claude/skills | wc -l && ls /tmp/aac-template/.claude/agents | wc -l && ls /tmp/aac-template/.claude/hooks | wc -l`
Expected: `23`, `15`, `14` (14 = 13 hooks + stack-profile.sh)

> If `/tmp/aac-template` is missing at any later task (new session), re-run Step 1.

---

## Task 1: `.gitignore` — pipeline state

**Files:**
- Modify: `.gitignore` (append)

- [ ] **Step 1: Append pipeline entries**

Append to `.gitignore` (do not remove existing entries):

```gitignore

# AI pipeline state (local only — never commit)
.current-task

# Throwaway live-verification artefacts (/webapp-testing, /perf-measure)
.scratch/
```

- [ ] **Step 2: Verify**

Run: `grep -E '\.current-task|\.scratch' .gitignore`
Expected: both lines present.

- [ ] **Step 3: Commit**

```bash
git switch -c feat/ai-pipeline-port
git add .gitignore
git commit -m "chore(pipeline): ignore .current-task and .scratch state"
```

> All subsequent tasks commit onto this `feat/ai-pipeline-port` branch.

---

## Task 2: `stack-profile.sh` — the single retarget file

**Files:**
- Create: `.claude/hooks/stack-profile.sh`

- [ ] **Step 1: Write the file**

Create `.claude/hooks/stack-profile.sh` with exactly:

```bash
#!/usr/bin/env bash
# stack-profile.sh — single source of truth for all stack-specific patterns the hooks use.
# Pipeline orchestration is stack-agnostic; only the regex/glob/command values below are
# stack-bound. Retarget the pipeline by editing THIS file, never the hook scripts.
#
# PROFILE: Vue 3 · Vite · TypeScript · PrimeVue · Pinia · Supabase · n8n · Vitest · Playwright

# Test/spec files — excluded from content scanners; flagged by guard-test-files.
export STACK_TEST_FILE_REGEX='\.(test|spec)\.(ts|tsx|js)$'

# Implementation paths gated behind /start-task (guard-roadmap-gate, guard-branch).
export STACK_GATED_PATHS_REGEX='^(src/|tests/|supabase/migrations/)'

# Auto-generated files that must never be hand-edited (guard-generated-files).
export STACK_GENERATED_FILES_GLOB='*/src/types/database.ts'

# Hard-delete that bypasses Kafka/audit (guard-soft-delete) — direct Supabase delete.
export STACK_SOFT_DELETE_PATTERN='\.from\([^)]*\)\.delete\('

# Destructive DB command that wipes data (guard-destructive-db).
export STACK_DESTRUCTIVE_DB_PATTERN='supabase db reset|supabase migration repair'

# Audit-log mutation (guard-audit-log) — Xayma audit table is general_audit (rule 11).
export STACK_AUDIT_LOG_ORM_PATTERN='\.from\(["'\'']xayma_app\.general_audit["'\''][^)]*\)\.(update|delete|upsert)\('
export STACK_AUDIT_LOG_SQL_PATTERN='(UPDATE|DELETE)[[:space:]]+.*general_audit'

# Sensitive field names that must never appear in client code / responses (guard-expose-hash).
export STACK_SENSITIVE_FIELDS='service_role|SUPABASE_SERVICE_ROLE|VITE_PAYMENT_GATEWAY[A-Z_]*SECRET|passwordHash'

# Sources that feed generated types, and the command to regenerate (remind-docs-generate).
export STACK_DOCS_SOURCE_REGEX='^(supabase/migrations/|src/services/)'
export STACK_DOCS_GENERATE_CMD='npm run supabase:types'

# New migration files (remind-docker-rebuild — inert for the Vite SPA but kept for parity).
export STACK_MIGRATIONS_REGEX='^supabase/migrations/'
export STACK_DOCKER_REBUILD_CMD='npm run supabase:types'

# Xayma-specific: direct credit mutation bypassing Kafka/workflow-engine (rule 6).
# Used by guard-credit-write.sh (Task 6).
export STACK_CREDIT_WRITE_PATTERN='remainingCredits[[:space:]]*[:=]|\.from\(["'\'']xayma_app\.partners["'\''][^)]*\)\.(update|upsert)\('
```

- [ ] **Step 2: Verify it sources cleanly**

Run: `bash -c '. .claude/hooks/stack-profile.sh && echo "$STACK_GATED_PATHS_REGEX | $STACK_AUDIT_LOG_SQL_PATTERN"'`
Expected: `^(src/|tests/|supabase/migrations/) | (UPDATE|DELETE)[[:space:]]+.*general_audit`

- [ ] **Step 3: Commit**

```bash
git add .claude/hooks/stack-profile.sh
git commit -m "feat(pipeline): add stack-profile.sh retargeted to Supabase/Vue/n8n"
```

---

## Task 3: Port the 11 stack-agnostic hooks verbatim

**Files:**
- Create: `.claude/hooks/{guard-roadmap-gate,guard-generated-files,guard-destructive-db,guard-commit-message,guard-soft-delete,guard-audit-log,guard-expose-hash,guard-secret-scan,guard-test-files,remind-docs-generate,remind-docker-rebuild}.sh`

> `guard-generated-files.sh` here **supersedes** the existing Xayma hook of the same name (template prevails). The existing one is removed in Task 14.

- [ ] **Step 1: Copy the 11 hooks**

```bash
for h in guard-roadmap-gate guard-generated-files guard-destructive-db guard-commit-message \
         guard-soft-delete guard-audit-log guard-expose-hash guard-secret-scan \
         guard-test-files remind-docs-generate remind-docker-rebuild; do
  cp "/tmp/aac-template/.claude/hooks/$h.sh" ".claude/hooks/$h.sh"
  chmod +x ".claude/hooks/$h.sh"
done
```

- [ ] **Step 2: Verify the roadmap gate fires (no active task)**

```bash
rm -f .current-task
echo '{"tool_input":{"file_path":"'"$PWD"'/src/foo.ts"}}' | \
  CLAUDE_PROJECT_DIR="$PWD" bash .claude/hooks/guard-roadmap-gate.sh
```
Expected: JSON containing `"continue": false` and `ROADMAP GATE`.

- [ ] **Step 3: Verify the audit-log guard fires on `general_audit` SQL**

```bash
echo '{"tool_input":{"file_path":"'"$PWD"'/src/services/x.ts","content":"DELETE FROM xayma_app.general_audit"}}' | \
  CLAUDE_PROJECT_DIR="$PWD" bash .claude/hooks/guard-audit-log.sh
```
Expected: a line containing `AUDIT LOG RULE`.

- [ ] **Step 4: Verify the generated-files guard blocks `database.ts`**

```bash
echo '{"tool_input":{"file_path":"'"$PWD"'/src/types/database.ts"}}' | \
  CLAUDE_PROJECT_DIR="$PWD" bash .claude/hooks/guard-generated-files.sh
```
Expected: JSON with `"permissionDecision": "deny"`.

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/*.sh
git commit -m "feat(pipeline): port 11 stack-agnostic guard hooks"
```

---

## Task 4: Port + retarget `guard-git-flow.sh` (trunk-based main)

**Files:**
- Create: `.claude/hooks/guard-git-flow.sh`

- [ ] **Step 1: Copy from template**

```bash
cp /tmp/aac-template/.claude/hooks/guard-git-flow.sh .claude/hooks/guard-git-flow.sh
```

- [ ] **Step 2: Retarget develop→main in the message strings**

The logic is already correct (`PROTECTED="main"`, blocks commit/push on `main`). Only the guidance messages reference `develop`. Replace the three deny-message strings so they instruct branching from `main`, not `develop`. In `.claude/hooks/guard-git-flow.sh`:

Replace the commit-deny reason:
```
deny "Refus de committer sur '$PROTECTED' (branche de production). Workflow : crée une branche de feature depuis main — git switch main && git switch -c <type>/<description> — puis committe et ouvre une PR vers main. (Blocked: committing directly on '$PROTECTED'. Branch from main and open a PR targeting main instead.)"
```

Replace the explicit-push-to-main deny reason:
```
    deny "Refus de pousser vers '$PROTECTED'. Pousse ta branche feature et ouvre une PR vers main : git push -u origin <branche> puis gh pr create --base main. (Blocked: pushing to '$PROTECTED'. Push your feature branch and open a PR targeting main.)"
```

Replace the bare-push-from-main deny reason:
```
    deny "Tu es sur '$PROTECTED' — un 'git push' nu mettrait à jour la production. Branche, committe, et ouvre une PR vers main. (Blocked: bare push from '$PROTECTED' would update production. Branch and open a PR targeting main.)"
```

Leave the branch-name convention `case` as-is (it already accepts `feature/*`, `fix/*`, etc.).

- [ ] **Step 3: Verify it denies a commit on main**

```bash
git switch main 2>/dev/null
echo '{"tool_input":{"command":"git commit -m \"feat: x\""}}' | bash .claude/hooks/guard-git-flow.sh
git switch feat/ai-pipeline-port
```
Expected (while on main): JSON with `"permissionDecision": "deny"` mentioning committing on `main`. The final `git switch` returns you to the feature branch.

- [ ] **Step 4: Commit**

```bash
git add .claude/hooks/guard-git-flow.sh
git commit -m "feat(pipeline): port guard-git-flow retargeted to trunk-based main"
```

---

## Task 5: Port + retarget `guard-branch.sh` (paths + main only)

**Files:**
- Create: `.claude/hooks/guard-branch.sh`

- [ ] **Step 1: Write the retargeted hook**

Create `.claude/hooks/guard-branch.sh` with exactly:

```bash
#!/bin/bash
# Block editing implementation files directly on the protected branch (main).

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Stack-specific gated paths live in stack-profile.sh.
PROFILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/stack-profile.sh"
[ -f "$PROFILE" ] && . "$PROFILE"

RELATIVE=$(echo "$FILE_PATH" | sed "s|^${CLAUDE_PROJECT_DIR:-$(pwd)}/||")
if echo "$RELATIVE" | grep -qE "${STACK_GATED_PATHS_REGEX:-^(src/|tests/|supabase/migrations/)}"; then
  BRANCH=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ "$BRANCH" = "main" ]; then
    echo "{\"continue\": false, \"stopReason\": \"🚫 BRANCH GATE: You are on 'main'. Create a feature branch first: git switch -c <type>/description — then open a PR to main when done.\"}"
  fi
fi
```

- [ ] **Step 2: Verify (on main, editing src/) it blocks**

```bash
git switch main 2>/dev/null
echo '{"tool_input":{"file_path":"'"$PWD"'/src/foo.ts"}}' | \
  CLAUDE_PROJECT_DIR="$PWD" bash .claude/hooks/guard-branch.sh
git switch feat/ai-pipeline-port
```
Expected (while on main): JSON with `BRANCH GATE`.

- [ ] **Step 3: Commit**

```bash
git add .claude/hooks/guard-branch.sh
git commit -m "feat(pipeline): port guard-branch retargeted to main + stack-profile paths"
```

---

## Task 6: Xayma-specific credit-write guard (rule 6)

**Files:**
- Create: `.claude/hooks/guard-credit-write.sh`

- [ ] **Step 1: Write the hook**

Create `.claude/hooks/guard-credit-write.sh` with exactly:

```bash
#!/usr/bin/env bash
# guard-credit-write.sh — warn on direct credit mutations bypassing Kafka/workflow-engine.
# Xayma architecture rule 6: never update partners.remainingCredits from frontend/services;
# all credit events flow Vue → n8n webhook → Kafka → consumer → Supabase.
# PostToolUse(Edit|Write). Warning only — review is the backstop. Test files excluded.

set -uo pipefail
PROFILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/stack-profile.sh"
[ -f "$PROFILE" ] && . "$PROFILE"

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')
if printf '%s' "$file_path" | grep -Eq "${STACK_TEST_FILE_REGEX:-\.(test|spec)\.(ts|tsx|js)$}"; then exit 0; fi

content=$(printf '%s' "$input" | jq -r '.tool_input.new_string // .tool_input.content // ""')
if printf '%s' "$content" | grep -Eq "${STACK_CREDIT_WRITE_PATTERN:-remainingCredits[[:space:]]*[:=]}"; then
  printf '⚠️  CREDIT RULE (architecture rule 6): direct credit mutation detected in "%s". Never update partners.remainingCredits from Vue/services — fire a workflow-engine webhook so the change flows through Kafka.\n' "$file_path"
fi
exit 0
```

- [ ] **Step 2: Verify it warns**

```bash
echo '{"tool_input":{"file_path":"'"$PWD"'/src/services/x.ts","content":"partner.remainingCredits = 5"}}' | \
  CLAUDE_PROJECT_DIR="$PWD" bash .claude/hooks/guard-credit-write.sh
```
Expected: a line containing `CREDIT RULE`.

- [ ] **Step 3: Commit**

```bash
git add .claude/hooks/guard-credit-write.sh
git commit -m "feat(pipeline): add Xayma credit-write guard for architecture rule 6"
```

---

## Task 7: Rewrite `.claude/settings.json` (hook wiring)

**Files:**
- Modify: `.claude/settings.json`

> Preserve Xayma's two unique hooks (`guard-n8n-direct-calls.sh`, `check-i18n-parity.sh`) and the `lint-and-typecheck.sh` / `verify-task-reminder.sh` PostToolUse/Stop hooks. Add the template's wiring + the new credit guard. Keep `enabledMcpjsonServers`, `testing`, `build` blocks from the current file.

- [ ] **Step 1: Write the merged settings**

Replace `.claude/settings.json` with exactly:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "deny": [
      "Bash(git push origin main)",
      "Bash(git push origin HEAD:main)",
      "Bash(git push --force origin main)",
      "Bash(git push -f origin main)"
    ]
  },
  "agents": { "enabled": true },
  "enabledMcpjsonServers": ["stitch"],
  "testing": { "unit": "vitest", "e2e": "playwright", "coverage": "v8" },
  "build": { "tool": "vite", "framework": "vue3", "language": "typescript" },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-git-flow.sh\"", "timeout": 10 },
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-destructive-db.sh\"", "timeout": 5 },
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-commit-message.sh\"", "timeout": 5 }
        ]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-branch.sh\"", "timeout": 5 },
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-roadmap-gate.sh\"", "timeout": 5 },
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-generated-files.sh\"", "timeout": 5 },
          { "type": "command", "command": ".claude/hooks/guard-n8n-direct-calls.sh", "timeout": 5 }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-test-files.sh\"", "timeout": 5 },
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-soft-delete.sh\"", "timeout": 5 },
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-audit-log.sh\"", "timeout": 5 },
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-expose-hash.sh\"", "timeout": 5 },
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-secret-scan.sh\"", "timeout": 5 },
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-credit-write.sh\"", "timeout": 5 },
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/remind-docs-generate.sh\"", "timeout": 5 },
          { "type": "command", "command": ".claude/hooks/lint-and-typecheck.sh", "timeout": 60 }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/check-i18n-parity.sh", "timeout": 15 }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": ".claude/hooks/verify-task-reminder.sh", "timeout": 5 }
        ]
      }
    ],
    "PreCompact": [
      {
        "hooks": [
          { "type": "command", "command": "echo '{\"additionalContext\": \"Preserve: architecture decisions, failing tests, blocked tasks, schema changes made this session\"}'" }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

Run: `jq . .claude/settings.json > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "feat(pipeline): wire ported hooks into settings, keep Xayma-unique hooks"
```

---

## Task 8: Port the 15 agent envelopes verbatim

**Files:**
- Create: `.claude/agents/{coder,test-writer,schema-agent,debugger,refactor,docs,diagram,commit,pr-reviewer,ux-review,perf-review,perf-measure,qa-tester,security-audit,dep-audit}.md`

> These supersede the existing `vue-specialist.md`, `css-design.md`, `test-writer.md`, `pr-reviewer.md`, `lead.md` (old ones removed in Task 14). All template agent files are stack-agnostic.

- [ ] **Step 1: Copy all 15 agents**

```bash
cp /tmp/aac-template/.claude/agents/*.md .claude/agents/
ls .claude/agents/
```

- [ ] **Step 2: Verify count and frontmatter**

Run: `ls .claude/agents/*.md | wc -l && grep -l 'model: opus' .claude/agents/*.md | wc -l`
Expected: at least `15` files; `5` opus agents (coder, debugger, schema-agent, security-audit, pr-reviewer).

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/
git commit -m "feat(pipeline): port 15 least-privilege agent envelopes"
```

---

## Task 9: Port the 18 stack-agnostic skills verbatim

**Files:**
- Create: `.claude/skills/{planner,discovery,sprint-start,start-task,roadmap-status,schema-agent,coder,test-writer,qa-tester,security-audit,dep-audit,docs,diagram,refactor,debugger,commit,pr-reviewer}/SKILL.md` (17) + `webapp-testing` handled with edits in Task 11.

- [ ] **Step 1: Copy the verbatim skills**

```bash
for s in planner discovery sprint-start start-task roadmap-status schema-agent coder \
         test-writer qa-tester security-audit dep-audit docs diagram refactor debugger \
         commit pr-reviewer; do
  mkdir -p ".claude/skills/$s"
  cp "/tmp/aac-template/.claude/skills/$s/SKILL.md" ".claude/skills/$s/SKILL.md"
done
```

- [ ] **Step 2: Verify no Prisma/Next leaked into the "verbatim" set**

Run: `grep -liE 'prisma|next\.js|app router|shadcn' .claude/skills/{coder,test-writer,schema-agent}/SKILL.md || echo "clean"`
Expected: `clean` (these three were measured at 0 stack hits; they defer to `context.md`).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/
git commit -m "feat(pipeline): port 17 stack-agnostic pipeline skills"
```

---

## Task 10: Port + retarget `ship-task` skill

**Files:**
- Create: `.claude/skills/ship-task/SKILL.md`

- [ ] **Step 1: Copy from template**

```bash
mkdir -p .claude/skills/ship-task
cp /tmp/aac-template/.claude/skills/ship-task/SKILL.md .claude/skills/ship-task/SKILL.md
```

- [ ] **Step 2: Rename the schema-impact flag `touchesPrisma`→`touchesSchema` (cosmetic, stack-neutral)**

```bash
sed -i 's/touchesPrisma/touchesSchema/g' .claude/skills/ship-task/SKILL.md
```

- [ ] **Step 3: Retarget the two prose descriptions of the flag**

In `.claude/skills/ship-task/SKILL.md`, update the two human-readable descriptions that still say "Prisma"/"ORM queries":
- In `TASK_INFO_SCHEMA` extraction prompt, change the `touchesSchema` line to: `true if the task description mentions schema, database, Supabase, RLS, or migrations`.
- In `CODER_RESULT_SCHEMA` prompt, change "whether you touched database queries" to "whether you touched Supabase queries or migrations".

(No logic changes — the orchestrator, parallel reviews, blocker gate, and PR-to-main behavior are stack-agnostic and stay as-is. PRs already target the integration branch = `main` per our trunk-based decision; confirm the Ship step text says "main".)

- [ ] **Step 4: Verify the script still parses as the workflow expects**

Run: `grep -c 'touchesPrisma' .claude/skills/ship-task/SKILL.md`
Expected: `0`

Run: `grep -cE 'agentType:' .claude/skills/ship-task/SKILL.md`
Expected: `>= 9` (schema-agent, test-writer×2, coder, debugger, docs, commit, the reviewers, pr-reviewer).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/ship-task/SKILL.md
git commit -m "feat(pipeline): port ship-task orchestrator, retarget schema flag"
```

---

## Task 11: Port + lightly retarget the 5 UI/stack-touching skills

**Files:**
- Create: `.claude/skills/{ux-review,perf-review,design-import,webapp-testing}/SKILL.md`

> Measured stack hits: ux-review 3, perf-review 1, design-import 1, webapp-testing 1. Copy, then replace the few React/Next/Prisma references with the Xayma equivalents.

- [ ] **Step 1: Copy the four skills**

```bash
for s in ux-review perf-review design-import webapp-testing; do
  mkdir -p ".claude/skills/$s"
  cp "/tmp/aac-template/.claude/skills/$s/SKILL.md" ".claude/skills/$s/SKILL.md"
done
```

- [ ] **Step 2: Inspect and replace the specific references**

For each file, run `grep -niE 'prisma|next\.js|next/|app router|react|tsx|shadcn|server component' <file>` and replace each hit per this mapping:
- `React` / `.tsx` / `JSX` → `Vue 3 SFC` / `.vue` / `<template>`
- `Next.js` / `App Router` / `Server Component` / `src/app/...` → `Vue Router page in src/pages/...`, `src/components/...`
- `shadcn/ui` → `PrimeVue 4`
- `Prisma` / `ORM query` → `Supabase query (xayma_app. prefix)`
- Any "design tokens" reference → `src/design-system/tokens.json`

Keep everything else (the 7-dimension structure, the perf anti-pattern list, the Stitch MCP flow in design-import) intact.

- [ ] **Step 3: Verify the replacements landed**

Run: `grep -liE 'prisma|shadcn|app router|server component' .claude/skills/{ux-review,perf-review,design-import,webapp-testing}/SKILL.md || echo "clean"`
Expected: `clean`

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/ux-review .claude/skills/perf-review .claude/skills/design-import .claude/skills/webapp-testing
git commit -m "feat(pipeline): port UI/stack skills retargeted to Vue/PrimeVue/Supabase"
```

---

## Task 12: Author `.claude/context.md` (the Tier-1 operational file)

**Files:**
- Create: `.claude/context.md`

> This is the highest-value authored file — every pipeline agent reads it each run. Source content from the existing `CLAUDE.md` and `.claude/rules/*.md`. Use the template's section structure (`/tmp/aac-template/.claude/context.md`) but fill with Xayma facts.

- [ ] **Step 1: Write the file**

Create `.claude/context.md` with exactly:

```markdown
# Project Context

> Tier-1 operational doc — every pipeline agent reads it each run. Keep it lean.
> Deep architecture → docs/ARCHITECTURE.md. Product vision → docs/PRODUCT.md. Design feel → DESIGN.md.

## Project

**Name:** Xayma.sh
**Description:** Credit-based SaaS for web-app deployment for West African SMEs; FCFA payments via Wave / Orange Money.
**Compliance / standards:** none formal; PII = phone numbers + payment identifiers.
**Multi-tenant:** yes — isolation key is `company_id`, derived from `auth.uid()` via RLS, never from request body.

## Tech stack

- Vue 3 (`<script setup lang="ts">`) · Vite · TypeScript (strict, zero `any`)
- PrimeVue 4 (all interactive components) · Tailwind (layout/spacing/typography/dark mode)
- Pinia (stores) · VeeValidate + Zod (forms) · vue-i18n v11 · vue-echarts
- Supabase (DB + Auth + Realtime) · n8n webhooks · Kafka (credit events) · Sentry · Datadog

## Key commands

```bash
npm run dev
npm run build
npm run type-check
npm run lint
npm run test:run
npm run test:coverage
npm run test:e2e
npm run supabase:types     # regenerates src/types/database.ts (generated — never hand-edit)
npm run supabase:push
```

## Absolute rules (NEVER VIOLATE)

1. No custom REST backend. DB reads via Supabase JS SDK; writes via `src/services/workflow-engine.ts` only.
2. Never call n8n URLs directly — always through `src/services/workflow-engine.ts`.
3. n8n handles all async ops. Vue fires-and-forgets; status via Supabase Realtime.
4. RLS is the auth layer. Missing data → check RLS first; never add frontend role filters for security.
5. Supabase service-role key lives in n8n only — never in frontend or Vite output.
6. Kafka for all credit events. Never update `partners.remainingCredits` from Vue directly.
7. Schema prefix always: `supabase.from("xayma_app.<table>")` — never a bare table name.
8. Role checks via `useAuth()` composable — never string-compare roles in templates.
9. All UI strings are i18n keys — add to both `src/i18n/en.ts` AND `src/i18n/fr.ts`.
10. Mockups in `docs/mockups/` are UI source of truth — check before any screen work.
11. Every new table needs an audit trigger → `general_audit`.
12. Always clean up Realtime: `onUnmounted(() => supabase.removeChannel(channel))`.

## Roles and access

| Role | Description | Access |
|------|-------------|--------|
| Admin | Platform operator | full |
| Customer | SME deploying apps | scoped to own `company_id` |
| Reseller | Resells credits | scoped + downstream partners |
| Sales | Internal sales | scoped read + assisted actions |

## Data isolation

- Every query is scoped by RLS using `auth.uid()` → `users.company_id`. Never add manual `where company_id = x`.
- Supabase Realtime requires RLS enabled on the table.

## UI conventions

- **Language:** French + English (i18n, both files always in parity).
- **Component library:** PrimeVue 4 — never plain `<button>`; use PrimeVue `Button`.
- **Layout/spacing:** Tailwind only; use `ms-*`/`me-*` (RTL-safe), never `ml-*`/`mr-*`.
- **Design tokens:** `src/design-system/tokens.json` — never hardcode hex/px. Theme PrimeVue only via `src/assets/styles/primevue-theme.css` CSS vars; no inline overrides, no `!important`.
- **Charts:** vue-echarts wrappers in `src/components/charts/`.
- **Errors/toasts:** `notificationStore.addError(t(...))` — never `console.log` for user-visible errors.

## File structure conventions

```
src/pages/        # route pages (PascalCase, one component per file)
src/components/    # shared UI components
src/stores/        # Pinia stores
src/composables/   # use*.ts shared logic
src/services/      # Supabase queries + workflow-engine.ts (only n8n entry point)
src/i18n/          # en.ts + fr.ts (keep in parity)
src/types/         # database.ts is auto-generated
supabase/migrations/  # SQL migrations (new table ⇒ general_audit trigger)
tests/e2e/         # Playwright specs
```

## Gotchas

- Phone (West Africa): `^(70|75|76|77|78)[0-9]{7}$`.
- Payment IPN arrives before UI redirect — credit update must be idempotent (check status first).
- Domain validation uses DB function `valid_domain_array()` — do not replicate in JS.
- Kafka infrastructure is an external dependency (separate project); the app only fires webhooks.

## Audit command (dep-audit)

```bash
npm audit --omit=dev
```
```

- [ ] **Step 2: Verify**

Run: `grep -c 'NEVER VIOLATE' .claude/context.md && grep -c 'xayma_app' .claude/context.md`
Expected: `1` and `>= 2`.

- [ ] **Step 3: Commit**

```bash
git add .claude/context.md
git commit -m "feat(pipeline): author .claude/context.md with Xayma operational facts"
```

---

## Task 13: Author `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `DESIGN.md`, `ci.yml`

**Files:**
- Create: `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `DESIGN.md`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: ROADMAP.md — copy template, retarget stack references**

```bash
cp /tmp/aac-template/docs/ROADMAP.md docs/ROADMAP.md
```
Then edit `docs/ROADMAP.md`:
- DoD line "E2E tests written and passing" — keep (`npm run test:e2e`).
- In the **Task Template**, change `**Components:** \`src/app/...\` · \`src/lib/...\`` → `**Components:** \`src/pages/...\` · \`src/components/...\` · \`src/stores/...\``.
- Change `**API:** \`POST /api/...\`` → `**Services:** \`src/services/...\` · workflow-engine webhook(s)`.
- Change unit-test path `src/lib/[module]/[file].test.ts` → `src/<area>/[file].test.ts`.
- Schema-impact note: `Migration — [supabase/migrations/...]`.
- Add one seed task block (ID `XAY-0` titled "Pipeline smoke task") with 3 acceptance criteria, `Schema impact: None`, `Risk: Low`, used only to dry-run `/ship-task` in Task 15. Mark it `[ ]`.

- [ ] **Step 2: ARCHITECTURE.md — copy template, fill [CONFIGURE] from existing docs**

```bash
cp /tmp/aac-template/docs/ARCHITECTURE.md docs/ARCHITECTURE.md
```
Fill the three `[CONFIGURE]` sections from `CLAUDE.md` + `docs/kafka.md` + `docs/workflow-engine/`:
- **System overview:** Vue SPA (`app.xayma.sh`) + Nuxt marketing (`xayma.sh`); Supabase DB/Auth/Realtime; n8n webhooks; Kafka credit-event bus. Note the write path: Vue → workflow-engine.ts → n8n → Kafka → consumer → Supabase.
- **Components:** services layer, Pinia stores, composables, RLS policies.
- **Key technical decisions:** RLS-as-auth; no custom REST; fire-and-forget n8n; Kafka for credit idempotency. One line each: decision · why · trade-off.
- **Data isolation:** `company_id` via `auth.uid()`; rationale + IPN idempotency edge case.

- [ ] **Step 3: DESIGN.md — copy template, fill from design-system.md**

```bash
cp /tmp/aac-template/DESIGN.md DESIGN.md
```
Fill principles/brand/visual-language from `docs/design-system.md` (qualitative only — exact tokens stay in `context.md`). Set accessibility stance to WCAG 2.1 AA.

- [ ] **Step 4: ci.yml — adapt to Supabase/Vue**

Edit `.github/workflows/ci.yml`:
- `on.pull_request.branches` → `[main]`; remove `develop` from triggers and the `push` block (or set `push.branches: [main]`).
- Replace the "Generate ORM types" step (which runs `npx prisma generate` with `DATABASE_URL`) with a type-check step:
```yaml
      - name: Type-check
        run: npm run type-check
```
- Keep Lint (`npm run lint`) and `Tests + coverage` (`npm run test:coverage`).
- Build step: `run: npm run build`; remove the `DATABASE_URL` env (Vite build uses `VITE_*` only; add any required `VITE_*` as repo secrets later — leave a comment).

- [ ] **Step 5: Verify**

Run: `test -f docs/ROADMAP.md && test -f docs/ARCHITECTURE.md && test -f DESIGN.md && grep -q 'XAY-0' docs/ROADMAP.md && echo OK`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add docs/ROADMAP.md docs/ARCHITECTURE.md DESIGN.md .github/workflows/ci.yml
git commit -m "feat(pipeline): add ROADMAP/ARCHITECTURE/DESIGN docs + Supabase CI"
```

---

## Task 14: Restructure `CLAUDE.md` to the two-tier model

**Files:**
- Modify: `CLAUDE.md`
- Reference: existing `.claude/rules/*.md` (kept as supporting detail, linked from CLAUDE.md)

> Adopt the template's `CLAUDE.md` shape but with Xayma content. Preserve all 12 architecture rules verbatim (they now live canonically in `context.md`; CLAUDE.md links to them). Do NOT delete `.claude/rules/*` — they remain deeper reference; CLAUDE.md and context.md link to them.

- [ ] **Step 1: Rewrite CLAUDE.md sections**

Restructure `CLAUDE.md` to these sections (use `/tmp/aac-template/CLAUDE.md` as the skeleton):
1. **Project** — Xayma one-paragraph (from current CLAUDE.md header).
2. **Tech stack** — point to `.claude/context.md`.
3. **Commands** — the `npm run` block (already present).
4. **Project knowledge — two tiers** — the table mapping `CLAUDE.md` / `.claude/context.md` / `docs/ROADMAP.md` (Tier 1) and `docs/PRODUCT.md` / `DESIGN.md` / `docs/ARCHITECTURE.md` (Tier 2). Keep the "a fact lives in exactly one tier" rule.
5. **Active roadmap + Gate before coding** — copy the template's gate (task must exist in `docs/ROADMAP.md` + DoR), trunk-based wording.
6. **When assigned a task** — the autonomous `/ship-task <ID>` recommendation + the manual step table (retarget skill names; drop Prisma rows). Keep `/discovery → /planner` flow.
7. **Absolute rules** — the 12 rules (canonical copy lives in `context.md`; link there, list titles here).
8. **Engineering principles** — copy the template's 4 (think/simplicity/surgical/goal-driven).
9. **Contribution workflow** — trunk-based: branch from `main`, allowed prefixes, Conventional Commits.
10. **Local skills** — the skill table (pipeline + reference), retargeted: replace `prisma` helper row with `supabase:types`; keep Xayma helpers row referencing kept commands.
11. **Agents (runtime enforcement)** — copy the template's least-privilege explanation.
12. **Automatic hooks** — the PreToolUse/PostToolUse tables including the kept Xayma hooks (`guard-n8n-direct-calls`, `check-i18n-parity`, `lint-and-typecheck`, `verify-task-reminder`) and the new `guard-credit-write`.

Keep the existing `## Vibe Annotations` section at the end.

- [ ] **Step 2: Verify the two-tier table and gate exist**

Run: `grep -c 'Definition of Ready\|two tiers\|ship-task' CLAUDE.md`
Expected: `>= 3`.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "refactor(pipeline): restructure CLAUDE.md to two-tier model, wire pipeline"
```

---

## Task 15: Remove superseded files & validate end-to-end

**Files:**
- Delete: `.claude/agents/{vue-specialist,css-design,lead}.md`, `.claude/commands/{new-feature,verify-task,status,db-migration}.md`
- Keep: `.claude/commands/{new-page,visual-check,test-sprint}.md`, `.claude/agents/test-writer.md` & `pr-reviewer.md` (already overwritten by Task 8)

> Removal happens only after replacements verify. `vue-specialist`→`coder`, `css-design`→`ux-review`/`design-import`, `lead`→`planner`/`sprint-start`/`roadmap-status`, `new-feature`→`ship-task`/`planner`, `verify-task`→GREEN+reviews, `status`→`roadmap-status`, `db-migration`→`schema-agent`.

- [ ] **Step 1: Create `workflow-engine-specialist` agent (Xayma-unique, closes dangling ref)**

Create `.claude/agents/workflow-engine-specialist.md`:

```markdown
---
name: workflow-engine-specialist
description: Implements n8n / Kafka / workflow-engine.ts integration for a task — the async write path. Xayma-specific builder (no template equivalent). Use for credit events, webhooks, and fire-and-forget flows.
tools: Read, Edit, Write, Bash, Glob, Grep
model: opus
---

You are the **workflow-engine-specialist** agent.

Before doing anything, read `.claude/context.md` — especially absolute rules 1–6. All n8n calls go through `src/services/workflow-engine.ts` (fire-and-forget POST, no awaited response); status is tracked via Supabase Realtime. All credit mutations flow Vue → workflow-engine webhook → Kafka → consumer → Supabase; never write `partners.remainingCredits` directly. Settings (n8n URLs, webhook paths, thresholds) come from `xayma_app.settings` via `src/services/settings.ts` — never hardcode.

Your tools let you edit source and run commands. Do not write tests (`test-writer`), run migrations (`schema-agent`), or open PRs (`pr-reviewer`). Return the structured result requested.
```

- [ ] **Step 2: Delete superseded files**

```bash
git rm .claude/agents/vue-specialist.md .claude/agents/css-design.md .claude/agents/lead.md \
       .claude/commands/new-feature.md .claude/commands/verify-task.md \
       .claude/commands/status.md .claude/commands/db-migration.md
```

- [ ] **Step 3: Validate the full hook suite is wired & valid**

```bash
jq -e '.hooks.PreToolUse and .hooks.PostToolUse' .claude/settings.json >/dev/null && echo "settings OK"
for h in .claude/hooks/*.sh; do bash -n "$h" && echo "syntax OK: $h"; done
```
Expected: `settings OK` and `syntax OK` for every hook.

- [ ] **Step 4: Dry-run `/ship-task` reasoning against the seed task**

Confirm `docs/ROADMAP.md` contains `XAY-0` with DoR satisfied (3 acceptance criteria, schema impact `None`, not `[x]`). Manually trace the `ship-task` SKILL's Validate phase logic against that block: it should report `dorMet: true`. (Do not execute the full pipeline here — that's a real feature task; this only verifies the orchestrator can parse a well-formed task.)

Run: `grep -A12 'XAY-0' docs/ROADMAP.md`
Expected: a task block with ≥3 `- [ ]` acceptance criteria and `Schema impact: None`.

- [ ] **Step 5: Verify no dangling references remain**

Run: `grep -rE 'vue-specialist|css-design|new-feature|/verify-task|workflow-engine-specialist' .claude/settings.json CLAUDE.md || echo "no stale config refs"`
Expected: `workflow-engine-specialist` may appear (intended) in CLAUDE.md; no `vue-specialist`/`css-design`/`new-feature` in settings.json.

- [ ] **Step 6: Commit**

```bash
git add .claude/agents/workflow-engine-specialist.md
git commit -m "feat(pipeline): add workflow-engine-specialist, remove superseded agents/commands"
```

---

## Task 16: Final review & PR

- [ ] **Step 1: Full lint/type sanity on the repo (no app code changed, should be clean)**

Run: `npm run lint && npm run type-check`
Expected: pass (this port touches only `.claude/`, `docs/`, `CLAUDE.md`, `ci.yml`, `.gitignore` — no `src/`).

- [ ] **Step 2: Confirm file counts**

Run: `ls .claude/skills | wc -l && ls .claude/agents/*.md | wc -l && ls .claude/hooks/*.sh | wc -l`
Expected: `23` skills; `16` agents (15 ported + workflow-engine-specialist); `19` hook scripts (13 ported + `stack-profile.sh` + `guard-credit-write.sh` + 4 kept Xayma-unique: guard-n8n-direct-calls, check-i18n-parity, lint-and-typecheck, verify-task-reminder).

- [ ] **Step 3: Open the PR**

```bash
git push -u origin feat/ai-pipeline-port
gh pr create --base main --title "feat: port ai-augmented-coding pipeline (Supabase/Vue retarget)" \
  --body "Ports supermalang/ai-augmented-coding into Xayma, retargeted to Vue/Supabase/n8n. See docs/superpowers/specs/2026-06-22-ai-augmented-coding-pipeline-design.md and docs/superpowers/plans/2026-06-22-ai-augmented-coding-pipeline.md."
```

---

## Self-review notes (coverage vs. spec)

- Spec §3 architecture (skills+agents+envelopes, autonomous ship-task, two-tier) → Tasks 8–14.
- Spec §4.1 ported files → Tasks 3,4,5,8,9,10,11,13.
- Spec §4.2 kept Xayma-unique → Task 7 (hooks kept in wiring), Task 15 (commands kept, workflow-engine-specialist created).
- Spec §4.3 superseded → Task 15.
- Spec §5 stack-profile + credit guard → Tasks 2, 6.
- Spec §6 trunk-based main → Tasks 4, 5, 13 (ci), 14 (workflow), 16 (PR base main).
- Spec §8 staging order preserved.
```
