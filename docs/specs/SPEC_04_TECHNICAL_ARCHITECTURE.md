# SPEC 04 — Technical Architecture
> Xayma.sh · v2 · Last updated: March 2026

---

## 1. Frontend Stack

### Management App (app.xayma.sh)
| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 + TypeScript (Composition API) |
| Build tool | Vite |
| State management | Pinia |
| Routing | Vue Router 4 |
| UI library | PrimeVue 4 + Tailwind CSS |
| Charts | Apache ECharts (vue-echarts) |
| Form validation | VeeValidate + Yup |
| i18n | vue-i18n v9 (FR + EN) |
| HTTP client | Supabase JS SDK (direct queries) + fetch for workflow engine webhooks |
| Real-time | Supabase WebSockets (Realtime) |
| Dev environment | VSCode Dev Container (Node 20 + Docker) |
| Containerization | Docker (multi-stage build) |
| CI/CD | GitHub Actions → DockerHub → Hetzner |

### Marketing Site (xayma.sh)
| Layer | Technology |
|-------|-----------|
| Framework | Nuxt 3 + TypeScript |
| CMS | Strapi (headless, self-hosted on CX32) |
| Styling | Tailwind CSS |
| i18n | @nuxtjs/i18n (FR + EN) |
| Deployment | Docker on CX32 behind Traefik |

---

## 2. Backend Stack

| Service | Role | Hosting |
|---------|------|---------|
| **Supabase** | PostgreSQL DB, Auth, Row-Level Security, Realtime WebSockets | Supabase Cloud (EU region) |
| **Workflow Engine** | Workflow automation (credit deduction, notifications, deployment engine triggers) | Self-hosted Docker on CX32 |
| **Deployment Engine** | Infrastructure automation for Docker container provisioning | Self-hosted Docker on CX32 |
| **Kafka** | Event streaming (credit.debit, credit.topup, deployment.suspend, etc.) | Self-hosted Docker on CX32 (KRaft mode, no Zookeeper) |
| **Traefik** | Reverse proxy, SSL termination, routing per customer domain | Self-hosted Docker on CX32 |
| **Strapi** | Headless CMS for marketing content | Self-hosted Docker on CX32 |
| **Datadog** | Monitoring, APM, log aggregation, alerting | Datadog Cloud |

---

## 3. Third-Party Integrations

| Service | Purpose | Integration method |
|---------|---------|-------------------|
| **Payment Gateway** | Payment processing (Wave, Orange Money, card) | REST API from frontend → workflow engine webhook for IPN |
| **RapidPro + Twilio** | WhatsApp notifications | Workflow engine HTTP node → RapidPro API → Twilio → WhatsApp |
| **Brevo** | Transactional email notifications (FR + EN templates) | Workflow engine Brevo node (native) |
| **Africa's Talking** | SMS notifications (West Africa) | Workflow engine HTTP node |
| **DockerHub** | Container image registry | GitHub Actions push |
| **Datadog** | Monitoring & alerting | Datadog agent on all Hetzner nodes |
| **Hetzner Cloud API** | Node provisioning (future) | Workflow engine HTTP node |

> **Email roadmap note:** Brevo covers all transactional email at launch (credit alerts, deployment confirmations, payment receipts). **Mautic** (self-hosted marketing automation) is planned for a future version to handle customer lifecycle campaigns, drip sequences, and onboarding flows. Mautic will run as an additional Docker service on CX32 when introduced.

---

## 4. Hard Technical Constraints

- **Supabase direct queries from frontend** — no custom REST API layer; all DB access goes through Supabase JS SDK with RLS enforcing authorization
- **Workflow engine as orchestrator** — all async/background operations (credit deduction, notifications, deployment engine calls) flow through workflow engine
- **Docker-only** — no Kubernetes at launch; all customer instances are Docker containers managed by deployment engine on Hetzner CX52 nodes
- **Kafka for credit events** — credit debit/credit operations must be event-sourced through Kafka for auditability and reliability; workflow engine consumes Kafka topics
- **Claude Code as primary dev tool** — `/mockups` folder contains reference UI designs; Claude Code reads these for implementation guidance
- **Dev Container** — all development happens inside VSCode Dev Container; no local Node installation required

---

## 5. Authentication & Authorization

| Layer | Mechanism |
|-------|-----------|
| Identity | Supabase Auth (email/password, JWT) |
| Session | JWT stored in httpOnly cookie (Nuxt) or localStorage (Vue SPA) |
| Authorization | Supabase RLS policies per table per role |
| Role enforcement | `users.user_role` ENUM checked in every RLS policy |
| Route guards | Vue Router `beforeEach` guard checks Pinia auth store |
| API security | Supabase anon key in frontend; service role key only in workflow engine server-side |

### RLS Policy Pattern
```sql
-- Example: customers can only see their own partner record
CREATE POLICY "customer_own_partner" ON xayma_app.partners
FOR SELECT USING (
  id = (SELECT company_id FROM xayma_app.users WHERE id = auth.uid())
);
```

---

## 6. Architectural Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    HETZNER CX32 (Management Node)            │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────────────┐  │
│  │  Traefik │  │Deployment│  │Workflow│  │    Kafka     │  │
│  │ (proxy)  │  │ Engine   │  │ Engine │  │  (KRaft)     │  │
│  └────┬─────┘  └────┬─────┘  └───┬────┘  └──────┬───────┘  │
│       │              │            │               │           │
│  ┌────┴─────┐  ┌─────┴──────┐    │         ┌────┴────────┐  │
│  │  Strapi  │  │  Portainer │    │         │  Datadog    │  │
│  │  (CMS)   │  │            │    │         │  Agent      │  │
│  └──────────┘  └────────────┘    │         └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │           │
         ▼                    ▼           ▼
┌─────────────┐    ┌──────────────┐   ┌──────────────────────┐
│  Supabase   │    │  Hetzner     │   │  External Services   │
│  (Cloud EU) │    │  CX52 Nodes  │   │  Payment Gateway, Brevo, │
│  DB+Auth+RT │    │  (Customer   │   │  RapidPro+Twilio,    │
│             │    │  containers) │   │  Africa's Talking,   │
│             │    │              │   │  DockerHub           │
└─────────────┘    └──────────────┘   └──────────────────────┘
         ▲
         │ Supabase JS SDK
         │ (direct queries + WebSocket)
┌─────────────────────────────┐
│  Vue 3 SPA (app.xayma.sh)  │
│  Nuxt 3 (xayma.sh)         │
└─────────────────────────────┘
         ▲
         │ Browser
┌─────────────────────────────┐
│  End Users                  │
│  (Admin/Customer/Reseller/  │
│  Sales)                     │
└─────────────────────────────┘
```

### Key Data Flows

| Flow | Path |
|------|------|
| User login | Vue → Supabase Auth → JWT → Pinia store |
| Deploy instance | Vue → Supabase insert (deployment) → workflow engine webhook → deployment engine job → Docker on CX52 → Traefik route |
| Credit deduction | Kafka topic (credit.debit) → workflow engine consumer → Supabase update → Realtime → Vue UI |
| Payment | Vue → Payment Gateway API → Payment Gateway IPN → workflow engine webhook → Supabase credit update → Kafka |
| Notification | Workflow engine → RapidPro+Twilio (WhatsApp) / Brevo (email) / Africa's Talking (SMS) / Supabase Realtime (in-app) |
| Marketing content | Nuxt → Strapi REST API → rendered SSR page |

---

## 7. Kafka Topics

| Topic | Producer | Consumer | Purpose |
|-------|---------|---------|---------|
| `credit.debit` | Workflow engine (cron every 15min) | Workflow engine | Deduct credits per active deployment |
| `credit.topup` | Workflow engine (Payment Gateway IPN) | Workflow engine | Add credits on payment |
| `credit.expiry` | Workflow engine (cron daily) | Workflow engine | Mark expired credits |
| `deployment.created` | Supabase trigger | Workflow engine | Trigger deployment engine deploy job |
| `deployment.suspend` | Workflow engine (credit=0) | Workflow engine | Trigger deployment engine stop job |
| `deployment.resume` | Workflow engine (credit topup) | Workflow engine | Trigger deployment engine start job |
| `notification.send` | Workflow engine | Workflow engine | Fan-out to all notification channels |
| `audit.event` | Workflow engine | Workflow engine | Write to general_audit table |
