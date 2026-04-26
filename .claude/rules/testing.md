---
description: Testing conventions for all test files
globs: "{src/**/*.test.ts,tests/**/*.spec.ts,tests/e2e/**/*.ts}"
---

## Layers

| Layer            | Tool                    | Covers                                                |
| ---------------- | ----------------------- | ----------------------------------------------------- |
| Unit + Component | Vitest + Vue Test Utils | Stores, composables, service functions, components    |
| E2E + Visual     | Playwright              | Full user journeys, routing, i18n, layout screenshots |

## Rules

- Unit tests co-located with source: `auth.store.ts` → `auth.store.test.ts`
- E2E tests in `tests/e2e/` organized by feature.
- Screenshots committed to `tests/screenshots/` for visual regression.
- Run `/verify-task` after every task — cannot check off without it passing.
- Run `/test-sprint` at sprint end — sprint is not done until E2E gate passes.
- Write failing test first, then make it pass. Never assert without running.
