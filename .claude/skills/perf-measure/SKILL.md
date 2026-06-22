---
name: perf-measure
description: Measure performance, don't just review it — bundle-size budget, Lighthouse / Core Web Vitals on key routes, and database query EXPLAIN on hot paths. Complements /perf-review (static analysis) with real numbers checked against budgets. Stack-agnostic via .claude/context.md commands. Run after /coder on perf-sensitive work.
---

# /perf-measure — Measured Performance Agent

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions.

## Role

`/perf-review` reads code for anti-patterns; **this skill runs the app and measures**. You cannot claim "good performance" from a code read alone — it has to be observed against a budget. This skill captures real numbers (bundle size, Web Vitals, query plans) and compares them to the thresholds in `.claude/context.md`.

## Permissions

✅ CAN read    : all project files
✅ CAN write   : `.scratch/perf-measure/**` (reports, traces) — throwaway, gitignored
✅ CAN run     : build · bundle analyzer · Lighthouse / Web Vitals capture · `EXPLAIN`/`ANALYZE` on queries · load tools
❌ CANNOT      : modify source, tests, or schema (report findings; escalate fixes to `/coder` / `/refactor`)
❌ CANNOT      : write to `docs/ROADMAP.md`, push, or open PRs

## Prerequisites

- A build/dev command and a running-app path (see `.claude/context.md`). Can reuse `/webapp-testing` to drive the live app.
- Performance budgets defined in `.claude/context.md` (if absent, propose sensible defaults and flag them as unconfirmed).

## Performance budgets (defaults if `.claude/context.md` is silent)

| Metric | Default budget |
|---|---|
| Largest Contentful Paint (LCP) | < 2.5 s |
| Interaction to Next Paint (INP) | < 200 ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Initial JS bundle (gzipped) | < 200 KB |
| Hot-path DB query | no seq scan on large tables; uses an index |

---

## Step-by-step

### 1 — Bundle size

Run the project's build + bundle analyzer (see `.claude/context.md`). Record the initial/route bundle sizes (gzipped) and compare to budget. Flag any single dependency that dominates a bundle and any route that ships far more JS than its neighbours.

### 2 — Lighthouse / Core Web Vitals on key routes

For each performance-critical route (the ones in the task, plus the app's main entry), capture Web Vitals — drive the running app via `/webapp-testing` (Playwright can read `web-vitals` / performance entries) or run Lighthouse if the project provides it. Record LCP, INP, CLS, TBT. Compare to budget.

### 3 — Database query plans on hot paths

For queries the task added or touched on hot paths, run `EXPLAIN` / `EXPLAIN ANALYZE` (or the ORM's query-plan tooling). Check for: sequential scans on large tables, missing indexes, and N+1 patterns confirmed at runtime (not just suspected from code).

### 4 — Optional: load / stress

If the task is on a high-traffic path and the project has a load tool (k6, autocannon, locust — see `.claude/context.md`), run a short load test and record p50/p95/p99 latency and error rate under load.

### 5 — Report against budget

```
📊 Performance measurement — task <ID>
📦 Bundle (initial, gzip) : 184 KB  / budget 200 KB  ✅
🎨 LCP /route             : 3.1 s   / budget 2.5 s   🔴 over
⚡ INP                    : 140 ms  / budget 200 ms  ✅
🗃️  Query <name>          : seq scan on orders (1.2M rows) 🔴 — add index on (tenantId, createdAt)
🏋️  Load p95              : 320 ms @ 50 rps          ✅
➡️  Over-budget items → escalate to /coder or /refactor; re-measure after fix
```

Lead with budget **breaches**. For each breach, name the likely cause and the owning agent for the fix. A green report is a valid, valuable result — say so plainly.

### 6 — Handoff

```
✅ Measurement complete
🔴 Budget breaches : N (listed)  /  ✅ all within budget
➡️  Next step       : /coder or /refactor for breaches, then re-run /perf-measure · else /pr-reviewer
```

---

## What perf-measure does NOT do

- Does not fix code (`/coder`, `/refactor`).
- Does not replace `/perf-review` — static review catches issues before runtime; this confirms with numbers.
- Does not commit its reports — `.scratch/perf-measure/` is throwaway.
