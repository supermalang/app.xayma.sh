# Design — Port `ai-augmented-coding` into Xayma (stack-retargeted)

**Date:** 2026-06-22
**Status:** Approved (design), pending implementation plan
**Source template:** https://github.com/supermalang/ai-augmented-coding

## 1. Goal

Adopt the `ai-augmented-coding` multi-agent pipeline as the development harness for the
Xayma management app, **retargeted** from the template's default stack (React/Next.js · Prisma ·
TypeScript) to Xayma's stack (Vue 3 · Vite · PrimeVue · Pinia · Supabase · n8n · Kafka · vue-i18n).

## 2. Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Scope | **Template as baseline**, retarget for stack, keep Xayma-unique pieces |
| Conflict rule | The template prevails over current files, **except clear/strong stack differences** (Prisma↔Supabase, React↔Vue, n8n/Kafka, i18n) |
| `/ship-task` autonomy | **Fully autonomous** — runs end-to-end, stops only on DoR failure, test failure, or a review blocker, then opens a PR for human review + merge. No extra commit/PR checkpoints. |
| Knowledge model | **Full two-tier** — new `.claude/context.md` (every-run) + `CLAUDE.md` (instructions) + `docs/ROADMAP.md` (work) as Tier 1; `PRODUCT.md` / `DESIGN.md` / `docs/ARCHITECTURE.md` as Tier 2 |
| Branch model | **Keep trunk-based `main`** — branch guards retarget to the `main` flow; do NOT adopt the template's `develop` git-flow |

## 3. Architecture adopted from the template

- **Skills define behavior; agents define the envelope.**
  - `.claude/skills/<name>/SKILL.md` — the behavior, single source of truth.
  - `.claude/agents/<name>.md` — thin frontmatter only: `tools:` (least-privilege) + `model:`
    (right-sized), body points at the SKILL.
- **`/ship-task` is a Workflow script** that dispatches each step via `agentType`, runs the six
  reviews in parallel, waits at a blocker gate, and opens a PR. Human touchpoints: DoR failure,
  test failure after 2 debugger retries, review blockers, and final PR (UAT + merge).
- **Two-tier knowledge** as in §2.
- **Least privilege as a hard boundary:** report-only reviewers (`ux-review`, `perf-review`,
  `security-audit`, `dep-audit`, `perf-measure`, `qa-tester`) have no Edit/Write; `commit` only
  stages/commits; `pr-reviewer` is the only agent that may `git push` / open PRs.

## 4. File manifest (≈55 files)

### 4.1 Ported & retargeted (template → Xayma)

**Skills** (`.claude/skills/<name>/SKILL.md`): discovery, planner, sprint-start, start-task,
ship-task, schema-agent, coder, test-writer, ux-review, perf-review, perf-measure, qa-tester,
security-audit, dep-audit, docs, diagram, refactor, debugger, commit, pr-reviewer, design-import,
webapp-testing, roadmap-status.

**Agents** (`.claude/agents/<name>.md`): thin tool/model envelopes for each pipeline role.

**Hooks** (`.claude/hooks/*.sh`): guard-git-flow, guard-branch, guard-destructive-db,
guard-commit-message, guard-roadmap-gate, guard-generated-files, guard-test-files, guard-soft-delete,
guard-audit-log, guard-expose-hash, guard-secret-scan, remind-docs-generate, remind-docker-rebuild,
plus **`stack-profile.sh`** (the single retarget file).

**Config / docs:** `.claude/settings.json` (rewritten to the template's hook wiring),
`.claude/context.md`, `CLAUDE.md` (restructured to template shape, Xayma content),
`docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `DESIGN.md`, `.github/workflows/ci.yml`,
`.gitignore` (+`.current-task`).

### 4.2 Kept (Xayma-unique, no template equivalent)

- Hooks: `guard-n8n-direct-calls.sh`, `check-i18n-parity.sh` — wired alongside the ported set.
- Commands kept as Xayma-specific helpers: `new-page`, `visual-check`, `test-sprint` (E2E sprint gate).
- Agent: `workflow-engine-specialist` — Xayma's n8n/Kafka builder is a **clear stack difference**
  (the template has no async-workflow concept). Created here, closing the dangling `settings.json`
  reference.

### 4.3 Superseded (template prevails — old Xayma file folded into the port)

| Xayma now | Becomes | Retarget notes |
|---|---|---|
| `agents/vue-specialist` | `coder` | Vue 3 `<script setup>`, Pinia, Supabase SDK, n8n via `workflow-engine.ts` |
| `agents/css-design` | `ux-review` + `design-import` | PrimeVue, Tailwind, `src/design-system/tokens.json`, `docs/mockups/` |
| `agents/test-writer` | `test-writer` | Already Vitest + Playwright; add Supabase/n8n mocks, i18n parity |
| `agents/pr-reviewer` | `pr-reviewer` | Xayma DoD + 12 architecture rules |
| `agents/lead` | `planner` + `sprint-start` + `roadmap-status` | planning/sprint/unblocking roles |
| `commands/db-migration` | `schema-agent` | Supabase migrations + mandatory `general_audit` trigger |
| `commands/status` | `roadmap-status` | |
| `commands/new-feature` | `ship-task` / `planner` | autonomous pipeline replaces the manual checklist |
| `commands/verify-task` | folded into `test-writer (GREEN)` + review gate | |

## 5. Stack retarget — `stack-profile.sh`

```bash
STACK_TEST_FILE_REGEX='\.(test|spec)\.(ts|tsx|js)$'
STACK_GATED_PATHS_REGEX='^(src/|tests/|supabase/migrations/)'
STACK_GENERATED_FILES_GLOB='src/types/database.ts'                       # generated by supabase:types
STACK_SOFT_DELETE_PATTERN='\.from\([^)]*\)\.delete\('                    # direct Supabase hard-delete
STACK_DESTRUCTIVE_DB_PATTERN='supabase db reset|supabase migration repair'
STACK_AUDIT_LOG_SQL_PATTERN='(UPDATE|DELETE)[[:space:]]+.*general_audit' # architecture rule 11
STACK_SENSITIVE_FIELDS='service_role|SUPABASE_SERVICE_ROLE|VITE_PAYMENT_GATEWAY.*SECRET|passwordHash'
STACK_DOCS_SOURCE_REGEX='^(supabase/migrations/|src/services/)'
STACK_DOCS_GENERATE_CMD='npm run supabase:types'
STACK_MIGRATIONS_REGEX='^supabase/migrations/'
# STACK_DOCKER_REBUILD_CMD — N/A for the Vite SPA; remind-docker-rebuild left effectively inert.
```

**Xayma-specific guard (new):** surface architecture rule 6 — flag direct writes to
`partners.remainingCredits` from frontend/service code (credits must flow through Kafka /
`workflow-engine.ts`). Implemented either as an addition to `guard-destructive-db.sh` patterns or a
small dedicated guard.

**Why the fit is good:** the template's guard model maps almost 1:1 onto Xayma's existing
"NEVER VIOLATE" rules — destructive-DB and migration safety ↔ rule 7 (`xayma_app.` prefix) and
Supabase migrations; audit-log guard ↔ rule 11 (`general_audit` trigger); secret/sensitive-field
guards ↔ rule 5 (service-role key only in n8n). The retarget is mostly pattern substitution, not
redesign.

## 6. Branch-guard retarget (trunk-based `main`)

- `guard-git-flow.sh` / `guard-branch.sh`: block commits/edits-of-implementation directly on `main`;
  require a `feature/…` (etc.) branch. Drop all `develop` references.
- `.claude/settings.json` `permissions.deny`: keep the template's `git push origin main` denies.
- `/ship-task` setup step and `pr-reviewer` open PRs **against `main`** (no integration branch).

## 7. Risks & mitigations

1. **Churn to working docs** — `CLAUDE.md` + `.claude/rules/*` restructured into the two-tier model.
   Mitigation: preserve all 12 architecture rules verbatim as content; restructure layout, do not
   reword semantics; move rather than rewrite where possible.
2. **`.current-task` gating** — once `guard-roadmap-gate.sh` is live, editing `src/` requires an
   active task or `/start-task`. Accepted friction; matches template intent. `.current-task` added to
   `.gitignore`.
3. **Autonomous pipeline on a payments SaaS** — accepted; the blocker gate + report-only reviewers +
   human PR merge are the safety net. No auto-merge.
4. **Volume (~55 files)** — staged delivery (see §8) so each chunk is independently verifiable.

## 8. Delivery staging (for the implementation plan)

1. **Config + docs foundation:** `stack-profile.sh`, `.claude/context.md`, `docs/ROADMAP.md`,
   `docs/ARCHITECTURE.md`, `DESIGN.md`, restructured `CLAUDE.md`, `.gitignore`.
2. **Hooks:** port + retarget the 13 hooks; keep `guard-n8n-direct-calls` + `check-i18n-parity`;
   rewrite `.claude/settings.json` wiring; verify each hook fires on a crafted input.
3. **Skills:** port + retarget the 23 `SKILL.md` files (behavior, stack-bound references → Xayma).
4. **Agents:** port the 15 thin envelopes + create `workflow-engine-specialist`.
5. **Orchestrator validation:** dry-run `/ship-task` against a sample `docs/ROADMAP.md` task;
   confirm phase ordering, parallel reviews, blocker gate, PR-to-`main`.
6. **Cleanup:** remove superseded Xayma files (§4.3) only after their replacements verify.

## 9. Out of scope

- Adopting the template's `develop` git-flow.
- Marketing site (Nuxt/Strapi) — this pipeline targets the management app only.
- Kafka infrastructure changes — external dependency; pipeline only respects the credit-event rule.
</content>
</invoke>
