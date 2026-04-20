# CLAUDE.md — Xayma.sh Project Guide

> Read this file before making ANY changes to the codebase.
> This file tells Claude Code how to work autonomously on this project.

---

## 0. Behavioral Constitution _(read before everything else)_

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: _"Would a senior engineer say this is overcomplicated?"_ If yes, simplify.

### Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

_Every changed line should trace directly to the user's request._

### Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Run `/verify-task` after every task. Evidence before assertions — always.

---

## Project Summary

**Xayma.sh** is a credit-based SaaS platform for deploying web applications and custom containerized software for SMEs in West Africa. Payments in FCFA via Wave/Orange Money. Multi-role portal: Admin, Customer, Reseller, Sales.

- **Management app:** Vue 3 + TypeScript SPA → `app.xayma.sh`
- **Marketing site:** Nuxt 3 + Strapi → `xayma.sh`
- **Backend:** database service (relational database + Auth + Realtime), workflow engine (automation), Kafka (events)
- **Infrastructure:** Hetzner CX32 (management) + CX52 (customer nodes), Docker, deployment engine, Traefik

---

## Project Structure

```
src/
├── components/
│   ├── common/         # Shared UI (AppDataTable, AppModal, AppStatusBadge, AppPageHeader…)
│   ├── deployments/    # DeploymentCard, DeploymentWizard, DeploymentStatusBadge
│   ├── credits/        # CreditMeter, CreditBundleCard, CreditTransactionRow
│   ├── partners/       # PartnerForm, PartnerStatusBadge, PartnerTypeBadge
│   ├── notifications/  # NotificationBell, NotificationFeed, NotificationItem
│   └── charts/         # ECharts wrappers (BarChart, LineChart, DonutChart, StatCard)
├── composables/        # useAuth, useDeployments, useCredits, usePartners, useCurrency, useSettings
├── design-system/      # tokens.json — single source of truth for all visual values
├── i18n/               # en.ts, fr.ts — ALL UI strings must be here
├── lib/                # shared helpers (formatDate, formatCurrency, slugify, validators)
├── pages/              # Vue Router pages (auth, dashboard, deployments, credits, partners…)
├── services/
│   ├── database.ts     # database service client singleton + typed queries
│   ├── workflow-engine.ts # Workflow engine webhook wrappers — NEVER call workflow engine URLs directly elsewhere
│   └── settings.ts     # Platform-wide settings (workflow engine URLs, webhook paths, thresholds)
├── stores/             # Pinia stores (auth, partner, deployments, notifications)
└── types/              # index.ts (domain types) + database.ts (auto-generated — never edit)
docs/
├── specs/              # Full project specifications (8 files)
├── design-system.md    # Component patterns, layout rules, interaction behaviors
└── mockups/            # Page/component mockup screenshots — source of truth for UI
.claude/
├── agents/             # css-design, vue-specialist, workflow-engine-specialist, test-writer, pr-reviewer, lead
├── commands/           # new-feature, new-page, verify-task, test-sprint, status,
│                       # visual-check, workflow-engine, db-migration
└── settings.json
```

---

## Stack

| Layer         | Technology                                        |
| ------------- | ------------------------------------------------- |
| Framework     | Vue 3 + Vite + TypeScript                         |
| UI components | PrimeVue 4                                        |
| CSS           | Tailwind CSS (layout, spacing, custom components) |
| Icons         | PrimeIcons + Heroicons                            |
| State         | Pinia                                             |
| Forms         | VeeValidate + Zod                                 |
| Charts        | Apache ECharts (vue-echarts)                      |
| i18n          | vue-i18n v11                                      |
| Backend       | Workflow engine webhooks (no custom REST server)  |
| Database      | database service (relational database + RLS)                       |
| Auth          | database service Auth                                     |
| Realtime      | database service Realtime WebSockets                      |
| Events        | Kafka (KRaft, self-hosted on CX32)                |
| Storage       | database service Storage                                  |
| Hosting       | Docker + Nginx on Hetzner CX32 behind Traefik     |
| Errors        | Sentry                                            |
| Monitoring    | Datadog                                           |

### PrimeVue + Tailwind Usage Split

| PrimeVue                          | Tailwind                     |
| --------------------------------- | ---------------------------- |
| DataTable, Column, Paginator      | Page layout, grid, flex      |
| Dialog, ConfirmDialog             | Spacing, margin, padding     |
| Steps (wizard)                    | Custom badge/chip components |
| Calendar, DatePicker              | Typography utilities         |
| FileUpload                        | Color overrides via CSS vars |
| Toast, Message                    | Responsive breakpoints       |
| Dropdown, MultiSelect, TreeSelect | Dark mode (`dark:` prefix)   |
| ProgressBar, Skeleton             | Custom card shells           |
| Button (use PrimeVue Button)      | Section backgrounds          |

---

## Commands

```bash
npm run dev            # Start Vite dev server (port 5173)
npm run build          # Type-check + production build
npm run type-check     # TypeScript check (no emit)
npm run lint           # ESLint (max-warnings 0)
npm run lint:fix       # ESLint with auto-fix
npm run test           # Vitest unit tests (watch mode)
npm run test:run       # Vitest single run
npm run test:coverage  # Vitest with V8 coverage report
npm run test:e2e       # Playwright E2E tests (headless)
npm run test:e2e:ui    # Playwright interactive UI mode
npm run stop           # Kill dev server + vibe-annotations server

# database service
npm run database:types    # Regenerate types → src/types/database.ts
npm run database:push     # Push schema migrations to remote
```

---

## Architecture Rules — NEVER VIOLATE THESE

### 1. No custom REST API backend

All DB reads go through **database service JS SDK** directly. All write operations and business logic trigger **workflow engine webhooks** via `src/services/workflow-engine.ts`. Never build an Express/Fastify/etc. server.

### 2. Never call workflow engine URLs directly

All workflow engine calls go through `src/services/workflow-engine.ts`. Never use `fetch()` to workflow engine URLs in components, stores, or composables — always the service wrapper.

### 3. Workflow engine handles all async operations

Anything involving deployment engine, Kafka, payments, or notifications goes through workflow engine. The Vue app fires and forgets — status is tracked via database service Realtime. Never await long operations synchronously.

### 4. RLS is the authorization layer

RLS policies in database service enforce what each role can access. Never filter by role on the frontend for security — only for display. If data is missing, check RLS first.

### 5. database service service role key = server-side only

The service role key lives **only** in workflow engine environment variables. It must never appear in any frontend code, committed `.env`, or Vite build output.

### 6. Kafka for all credit events

Credit debit, topup, expiry, and suspension events **must** flow through Kafka. Never update `partners.remainingCredits` directly from the Vue app.
Flow: Vue → workflow engine webhook → Kafka → workflow engine consumer → database service update.

### 7. Schema prefix in all database service queries

```typescript
// CORRECT
database.from("xayma_app.partners").select("*");
// WRONG — will hit public schema
database.from("partners").select("*");
```

### 8. Role checks via composable only

```typescript
// CORRECT — in <script setup>
const { isAdmin, isReseller, isCustomer } = useAuth()
// WRONG — never string-compare in templates
v-if="authStore.user?.user_role === 'ADMIN'"
```

### 9. All strings must be i18n keys

```vue
<!-- CORRECT -->
{{ $t("deployments.status.active") }}
<!-- WRONG — breaks FR users -->
Active
```

Add to BOTH `en.ts` AND `fr.ts` before committing. Never one without the other.

### 10. Mockups are the source of truth for UI

Before implementing any screen, check `docs/mockups/`. Implement with tokens from `src/design-system/tokens.json` and patterns from `docs/design-system.md`.

### 11. Audit every mutation

Every INSERT/UPDATE/DELETE on core tables is caught by relational database audit triggers writing to `general_audit`. If adding a new table, add the audit trigger.

### 12. Always clean up Realtime subscriptions

```typescript
onUnmounted(() => database.removeChannel(channel));
```

No exceptions. Dangling subscriptions cause memory leaks.

---

## Platform Settings

- Platform-wide config (workflow engine base URL, webhook paths, deployment engine base URL, credit thresholds, payment gateway keys) stored in `xayma_app.settings` table (key/value)
- Access via `src/services/settings.ts` or `src/composables/useSettings.ts`
- Admin-only write access enforced by RLS
- Never hardcode webhook URLs, thresholds, or API keys in components

---

## Multi-Tenancy

- A user belongs to one partner via `users.company_id → partners.id`
- ALL database service queries are scoped by RLS using `auth.uid()` → `users.company_id`
- If data appears missing, check RLS policies — do not add manual `where company_id = x` filters in frontend code

---

## Design System

### Before writing any UI code, read:

1. `src/design-system/tokens.json` — all allowed color, spacing, radius, shadow values
2. `docs/design-system.md` — component anatomy, layout rules, interaction patterns

### PrimeVue theming

PrimeVue is themed via CSS variables in `src/assets/styles/primevue-theme.css`. Never override PrimeVue styles inline or with `!important`. Extend the theme file.

```css
/* primevue-theme.css — example token overrides */
:root {
  --p-primary-color: var(--brand-primary);
  --p-primary-contrast-color: #ffffff;
  --p-surface-card: var(--surface-raised);
}
```

### Never:

- Hardcode a hex color — use the design token CSS variable
- Hardcode pixel values for spacing — use Tailwind spacing classes
- Use `ml-*` / `mr-*` — use `ms-*` / `me-*` (RTL-safe)
- Override PrimeVue styles inline — always via the theme file

### Working from a mockup:

Paste a screenshot with `Ctrl+V` in the Claude Code terminal, or use `/from-figma [link]`.
Claude will do mockup → token mapping → build → `/visual-check` screenshot comparison automatically.

---

## Vibe Annotations

UI annotations flow from browser → annotation server → Claude Code:

```bash
./scripts/vibe-annotations.sh pending        # Show pending annotations
./scripts/vibe-annotations.sh watch          # Auto-refresh every 5s
./scripts/vibe-annotations.sh resolve <id>   # Mark as fixed
```

Server runs automatically at `http://127.0.0.1:3846` (started by devcontainer `postStartCommand`).

---

## Agent Team

5 specialist sub-agents + 1 lead in `.claude/agents/`. Claude invokes them automatically.

| Moment                                      | Agent                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| Starting any UI work                        | `css-design` — token mapping + PrimeVue component selection before any code |
| Building Vue component / store / composable | `vue-specialist` — pattern validation                                       |
| Building any workflow engine automation     | `workflow-engine-specialist` — contract, Kafka, error handling              |
| After implementation                        | `test-writer` — Vitest unit tests + Playwright E2E + screenshots            |
| Before every commit                         | `pr-reviewer` — nothing commits without APPROVE                             |

**Lead agent** — invoke manually:

```
"give me sprint 3 status"    → reads IMPLEMENTATION_PLAN.md, reports progress
"plan sprint 5"              → ordered task list with complexity estimates
"we're stuck on task 4.7"   → proposes options, escalates if blocked
```

### Full task flow

```
css-design → vue-specialist → workflow-engine-specialist (if needed)
                ↓ [implementation] ↓
           test-writer (unit tests + E2E + screenshots)
                ↓
        /verify-task — must PASS before checking off
                ↓
        ⏸️ APPROVAL GATE — type "go"
                ↓
           pr-reviewer (8-layer review)
           commit + push + PR description
```

---

## Slash Commands

| Command             | When to use                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `/new-feature <n>`  | Add a new feature end-to-end (type + service + store + component + test) |
| `/new-page <n>`     | Scaffold a new page with route, layout, i18n keys                        |
| `/verify-task`      | Self-check after implementing a task — must pass before ✅               |
| `/test-sprint`      | Full E2E acceptance gate at end of each sprint                           |
| `/status`           | Read docs/IMPLEMENTATION_PLAN.md and report current progress              |
| `/visual-check`     | Screenshot comparison vs mockup reference                                |
| `/workflow-engine <n>` | Scaffold workflow engine automation with input/output contract           |
| `/db-migration <n>` | Generate a database service SQL migration file                                   |

---

## Testing

| Layer            | Tool                    | Covers                                                |
| ---------------- | ----------------------- | ----------------------------------------------------- |
| Unit + Component | Vitest + Vue Test Utils | Stores, composables, service functions, components    |
| E2E + Visual     | Playwright MCP          | Full user journeys, routing, i18n, layout screenshots |
| Self-verify      | `/verify-task`          | Claude checks its own work after each task            |
| Sprint gate      | `/test-sprint`          | Full E2E before sprint is declared complete           |

**Rules:**

- Unit tests co-located with source (`auth.store.ts` → `auth.store.test.ts`)
- E2E tests in `tests/e2e/` organized by feature
- Screenshots committed to `tests/screenshots/` for visual regression
- Run `/verify-task` after EVERY task — cannot check the box without it passing
- Run `/test-sprint` at the END of every sprint — sprint is not done until E2E gate passes

---

## TypeScript Conventions

- Strict mode — zero `any`; use `unknown` + type guards
- `src/types/database.ts` is auto-generated — NEVER edit manually
- Domain types in `src/types/index.ts`
- Prefer `interface` over `type` for object shapes
- Named exports everywhere — default exports only for Vue components and Pinia stores

---

## Vue / Component Conventions

- Composition API with `<script setup lang="ts">` — no Options API, ever
- Props typed with `defineProps<{...}>()`
- Emits typed with `defineEmits<{...}>()`
- Composables (`use*.ts`) for logic shared across more than one component
- One component per file, PascalCase filename

---

## database service Patterns

### Realtime subscription

```typescript
const channel = database
  .channel("partner-credits")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "xayma_app",
      table: "partners",
      filter: `id=eq.${partnerId}`,
    },
    (payload) => {
      partnerStore.updateCredits(payload.new.remainingCredits);
    },
  )
  .subscribe();

onUnmounted(() => database.removeChannel(channel));
```

### Error handling

```typescript
const { data, error } = await database.from("xayma_app.partners").select("*");
if (error) {
  // Use notification store — never console.log
  notificationStore.addError(t("errors.fetch_failed"));
  return;
}
```

---

## Environment Variables

```bash
# database service
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_PROJECT_ID=           # Required for: npm run database:types

# Workflow Engine
VITE_WORKFLOW_ENGINE_BASE_URL=     # e.g. https://workflow-engine.xayma.sh

# Deployment Engine
VITE_DEPLOYMENT_ENGINE_BASE_URL=   # e.g. https://deployment-engine.xayma.sh

# Payments
VITE_PAYMENT_GATEWAY_API_KEY=          # Public key only — secret lives in workflow engine

# Monitoring
VITE_SENTRY_DSN=
VITE_APP_ENV=                  # development | production
```

Never commit `.env`. Use `.env.example` for documentation.

---

## Gotchas & Known Issues

| Issue                                    | Workaround                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| database service requires `xayma_app.` prefix    | Prefix all table names in all queries                                     |
| Phone validation is West Africa specific | Regex: `^(70\|75\|76\|77\|78)[0-9]{7}$`                                   |
| database service Realtime requires RLS enabled   | All realtime tables must have RLS; realtime respects it                   |
| Kafka KRaft needs `KAFKA_NODE_ID` env    | Set in docker-compose; see `infra/kafka/README.md`                        |
| Workflow engine webhook URLs must be static | Never use dynamic paths; configure base URL in `settings` table           |
| Payment Gateway IPN arrives before UI redirect   | Credit update must be idempotent — check status before processing         |
| Domain regex for deployments             | Uses relational database function `valid_domain_array()` — don't replicate in JS   |
| `useRoute()` outside `setup()`           | Only call inside `setup()` or composables used within `setup()`           |
| PrimeVue DataTable + sticky header       | Use `scrollHeight="flex"` + parent `height: calc(100vh - Xpx)`            |
| PrimeVue theme overrides                 | Only via `primevue-theme.css` CSS vars — never inline, never `!important` |
| vue-i18n v11                             | Use `const { t } = useI18n()` — not `this.$t()`                           |

---

## File Creation Checklist

When adding a new feature:

- [ ] Type definition in `src/types/index.ts`
- [ ] Service function in `src/services/`
- [ ] Pinia store action or composable
- [ ] Route in `src/router/index.ts` with `requiredRole` meta
- [ ] Page component in `src/pages/`
- [ ] i18n keys in BOTH `src/i18n/en.ts` AND `src/i18n/fr.ts`
- [ ] Check `docs/mockups/` for reference design
- [ ] Unit test co-located with implementation
- [ ] `/verify-task` passes before checking off

---

## Specs (load when needed)

```
docs/specs/SPEC_01_PROJECT_OVERVIEW.md
docs/specs/SPEC_02_USER_PERSONAS_FLOWS.md
docs/specs/SPEC_03_FEATURES_REQUIREMENTS.md
docs/specs/SPEC_04_TECHNICAL_ARCHITECTURE.md
docs/specs/SPEC_05_DATABASE_DESIGN.md
docs/specs/SPEC_06_API_SPECIFICATIONS.md
docs/specs/SPEC_07_UI_UX_DESIGN.md
docs/specs/SPEC_08_DEPLOYMENT_INFRASTRUCTURE.md
```
