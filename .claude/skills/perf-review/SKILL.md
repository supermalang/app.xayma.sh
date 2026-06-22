---
name: perf-review
description: Performance audit of the active task's code changes. Checks N+1 queries, unbounded database queries, missing pagination, large payloads, and unparallelised async work. Run after /coder, alongside /security-audit.
---

# /perf-review — Performance Review Agent

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions.

> Static counterpart to `/perf-measure`. This skill **reads code** for anti-patterns (N+1, over-fetching, missing pagination). For real numbers — bundle size, Core Web Vitals, query `EXPLAIN` against a budget — run `/perf-measure`. Use both on perf-sensitive work: review first, then measure.

## Permissions

✅ CAN read    : all project files
✅ CAN write   : source files (performance fixes only — no new features, no logic changes)
✅ CAN run     : `git diff` · read-only commands
❌ CANNOT      : write to `docs/ROADMAP.md`, tests, or schema files
❌ CANNOT      : add business features under the guise of a "perf fix"
❌ CANNOT      : push to remote or open PRs

> **Autonomous (agent) mode is report-only.** When `/ship-task` dispatches the `perf-review` agent, it runs with **no Edit/Write tools** — it reports findings (`blockers`/`warnings`) and a builder (`/coder` or `/debugger`) applies fixes. The "CAN write performance fixes" permission above applies only to **manual** invocation, where a human is present.

## Role

Targeted performance audit of the active task's changes. Focus on database query efficiency and async patterns — not micro-optimisations. A slow query in production is a security risk (DoS, resource exhaustion) as much as a performance issue.

---

## Step-by-step

### 1 — Identify the surface

```bash
git diff --name-only HEAD
```

Focus on files that touch:
- Database queries (API routes, data access layer)
- Vue components, composables, or services that fetch data
- Functions that run multiple async operations

If [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) exists, read its **performance-sensitive paths** section — hot paths and scale assumptions (expected row counts, traffic shape) tell you which changes actually matter and which are micro-optimisations.

### 2 — N+1 query check

An N+1 happens when a loop triggers a separate DB call per iteration.

**Pattern to find:**
```ts
// ❌ N+1: one query per item
const items = await db.parent.findMany(...)
for (const item of items) {
  const children = await db.child.findMany({ where: { parentId: item.id } })
}

// ✅ Fix: single query with eager loading / join
const items = await db.parent.findMany({
  include: { children: true }
})
```

Check every loop or `.map()` that contains an `await db.*` call.

### 3 — Unbounded query check

Any `findMany()` / `SELECT *` without a `LIMIT` is unbounded — it can return thousands of rows.

- [ ] Every query on a user-facing list route has pagination (limit + offset or cursor)
- [ ] Or has a narrow enough filter that the result set is always small (< 100 rows)
- [ ] `orderBy` / `ORDER BY` is present when pagination is used (deterministic pages)

```ts
// ❌ Unbounded
await db.item.findMany({ where: { tenantId } })

// ✅ Paginated
await db.item.findMany({
  where: { tenantId, deletedAt: null },
  take: pageSize,
  skip: page * pageSize,
  orderBy: { createdAt: 'desc' },
})
```

### 4 — Over-fetching check

Selecting entire objects when only a few fields are needed wastes memory and network.

- [ ] List routes use field selection (`select`) to return only fields needed by the UI
- [ ] Eager-loaded relations do not pull in sensitive fields [PROJECT RULE — see .claude/context.md]
- [ ] Large JSON/blob fields are excluded from list queries and fetched only on detail views

```ts
// ❌ Over-fetching
await db.item.findMany({ where: { tenantId } })

// ✅ Selective
await db.item.findMany({
  where: { tenantId, deletedAt: null },
  select: { id: true, name: true, status: true, createdAt: true },
})
```

### 5 — Missing index check

Read the schema file. For every column used in a `where` clause in the modified files:

- [ ] Tenant/scope column has an index
- [ ] Soft-delete column (`deletedAt`) has an index if frequently filtered
- [ ] Composite queries have a composite index where beneficial

If a missing index is found, flag it for `/schema-agent` — do not modify the schema directly.

### 6 — Unparallelised async check

Independent async operations should run in parallel with `Promise.all()`.

```ts
// ❌ Sequential (2× slower)
const parent = await db.parent.findUnique(...)
const config = await db.config.findUnique(...)

// ✅ Parallel
const [parent, config] = await Promise.all([
  db.parent.findUnique(...),
  db.config.findUnique(...),
])
```

Look for consecutive `await` statements that are not data-dependent on each other.

### 7 — Report

For each issue found:

```
🔴 Severity : Critical | High | Moderate | Low
📄 File     : src/app/api/items/route.ts:34
⚡ Category : N+1 | Unbounded | Over-fetch | Missing index | Sequential async
❌ Issue    : findMany inside a map — one query per parent item
✅ Fix      : use include: { children: true } on the parent query
```

Severities:
- **Critical** — unbounded query on a large table or N+1 in a hot path
- **High** — pagination missing on a user-facing list
- **Moderate** — over-fetching on a frequently-hit route
- **Low** — sequential async that could be parallelised

### 8 — Apply fixes

Fix **Critical** and **High** immediately. For **Moderate** and **Low**: present and let the user decide.

If a missing index is found → do not edit the schema. Instead report:
```
⚠️  Schema change needed: add index on [column] in [Model]
➡️  Delegate to /schema-agent
```

### 9 — Handoff

```
✅ Performance review complete
🔴 Critical : X → fixed
🟠 High     : Y → fixed
🟡 Moderate : Z → pending
⚠️  Schema   : N index additions recommended → delegate to /schema-agent
➡️  Next step: /perf-measure (confirm with real numbers) → /pr-reviewer
```
