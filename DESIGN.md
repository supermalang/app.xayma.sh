# Design

> **[OPTIONAL — Tier-2 knowledge doc].** The standing design language: the overall *feeling*,
> tone, and UX principles the product should express. This is the qualitative "what should it
> feel like" — the exact tokens, badge classes, icon library, and component rules live in
> `.claude/context.md` (operational, read every run). Per-screen specs live in `docs/design/`.
>
> **Read by:** `/design-import` (reconciles imported designs against this language + keeps the
> index below current), `/ux-review` (judges visual harmony and tone against it). Both treat
> this file as optional — if it's absent they fall back to `.claude/context.md` conventions.

---

> The aesthetic is **"The Technical Editorial"** — sophisticated, high-precision, architectural.
> This is an operational admin/dashboard product: the design serves the user's work, not brand
> self-expression.

## Design principles

- **Clarity over cleverness.** One action per screen, one obvious next step. Focused forms, clear
  outcomes, no cognitive load.
- **Trust through transparency.** Credit balance, pricing, and status are always visible, never
  hidden behind cleverness.
- **Assume competence.** Users know what a domain, a port, or memory is. Don't over-explain or
  patronize.
- **Depth through tone, not decoration.** Layered surfaces carry hierarchy — no shadows, no
  gradients, no card spam.
- **Bilingual parity.** French and English are equal citizens, not a translation afterthought.
- **Motion only when it clarifies.** Transitions confirm or guide state changes; they never
  decorate.

## Brand & tone

- **Personality:** confident not arrogant; precise; understated; professional.
- **Voice:** clear and concise plain French/English — no buzzwords, no empty promises, no
  corporate filler. Helpful, never patronizing.
- **Feeling to evoke:** "in control", "fast and efficient", "this is built by people who know what
  they're doing".

## Visual language (the feel, not the tokens)

- **Mood:** light, flat, architectural with depth from tonal surface layering. Dense where data
  demands it (tables, billing), airy and generous elsewhere — anti-cramped, pro-breathing-room.
  Dark mode only if the customer base demands it; never decorative.
- **Color intent:** restrained — tinted neutrals as the base, deep "ink" blue for primary actions
  and active/focus states (interactive only, never decoration), orange as a secondary highlight,
  and desaturated green/amber/red for status. Color signals function, not flourish.
- **Typography intent:** weight carries hierarchy as much as size. A clean UI sans for headings,
  labels and body; monospace reserved strictly for data — FCFA amounts, ISO 8601 dates, IDs, and
  billing figures (right-aligned). No decorative fonts; no three-plus sizes per view.
- **Spacing & density:** consistent baseline grid with generous whitespace; never cram a table.
  Asymmetric gutters and clear section breaks give the editorial, composed feel.
- **Motion:** sharp and machine-like — short linear transitions (~150ms) for hover and controls,
  a brief fade on page navigation. Transitions confirm actions; they are never bouncy or
  attention-seeking.

> Exact values (hex, Tailwind classes, icon library, component library) are defined **once** in
> `src/design-system/tokens.json` (machine source of truth), mirrored for humans in
> [`docs/design-tokens-reference.md`](docs/design-tokens-reference.md); the operational summary used
> every run is in `.claude/context.md` under *UI conventions*. Do not duplicate them here — they drift.

## Accessibility stance

- WCAG 2.1 AA on every shipped screen; color is never the sole signal. Focus is always visible
  (never removed), touch targets meet the minimum size, and all UI strings come from i18n (EN + FR).

---

## Screen specs (index)

Each imported or designed screen gets a detailed spec under `docs/design/<slug>.md`, written by
`/design-import`. This table maps the language above to those per-screen specs.

| Screen / feature | Spec | Source |
|---|---|---|
| [Screen name] | [docs/design/&lt;slug&gt;.md](docs/design/) | Stitch / hand / Figma |

> `/design-import` appends a row here each time it writes a new spec.
