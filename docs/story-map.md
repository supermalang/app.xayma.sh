# Story Map — Xayma.sh

*Generated: 2026-06-29 · Based on: PRODUCT.md, SPEC_01–07, ROADMAP.md, full src/ audit*

> **Legend**
> | Symbol | Meaning |
> |---|---|
> | ✅ | Built and connected end-to-end |
> | 🔧 | UI page/component exists; backend not fully wired or untested E2E |
> | ⬜ | Roadmap task exists (open) |
> | ⚠️ GAP | No roadmap task and no implementation — journey step has no story yet |

---

## Persona 1 — Customer "Fatou" (SME owner deploying her first app)

**Backbone:**
| Discover | Register | Onboard | Buy Credits | Deploy | Monitor | Manage | Renew | Off-board |
|---|---|---|---|---|---|---|---|---|
| Learn about Xayma | Create account | First-run setup | Purchase via FCFA | Run wizard | Watch status | Stop/start/restart | Top up before expiry | Terminate + close |

---

### Release 1 — Walking skeleton (register → buy → deploy → go live)

| Activity | Step | Story | Status |
|---|---|---|---|
| Discover | Find product | Visit marketing site (xayma.sh) | ⚠️ GAP — marketing site separate project |
| Discover | Click "Get Started" | Redirect to app.xayma.sh/register | ⚠️ GAP — cross-site link not built |
| Register | Land on register page | View registration form | ✅ `Register.vue` |
| Register | Fill registration form | Name, email, company, phone (West Africa format) | ✅ `Register.vue` + Supabase Auth |
| Register | Submit form | Account created, email verification sent | ✅ Supabase Auth magic link |
| Register | Verify email | Click link in email → account activated | ✅ Supabase Auth |
| Register | Password reset | Request forgotten password link | ✅ Supabase Auth password reset |
| Onboard | First login | Redirect to customer dashboard | ✅ router guard + `CustomerDashboard.vue` |
| Onboard | See empty state | Dashboard shows 0 deployments + balance 0 | 🔧 `CustomerDashboard.vue` empty state |
| Onboard | Update profile | Set display name, language preference | ✅ `Profile.vue` |
| Buy Credits | Navigate to Buy | Click "Buy Credits" CTA | 🔧 `Credits/Buy.vue` route accessible |
| Buy Credits | Select bundle | Choose 10/20/40 credit bundle | 🔧 `Credits/Buy.vue` bundle selection |
| Buy Credits | Initiate checkout | POST → initiateCheckout → payment URL | ⬜ XAYMA-103 (n8n workflow not built) |
| Buy Credits | Pay via Wave | Complete payment on gateway page | ⚠️ GAP — payment gateway config needed |
| Buy Credits | Pay via Orange Money | Complete payment on gateway page | ⚠️ GAP — payment gateway config needed |
| Buy Credits | IPN received | n8n receives server-to-server callback | ⬜ XAYMA-104 (IPN handler not built) |
| Buy Credits | Credits appear | Realtime balance update on dashboard | ⬜ XAYMA-104 (Kafka credits.topup flow) |
| Buy Credits | Redirect back | App.xayma.sh/credits/success shows confirmation | 🔧 `Credits/Success.vue` Realtime poll |
| Buy Credits | Payment cancelled | Redirected to /credits/cancel with message | ✅ `Credits/Cancel.vue` |
| Buy Credits | Payment failed | Error shown with retry option | 🔧 `Credits/Buy.vue` error state |
| Deploy | Open deployment wizard | Navigate to /deployments/new | 🔧 `DeploymentWizard.vue` 4-step UI |
| Deploy | Step 1 — pick service | Select from published service catalogue | ✅ `listServices` query |
| Deploy | Step 2 — pick plan | Choose Starter / Pro / Enterprise | ✅ `getServicePlansByServiceId` |
| Deploy | Step 3 — name + domain | Set deployment label + prefixed domain | ✅ domain validation via DB fn |
| Deploy | Credit sufficiency check | Wizard warns if credits < 1 day of plan cost | 🔧 `hasPartnerSufficientCredits` exists, UI gate partial |
| Deploy | Step 4 — confirm + submit | Fire-and-forget POST → n8n | ⬜ XAYMA-100 + XAYMA-101 + XAYMA-102 |
| Deploy | correlationId attached | Deployment slug included in webhook payload | ⬜ XAYMA-100 |
| Deploy | n8n routes to Kafka | Central notification workflow publishes event | ⬜ XAYMA-101 |
| Deploy | AWX provisions containers | Consumer triggers AWX job template | ⬜ XAYMA-102 |
| Monitor | See "pending" status | Deployment card shows pending_deployment | 🔧 `Deployments.vue` + `DeploymentCard.vue` |
| Monitor | Status transitions | deploying → active via Realtime (AWX callback) | ⬜ XAYMA-102 (AWX callback WF) |
| Monitor | Deployment goes live | Status = "active", URL shown on card | 🔧 `DeploymentDetail.vue` URL display |
| Monitor | Receive "live" notification | WhatsApp + email with deployment URL | ⚠️ GAP — sendNotification n8n WF not built |
| Monitor | View deployment detail | See URL, status, plan, created date | 🔧 `DeploymentDetail.vue` |

---

### Release 2 — Operational loop (credits drain → alerts → suspend → renew)

| Activity | Step | Story | Status |
|---|---|---|---|
| Monitor | Credit burn meter | Real-time display of balance depletion rate | ⚠️ GAP — 15-min Kafka debit cron not built |
| Monitor | See monthly consumption | Cost estimate based on active deployments | 🔧 `getPartnerTotalMonthlyConsumption` wired in History.vue |
| Monitor | Balance update in real time | Dashboard reflects each Kafka debit event | ⚠️ GAP — Realtime subscription to credit_transactions not wired |
| Monitor | 20% credits warning | WhatsApp + email + in-app alert | ⚠️ GAP — threshold check in debit consumer not built |
| Monitor | 10% credits warning | Second, more urgent alert | ⚠️ GAP |
| Monitor | Deployment suspended at 0% | Status → "suspended", containers stopped | ⚠️ GAP — xayma.deployments.suspend Kafka flow not built |
| Monitor | Suspension notification | WhatsApp + email + in-app alert | ⚠️ GAP |
| Monitor | Grace period countdown | Dashboard shows days remaining before data loss | ⚠️ GAP — grace period field not surfaced in UI |
| Renew | Buy more credits | Navigate to Credits/Buy.vue | 🔧 (same as Release 1 Buy Credits flow) |
| Renew | Deployment auto-resumes | Status → "active" after Kafka credits.topup | ⚠️ GAP — auto-resume trigger not built |
| Renew | Resume notification | WhatsApp + email confirming deployment is live again | ⚠️ GAP |
| Manage | View deployment list | See all own deployments with status badges | 🔧 `Deployments.vue` |
| Manage | Stop a deployment | Button fires stop action → n8n | ⚠️ GAP — xayma.deployments.stop consumer not built |
| Manage | Start a deployment | Button fires start action → n8n | ⚠️ GAP — xayma.deployments.start consumer not built |
| Manage | Restart a deployment | Button fires restart action → n8n | ⚠️ GAP — xayma.deployments.restart consumer not built |
| Manage | Terminate a deployment | Confirm dialog → terminate → AWX teardown | ⚠️ GAP — xayma.deployments.terminate consumer not built |
| Manage | Edit deployment label | Rename instance inline | 🔧 `EditInstanceDialog.vue` — Supabase update only, no n8n |
| Manage | Retry failed deployment | See error reason + retry button on failed card | ⚠️ GAP — retry flow and error reason display not built |
| Manage | View deployment logs | Stream real-time AWX job output | ⚠️ GAP — no log viewer page or n8n log-stream WF |

---

### Release 3 — Full customer experience (notifications, vouchers, history, export)

| Activity | Step | Story | Status |
|---|---|---|---|
| Buy Credits | View credit history | Paginated list of all transactions | ✅ `Credits/History.vue` |
| Buy Credits | View transaction detail | Full detail of one payment (method, date, amount) | ✅ `Credits/TransactionDetail.vue` |
| Buy Credits | Redeem a voucher | Enter code → credits added instantly | 🔧 `Credits/Buy.vue` voucher tab UI exists; `redeemVoucher` n8n WF missing |
| Buy Credits | Payment receipt email | Email confirmation after successful payment | ⚠️ GAP — sendNotification not built for payments |
| Monitor | In-app notification feed | Bell icon → full notification list | 🔧 `Notifications.vue` UI exists; data source not wired to n8n |
| Monitor | Mark notification as read | Click → mark single notification read | 🔧 `Notifications.vue` has UI button; DB write may work |
| Monitor | Mark all notifications read | Bulk action button | 🔧 `Notifications.vue` |
| Monitor | Domain management | Add/edit domain names for a deployment | ⚠️ GAP — no domain management UI or n8n flow |
| Off-board | Terminate all deployments | Terminate each one via manage flow | ⚠️ GAP — batch terminate not built |
| Off-board | Request account deletion | GDPR deletion request | ⚠️ GAP |

---

## Persona 2 — Admin "Mamadou" (platform operator)

**Backbone:**
| Configure Services | Manage Partners | Manage Users | Monitor Platform | Handle Incidents | Audit | Configure Settings |
|---|---|---|---|---|---|---|
| Build service catalogue | CRUD partners + credit grants | Invite / deactivate users | Watch all deployments | Intervene on failures | Review events | Engine URLs + thresholds |

---

### Release 1 — Minimum admin ops (configure service → customer can deploy it)

| Activity | Step | Story | Status |
|---|---|---|---|
| Configure Services | View service list | See all configured services | 🔧 `Services.vue` list |
| Configure Services | Create a service | Name, slug, logo, plans, AWX template | 🔧 `CreateService.vue` — form built, AWX template link partial |
| Configure Services | Fetch AWX job templates | Dropdown populated from deployment engine | 🔧 `fetchDeploymentTemplates` exists; needs live engine |
| Configure Services | Set service plans | Starter/Pro/Enterprise with credit cost | 🔧 `CreateService.vue` plan config |
| Configure Services | Publish service | Set isPubliclyAvailable = true | 🔧 toggle exists in form |
| Configure Services | Edit existing service | Update plans, logo, or AWX template | 🔧 `services/:id/edit` route exists; edit page status unclear |
| Configure Services | View service detail | Read-only view of a configured service | 🔧 `ServiceDetail.vue` |
| Configure Services | Manage control nodes | Add Hetzner CX32/CX52 nodes | 🔧 `ControlNodes.vue` |
| Configure Services | Control node detail | View node specs, health, assigned deployments | ⚠️ GAP — no detail page, no health check |
| Manage Partners | Create partner | Name, type (Customer/Reseller), credit allocation | 🔧 `Partners.vue` create form |
| Manage Partners | View partner list | Filterable table of all partners | 🔧 `Partners.vue` |
| Manage Partners | View partner detail | Deployments, balance, user list, history | 🔧 `PartnerDetail.vue` |
| Manage Partners | Edit partner | Update contact, type, grace period | 🔧 `PartnerDetail.vue` edit |
| Manage Partners | Suspend partner | Suspend → cascade stop all deployments | ⚠️ GAP — cascade not implemented (Kafka flow missing) |
| Manage Partners | Reactivate partner | Unsuspend → auto-resume deployments | ⚠️ GAP |
| Manage Partners | Add credits to partner | Admin credit grant (promotional) | ⚠️ GAP — no admin credit override flow |
| Monitor Platform | Admin dashboard | KPIs: active deployments, total credit usage, revenue | 🔧 `AdminDashboard.vue` — charts exist, data not all wired |
| Monitor Platform | View all deployments | Filterable list across all partners | 🔧 `Deployments.vue` (admin sees all via RLS) |
| Configure Settings | Platform settings | Engine URLs, API keys, credit price, thresholds | ✅ `Settings.vue` + xayma_app.settings table |
| Configure Settings | Test engine connection | Ping workflow/deployment engine | ✅ `testEngineConnection` in Settings.vue |

---

### Release 2 — User management + vouchers + audit

| Activity | Step | Story | Status |
|---|---|---|---|
| Manage Users | View all users | List of all platform users | 🔧 `Users.vue` |
| Manage Users | View user detail | User info, role, partner assignment | 🔧 `UserDetail.vue` |
| Manage Users | Invite user to partner | Send email invite, assign role | ⚠️ GAP — invite flow not built (Supabase invite only) |
| Manage Users | Deactivate user | Disable login without deleting | ⚠️ GAP |
| Manage Partners | Generate single voucher | Admin creates one promotional voucher | 🔧 `Vouchers/Management.vue` + `GenerateVouchersDialog.vue` |
| Manage Partners | Generate voucher batch | Admin creates up to 100 vouchers at once | 🔧 `GenerateVouchersDialog.vue` batch mode |
| Manage Partners | View voucher list | Status, code, credits, expiry, usage count | 🔧 `Vouchers/Management.vue` list view |
| Manage Partners | Deactivate voucher | Disable unredeemed voucher | 🔧 `Vouchers/Management.vue` deactivate action |
| Manage Partners | Voucher redeemed (Kafka) | Redemption publishes credits.topup → same as payment | ⚠️ GAP — redeemVoucher n8n WF not built |
| Audit | View audit log | All create/update/delete events across all entities | 🔧 `AuditLog.vue` — reads general_audit table |
| Audit | Filter audit log | By entity, actor, date range | 🔧 `AuditLog.vue` filter UI |
| Audit | Export audit log | CSV/JSON export of filtered results | ⚠️ GAP — no export functionality |

---

### Release 3 — Analytics + monitoring + incident handling

| Activity | Step | Story | Status |
|---|---|---|---|
| Monitor Platform | ECharts analytics | Revenue trend, deployment stats, credit usage charts | 🔧 `AdminDashboard.vue` — vue-echarts components; data not all wired |
| Monitor Platform | View all credit transactions | Paginated cross-partner transaction log | ⚠️ GAP — admin view of all transactions not built |
| Monitor Platform | Deployment engine health | Real-time health check of AWX/n8n/Kafka | ⚠️ GAP — no monitoring dashboard for infrastructure |
| Handle Incidents | View failed deployments | Filter list by status = "failed" | 🔧 `Deployments.vue` status filter |
| Handle Incidents | Manually update deployment status | Override status for stuck deployments | ⚠️ GAP — admin manual status override not built |
| Handle Incidents | View deployment logs | See AWX job output for any deployment | ⚠️ GAP — no log viewer |
| Handle Incidents | Send manual notification | Push ad-hoc message to a partner | ⚠️ GAP |
| Configure Settings | Payment gateway config | Enter Payment Gateway credentials + test | 🔧 `Settings.vue` — VITE_PAYMENT_GATEWAY_API_KEY env var; gateway config UI partial |
| Configure Settings | Export data | CSV/JSON export of partners/deployments | ⚠️ GAP |

---

## Persona 3 — Reseller "Ibrahima" (IT integrator managing 10+ clients)

**Backbone:**
| Register/Onboard | Buy Credits (bulk) | Deploy for Clients | Monitor Portfolio | Report to Clients |
|---|---|---|---|---|
| Reseller account setup | Purchase with volume discount | Create deployments per client | Consolidated multi-deployment view | Credit usage & status sharing |

---

### Release 2 — Reseller operations (critical for volume)

| Activity | Step | Story | Status |
|---|---|---|---|
| Register/Onboard | Register as reseller | Same Register.vue; Admin sets type=Reseller | 🔧 `Register.vue` works; Admin must set reseller type manually |
| Register/Onboard | Reseller dashboard | Consolidated view of all client deployments | 🔧 `ResellerDashboard.vue` — layout built; data not wired |
| Buy Credits (bulk) | View reseller bundles | Bundle selector shows 10/20/40 instance tiers | ⚠️ GAP — discount tiers not in roadmap; regular bundles shown |
| Buy Credits (bulk) | Volume discount applied | Discount auto-calculated from tier (10/20/40%) | ⚠️ GAP |
| Buy Credits (bulk) | Credit expiry per tier | 30/45/60 days per bundle size | ⚠️ GAP — expiry tracking not built |
| Buy Credits (bulk) | Bulk payment checkout | Same FCFA checkout flow as customer | ⬜ XAYMA-103 + XAYMA-104 (shared with customer) |
| Deploy for Clients | Deploy on behalf of client | Reseller creates deployment tied to their account | ⚠️ GAP — sub-partner association flow not built |
| Deploy for Clients | Assign deployment to client | Tag a deployment with client label | ⚠️ GAP |
| Monitor Portfolio | View all client deployments | List filtered by Reseller account | 🔧 `ResellerDashboard.vue` — partner_id filter exists in `listDeployments` |
| Monitor Portfolio | Filter by client/status | Drill down per logical client | ⚠️ GAP — client grouping not implemented |
| Monitor Portfolio | See credit pool usage | Total credits vs total monthly burn | ⚠️ GAP — pool-level consumption view not built |
| Monitor Portfolio | Low-credit alert | Notification when pool drops below threshold | ⚠️ GAP |
| Report to Clients | Weekly consolidated report | Email with all client deployment statuses | ⚠️ GAP — no scheduled report WF |
| Report to Clients | Per-client credit usage | Breakdown by deployment of credit consumption | ⚠️ GAP |

---

## Persona 4 — Sales "Aissatou" (internal sales rep)

**Backbone:**
| View Portfolio | Track Commissions | Follow Up on Renewals |
|---|---|---|
| See her assigned customers | Monitor acquisition + renewal earnings | Alert on customers at low credits |

---

### Release 3 — Sales tools

| Activity | Step | Story | Status |
|---|---|---|---|
| View Portfolio | Sales dashboard | Overview of her portfolio | 🔧 `SalesDashboard.vue` layout; data not wired |
| View Portfolio | Customer list | All partners assigned to her | 🔧 `Portfolio.vue` — list view |
| View Portfolio | Filter by credit risk | Show customers with <20% credits remaining | ⚠️ GAP — risk filter not built |
| View Portfolio | Customer deployment summary | See how many deployments each customer has | ⚠️ GAP — per-customer deployment count in portfolio |
| Track Commissions | View commission earnings | Acquisition bonus + renewal bonus breakdown | 🔧 `Commissions.vue` — UI layout; commission data source not confirmed wired |
| Track Commissions | Commission per period | Filter commissions by month/quarter | ⚠️ GAP |
| Track Commissions | Download commission report | CSV/PDF export of commissions | ⚠️ GAP |
| Follow Up on Renewals | Low-credit alert in portfolio | Visual flag when customer drops below threshold | ⚠️ GAP — no real-time credit status in portfolio |
| Follow Up on Renewals | Receive low-credit push | Notification/email when portfolio customer at risk | ⚠️ GAP — sendNotification not configured for sales alerts |
| Follow Up on Renewals | Sales creates customer account | ADMIN + SALES interaction: create partner for new customer | ⚠️ GAP — sales-initiated partner creation flow not built |

---

## Persona 5 — Support (read-only platform assistant)

**Backbone:**
| View Customer State | View Deployment State | Manual Status Override |
|---|---|---|
| Read partner info | Read deployment logs + status | Manually unstick a deployment |

> Note: Support role defined in SPEC_02 Table 1 but no dedicated dashboard implemented yet.

### Release 3 — Support tooling

| Activity | Step | Story | Status |
|---|---|---|---|
| View Customer State | View any partner | Read-only view of partner detail | ⚠️ GAP — Support role has no dashboard; uses Admin views in read-only mode via RLS |
| View Deployment State | View any deployment | Read-only deployment detail with status history | ⚠️ GAP — Support-specific view not built |
| View Deployment State | View deployment logs | Read AWX job output | ⚠️ GAP — no log viewer |
| Manual Status Override | Update deployment status | Override "stuck" deployment status | ⚠️ GAP — status override not built (SPEC_02: Support can update deployment status) |

---

## Cross-cutting system journeys

| Domain | Step | Story | Status |
|---|---|---|---|
| Platform | Theme toggle | Switch dark/light mode | ✅ dark/light toggle built (SPEC_03 nice-to-have confirmed) |
| Platform | Language switch | Toggle FR ↔ EN at any time | ✅ `vue-i18n` + `Profile.vue` language selector |
| Platform | Session persistence | Refresh browser — stay logged in | ✅ Supabase session persistence |
| Platform | Session expiry | Token expired → redirect to /login | ✅ router auth guard |
| Platform | Role-based routing | Each role lands on correct dashboard | ✅ `requiredRole` meta on routes |
| Platform | Route guard | Unauthorized access → redirect to /login | ✅ router guard |
| Credits | 15-min Kafka debit | Cron publishes credit.debit for each active deployment | ⚠️ GAP — debit cron n8n WF not built |
| Credits | Credit expiry | Expired credits removed from balance | ⚠️ GAP — expiry tracking not implemented |
| Credits | Grace period mgmt | Partner type determines grace period duration | ⚠️ GAP — grace period not surfaced |
| Notifications | WhatsApp delivery | All alert triggers → WhatsApp Business API | ⚠️ GAP — sendNotification n8n WF not built |
| Notifications | Email delivery | All alert triggers → SMTP/SendGrid | ⚠️ GAP |
| Notifications | SMS delivery | All alert triggers → Africa's Talking | ⚠️ GAP |
| Notifications | In-app delivery | n8n writes to notifications table → Realtime → `Notifications.vue` | ⚠️ GAP — write path from n8n not built |
| Deployments | AWX callback updates status | AWX sends result → n8n callback WF → Supabase | ⬜ XAYMA-102 |
| Deployments | DLQ handling | 3 retries → .dlq topic → status = "failed" + alert | ⚠️ GAP — DLQ handler n8n WF not built |
| Deployments | Suspend cascade | Suspend partner → all active deployments suspended | ⚠️ GAP |
| Deployments | Resume cascade | Credit topup → all suspended deployments resumed | ⚠️ GAP |

---

## Gap summary

| # | Gap description | Affects | Priority |
|---|---|---|---|
| G-01 | `initiateCheckout` n8n workflow not built | Customer + Reseller: Buy Credits | 🔴 Blocker for Revenue |
| G-02 | Payment IPN handler + `xayma.credits.topup` Kafka flow | Customer: Credits appear after payment | 🔴 Blocker for Revenue |
| G-03 | Deployment stop/start/restart/terminate n8n consumers | Customer: Manage deployments | 🔴 Blocker for Operations |
| G-04 | Deployment suspend/resume flow (credits ↔ 0%) | Customer: Credit lifecycle | 🔴 Blocker for Operations |
| G-05 | `sendNotification` n8n WF (WhatsApp/Email/SMS) | All personas: Alerts + confirmations | 🟠 High |
| G-06 | `redeemVoucher` n8n WF + Kafka credits.topup | Admin + Customer: Vouchers | 🟠 High |
| G-07 | Credit debit cron (15-min Kafka events per active deployment) | Customer: Credit burn visibility | 🟠 High |
| G-08 | Partner suspension cascade (Admin suspends → deployments stop) | Admin: Partner management | 🟠 High |
| G-09 | DLQ handler n8n WF (3 retries → .dlq → status = failed + alert) | Platform: Resilience | 🟠 High |
| G-10 | In-app notifications write path (n8n → notifications table → Realtime) | All: In-app notification feed | 🟠 High |
| G-11 | Reseller volume discount tiers (10/20/40 instance bundles) | Reseller: Buy Credits | 🟡 Medium |
| G-12 | Credit expiry (30/45/60 days per bundle size) | Customer + Reseller: Credit lifecycle | 🟡 Medium |
| G-13 | Deployment logs viewer (stream AWX job output in real time) | Customer + Admin: Incident handling | 🟡 Medium |
| G-14 | Admin partner credit override (admin grants credits directly) | Admin: Promotional ops | 🟡 Medium |
| G-15 | Failed deployment retry flow (error reason displayed + retry button) | Customer: Deploy | 🟡 Medium |
| G-16 | Low-credit alert for sales portfolio | Sales: Follow Up | 🟡 Medium |
| G-17 | Admin support for user invite/deactivation | Admin: User management | 🟡 Medium |
| G-18 | Control node health check and detail page | Admin: Infrastructure | 🟡 Medium |
| G-19 | Reseller weekly consolidated usage report (email) | Reseller: Reporting | 🟡 Medium |
| G-20 | Domain name management per deployment | Customer: Manage | 🟡 Medium |
| G-21 | Support role dashboard / manual status override | Support: Platform ops | 🟢 Low |
| G-22 | CSV/JSON export (audit log, partners, transactions) | Admin + Sales: Reporting | 🟢 Low |
| G-23 | Marketing site → register cross-site link | Customer: Discover | 🟢 Low |
| G-24 | Commission period filter + PDF export | Sales: Track Commissions | 🟢 Low |

---

## Impact map — Goal: first paying customer deploys and stays live

- **Actor: Customer (Fatou)**
  - **Impact:** completes wizard and sees deployment go live
    - **Deliverable:** XAYMA-100 correlationId in webhook payload · ⬜ open
    - **Deliverable:** XAYMA-101 central notification WF · ⬜ open
    - **Deliverable:** XAYMA-102 create deployment consumer + AWX callback · ⬜ open
  - **Impact:** has credits before deploying
    - **Deliverable:** G-01 `initiateCheckout` n8n workflow · ⬜ XAYMA-103 open
    - **Deliverable:** G-02 IPN handler + Kafka credits.topup · ⬜ XAYMA-104 open
  - **Impact:** deployment stays live (credits don't run out silently)
    - **Deliverable:** G-07 credit debit cron (Kafka debit every 15 min) · ⚠️ no task yet
    - **Deliverable:** G-05 alerts at 20% and 10% · ⚠️ no task yet
    - **Deliverable:** G-04 suspend at 0%, resume on top-up · ⚠️ no task yet

- **Actor: Admin (Mamadou)**
  - **Impact:** has a service configured so customers can deploy
    - **Deliverable:** CreateService + deployment template link · 🔧 UI exists, needs E2E verification
  - **Impact:** can see platform health
    - **Deliverable:** AdminDashboard KPIs · 🔧 UI exists, needs data wiring
  - **Impact:** can suspend a bad actor without losing data
    - **Deliverable:** G-08 partner suspension cascade · ⚠️ no task yet

- **Actor: Reseller (Ibrahima)**
  - **Impact:** can deploy for multiple clients from one account
    - **Deliverable:** G-11 reseller bundle tiers · ⚠️ no task yet
    - **Deliverable:** G-01/G-02 shared checkout flow · ⬜ XAYMA-103/104

---

## Story count summary

| Persona | Total stories | ✅ Built | 🔧 Partial | ⬜ Tasked | ⚠️ Gap |
|---|---|---|---|---|---|
| Customer (Fatou) | 47 | 11 | 16 | 9 | 11 |
| Admin (Mamadou) | 36 | 3 | 19 | 0 | 14 |
| Reseller (Ibrahima) | 14 | 0 | 4 | 2 | 8 |
| Sales (Aissatou) | 10 | 0 | 3 | 0 | 7 |
| Support | 4 | 0 | 0 | 0 | 4 |
| Cross-cutting | 15 | 5 | 0 | 2 | 8 |
| **Total** | **126** | **19** | **42** | **13** | **52** |

*19 stories fully built end-to-end · 42 have UI but need backend wiring · 13 have open roadmap tasks · 52 are undiscovered gaps with no task yet*

---

*Next: `/planner` to create roadmap tasks for G-07, G-04, G-05, G-08 (the operational loop that keeps a deployment live after Sprint 1 ships).*
