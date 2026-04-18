# Xayma.sh

A credit-based SaaS platform for deploying Odoo Community and custom Docker instances for SMEs in West Africa.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
npm run test:e2e
```

## Project Structure

- `src/` — Vue 3 SPA source code
  - `components/` — Vue components (shared, feature-specific)
  - `pages/` — Page routes
  - `stores/` — Pinia state management
  - `composables/` — Reusable composition API logic
  - `services/` — Supabase client, n8n webhooks, settings
  - `types/` — TypeScript type definitions
  - `i18n/` — English/French translations
  - `lib/` — Shared utilities (formatters, validators)
  - `assets/` — Styles, icons, images
- `docs/` — Specs, mockups, design system
- `.claude/` — Claude Code agent configuration
- `tests/` — Unit tests (Vitest) and E2E tests (Playwright)

## Tech Stack

- **Frontend:** Vue 3 + TypeScript + Vite + PrimeVue
- **State:** Pinia
- **Styles:** Tailwind CSS + design tokens
- **i18n:** vue-i18n
- **Backend:** n8n webhooks (no REST API)
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth
- **Testing:** Vitest + Playwright
- **Forms:** VeeValidate + Zod

## Architecture

**No custom backend** — all database reads go through Supabase JS SDK, all writes/async operations trigger n8n webhooks.

**RLS is the security layer** — Supabase row-level security enforces multi-tenancy. Never filter by role on the frontend.

**Kafka for credits** — all credit events flow through Kafka → n8n consumers → Supabase.

See `CLAUDE.md` for full rules and guidelines.

## Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# n8n
VITE_N8N_WEBHOOK_BASE_URL=

# Payments
VITE_PAYTECH_API_KEY=

# Monitoring
VITE_SENTRY_DSN=
VITE_APP_ENV=development
```

## Documentation

- `CLAUDE.md` — Architecture rules, slash commands, project conventions
- `IMPLEMENTATION_PLAN.md` — Feature roadmap and sprints
- `docs/specs/` — Full technical specifications
- `docs/design-system.md` — UI patterns and component guidelines
