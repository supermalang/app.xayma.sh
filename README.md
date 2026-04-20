# Xayma.sh — Credit-Based SaaS for Odoo Deployments in West Africa

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#license)

## Overview

Xayma.sh is a multi-tenant SaaS platform for SMEs in West Africa to deploy, manage, and bill for Odoo Community instances and custom Docker applications. Built on a modern Vue 3 frontend, serverless workflow engine automation, and PostgreSQL with Supabase.

**Key Value:** Businesses in Senegal, Mali, and neighboring countries can launch enterprise-grade Odoo deployments in minutes with flexible credit-based billing via Wave and Orange Money.

## Features

- 🚀 **One-Click Deployments** — Launch Odoo Community or custom Docker apps with pre-configured sizing
- 💳 **Flexible Billing** — Credit-based pricing with micropayments via Wave/Orange Money  
- 👥 **Multi-Role Access** — Admin, Reseller, Customer, and Sales roles with fine-grained permissions
- 🔒 **Enterprise Security** — Row-level security (RLS) via Supabase, encrypted credentials, audit logging
- 🌍 **Localized UX** — Full English/French UI with West African payment integration
- 📊 **Real-Time Dashboards** — Live deployment status, credit consumption, and billing insights
- 🔗 **No Custom Backend** — Serverless architecture: workflow engine for automation, Supabase for data
- 📱 **Responsive Design** — Desktop, tablet, and mobile support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vue 3 + TypeScript + Vite + PrimeVue 4 |
| **Styling** | Tailwind CSS + design tokens |
| **State** | Pinia |
| **Forms** | VeeValidate + Zod |
| **i18n** | vue-i18n (EN/FR) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Realtime** | Supabase WebSockets |
| **Automation** | workflow engine webhooks |
| **Events** | Kafka (KRaft) |
| **Testing** | Vitest + Playwright |
| **Deployment** | Docker + Nginx on Hetzner |

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase project (local or hosted)
- workflow engine instance for webhook automation (optional for dev)

### Installation

```bash
# Clone the repository
git clone https://github.com/supermalang/app.xayma.sh.git
cd app.xayma.sh

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your Supabase credentials to .env.local
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=...
```

### Running Locally

```bash
# Start development server (port 5173)
npm run dev

# Run type check
npm run type-check

# Run linter
npm run lint:fix

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e
```

### Building for Production

```bash
npm run build    # Type-check + production bundle
npm run test:run # Run all tests once
```

## Architecture

### Core Principles

**No Custom REST API** — All database reads use Supabase JS SDK. All writes and async operations trigger workflow engine webhooks.

**RLS is the Security Layer** — Row-level security in PostgreSQL enforces multi-tenancy. Frontend never filters by role.

**Kafka for Credit Events** — Credit debits, topups, expirations flow through Kafka → workflow engine consumers → Supabase updates.

**Schema Prefix on All Queries** — All Supabase queries target `xayma_app.*` schema, never the public schema.

### Data Flow

```
Vue 3 App
    ↓
[Supabase JS SDK] — Read operations (RLS enforced)
    ↓
PostgreSQL (xayma_app schema)
    ↓
[Workflow Engine Webhooks] — Write/async operations
    ↓
[Kafka] — Credit events, deployments, notifications
    ↓
[deployment engine] — deployment engine for deployment orchestration
```

For detailed architecture rules, see [CLAUDE.md](CLAUDE.md).

## Project Structure

```
src/
├── components/          # Vue components (shared, feature-specific)
│   ├── common/         # Reusable UI (AppDataTable, AppHeader, etc.)
│   ├── deployments/    # DeploymentCard, DeploymentWizard
│   ├── credits/        # CreditMeter, CreditBundleCard
│   ├── partners/       # PartnerForm, PartnerStatusBadge
│   └── notifications/  # NotificationBell, NotificationFeed
├── pages/              # Vue Router page components
├── stores/             # Pinia state management (auth, partners, deployments)
├── composables/        # Reusable composition API logic
├── services/           # Supabase client, workflow engine service, settings
├── types/              # TypeScript types (domain + auto-generated from Supabase)
├── i18n/               # English (en.ts) and French (fr.ts) translations
├── lib/                # Utilities (formatters, validators, fixtures)
├── design-system/      # tokens.json (single source of truth for colors, spacing, etc.)
└── assets/             # Styles, icons, images
```

## Environment Variables

```bash
# Required: Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Required: Workflow Engine
VITE_WORKFLOW_ENGINE_BASE_URL=https://workflow-engine.your-domain.com

# Required: Payments
VITE_PAYMENT_GATEWAY_API_KEY=your_payment_gateway_public_key

# Optional: Monitoring
VITE_SENTRY_DSN=https://...
VITE_APP_ENV=development
```

Copy `.env.example` and update with your values:

```bash
cp .env.example .env.local
```

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — Architecture rules, slash commands, conventions, gotchas
- **[docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)** — Feature roadmap and sprint status
- **[docs/specs/](docs/specs/)** — Full technical specifications (8 documents)
- **[docs/design-system.md](docs/design-system.md)** — UI component patterns and layout rules
- **[docs/rls-policies.md](docs/rls-policies.md)** — Row-level security policy documentation

## Development Workflow

### Running Tests

```bash
# Unit + Component tests (watch mode)
npm run test

# Single run (CI)
npm run test:run

# E2E tests (interactive UI)
npm run test:e2e:ui

# E2E tests (headless)
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Linting & Formatting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
npm run type-check  # TypeScript strict check
```

### Supabase Migrations

```bash
npm run supabase:types  # Regenerate TypeScript types from schema
npm run supabase:push   # Push migrations to remote database
```

### Slash Commands

```bash
npm run new-feature <name>      # Scaffold a new feature end-to-end
npm run new-page <name>         # Create a new page with routing
npm run verify-task             # Self-check task implementation
npm run test-sprint             # Full E2E acceptance gate
npm run status                  # Sprint progress report
npm run visual-check            # Screenshot comparison vs mockup
```

## Contributing

1. Read [CLAUDE.md](CLAUDE.md) — it covers conventions, safety rules, and the architectural charter
2. Follow the style guide: TypeScript strict, Vue Composition API, Tailwind + design tokens, i18n for all strings
3. Write tests alongside code (unit tests co-located, E2E in `tests/e2e/`)
4. Run `/verify-task` after implementation — evidence before assertions
5. Create a pull request with a detailed description of why, not what

## Multi-Tenancy & Security

- **RLS by Company ID** — Every user belongs to one partner (company). Supabase RLS uses `auth.uid()` and `users.company_id` to enforce data isolation.
- **No Frontend Filtering** — If data appears missing, check RLS policies first. Never manually filter by role on the frontend.
- **Audit Trail** — All INSERT/UPDATE/DELETE on core tables flow through PostgreSQL audit triggers → `general_audit` table
- **Encrypted Credentials** — API keys and tokens are encrypted at rest, never logged or exposed

## Deployment

Deployed on Hetzner CX32 (management app) behind Traefik reverse proxy.

**Docker:**
```bash
docker build -t xayma-app:latest .
docker run -p 80:80 xayma-app:latest
```

**CI/CD:** GitHub Actions builds and pushes Docker images on tag.

See [docs/DEPLOYMENT_INFRASTRUCTURE.md](docs/specs/SPEC_08_DEPLOYMENT_INFRASTRUCTURE.md) for full infrastructure details.

## Known Issues & Gotchas

| Issue | Workaround |
|-------|-----------|
| Supabase queries must use `xayma_app.` prefix | Always prefix table names: `supabase.from("xayma_app.partners")` |
| Phone validation is West Africa specific | Use regex: `^(70\|75\|76\|77\|78)[0-9]{7}$` for Senegal |
| PrimeVue DataTable sticky header | Use `scrollHeight="flex"` + parent `height: calc(100vh - Xpx)` |
| `useRoute()` outside `setup()` | Only call inside `setup()` or composables |
| PrimeVue theme overrides | Only via `src/assets/styles/primevue-theme.css` CSS vars, never inline |

## License

Proprietary. Unauthorized copying or derivative works are prohibited.

---

**Built with ❤️ for SMEs in West Africa.**
