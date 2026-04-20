# PROJECT STRUCTURE — Xayma.sh
> Recommended file and folder layout for Claude Code and the solo developer.

---

```
xayma/
│
├── app/                                    # Vue 3 Management SPA
│   ├── .devcontainer/
│   │   ├── devcontainer.json               # VSCode Dev Container config
│   │   └── Dockerfile                      # Node 20 + tools
│   │
│   ├── src/
│   │   ├── assets/
│   │   │   ├── images/                     # Logo, illustrations
│   │   │   └── styles/
│   │   │       ├── main.css                # Tailwind base + custom tokens
│   │   │       └── primevue-theme.css      # PrimeVue theme overrides
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── AppDataTable.vue        # Wrapper around PrimeVue DataTable
│   │   │   │   ├── AppModal.vue            # Standard modal shell
│   │   │   │   ├── AppConfirmDialog.vue    # Delete/suspend confirmation
│   │   │   │   ├── AppStatusBadge.vue      # Color-coded status chip
│   │   │   │   ├── AppEmptyState.vue       # Empty list placeholder
│   │   │   │   ├── AppPageHeader.vue       # Page title + action slot
│   │   │   │   └── AppLoadingSpinner.vue
│   │   │   │
│   │   │   ├── credits/
│   │   │   │   ├── CreditMeter.vue         # Progress bar + days remaining
│   │   │   │   ├── CreditTransactionRow.vue
│   │   │   │   └── CreditBundleCard.vue    # Plan picker card for buy flow
│   │   │   │
│   │   │   ├── deployments/
│   │   │   │   ├── DeploymentCard.vue      # Status card with actions
│   │   │   │   ├── DeploymentStatusBadge.vue
│   │   │   │   ├── DeploymentWizard.vue    # Multi-step new deployment
│   │   │   │   └── DeploymentLogViewer.vue # deployment engine job log stream
│   │   │   │
│   │   │   ├── partners/
│   │   │   │   ├── PartnerForm.vue         # Create/edit partner form
│   │   │   │   ├── PartnerStatusBadge.vue
│   │   │   │   └── PartnerTypeBadge.vue
│   │   │   │
│   │   │   └── notifications/
│   │   │       ├── NotificationBell.vue    # Header bell with unread count
│   │   │       ├── NotificationFeed.vue    # Dropdown feed
│   │   │       └── NotificationItem.vue
│   │   │
│   │   ├── composables/
│   │   │   ├── useAuth.ts                  # Role checks, session helpers
│   │   │   ├── useDeployments.ts           # Deployment CRUD + realtime
│   │   │   ├── useCredits.ts               # Credit balance + transactions
│   │   │   ├── usePartners.ts              # Partner CRUD
│   │   │   ├── useNotifications.ts         # In-app notification subscription
│   │   │   ├── useI18n.ts                  # Language toggle helper
│   │   │   ├── useCurrency.ts              # FCFA/USD/EUR formatting
│   │   │   └── useDataTable.ts             # Shared DataTable state (pagination, filters)
│   │   │
│   │   ├── layouts/
│   │   │   ├── AppLayout.vue               # Sidebar + header shell
│   │   │   └── AuthLayout.vue              # Centered auth card shell
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.vue
│   │   │   │   └── RegisterPage.vue
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.vue       # Role-aware: shows correct dashboard
│   │   │   │
│   │   │   ├── deployments/
│   │   │   │   ├── DeploymentsPage.vue     # List view
│   │   │   │   ├── DeploymentDetailPage.vue
│   │   │   │   └── NewDeploymentPage.vue
│   │   │   │
│   │   │   ├── credits/
│   │   │   │   ├── BuyCreditsPage.vue
│   │   │   │   ├── CreditHistoryPage.vue
│   │   │   │   ├── PaymentSuccessPage.vue
│   │   │   │   └── PaymentCancelPage.vue
│   │   │   │
│   │   │   ├── partners/
│   │   │   │   ├── PartnersPage.vue        # Admin only
│   │   │   │   └── PartnerDetailPage.vue
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── UsersPage.vue           # Admin only
│   │   │   │   └── UserDetailPage.vue
│   │   │   │
│   │   │   ├── services/
│   │   │   │   ├── ServicesPage.vue        # Admin only
│   │   │   │   └── ServiceDetailPage.vue
│   │   │   │
│   │   │   ├── control-nodes/
│   │   │   │   └── ControlNodesPage.vue    # Admin only
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   └── SettingsPage.vue        # Admin only
│   │   │   │
│   │   │   ├── audit/
│   │   │   │   └── AuditLogPage.vue        # Admin only
│   │   │   │
│   │   │   ├── portfolio/
│   │   │   │   └── PortfolioPage.vue       # Sales only
│   │   │   │
│   │   │   ├── commissions/
│   │   │   │   └── CommissionsPage.vue     # Sales only
│   │   │   │
│   │   │   ├── notifications/
│   │   │   │   └── NotificationsPage.vue   # All roles
│   │   │   │
│   │   │   └── profile/
│   │   │       └── ProfilePage.vue         # All roles
│   │   │
│   │   ├── router/
│   │   │   ├── index.ts                    # Route definitions + meta (requiredRole)
│   │   │   └── guards.ts                   # beforeEach guard
│   │   │
│   │   ├── stores/
│   │   │   ├── auth.store.ts               # Session, user, role
│   │   │   ├── partner.store.ts            # Current partner, credit balance
│   │   │   ├── deployments.store.ts        # Deployments list + realtime
│   │   │   └── notifications.store.ts      # In-app notifications
│   │   │
│   │   ├── services/
│   │   │   ├── supabase.ts                 # Supabase client singleton
│   │   │   ├── auth.service.ts
│   │   │   ├── partners.service.ts
│   │   │   ├── users.service.ts
│   │   │   ├── deployments.service.ts
│   │   │   ├── services.service.ts         # Supabase services/serviceplans
│   │   │   ├── credits.service.ts
│   │   │   ├── settings.service.ts
│   │   │   ├── audit.service.ts
│   │   │   └── workflow engine.service.ts              # workflow engine webhook calls
│   │   │
│   │   ├── types/
│   │   │   ├── database.types.ts           # Auto-generated from Supabase
│   │   │   ├── partner.types.ts
│   │   │   ├── deployment.types.ts
│   │   │   ├── credit.types.ts
│   │   │   ├── user.types.ts
│   │   │   └── notification.types.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── currency.ts                 # FCFA/USD/EUR formatting
│   │   │   ├── date.ts                     # Date formatting helpers
│   │   │   ├── slug.ts                     # Auto-generate slug from name
│   │   │   ├── validators.ts               # Phone, domain, email validators
│   │   │   └── creditCalc.ts               # Days remaining from credits
│   │   │
│   │   ├── i18n/
│   │   │   ├── index.ts                    # vue-i18n setup
│   │   │   ├── fr.ts                       # French translations
│   │   │   └── en.ts                       # English translations
│   │   │
│   │   ├── App.vue
│   │   └── main.ts
│   │
│   ├── Dockerfile                          # Multi-stage: build + nginx serve
│   ├── nginx.conf                          # SPA fallback config
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── .env.local                          # gitignored — local dev vars
│   ├── .env.example                        # committed — template
│   └── package.json
│
├── marketing/                              # Nuxt 3 Marketing Site
│   ├── pages/
│   │   ├── index.vue                       # Home
│   │   ├── pricing.vue
│   │   ├── features.vue
│   │   ├── about.vue
│   │   ├── contact.vue
│   │   ├── blog/
│   │   │   ├── index.vue
│   │   │   └── [slug].vue
│   │   └── legal/
│   │       ├── terms.vue
│   │       └── privacy.vue
│   ├── components/
│   │   ├── AppHeader.vue
│   │   ├── AppFooter.vue
│   │   ├── PricingTable.vue
│   │   └── FeatureCard.vue
│   ├── i18n/
│   │   ├── fr.ts
│   │   └── en.ts
│   ├── Dockerfile
│   ├── nuxt.config.ts
│   └── package.json
│
├── mockups/                                # UI reference designs
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── admin-dashboard.png
│   │   │   ├── customer-dashboard.png
│   │   │   ├── reseller-dashboard.png
│   │   │   └── sales-dashboard.png
│   │   ├── deployments/
│   │   │   ├── deployment-list.png
│   │   │   ├── deployment-wizard-step1.png
│   │   │   ├── deployment-wizard-step2.png
│   │   │   ├── deployment-wizard-step3.png
│   │   │   └── deployment-detail.png
│   │   ├── credits/
│   │   │   ├── credit-buy.png
│   │   │   └── credit-history.png
│   │   └── partners/
│   │       ├── partner-list.png
│   │       └── partner-detail.png
│   ├── marketing/
│   │   ├── home.png
│   │   ├── pricing.png
│   │   └── features.png
│   └── README.md                           # Color tokens, component names, conventions
│
├── infra/                                  # Infrastructure as Code
│   ├── docker-compose.prod.yml             # CX32 management node stack
│   ├── traefik/
│   │   ├── traefik.yml                     # Static config
│   │   └── dynamic/
│   │       ├── xayma.yml                   # Platform routes
│   │       └── customers/                  # Per-customer routes (deployment engine-generated)
│   ├── ansible/
│   │   ├── deploy_odoo.yml                 # Provision Odoo instance on CX52
│   │   ├── stop_odoo.yml
│   │   ├── start_odoo.yml
│   │   ├── restart_odoo.yml
│   │   ├── delete_odoo.yml
│   │   ├── add_traefik_route.yml
│   │   └── inventory/
│   │       └── hosts.yml
│   └── kafka/
│       ├── kafka.env                       # KRaft mode config
│       └── create_topics.sh                # Initialize all Kafka topics
│
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Lint + type-check on PR
│       └── deploy.yml                      # Build + push + deploy on main
│
├── CLAUDE.md                               # Architecture rules for Claude Code
├── IMPLEMENTATION_PLAN.md                  # Sprint tasks with checkboxes
└── README.md                               # Getting started, env setup
```

---

## Notes

- **`/mockups`** is read-only reference — never edited programmatically, only by the developer adding design screenshots
- **`/infra/ansible/deploy_odoo.yml`** is the most critical playbook — it provisions a complete Odoo instance on CX52; changes here affect all future deployments
- **`database.types.ts`** is auto-generated; never edit manually. Regenerate with: `npx supabase gen types typescript --project-id <id> > src/types/database.types.ts`
- **`.env.local`** is gitignored; `.env.example` is committed and documents all required vars
- The `app/` and `marketing/` folders are separate npm projects — each has its own `package.json`, `Dockerfile`, and CI/CD step
