# Project Context

> Tier-1 operational doc — every pipeline agent reads it each run. Keep it lean.
> Deep architecture → docs/ARCHITECTURE.md. Product vision → docs/PRODUCT.md. Design feel → DESIGN.md.

## Project

**Name:** Xayma.sh
**Description:** Credit-based SaaS for web-app deployment for West African SMEs; FCFA payments via Wave / Orange Money.
**Compliance / standards:** none formal; PII = phone numbers + payment identifiers.
**Multi-tenant:** yes — isolation key is `company_id`, derived from `auth.uid()` via RLS, never from request body.

## Tech stack

- Vue 3 (`<script setup lang="ts">`) · Vite · TypeScript (strict, zero `any`)
- PrimeVue 4 (all interactive components) · Tailwind (layout/spacing/typography/dark mode)
- Pinia (stores) · VeeValidate + Zod (forms) · vue-i18n v11 · vue-echarts
- Supabase (DB + Auth + Realtime) · n8n webhooks · Kafka (credit events) · Sentry · Datadog

## Key commands

```bash
npm run dev
npm run build
npm run type-check
npm run lint
npm run test:run
npm run test:coverage
npm run test:e2e
npm run supabase:types     # regenerates src/types/database.ts (generated — never hand-edit)
npm run supabase:push
```

## Absolute rules (NEVER VIOLATE)

1. No custom REST backend. DB reads via Supabase JS SDK; writes via `src/services/workflow-engine.ts` only.
2. Never call n8n URLs directly — always through `src/services/workflow-engine.ts`.
3. n8n handles all async ops. Vue fires-and-forgets; status via Supabase Realtime.
4. RLS is the auth layer. Missing data → check RLS first; never add frontend role filters for security.
5. Supabase service-role key lives in n8n only — never in frontend or Vite output.
6. Kafka for all credit events. Never update `partners.remainingCredits` from Vue directly.
7. Schema prefix always: `supabase.from("xayma_app.<table>")` — never a bare table name.
8. Role checks via `useAuth()` composable — never string-compare roles in templates.
9. All UI strings are i18n keys — add to both `src/i18n/en.ts` AND `src/i18n/fr.ts`.
10. Mockups in `docs/mockups/` are UI source of truth — check before any screen work.
11. Every new table needs an audit trigger → `general_audit`.
12. Always clean up Realtime: `onUnmounted(() => supabase.removeChannel(channel))`.

## Roles and access

| Role | Description | Access |
|------|-------------|--------|
| Admin | Platform operator | full |
| Customer | SME deploying apps | scoped to own `company_id` |
| Reseller | Resells credits | scoped + downstream partners |
| Sales | Internal sales | scoped read + assisted actions |

## Data isolation

- Every query is scoped by RLS using `auth.uid()` → `users.company_id`. Never add manual `where company_id = x`.
- Supabase Realtime requires RLS enabled on the table.

## UI conventions

- **Language:** French + English (i18n, both files always in parity).
- **Component library:** PrimeVue 4 — never plain `<button>`; use PrimeVue `Button`.
- **Layout/spacing:** Tailwind only; use `ms-*`/`me-*` (RTL-safe), never `ml-*`/`mr-*`.
- **Design tokens:** `src/design-system/tokens.json` — never hardcode hex/px. Theme PrimeVue only via `src/assets/styles/primevue-theme.css` CSS vars; no inline overrides, no `!important`.
- **Charts:** vue-echarts wrappers in `src/components/charts/`.
- **Errors/toasts:** `notificationStore.addError(t(...))` — never `console.log` for user-visible errors.

## File structure conventions

```
src/pages/        # route pages (PascalCase, one component per file)
src/components/    # shared UI components
src/stores/        # Pinia stores
src/composables/   # use*.ts shared logic
src/services/      # Supabase queries + workflow-engine.ts (only n8n entry point)
src/i18n/          # en.ts + fr.ts (keep in parity)
src/types/         # database.ts is auto-generated
supabase/migrations/  # SQL migrations (new table ⇒ general_audit trigger)
tests/e2e/         # Playwright specs
```

## Gotchas

- Phone (West Africa): `^(70|75|76|77|78)[0-9]{7}$`.
- Payment IPN arrives before UI redirect — credit update must be idempotent (check status first).
- Domain validation uses DB function `valid_domain_array()` — do not replicate in JS.
- Kafka infrastructure is an external dependency (separate project); the app only fires webhooks.

## Audit command (dep-audit)

```bash
npm audit --omit=dev
```
