# IMPLEMENTATION PLAN — Xayma.sh
> v3 · Last updated: March 2026
> Stack: Vue 3 + TypeScript · PrimeVue 4 · Tailwind CSS · Supabase · n8n · Kafka · Docker · AWX · Traefik

---

## MVP Scope Definition

**v1.0 Launch (Sprints 1–6):** Full feature parity for all roles (Admin, Customer, Reseller, Sales) with working deployments, credits, and real-time automation. **Marketing site + Monitoring (Sprints 7–8) can shift to v1.1 if timeline compresses.**

If a blocking bug is found, drop lowest-priority features in order: Reseller commission tracker → Sales portfolio → Marketing site SEO → Dark mode.

---

## Overview

| Total sprints | 8 | ~16 weeks |
|---|---|---|
| Sprint length | 2 weeks | ~10 working days |
| Developer | 1 (solo) | AI-assisted via Claude Code |
| Launch target | April 2026 | After Sprint 8 complete |
| Environments | dev + production | No staging |
| MVP cutoff | After Sprint 6 | Full feature set: Sprints 1–8 |

### Sprint Map
| Sprint | Theme | Weeks |
|--------|-------|-------|
| 1 | Foundation, Auth & Dev Setup | 1–2 |
| 2 | Partner & User Management | 3–4 |
| 3 | Services & Deployments | 5–6 |
| 4 | Credits & Payments | 7–8 |
| 5 | Kafka + n8n Automation | 9–10 |
| 6 | Role Dashboards & Portals | 11–12 |
| 7 | Marketing Site (Nuxt + Strapi) | 13–14 |
| 8 | Monitoring, CI/CD & Hardening | 15–16 |

### Testing Convention (Two-Tier Model)

**Per-Task Gate** (`/verify-task` — run after every task):
- Unit tests with **mocked external services** (`vi.mock()` Supabase, n8n)
- All unit tests use typed fixtures from `tests/fixtures/`
- Coverage ≥80% on business logic
- ESLint + TypeScript type-check

**Per-Sprint Gate** (`/test-sprint` — run at sprint end only):
- Full E2E test suite with **real Supabase dev project** (no mocks)
- Dedicated test users per role (stored in `.env.test`)
- Coverage validation + visual regression screenshots
- Sprint is NOT done until `/test-sprint` passes

**Key Rule:** Unit tests NEVER hit real Supabase/n8n. E2E tests ALWAYS hit real services. This keeps per-task cycle fast (mocked), sprint validation complete (real).

---

## Sprint 0 — Prerequisites (Week 0, before Sprint 1 kickoff)
**Goal:** All external services, infrastructure, and local dev environment ready. Cannot start Sprint 1 without these.

### External Setup (1 week parallel with local setup)
- [ ] **0.1** Supabase project created; database schema migrated from `docs/specs/SPEC_05_DATABASE_DESIGN.md`; RLS enabled on all tables
- [ ] **0.2** GitHub repository (existing repo from v1) cleared for v2 rewrite; create `v2-rewrite` branch; configure branch protection on `main` (no commits directly, PR + CI/CD required)
- [ ] **0.3** DockerHub account created; set up private image repository for `xayma-app` and `xayma-cms`
- [ ] **0.4** Hetzner CX32 (management) + CX52 (first customer node) provisioned; SSH access verified
- [ ] **0.5** Domain `blog.xayma.net` registered + DNS control verified; set up `my.xayma.net` and `strapi-cms.xayma.net` CNAME records
- [ ] **0.6** Datadog account created (or similar monitoring SaaS); install agent skeleton
- [ ] **0.7** Paytech merchant account submitted for approval (parallel with dev work)
- [ ] **0.8** Sentry project created; DSN saved to `.env.example`

### Local Dev Setup
- [x] **0.9** Dev Container configured: Node 20 Bookworm, Docker, Playwright dependencies (see Sprint 1.9 contingency)
- [x] **0.10** `.env.example` created with all vars (Supabase URL/anon key, n8n base URL, Paytech keys, Sentry DSN, Datadog API key)
- [x] **0.11** Confirm design system tokens from `docs/mockups/DESIGN-SYSTEM.md` are finalized; no changes to design during sprints

**Sprint 0 blocking gate:** All checklist items ✅ before Sprint 1 day 1.

---

## Sprint 1 — Foundation, Auth & Dev Setup
**Goal:** Working app shell with authentication, routing, role guards, and full dev tooling.

### Setup Tasks
- [x] **1.1** Initialize Vue 3 + TypeScript + Vite project inside Dev Container (Node 20 Bookworm)
- [x] **1.2** Install and configure PrimeVue 4 (Aura theme); install Tailwind CSS v3; set up `primevue-theme.css` for CSS var overrides matching design system colors
- [x] **1.3** Create `src/design-system/tokens.json` — **map from `docs/mockups/DESIGN-SYSTEM.md`**: primary `#00288e`, secondary `#fd761a`, surface hierarchy (4 levels), **NO shadows/gradients/rounded corners** except badges; document in `docs/design-system.md`; update `primevue-theme.css` with all CSS variable mappings
- [x] **1.4** Configure vue-router with `AppLayout.vue` (PrimeVue Sidebar + header) and `AuthLayout.vue` (centered card)
- [x] **1.5** Set up Pinia; create `auth.store.ts` skeleton
- [x] **1.6** Configure vue-i18n v11 with `src/i18n/en.ts` and `src/i18n/fr.ts`; add language toggle to header
- [x] **1.7** Set up Sentry (`@sentry/vue`); configure for dev + production environments
- [x] **1.8** Configure Vitest + Vue Test Utils; create `vitest.config.ts`; add first smoke test
- [x] **1.9** Configure Playwright; create `playwright.config.ts`; install Chromium via `npx playwright install chromium --with-deps`
- [x] **1.10** Configure `vibe-annotations-server`; add helper script at `scripts/vibe-annotations.sh` with `pending`, `watch`, `resolve` commands
- [x] **1.11** Set up `.claude/agents/` (css-design, vue-specialist, n8n-specialist, test-writer, pr-reviewer, lead) and `.claude/commands/` (new-feature, new-page, verify-task, test-sprint, status, visual-check, n8n-workflow, db-migration)
- [x] **1.12** Create `.env.example` with all required vars; document in `README.md`
- [ ] **1.13** **SECURITY AUDIT:** Add CI check to prevent Supabase service role key in built bundle; document in `docs/runbook.md` that service role key = n8n only, never frontend

### Auth Tasks
- [x] **1.14** Integrate Supabase JS SDK; create `src/services/supabase.ts` singleton
- [x] **1.15** Generate initial Supabase TypeScript types (`npm run supabase:types`)
- [x] **1.16** Build Login page (`/login`) — PrimeVue InputText + Password + Button; VeeValidate + Zod schema; check `docs/mockups/` for reference
- [x] **1.17** Build Register page (`/register`) — firstname, email, phone (validate against West Africa regex: `^(70|75|76|77|78)[0-9]{7}$`), company name; Zod schema; PrimeVue form
- [x] **1.18** Implement `auth.store.ts` — `signIn()`, `signOut()`, `restoreSession()` on app mount, `onAuthStateChange` listener
- [x] **1.19** Implement `useAuth()` composable — `isAdmin`, `isCustomer`, `isReseller`, `isSales`, `isSupport` computed refs
- [x] **1.20** Implement Vue Router `beforeEach` guard — redirect to `/login` if no session; redirect by role on successful login
- [x] **1.21** Build role-aware sidebar nav (PrimeVue `PanelMenu`) — different items per role; collapses to icon-only on tablet; check `docs/mockups/` for layout
- [x] **1.22** Build Header component — logo, breadcrumb, language toggle, PrimeVue `Badge` on notification bell, user avatar + `Menu` dropdown (no dark mode toggle yet)

### Sprint 1 Tests
- [x] **1.T1** Unit: `auth.store.test.ts` — signIn success, signIn failure, signOut, session restore
- [x] **1.T2** Unit: `useAuth.test.ts` — role checks return correct booleans for each `user_role` value
- [x] **1.T3** Unit: Login form validation — invalid email, empty password, valid submission triggers store action
- [x] **1.T4** Unit: Register phone validation — rejects non-West-Africa format; accepts valid (70–78) format
- [ ] **1.T5** `/verify-task` passes on each task above before checking off
- [x] **1.T6** E2E sprint gate: `tests/e2e/auth.spec.ts`
  - Login with valid credentials → redirected to correct dashboard per role
  - Login with invalid credentials → PrimeVue Toast error shown in FR and EN
  - Unauthorized route → redirected to `/login`
  - Session persists after page refresh
  - Logout clears session, redirects to `/login`

**Sprint 1 done when:** `/test-sprint` E2E gate passes. All checklist items ✅.

---

## Sprint 2 — Partner & User Management
**Goal:** Admin can fully CRUD partners and users. Foundation for all downstream features.

### Tasks
- [x] **2.1** Build `src/services/partners.service.ts` — CRUD for `xayma_app.partners`; typed with generated `Database` types
- [x] **2.2** Build `src/services/users.service.ts` — CRUD for `xayma_app.users`
- [x] **2.3** Build `partner.store.ts` — list, selected partner, credit balance; Realtime subscription for credit updates
- [x] **2.4** Build `AppDataTable.vue` wrapper around PrimeVue `DataTable` — global search, column toggle, CSV export, paginator
- [x] **2.5** Build Partners list page (`/partners`) — `AppDataTable`, status filter (`Dropdown`), partner_type filter; admin-only route
- [x] **2.6** Build `PartnerForm.vue` — PrimeVue `InputText`, `InputMask` for phone (West Africa validation: `^(70|75|76|77|78)[0-9]{7}$`), `Dropdown` for type/status; VeeValidate + Zod; slug auto-generation; check `docs/mockups/` for reference
- [x] **2.7** Build Create Partner `Dialog` (uses `PartnerForm.vue`)
- [x] **2.8** Build Partner detail page (`/partners/:id`) — `TabView` (Profile / Deployments / Credits / Audit); status controls via `SplitButton`
- [x] **2.9** Build `PartnerStatusBadge.vue` and `PartnerTypeBadge.vue` — PrimeVue `Tag` component, color-coded per enum value
- [x] **2.10** Build Users list page (`/users`) — `AppDataTable` with linked partner name; admin-only
- [x] **2.11** Build User detail page (`/users/:id`) — edit role (`Dropdown`), link partner, deactivate (`ToggleButton`)
- [x] **2.12** Build Credit Purchase Options page (`/credit-options`) — volume discount tier CRUD; `DataTable` with inline edit; admin-only
- [x] **2.13** Implement Supabase RLS policies for `partners` and `users` — admin full access; customers see own record only; **document RLS logic in `docs/rls-policies.md`**
- [x] **2.14** Add PostgreSQL audit triggers for `partners` and `users` tables (INSERT/UPDATE/DELETE → `general_audit`); document in `docs/audit-triggers.sql`
- [x] **2.15** Build Profile page (`/profile`) — PrimeVue `InputText`, `Dropdown` for language + currency; `Button` save; check `docs/mockups/` for reference
- [x] **2.16** Build Audit Log page (`/audit`) — `DataTable` filterable by table_name, action, user, date range (`Calendar`); admin-only; check `docs/mockups/` for reference
- [x] **2.17** Add i18n keys (EN + FR) for all new strings

### Sprint 2 Tests
- [x] **2.T1** Unit: `partners.service.test.ts` — create, update, status change, phone validation (West Africa regex)
- [x] **2.T2** Unit: `partner.store.test.ts` — list loads, credit balance updates via mocked Realtime
- [x] **2.T3** Unit: `PartnerForm.vue` — phone regex rejects invalid numbers (e.g., 60-69, non-numeric); slug auto-generates correctly from name
- [x] **2.T4** Unit: `PartnerStatusBadge.vue` — renders correct PrimeVue `Tag` severity for each status enum
- [x] **2.T5** Unit: RLS policies — partner record invisible to non-admin users without matching company_id
- [x] **2.T6** E2E sprint gate: `tests/e2e/partners.spec.ts`
  - Admin creates partner → appears in DataTable with correct status badge
  - Admin suspends partner → status badge updates; partner record reflects new status
  - Customer sees only their own partner record (RLS check — other partner returns empty)
  - Phone number with invalid format is rejected with i18n error message
  - Audit log shows mutation with correct old/new values
- [x] **2.T7** Screenshots: Partners list (desktop + mobile), Partner detail TabView, Audit log

**Sprint 2 done when:** `/test-sprint` E2E gate passes. All checklist items ✅.

---

## Sprint 3 — Services & Deployments
**Goal:** Admin configures services; customers deploy instances; AWX integration works end-to-end.

### Tasks
- [x] **3.1** Build `src/services/services.service.ts` — CRUD for `xayma_app.services` and `xayma_app.serviceplans`
- [x] **3.2** Build `src/services/deployments.service.ts` — CRUD for `xayma_app.deployments`
- [x] **3.3** Build `src/services/n8n.ts` — webhook caller with typed payloads, retry on 5xx, error normalization
- [x] **3.4** Build Control Nodes page (`/control-nodes`) — `DataTable` + create/edit `Dialog`; admin-only
- [x] **3.5** Build Services page (`/services`) — service catalogue, `ToggleButton` for `isPubliclyAvailable`; admin-only
- [x] **3.6** Build Service detail page (`/services/:id`) — `TabView` (Plans / AWX Config); plan CRUD via inline `DataTable` edit
- [x] **3.7** Build Deployments list page (`/deployments`) — role-aware (admin sees all, customer/reseller see own); `SelectButton` status filter; check `docs/mockups/` for reference
- [x] **3.8** Build `DeploymentCard.vue` — PrimeVue `Card` with `Tag` status badge, `ProgressBar` credit meter, domain link, `SplitButton` actions; check `docs/mockups/` for design
- [x] **3.9** Build New Deployment wizard (`/deployments/new`) — PrimeVue `Steps` (4 steps); check `docs/mockups/` for each step:
  - Step 1: Pick service (`DataView` grid of service cards)
  - Step 2: Pick plan + version (`SelectButton`)
  - Step 3: Label (`InputText`) + domain names (`Chips` input; **validate via `valid_domain_array()` PostgreSQL function, NOT client-side regex**)
  - Step 4: Confirm + credit check (block + `Message` error if insufficient balance)
- [ ] **3.10** Implement deployment credit check before submission — read `partner.remainingCredits` from store; block if < `monthlyCreditConsumption`
- [ ] **3.11** On deployment INSERT → call n8n webhook via `src/services/n8n.ts`; payload: control node, job template, partner, plan, domain
- [x] **3.12** Build Deployment detail page (`/deployments/:id`) — status history (`Timeline`), domain(s), plan, action `ButtonGroup`
- [ ] **3.13** Implement Supabase Realtime subscription for `deployments` — live status updates without page refresh
- [x] **3.14** Build `DeploymentStatusBadge.vue` — PrimeVue `Tag` with correct severity per `deployment_status` enum
- [ ] **3.15** Configure Ansible playbooks: `deploy_odoo.yml`, `stop_odoo.yml`, `start_odoo.yml`, `restart_odoo.yml`, `add_traefik_route.yml`
- [ ] **3.16** Implement AWX job call in n8n (HTTP node); update `deployments.status` on success/fail via Supabase
- [x] **3.17** Implement RLS policies for `deployments` and `services`
- [x] **3.18** Add i18n keys (EN + FR) for all new strings

### Sprint 3 Tests
- [x] **3.T1** Unit: `deployments.service.test.ts` — create, status update, credit check helper
- [x] **3.T2** Unit: `n8n.service.test.ts` — webhook called with correct payload; 5xx triggers retry; error normalized
- [x] **3.T3** Unit: Deployment wizard — Step 4 blocks when credits < plan consumption; domain `Chips` input calls `valid_domain_array()` PostgreSQL function to validate (NOT JS regex)
- [x] **3.T4** Unit: `DeploymentStatusBadge.vue` — correct PrimeVue `Tag` severity for each status
- [x] **3.T5** E2E sprint gate: `tests/e2e/deployments.spec.ts`
  - Customer completes wizard → status shows `pending_deployment` immediately
  - Status transitions to `deploying` then `active` (mock AWX n8n response)
  - Domain appears as clickable link when status is `active`
  - Stop/Start actions update status in real time via Realtime (no page refresh)
  - Customer cannot access another partner's deployment (RLS — returns empty)
  - Wizard Step 4 blocked with error when credits insufficient
- [x] **3.T6** Screenshots: Deployment list, wizard each step (4), deployment detail

**Sprint 3 done when:** `/test-sprint` E2E gate passes. All checklist items ✅.

---

## Sprint 4 — Credits & Payments
**Goal:** Paytech payment flow works; credits add correctly; suspension/resumption automated.

### Tasks
- [x] **4.1** Build `src/services/credits.service.ts` — credit transaction CRUD, balance helpers
- [x] **4.2** Build `useCurrency.ts` composable — format amounts in FCFA/USD/EUR based on user preference; use `Intl.NumberFormat`; **ALL numeric output wrapped in `<span class="font-mono">` (IBM Plex Mono)**
- [x] **4.3** Build Credit Buy page (`/credits/buy`) — PrimeVue `DataView` grid of `CreditBundleCard.vue` per partner type with discount tiers; check `docs/mockups/` for design
- [x] **4.4** Build `CreditBundleCard.vue` — PrimeVue `Card`, price in FCFA (IBM Plex Mono), discount `Badge`, expiry duration, instance count, `Button` select; check `docs/mockups/` for reference
- [ ] **4.5** Implement Paytech checkout — frontend calls n8n webhook → n8n POSTs to Paytech API → returns `payment_url` → frontend redirects user
- [x] **4.6** Build payment return pages — `/credits/success` (PrimeVue `ProgressSpinner` while waiting for IPN) and `/credits/cancel`
- [ ] **4.7** Implement n8n Paytech IPN workflow — receive callback, verify token, update `credit_transactions.status → completed`, update `partners.remainingCredits`, publish `credit.topup` to Kafka
- [ ] **4.8** Implement idempotency in IPN handler — skip processing if transaction `status` already `completed`
- [x] **4.9** Build Credit History page (`/credits/history`) — `DataTable` with type `Tag`, amount (IBM Plex Mono), date (ISO 8601), status; `Calendar` date range filter; paginated; check `docs/mockups/` for reference
- [x] **4.10** Build `CreditMeter.vue` — PrimeVue `ProgressBar` with dynamic color (green >30%, amber 10–30%, red <10%); days-remaining estimate in IBM Plex Mono; expiry date `Tag`; check `docs/mockups/` for design
- [ ] **4.11** Wire `CreditMeter` to Supabase Realtime on `partners.remainingCredits` — live updates without refresh
- [ ] **4.12** Implement credit threshold alerts — publish `notification.send` Kafka event at 20% and 10% remaining
- [ ] **4.13** Implement reseller volume discount — auto-apply in buy flow from `partner_credit_purchase_options`; display savings amount
- [ ] **4.14** Implement credit expiry in n8n — daily cron zeroes expired credits; publishes `credit.expiry`
- [ ] **4.15** Implement credit debt logic in n8n consumer — respect `allowCreditDebt` flag + `creditDebtThreshold`
- [x] **4.16** Build Voucher management page (`/vouchers`) — admin-only; `DataTable` with code, credits (IBM Plex Mono), max_uses, uses_count, expiry (ISO 8601), status `Tag`, partner_type restriction; deactivate action; check `docs/mockups/` for reference
- [ ] **4.17** Build "Generate Vouchers" `Dialog` — admin inputs: credit amount, quantity (1–100), expiry date (`Calendar`), partner_type restriction (`MultiSelect`), optional specific partner (`Dropdown`); generates codes server-side via n8n; check `docs/mockups/` for form layout
- [ ] **4.18** Implement n8n voucher generation workflow — receives parameters, generates unique `XAYMA-XXXX-XXXX` codes, bulk-inserts to `vouchers` table
- [ ] **4.19** Build "Redeem a Voucher" tab on Buy Credits page — `InputText` for code entry + `Button` redeem; clear i18n error states (invalid / expired / already redeemed / wrong type)
- [ ] **4.20** Implement n8n voucher redemption workflow — validate code → check expiry, status, partner_type, unique redemption → atomically increment `uses_count` + update status if fully redeemed → insert `credit_transaction` (`paymentMethod = 'voucher'`) → insert `voucher_redemption` → update `partners.remainingCredits` → publish `credit.topup` to Kafka
- [x] **4.21** Add i18n keys (EN + FR) for all voucher-related strings

### Sprint 4 Tests
- [x] **4.T1** Unit: `credits.service.test.ts` — transaction create, balance calculation, discount tier selection
- [ ] **4.T2** Unit: `CreditMeter.vue` — correct CSS class/color at >30%, 10–30%, <10%; days-remaining math
- [ ] **4.T3** Unit: `useCurrency.ts` — FCFA formatting (no decimals, space separator), USD/EUR (2 decimals)
- [ ] **4.T4** Unit: IPN idempotency — calling handler twice with same `ref_command` credits once only
- [x] **4.T5** E2E sprint gate: `tests/e2e/credits.spec.ts`
  - Customer clicks Buy Credits → Paytech redirect initiated (mock)
  - IPN received → credit balance updates in UI via Realtime (no page refresh)
  - Credit meter color changes at correct thresholds
  - Reseller sees correct discount per bundle size
  - Credit expiry zeroes balance (fast-forward cron test)
  - Partner with `allowCreditDebt = false` suspended at 0
- [ ] **4.T6** E2E: `tests/e2e/vouchers.spec.ts`
  - Admin generates batch of 5 vouchers → all appear in voucher DataTable
  - Customer redeems valid voucher → credits appear in balance in real time
  - Same customer tries to redeem same code again → blocked with i18n error
  - Expired voucher → correct i18n error message
  - Wrong partner type voucher → correct i18n error message
  - Admin deactivates voucher → redemption attempt returns invalid error
- [ ] **4.T7** Screenshots: Credit buy (customer + reseller), CreditMeter states, Credit history, Voucher management page, Redeem voucher tab

**Sprint 4 done when:** `/test-sprint` E2E gate passes. All checklist items ✅.

---

## Sprint 5 — Kafka + n8n Automation
**Goal:** All async operations flow through Kafka; credit deduction is reliable, accurate, and auditable.

### Tasks
- [ ] **5.1** Deploy Kafka (KRaft mode) on CX32 (`infra/kafka/`); **set `KAFKA_NODE_ID=1` in docker-compose**; create all topics via `infra/kafka/create_topics.sh`:
  `credit.debit`, `credit.topup`, `credit.expiry`, `deployment.created`, `deployment.suspend`, `deployment.resume`, `notification.send`, `audit.event`; document Kafka architecture in `docs/kafka.md`
- [ ] **5.2** Configure Kafka UI (internal, admin-only via Traefik auth); verify topics + consumer groups
- [ ] **5.3** Implement n8n credit deduction cron — runs every 15 minutes; calculates debit per active deployment per plan; publishes `credit.debit` events
- [ ] **5.4** Implement n8n `credit.debit` Kafka consumer — updates `partners.remainingCredits`; writes debit `credit_transaction`
- [ ] **5.5** Implement suspension trigger — credits reach 0 → publish `deployment.suspend` → n8n triggers AWX stop → update `deployments.status`
- [ ] **5.6** Implement resumption trigger — `credit.topup` event → check suspended deployments for partner → publish `deployment.resume` → AWX start
- [ ] **5.7** Implement notification fan-out n8n workflow — consumes `notification.send`; branches to: RapidPro (WhatsApp), Brevo (email), Africa's Talking (SMS), Supabase in-app insert
- [ ] **5.8** Configure RapidPro + Twilio integration in n8n (HTTP node → RapidPro API; auth token from `settings` table; FR + EN message templates defined in RapidPro)
- [ ] **5.9** Configure Brevo transactional email in n8n (native Brevo n8n node; HTML templates in FR + EN; verified sending domain)
- [ ] **5.10** Configure Africa's Talking SMS in n8n (HTTP node; West Africa number format)
- [ ] **5.11** Implement in-app notifications — n8n inserts to `xayma_app.notifications`; Vue subscribes via Supabase Realtime
- [x] **5.12** Build `NotificationBell.vue` — PrimeVue `OverlayBadge` with unread count; opens `NotificationFeed.vue` via `OverlayPanel`; check `docs/mockups/` for design
- [x] **5.13** Build Notifications page (`/notifications`) — PrimeVue `DataView` list; read/unread state; timestamps (ISO 8601); action links; check `docs/mockups/` for reference
- [ ] **5.14** Add Kafka consumer lag metric → Datadog custom metric (via Kafka UI REST API polled by n8n)

### Sprint 5 Tests
- [ ] **5.T1** Unit: Credit deduction calculation — per-plan per-15-min debit amounts correct for Starter (10cr/30d), Pro (20cr/30d), Enterprise (50cr/30d)
- [ ] **5.T2** Unit: Suspension logic — partner at 0 credits emits `deployment.suspend`; partner with debt threshold does not
- [ ] **5.T3** Unit: Notification fan-out — correct payload shape sent to each channel; FR/EN language selection based on user preference
- [ ] **5.T4** Unit: `NotificationBell.vue` — unread count increments on new Realtime event; clears on mark-all-read
- [ ] **5.T5** E2E sprint gate: `tests/e2e/notifications.spec.ts`
  - Credit warning appears in bell and `/notifications` without page refresh
  - Notification renders correct language per user setting
  - Mark as read removes unread indicator from bell
  - Suspension notification includes "Top up credits" CTA link
- [ ] **5.T6** E2E: `tests/e2e/automation.spec.ts`
  - 0 credits → deployment card shows `suspended` status (via mocked Kafka consumer)
  - Top up → deployment card returns to `active`
- [ ] **5.T7** Screenshots: Notification bell (with badge), OverlayPanel feed, Notifications page

**Sprint 5 done when:** `/test-sprint` E2E gate passes. All checklist items ✅.

---

## Sprint 6 — Role Dashboards & Portals
**Goal:** All 4 role dashboards polished and complete. Reseller and Sales portals fully functional.

### Tasks
- [x] **6.1** Install vue-echarts + Apache ECharts; create `src/components/charts/` wrappers: `LineChart.vue`, `BarChart.vue`, `DonutChart.vue`, `StatCard.vue`
- [x] **6.2** Build Admin dashboard — PrimeVue `Card` stat grid (total partners, active deployments, revenue today, failed deployments, Kafka lag); ECharts: deployments over time (line), credit deducted by plan (bar), revenue by partner type (donut); check `docs/mockups/` for layout
- [x] **6.3** Build Customer dashboard — `CreditMeter`, active deployments `DataView` (top 5 cards), days remaining (IBM Plex Mono), last payment date (ISO 8601), "Top Up" `Button` CTA; check `docs/mockups/` for reference
- [x] **6.4** Build Reseller dashboard — credit pool `CreditMeter`, all client deployments `DataTable` (filterable), clients at risk panel (`Panel` with red `Tag`), this month's spend (IBM Plex Mono); check `docs/mockups/` for layout
- [x] **6.5** Build Sales dashboard — portfolio size `StatCard`, new customers this month, pending commission estimate (IBM Plex Mono), at-risk customer `DataTable`; check `docs/mockups/` for reference
- [x] **6.6** Build Portfolio page (`/portfolio`) — Sales role only; `DataTable` with partner name, plan, credit status `Tag`, renewal date, last payment
- [x] **6.7** Build Commission tracker page (`/commissions`) — Sales role only; PrimeVue `Accordion` per customer showing acquisition bonus (3-month window) + ongoing renewal line; total earnings `StatCard`
- [ ] **6.8** Implement reseller deployment management — reseller can stop/start/manage any deployment under their account from their dashboard; cannot exceed credit pool
- [ ] **6.9** Build Settings page (`/settings`) — Admin only; PrimeVue `Accordion` grouped by category (Payments, Notifications, Limits, Infrastructure); inline edit for each key/value; check `docs/mockups/` for reference
- [ ] **6.10** Dark mode: **DEFER to v1.1** — Design system currently light-only; dark mode requires design system update + theme overhaul
- [ ] **6.11** Implement DataTable CSV export for all admin list pages via `AppDataTable.vue` export slot
- [ ] **6.12** Responsive polish — test all pages at 375px, 768px, 1280px; PrimeVue `DataTable` uses `responsiveLayout="stack"` on mobile
- [ ] **6.13** Accessibility pass — keyboard navigation, ARIA labels on icon-only buttons, focus rings visible, color contrast ≥4.5:1

### Sprint 6 Tests
- [ ] **6.T1** Unit: `StatCard.vue` — renders value, label, trend arrow correctly
- [ ] **6.T2** Unit: Commission calculation — acquisition bonus (10% × plan price × 3 months) and renewal (5% × plan/month) compute correctly for all plan types
- [ ] **6.T3** Unit: `useCurrency.ts` — formats FCFA/USD/EUR based on stored user preference
- [ ] **6.T4** E2E sprint gate: `tests/e2e/dashboards.spec.ts`
  - Admin dashboard stat cards load with correct values from DB
  - Customer dashboard credit balance matches `partners.remainingCredits`
  - Reseller sees all client deployments; at-risk row highlighted
  - Sales portfolio and commission totals are correct
- [ ] **6.T5** E2E: `tests/e2e/responsive.spec.ts`
  - Each dashboard at 375px — no horizontal scroll; sidebar collapses
  - DataTable at 375px — stacks into cards
- [ ] **6.T6** Screenshots (3 viewports each): Admin, Customer, Reseller, Sales dashboards + Commissions page

**Sprint 6 done when:** `/test-sprint` E2E gate passes. All checklist items ✅.

---

## Sprint 7 — Marketing Site (Nuxt + Strapi)
**Goal:** Public marketing site live at blog.xayma.net with CMS-driven content, SEO, and FR/EN support.

### Tasks
- [ ] **7.1** Initialize Nuxt 3 + TypeScript; configure `@nuxtjs/i18n`, `@nuxtjs/tailwindcss`, `@nuxtjs/seo`
- [ ] **7.2** Deploy Strapi on CX32 at `strapi-cms.xayma.net` (Traefik route, separate container from app); create content types: Blog, Feature, Testimonial, PricingFAQ; Nuxt fetches via HTTP to `strapi-cms.xayma.net/api`
- [ ] **7.3** Build Home page — hero (headline + "Get Started" CTA), features grid (6 cards), pricing comparison table (Starter/Pro/Enterprise + Reseller bundles), testimonials carousel, footer CTA
- [ ] **7.4** Build Pricing page — detailed plan table, reseller bundle section with discount tiers, FAQ accordion
- [ ] **7.5** Build Features page — "How it works" (3-step diagram), infrastructure highlights, payment method logos (Wave, Orange Money, Paytech)
- [ ] **7.6** Build Blog index + post pages — Strapi content; date, reading time, category
- [ ] **7.7** Build Contact page — form (name, email, company, message) + WhatsApp direct link
- [ ] **7.8** Build About page — founder story, West Africa focus, mission
- [ ] **7.9** Build Legal pages — Terms of Service, Privacy Policy (GDPR-aware language)
- [ ] **7.10** Configure Nuxt SEO — `useHead()` per page, Open Graph, `sitemap.xml`, `robots.txt`, canonical URLs
- [ ] **7.11** Configure Traefik routes for `my.xayma.net` (app), `blog.xayma.net` (marketing), and `strapi-cms.xayma.net` (CMS)
- [ ] **7.12** Translate all page content to French (default) + English — **~40 hours or budget for professional translator (~$500–$1000); coordinate timing at Sprint 7 midpoint**
- [ ] **7.13** Core Web Vitals check: LCP < 2.5s, CLS < 0.1 on Home page (Lighthouse CI)

### Sprint 7 Tests
- [ ] **7.T1** E2E sprint gate: `tests/e2e/marketing.spec.ts`
  - Home page renders hero, pricing table, footer without JS errors
  - Language toggle switches FR ↔ EN across all pages; URL prefix changes (`/en/`)
  - All "Get Started" CTAs link to `my.xayma.net/register`
  - Blog post renders Strapi content (mocked API)
  - Contact form submits and shows success `Toast`
- [ ] **7.T2** E2E: `tests/e2e/marketing-seo.spec.ts`
  - Each page has correct `<title>` and `og:description` in both languages
  - `sitemap.xml` reachable and contains all expected routes
- [ ] **7.T3** Screenshots: Home (desktop + mobile), Pricing, Blog index, Contact

**Sprint 7 done when:** `/test-sprint` E2E gate passes. Site reachable at `blog.xayma.net`. All checklist items ✅.

---

## Sprint 8 — Monitoring, CI/CD & Hardening
**Goal:** Production observable, deploys automated, security locked down, beta launched.

### Tasks
- [ ] **8.1** Set up Datadog agent on CX32 + all CX52 nodes (Docker integration); configure log collection for all containers
- [ ] **8.2** Create Datadog dashboard — active deployments, credit deductions/day, revenue, n8n errors, Kafka consumer lag, CX52 memory %
- [ ] **8.3** Configure Datadog alerts:
  - Container restart → immediate
  - Kafka consumer lag > 100 → warning
  - n8n workflow failure → immediate
  - CX52 memory > 85% → warning (add node)
  - Failed deployment rate > 10% → alert
  - Paytech IPN not received within 5 min of initiation → alert
- [ ] **8.4** Set up Datadog Synthetic monitors for `my.xayma.net` and `blog.xayma.net` (every 5 min)
- [ ] **8.5** Configure GitHub Actions `ci.yml` — on every PR: lint → type-check → `test:run` → build
- [ ] **8.6** Configure GitHub Actions `deploy.yml` — on merge to `main`: build Docker images → push DockerHub → SSH to CX32 → pull + redeploy → health check → Datadog event
- [ ] **8.7** Configure all GitHub Secrets (DockerHub, SSH key, Supabase anon key, Sentry DSN, Datadog API key)
- [ ] **8.8** Implement Docker volume backup cron on CX52 nodes → rsync to Contabo (see `SPEC_08`)
- [ ] **8.9** Implement weekly Supabase `pg_dump` → Contabo via n8n cron
- [ ] **8.10** Security hardening — disable SSH password auth on all nodes; UFW rules; restrict Portainer to admin IP; Supabase CORS to `my.xayma.net` only
- [ ] **8.11** Load test — **use k6 script** (`tests/load/deploy-and-credit.js`): 20 concurrent users through full deploy + credit deduction cycle; target: 0 errors, p95 response < 500ms; publish results to Datadog
- [ ] **8.12** Write `docs/runbook.md` — add CX52 node, restore from backup, roll back deploy, manually trigger credit deduction
- [ ] **8.13** Final QA — full user journey for each role (Admin, Customer, Reseller, Sales) on production URL
- [ ] **8.14** Soft launch — onboard 3–5 beta customers; collect NPS

### Sprint 8 Tests
- [ ] **8.T1** E2E sprint gate: `tests/e2e/production-smoke.spec.ts` (runs against `my.xayma.net`):
  - Login/logout per role
  - Create deployment (Paytech sandbox)
  - Credit meter updates in real time
  - Notification received on credit threshold
- [ ] **8.T2** CI: GitHub Actions `ci.yml` runs green on a test PR (lint + type-check + unit tests + build)
- [ ] **8.T3** CD: `deploy.yml` deploys successfully; health check passes
- [ ] **8.T4** Load: 20 concurrent users — 0 errors; average response < 500ms
- [ ] **8.T5** Security: Confirm service role key absent from all browser network requests (DevTools check)
- [ ] **8.T6** Backup: Restore a test volume from Contabo backup on a scratch node — succeeds

**Sprint 8 done when:** Production smoke tests pass. Beta customers onboarded. All checklist items ✅.

---

## Testing Summary

| Sprint | Unit tests | E2E tests | Screenshots |
|--------|-----------|-----------|-------------|
| 1 | auth.store, useAuth, login form | auth flows (5 scenarios) | login, register |
| 2 | partners.service, partner.store, PartnerForm, StatusBadge | partner CRUD, RLS, audit | partners list, detail, audit |
| 3 | deployments.service, n8n.service, wizard, StatusBadge | wizard, realtime status, RLS | wizard (4 steps), detail |
| 4 | credits.service, CreditMeter, useCurrency, IPN idempotency, voucher validation | payment flow, meter thresholds, expiry, voucher redeem + edge cases | buy page, meter states, history, vouchers page |
| 5 | deduction calc, suspension logic, notification fan-out, bell | automation flow, notification feed | bell, OverlayPanel, notifications page |
| 6 | StatCard, commission calc, useCurrency | all dashboards, responsive, dark mode | 4 dashboards × 3 viewports |
| 7 | — | marketing pages, i18n, SEO, contact | home, pricing, blog, contact |
| 8 | — | production smoke, load test, security | — |

---

## Cross-Sprint Dependencies

```
Sprint 1 (Auth + Setup) ──────────────────────────► All sprints depend on this
Sprint 2 (Partners) ──────────────────────────────► Sprints 3, 4, 5, 6
Sprint 3 (Deployments) ───────────────────────────► Sprints 4, 5, 6
Sprint 4 (Credits) ────────────────────────────────► Sprints 5, 6
Sprint 5 (Kafka + n8n) ────────────────────────────► Sprints 6, 8
Sprint 6 (Portals) ────────────────────────────────► Sprint 8 QA
Sprint 7 (Marketing) ─────────────────────────────► Sprint 8
Sprint 8 (Hardening) ─────────────────────────────► 🚀 Launch
```

---

## External Dependencies Checklist

**All Sprint 0 items MUST be ✅ before Sprint 1 day 1.**

| Dependency | Status | Needed by |
|-----------|--------|-----------|
| **SPRINT 0 (Blocking)** |
| Supabase project created + schema migrated from SPEC_05 | ⬜ | Sprint 1 |
| GitHub repo (existing v1) cleared + `v2-rewrite` branch created + `main` protection | ⬜ | Sprint 1 |
| DockerHub account + private image repo created | ⬜ | Sprint 1 |
| Domain `blog.xayma.net` registered + DNS control verified | ⬜ | Sprint 0 |
| Hetzner CX32 (mgmt) provisioned + SSH access | ⬜ | Sprint 0 |
| Hetzner CX52 (first node) provisioned + SSH access | ⬜ | Sprint 0 |
| Datadog account created | ⬜ | Sprint 0 |
| Dev Container configured (Node 20, Playwright deps) | ⬜ | Sprint 0 |
| **SPRINT 3–8 (Parallel)** |
| AWX installed on CX32 | ⬜ | Sprint 3 |
| Ansible playbooks for Odoo Community written | ⬜ | Sprint 3 |
| Paytech merchant account approved | ⬜ | Sprint 4 |
| WhatsApp Business API (RapidPro) approved | ⬜ | Sprint 5 |
| Africa's Talking SMS account active | ⬜ | Sprint 5 |
| Brevo (SendGrid alternative) account + domain verified | ⬜ | Sprint 5 |
| Logo SVG finalized | ⬜ | Sprint 7 |
| Contabo backup node provisioned | ⬜ | Sprint 8 |
| Design system tokens finalized (no changes after Sprint 1.3) | ⬜ | Sprint 1 |

---

## Specification References

Every sprint task should be informed by the authoritative specs. Before starting a sprint, read:

- **SPEC_02_USER_PERSONAS_FLOWS.md** — User journeys, flow diagrams, decision trees
- **SPEC_03_FEATURES_REQUIREMENTS.md** — Feature definitions, acceptance criteria, constraints
- **SPEC_05_DATABASE_DESIGN.md** — Table schemas, RLS policies, audit triggers
- **SPEC_06_API_SPECIFICATIONS.md** — n8n webhook contracts, Kafka topic schemas, error handling
- **SPEC_07_UI_UX_DESIGN.md** — Screen layouts, component specs (also see `docs/mockups/`)

**Rule:** If a task conflicts with a spec, update the spec before proceeding.

---

## Key Timeline Assumptions

- **Solo developer, AI-assisted** — assumes high velocity with automated testing + code review
- **No staging environment** — dev → production only; mirrors CLAUDE.md constraint
- **Aggressive scope:** Full 8-sprint plan required for v1.0 launch by April 2026
- **If blocked:** Drop features in order: Reseller commissions → Sales portfolio → Marketing SEO → Dark mode
- **Translation workload:** Budget ~40 hours or hire professional (Sprint 7 midpoint)

---

## Checklist Before Kickoff

Before Sprint 1, confirm:

- [ ] All Sprint 0 external dependencies ✅
- [ ] `.env.example` file created + committed
- [ ] Supabase schema migrated + RLS enabled
- [ ] Design system tokens in `src/design-system/tokens.json` + `docs/design-system.md` + `docs/mockups/` reviewed
- [ ] CLAUDE.md read and understood (especially architecture rules + gotchas)
- [ ] All 8 specs read (SPEC_02 through SPEC_08)
- [ ] `.claude/agents/` and `.claude/commands/` configured
- [ ] Datadog + Sentry projects created
- [ ] GitHub Actions CI/CD skeleton ready (will be built in Sprint 8)

**Blockers:** If ANY Sprint 0 item is ❌, delay Sprint 1 kickoff.
