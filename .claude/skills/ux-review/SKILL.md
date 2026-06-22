---
name: ux-review
description: Review edited pages and components for visual harmony, WCAG accessibility, UI language correctness, layout consistency, and alignment with project design conventions. Run after implementing any UI change.
---

# /ux-review — UX / Accessibility Agent

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions. If [`DESIGN.md`](../../../DESIGN.md) exists, read it too — it is the source of truth for the standing design language (principles, tone, mood) that Dimension 7 (harmony) is judged against. Exact tokens/badges/icons still come from `.claude/context.md`.

## Permissions

✅ CAN read    : all project files (to compare with neighbouring pages)
✅ CAN write   : UI source files (visual fixes only: style classes, text, icons, HTML structure) · component files
✅ CAN run     : E2E tests in headed mode (for reference screenshots)
❌ CANNOT      : write to API routes, library code, tests, schema, or docs

> **Autonomous (agent) mode is report-only.** When `/ship-task` dispatches the `ux-review` agent, it runs with **no Edit/Write tools** — it reports findings (`blockers`/`warnings`) and a builder (`/coder`) applies fixes. The "CAN write visual fixes" permission above applies only to **manual** invocation, where a human is present.
❌ CANNOT      : modify business logic, API calls, or state management
❌ CANNOT      : add new features — only fix existing visual and accessibility issues
❌ CANNOT      : change the observable behaviour of a page (appearance only)

## When to use

After any implementation that touches UI components, pages, or styles. Can be run on a specific file or on the full current diff.

## Argument (optional)

```
/ux-review                    # Analyses all modified UI files (git diff)
/ux-review src/app/some-page/ # Analyses a specific directory or file
```

---

## Step-by-step

### 1 — Identify files to analyse

Without argument: get the list of modified UI files since the last commit:

```bash
git diff --name-only HEAD | grep -E '\.(vue|css)$'
```

With argument: use the provided path.

Read each identified file in full before starting the review. For a more reliable review, use `/webapp-testing` to capture live screenshots of the edited pages and review what actually renders — not just the `.vue` source.

### 2 — Review across 7 dimensions

For each file, check the 7 dimensions below and note every deviation.

---

#### Dimension 1 — UI language

[PROJECT CONVENTION — see .claude/context.md for the required UI language]

- [ ] All visible text is in the required language — zero violations in labels, placeholders, tooltips, error messages, titles
- [ ] User-facing notifications (toasts, alerts) use the required language
- [ ] Accessible labels (`aria-label` attributes) use the required language

---

#### Dimension 2 — Badges and statuses

Use **only** the exact status badge styles defined in `.claude/context.md` — any invented variant is an error.

[PROJECT CONVENTION — see .claude/context.md for the exact badge/status classes for each status value]

---

#### Dimension 3 — Icons

- [ ] Only the project's approved icon library — no other icon library [PROJECT CONVENTION — see .claude/context.md]
- [ ] Sizes respected: see `.claude/context.md` for standard icon sizes per context
- [ ] Icon semantically consistent with the action

---

#### Dimension 4 — Layout and alignment

- [ ] Grids and flexbox consistent with neighbouring pages in the same module
- [ ] Spacing aligned with dashboard conventions (no arbitrary values)
- [ ] Responsive: page is readable on mobile (no horizontal overflow)
- [ ] Clear visual hierarchy: title → subtitle → content → actions
- [ ] Tables have an `overflow-x: auto` wrapper if content can overflow

---

#### Dimension 5 — Component library usage

[PROJECT CONVENTION — see .claude/context.md for the approved component library]

- [ ] Using existing approved components — no native HTML where a library component exists
- [ ] Button variants consistent: primary for the main action, secondary/outline for supporting actions, destructive for deletions
- [ ] No inline styles — everything goes through the project's styling system

---

#### Dimension 6 — Accessibility (WCAG 2.1 AA)

- [ ] All inputs have an associated `<label>` or `aria-label`
- [ ] Icon buttons have a descriptive `aria-label`
- [ ] Dialogs/modals have a title
- [ ] Status colours are not the sole information vector (text or icon as complement)
- [ ] Keyboard focus order is logical
- [ ] Form error messages are linked to the field via `aria-describedby`

---

#### Dimension 7 — Harmony with existing pages

Compare the edited page with pages in the same module (read 1–2 neighbouring files):

- [ ] Loading pattern (skeleton, spinner) is identical
- [ ] Card/section structure is consistent
- [ ] Actions (Save, Cancel buttons) are positioned the same way
- [ ] Empty states follow the same style
- [ ] Page headers (title + breadcrumb + primary action button) follow the same pattern

---

### 3 — Review report

For each deviation found:

```
📄 File     : src/pages/SomePage.vue
📍 Line     : 42
🔴 Severity : Critical | Moderate | Minor
📐 Dimension: Badges
❌ Issue    : Status badge uses non-standard classes
✅ Fix      : <corrected code>
```

Severities:
- **Critical** — absolute rule violated (wrong language, off-convention badge, unapproved icon library)
- **Moderate** — consistency broken with neighbouring pages, degraded accessibility
- **Minor** — suboptimal style, slightly different alignment

### 4 — Apply fixes

After the report, offer to apply fixes automatically. Apply **Critical** and **Moderate** first. For **Minor**, present them and let the user choose.

### 5 — Final summary

```
✅ Files analysed: N
🔴 Critical : X  →  fixed
🟡 Moderate : Y  →  fixed
🟢 Minor    : Z  →  pending review
📸 Screenshot recommended: yes | no
```

If the task has an **E2E tests** section with screenshots, remind to run the E2E suite in headed mode to capture reference screenshots after fixes. For ad-hoc reference shots of the live page, use `/webapp-testing`.
