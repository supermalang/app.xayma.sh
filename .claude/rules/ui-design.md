---
description: Design system and PrimeVue rules for all UI components and pages
globs: src/{components,pages}/**/*.vue
---

## Before Writing Any UI Code

1. Check `docs/mockups/` for the reference design.
2. Read `src/design-system/tokens.json` for all allowed color, spacing, radius, shadow values.
3. Read `docs/design-system.md` for component anatomy and interaction patterns.

## PrimeVue Component Selection

| Need               | Component                                        |
| ------------------ | ------------------------------------------------ |
| Tables             | DataTable + Column + Paginator                   |
| Modals             | Dialog / ConfirmDialog                           |
| Multi-step flows   | Steps                                            |
| Date pickers       | Calendar / DatePicker                            |
| Selects            | Dropdown / MultiSelect / TreeSelect              |
| Progress / loading | ProgressBar / Skeleton                           |
| Alerts / toasts    | Toast / Message                                  |
| All buttons        | Button (never plain `<button>`)                  |
| Charts             | vue-echarts wrappers in `src/components/charts/` |

## Theming

PrimeVue is themed only via CSS vars in `src/assets/styles/primevue-theme.css`.

- Never override PrimeVue styles inline.
- Never use `!important`.
- Never hardcode hex colors — use design token CSS variables.
- Never hardcode px spacing — use Tailwind spacing classes.
- Use `ms-*` / `me-*` not `ml-*` / `mr-*` (RTL-safe).

## After Any UI Implementation

Run `/visual-check` — screenshot comparison vs mockup. Fix before committing.

## Known Issues

- PrimeVue DataTable sticky header: use `scrollHeight="flex"` + parent `height: calc(100vh - Xpx)`.
- PrimeVue theme overrides: only via `primevue-theme.css` CSS vars.
