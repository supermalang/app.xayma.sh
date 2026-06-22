---
name: security-audit
description: Security audit of the active task's code changes. Checks OWASP Top 10 and project-specific absolute rules. Run after /qa-tester, before /pr-reviewer.
---

# /security-audit — Web Security Agent

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions.

## Permissions

✅ CAN read    : all project files
✅ CAN write   : source files (security fixes only — no new features)
✅ CAN run     : `git diff` · lint · read-only commands
❌ CANNOT      : write to `docs/ROADMAP.md`, tests, or schema files
❌ CANNOT      : add business features under the guise of a "security fix"
❌ CANNOT      : modify tests (escalate to `/test-writer`)
❌ CANNOT      : push to remote or open PRs

> **Autonomous (agent) mode is report-only.** When `/ship-task` dispatches the `security-audit` agent, it runs with **no Edit/Write tools** — it reports findings (`blockers`/`warnings`) and a builder (`/coder` or `/debugger`) applies fixes. The "CAN write security fixes" permission above applies only to **manual** invocation, where a human is present.

## Role

Targeted security audit of the active task's changes. Not a full codebase review — only the files modified or created by the current task.

---

## Step-by-step

### 1 — Identify the attack surface

```bash
git diff --name-only HEAD
```

Read each modified file. Classify by risk:
- **Critical**: API routes, authentication/auth library, sensitive business logic
- **High**: components with forms, middleware, database queries
- **Standard**: read-only components, pure utilities

If [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) exists, read its **trust boundaries** section — where untrusted input enters the system — and weight the review toward changes that cross those boundaries.

### 2 — OWASP Top 10 checklist

#### A01 — Broken Access Control
- [ ] Every API route checks the session/token before any operation — return 401 if missing or invalid
- [ ] Every database query is scoped to the authenticated context — a user cannot read another tenant's data [PROJECT RULE — see .claude/context.md]
- [ ] Admin routes check the required role [PROJECT CONVENTION — see .claude/context.md for role names]
- [ ] No IDOR: IDs in the URL are revalidated against the authenticated context before use

#### A02 — Cryptographic Failures
- [ ] Sensitive credential fields absent from all API responses [PROJECT RULE — see .claude/context.md]
- [ ] No secret (API key, token, connection string) hardcoded — everything via environment variables
- [ ] Session cookies are `httpOnly` + `secure` (managed by the auth library — do not bypass)

#### A03 — Injection
- [ ] No raw SQL with string interpolation — use parameterised queries or ORM methods only
- [ ] All user inputs are validated before reaching the database
- [ ] No `eval()`, no unsanitised `dangerouslySetInnerHTML`

#### A04 — Insecure Design
- [ ] Sensitive business logic is server-side only — never trust client-provided security decisions
- [ ] Threshold or configuration values used in security decisions are immutable once written — never recalculated from mutable data [PROJECT RULE — see .claude/context.md]

#### A05 — Security Misconfiguration
- [ ] No unprotected routes in the authenticated segment — middleware covers this
- [ ] Security headers in place (check the framework config)

#### A06 — Vulnerable and Outdated Components
- [ ] No upgrade of critical dependencies without a compatibility check against the versions pinned in `.claude/context.md`
- [ ] Run `/dep-audit` for the SCA scan (known CVEs in dependencies) — code review cannot catch vulnerable libraries

#### A07 — Identification and Authentication Failures
- [ ] Any privileged operation that requires re-verification (e.g. PIN, password confirm) is re-verified **server-side** — never client-side only [PROJECT RULE — see .claude/context.md]
- [ ] Context/site/tenant switches validate that the user has access to the requested context

#### A09 — Security Logging and Monitoring Failures
- [ ] Audit log helper called for every sensitive mutation [PROJECT RULE — see .claude/context.md for the list of auditable events]
- [ ] Authentication failures are logged

#### A10 — SSRF (if applicable)
- [ ] External URLs come from environment variables only — never from user input

### 3 — Project absolute rules

Check the project's absolute rules defined in `.claude/context.md`.

Example rules your project may define (replace with the actual rules from `.claude/context.md`):

- [ ] **Soft delete only** — no hard-delete calls in the ORM; all deletions must set a `deletedAt` timestamp
- [ ] **Audit log is insert-only** — no update or delete on the audit log table
- [ ] **Always scope by tenant** — every query carries the tenant/site scoping field
- [ ] **No sensitive field exposure** — password hashes or equivalent fields absent from responses
- [ ] **Always validate input** — validation library applied on all API routes
- [ ] Any additional rules listed in `.claude/context.md`

### 4 — Report

For each vulnerability found:

```
🔴 Severity : Critical | High | Moderate | Low
📄 File     : src/app/api/items/route.ts:42
🔑 Category : A01 — Broken Access Control / Absolute Rule
❌ Issue    : Query without tenant scope filter — cross-tenant data accessible
✅ Fix      : Add the scoping filter to the where clause
```

### 5 — Apply fixes

Fix **Critical** and **High** immediately. For **Moderate** and **Low**: present and let the user decide.

### 6 — Handoff

```
✅ Security review complete
🔴 Critical : X → fixed
🟠 High     : Y → fixed
🟡 Moderate : Z → pending
✅ Absolute rules : all respected
➡️  Next step : /pr-reviewer
```
