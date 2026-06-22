---
name: design-import
description: Turn a design into code via the Google Stitch MCP server. Pulls the generated UI's structure, color tokens, typography, and layout from Stitch, writes a design spec, and hands implementation to /coder under the project's component/Tailwind conventions. Requires the Stitch MCP to be connected by the user. Use to go from a design prompt to real components.
---

# /design-import — Design-to-Code Agent (Google Stitch MCP)

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions.

## Role

Bridges design and code using the **Google Stitch** MCP server. Stitch (Google Labs, Gemini-based) generates UI from text prompts and exposes the result as structured data — colors as hex, typography as exact values, layout as structured HTML. This skill reads that design context and produces a **design spec** that `/coder` implements as real components, conforming to the project's approved component library and Tailwind conventions rather than pasting raw generated markup.

## Prerequisite — connect the MCP (user-side, one-time)

The MCP server runs on **your** machine with **your** credentials — this skill cannot set it up for you.

1. Get a Stitch API key (Google Labs / Stitch settings).
2. In Claude Code: run `/mcp`, add the **Stitch** server, and authenticate.
3. Confirm with `/mcp` that the Stitch tools are listed.

If the Stitch MCP tools are **not** available when this skill runs, stop and tell the user to connect it first (the steps above) — do not fabricate a design.

## Permissions

✅ CAN read    : all project files · Stitch MCP design data
✅ CAN write   : a design spec under `docs/design/<slug>.md` · the **index table** in `DESIGN.md` (add a row for the new spec; create `DESIGN.md` from the template if it is missing)
✅ CAN run     : the Stitch MCP tools (read design, list projects/frames)
✅ CAN delegate: implementation to `/coder`
❌ CANNOT      : write component/source code directly — `/coder` implements, under project conventions
❌ CANNOT      : paste raw generated markup into the codebase verbatim — it must be adapted to the approved component library
❌ CANNOT      : write to tests, schema, or `docs/ROADMAP.md`; push; or open PRs

---

## Step-by-step

### 1 — Confirm the MCP and locate the design

Verify the Stitch MCP tools are available (see prerequisite). Identify the target design/frame — by name from the user, or list available Stitch projects and ask which one.

### 2 — Pull the design context

Use the Stitch MCP tools to read the design's structured data:
- **Color tokens** (hex values, semantic roles)
- **Typography** (families, sizes, weights, line-heights)
- **Layout** (structure, spacing, component breakdown)
- **States** if present (hover, disabled, empty)

Extract values; do not screenshot-and-guess.

### 3 — Reconcile with project conventions

If [`DESIGN.md`](../../../DESIGN.md) exists, read it first — it sets the standing design language (principles, tone, mood). Reconcile the imported design against that feeling, not just the exact tokens. Flag any imported design that fights the stated principles.

Map the design onto the project's system (from `.claude/context.md`):
- Map Stitch colors to the project's design tokens / Tailwind theme — **reuse existing tokens** where they match; only add new ones when genuinely needed (respect the "no invented badge variants" discipline).
- Map components to the **approved component library** (e.g. PrimeVue 4) — don't reintroduce native elements where a library component exists.
- Note the required UI language, icon library, and accessibility rules — they override anything Stitch produced.

Flag any conflict between the design and project conventions for the user to resolve, rather than silently overriding either.

### 4 — Write the design spec

Write `docs/design/<slug>.md`:

```markdown
# Design Spec — <screen/feature>

**Source:** Google Stitch (<project/frame>)   **Date:** <today>

## Tokens
| Role | Stitch value | Mapped project token |
|---|---|---|
| primary | #2563EB | theme.colors.primary |

## Typography
<families, sizes, weights → project scale>

## Component breakdown
- <Component> → <approved library component> · props/states
- …

## Layout & responsive
<structure, spacing, breakpoints>

## Accessibility & conventions
- UI language: …   Icons: …   Labels/ARIA: …

## Open conflicts (need decision)
- <design vs convention> → recommendation
```

After writing the spec, keep the design index current: add a row to the **Screen specs (index)** table in `DESIGN.md` linking the new `docs/design/<slug>.md`. If `DESIGN.md` does not exist, create it from the template (seed the design-language sections from the imported design) and then add the row. Do not touch any other section of `DESIGN.md`.

### 5 — Hand off to implementation

The spec is the contract. Implementation goes through `/coder` (which requires an active `/start-task` and roadmap task). Do not write component code here.

### 6 — Handoff

```
✅ Design imported from Stitch → spec written to docs/design/<slug>.md
🎨 Tokens mapped   : N (M new)
🧩 Components       : mapped to <library>
⚠️  Conflicts       : <count needing a decision, or none>
➡️  Next step       : /planner (if no task yet) → /start-task → /coder to implement the spec
```

---

## What design-import does NOT do

- Does not set up the MCP — that's a user-side one-time step.
- Does not write component code (`/coder` does, under project conventions).
- Does not paste generated markup verbatim or invent design tokens.
- Does not bypass the roadmap gate — implementation still needs a task.
