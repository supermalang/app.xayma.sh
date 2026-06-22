# Xayma.sh

Credit-based SaaS for web app deployment for West African SMEs. FCFA payments via Wave/Orange Money. Roles: Admin, Customer, Reseller, Sales.

- **Management app:** Vue 3 + TS SPA → `app.xayma.sh`
- **Marketing site:** Nuxt 3 + Strapi → `xayma.sh`
- **Backend:** Supabase (DB + Auth + Realtime) + n8n webhooks + Kafka (KRaft)
- **Infra:** Hetzner CX32/CX52, Docker, Traefik

> This file instructs the agent (rules, workflow, which skill when). It is paired with
> [`.claude/context.md`](.claude/context.md), which every pipeline agent reads each run for the
> concrete operational facts (stack, commands, the 12 absolute rules, UI conventions). Fill/keep
> `context.md` first — it is the single source of truth for those facts; this file links to it.

---

## Project knowledge — two tiers

A fact lives in exactly **one** tier — never duplicate across files (it drifts).

**Tier 1 — operational (read every run):**

| File | Holds |
|---|---|
| `CLAUDE.md` (this file) | Instructions — rules of engagement, workflow, which skill when |
| [`.claude/context.md`](.claude/context.md) | Stack, commands, the 12 absolute rules, roles, UI conventions, gotchas |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | The work — tasks with Definition of Ready / Done, sprints |

**Tier 2 — knowledge (read when relevant; agents fall back to `context.md` if absent):**

| File | Holds | Read by |
|---|---|---|
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Product vision, users, non-goals | `/discovery`, `/planner` |
| [`DESIGN.md`](DESIGN.md) | Design language & feeling (not exact tokens) | `/design-import`, `/ux-review` |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System shape, decisions, data isolation, hot paths | `/coder`, `/schema-agent`, `/perf-review`, `/security-audit`; kept current by `/docs` |

---

## Stack

Vue 3 · Vite · TypeScript · PrimeVue 4 · Tailwind · Pinia · VeeValidate+Zod · vue-echarts · vue-i18n v11 · Supabase · n8n · Kafka · Sentry · Datadog. Full detail in [`.claude/context.md`](.claude/context.md).

**PrimeVue** = all interactive components. **Tailwind** = layout, spacing, typography, responsive, dark mode.

## Commands

```
npm run dev | build | type-check | lint | lint:fix
npm run test | test:run | test:coverage | test:e2e
npm run supabase:types   # regenerates src/types/database.ts (generated — never hand-edit)
npm run supabase:push
```

---

## Active roadmap

Planned work lives in [`docs/ROADMAP.md`](docs/ROADMAP.md).

### Gate before coding

**Before writing any implementation code, test, or migration, confirm the task exists in `docs/ROADMAP.md` and satisfies the Definition of Ready (DoR).**

1. **Task exists?** If listed → continue. If not → invoke `/planner` to create it (unplanned work always needs a roadmap entry first), then continue.
2. **DoR satisfied?** Check every DoR item at the top of `docs/ROADMAP.md`. If any is missing → stop and fill it before coding.
3. **Proceed** — read the acceptance criteria in full; if schema impact is `Migration`, run the migration first via `/schema-agent`.

The `guard-roadmap-gate.sh` hook enforces this: edits to `src/`, `tests/`, or `supabase/migrations/` are blocked unless `.current-task` is set to a task that exists in the roadmap. The gate does not apply to bug fixes on shipped features, tooling, or docs.

### When assigned a task

**Recommended — fully autonomous:** `/ship-task <ID>` chains all pipeline agents with skip logic and opens a PR. It pauses only on DoR failure, test failure (after 2 debugger retries), or a review blocker. Human reviews + merges the PR (run UAT on it). No auto-merge.

**Manual — step by step:**

| Step | Skill | Run when |
|---|---|---|
| −1 | `/discovery` | Requirements unclear — interviews you, writes a product brief, feeds `/planner` |
| 0 | `/planner` | Task not in roadmap yet |
| 1 | `/start-task <ID>` | Always — validates DoR, sets `.current-task`, creates feature branch |
| 2 | `/schema-agent` | Schema impact = `Migration` |
| 3 | `/test-writer` (RED) | Always — tests from criteria, confirm they fail |
| 4 | `/coder` | Always — implement until RED tests pass |
| 5 | `/test-writer` (GREEN) | Always — re-run tests, confirm pass |
| 6 | `/ux-review` | Task touches UI |
| 7 | `/perf-review` (+ `/perf-measure`) | Task touches Supabase queries or async fetching |
| 8 | `/qa-tester` | Always |
| 9 | `/security-audit` | Always |
| 9b | `/dep-audit` | Always before shipping — SCA scan (OWASP A06) |
| 10 | `/docs` | Task changes schema, services, setup, or user-facing behaviour |
| 11 | `/pr-reviewer` | Always — DoD check, roadmap update, opens PR |

`/design-import` (Stitch MCP) can run before `/planner`; `/diagram` adds Mermaid diagrams any time.

---

## Absolute rules — NEVER VIOLATE

Canonical full text in [`.claude/context.md`](.claude/context.md). Titles:

1. No custom REST backend — DB reads via Supabase SDK; writes via `src/services/workflow-engine.ts` only.
2. Never call n8n URLs directly — always via `workflow-engine.ts`.
3. n8n owns async ops; Vue fires-and-forgets; status via Realtime.
4. RLS is the auth layer — never add frontend role filters for security.
5. Supabase service-role key lives in n8n only.
6. Kafka for all credit events — never write `partners.remainingCredits` from Vue.
7. Schema prefix always: `supabase.from("xayma_app.<table>")`.
8. Role checks via `useAuth()` — never string-compare roles in templates.
9. All UI strings are i18n keys — both `en.ts` AND `fr.ts`.
10. Mockups in `docs/mockups/` are UI source of truth.
11. Every new table needs an audit trigger → `general_audit`.
12. Always clean up Realtime in `onUnmounted`.

## Engineering principles

Apply to every code-writing agent (`/coder`, `/refactor`, `/debugger`):

1. **Think before coding** — surface assumptions/ambiguities first; if underspecified, check the roadmap criteria, don't guess.
2. **Simplicity first** — minimal code that satisfies the acceptance criteria; no speculative abstractions.
3. **Surgical changes** — touch only what the task requires; structural cleanup is `/refactor`'s job behind green tests.
4. **Goal-driven** — "done" = the acceptance criteria and tests objectively pass; prove it, don't vibe it.

## Behavior

- State assumptions explicitly. If ambiguous, present options — don't pick silently.
- Minimum code. No unrequested features or abstractions. Match existing style.

---

## Contribution workflow

**Branches (trunk-based):** branch from `main`; `main` is the integration + production branch. Allowed prefixes: `feature/`, `fix/`, `chore/`, `hotfix/`, `refactor/`, `test/`, `docs/`, `ci/`. Never commit or push directly to `main` (the `guard-git-flow.sh` / `guard-branch.sh` hooks block it).

**Commits — Conventional Commits:** `type(scope): description`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`, `style`, `build`, `revert`.

---

## Local skills

**Pipeline skills** (`.claude/skills/`):

| Skill | Role |
|---|---|
| `discovery` | Requirements/PRD/HCD interview → product brief that feeds `/planner` |
| `planner` | Owns `docs/ROADMAP.md` — writes task definitions with DoR/DoD |
| `sprint-start` | Verify all planned tasks satisfy DoR before a sprint |
| `ship-task` | Autonomous orchestrator — chains all agents, ships to a PR |
| `start-task` | Validate DoR, set `.current-task`, create feature branch |
| `schema-agent` | Design + apply Supabase migrations (incl. `general_audit` trigger) |
| `coder` | Implement a task — Vue + Supabase + workflow-engine |
| `test-writer` | Vitest unit + Playwright E2E (RED/GREEN modes) |
| `ux-review` | PrimeVue/Tailwind/token + WCAG + convention review |
| `perf-review` / `perf-measure` | Static query/async audit; measured bundle/Web Vitals/EXPLAIN |
| `qa-tester` | UAT checklist + screenshot review vs `docs/mockups/` |
| `security-audit` | OWASP Top 10 + the 12 absolute rules |
| `dep-audit` | Dependency/SCA scan (OWASP A06) |
| `docs` / `diagram` | Update docs from the diff; Mermaid diagrams |
| `refactor` / `debugger` | Behaviour-preserving cleanup; root-cause fixes |
| `commit` / `pr-reviewer` | Conventional commit; DoD gate + opens PR |
| `design-import` / `webapp-testing` | Stitch-MCP design-to-code; live browser verification |

**Xayma-specific helper commands** (`.claude/commands/`): `/new-page` (scaffold a page), `/visual-check` (screenshot vs mockup), `/test-sprint` (full E2E sprint gate).

---

## Agents — runtime enforcement layer

Skills define *behaviour*; **agents** in `.claude/agents/` define the *envelope* — which tools each role may use and which model it runs on. `/ship-task` dispatches each step through these agents (least privilege as a hard boundary):

- **Report-only reviewers** (`ux-review`, `perf-review`, `security-audit`, `dep-audit`, `perf-measure`, `qa-tester`) — no Edit/Write; they report `blockers`/`warnings`, a builder applies fixes.
- **`commit`** — stages/commits only. **`pr-reviewer`** — the only agent that may `git push` / open PRs.
- **Builders** (`coder`, `debugger`, `schema-agent`, `test-writer`, `refactor`, `workflow-engine-specialist`) edit + run commands. **`workflow-engine-specialist`** is the Xayma-specific n8n/Kafka/`workflow-engine.ts` builder.
- **Models** right-sized: Opus for `coder`/`debugger`/`schema-agent`/`security-audit`/`pr-reviewer`; Sonnet for most reviewers; Haiku for `commit`/`diagram`.

When invoked manually (e.g. typing `/ux-review`) a role runs in the main loop with full tools and a human present — the report-only restriction applies to autonomous dispatch only.

## Automatic hooks

Configured in `.claude/settings.json`. All stack-specific patterns live in **`.claude/hooks/stack-profile.sh`** — retarget by editing that one file.

**PreToolUse (hard block):** `guard-git-flow` (commit/push to `main`), `guard-branch` (edit `src/` on `main`), `guard-roadmap-gate` (edit gated paths without `.current-task`), `guard-destructive-db` (Supabase reset), `guard-commit-message` (Conventional Commits), `guard-generated-files` (`src/types/database.ts`), `guard-n8n-direct-calls` (direct n8n `fetch()`).

**PostToolUse (warn):** `guard-test-files`, `guard-soft-delete`, `guard-audit-log` (`general_audit`), `guard-expose-hash`, `guard-secret-scan`, `guard-credit-write` (rule 6 — direct `remainingCredits` write), `remind-docs-generate`, `lint-and-typecheck`, `check-i18n-parity` (EN/FR parity). **Stop:** `verify-task-reminder`.

---

## Vibe Annotations

`./scripts/vibe-annotations.sh pending|watch|resolve <id>` — server at `127.0.0.1:3846`
