# SPEC 01 — Project Overview
> Xayma.sh · v2 · Last updated: March 2026

---

## 1. Name & Description

**Name:** Xayma.sh
**Tagline:** Deploy Odoo in minutes. Pay as you go. Grow your business.
**One-sentence description:** Xayma.sh is a credit-based SaaS platform that lets businesses and resellers in West Africa deploy, manage, and scale Odoo Community instances through a self-service portal — without any infrastructure knowledge.

---

## 2. Problem Statement

SMEs in West Africa that want to adopt Odoo face three hard blockers:
- **No local infrastructure expertise** — setting up a server, Docker, and Odoo is beyond most small businesses
- **No affordable managed option** — international Odoo SaaS providers (Odoo.sh) are priced for European/North American markets
- **No reseller-friendly model** — IT integrators and digital agencies have no white-label, multi-tenant platform to resell Odoo to their clients

Xayma.sh solves all three by providing a fully managed, credit-based, multi-tenant Odoo deployment platform built for the West African market, with pricing in FCFA, payments via Wave/Orange Money/Paytech, and a reseller programme with volume discounts.

---

## 3. Primary Users

| Profile | Description | Experience Level |
|---------|-------------|-----------------|
| **Admin** | Platform operator (you) — manages all entities, infrastructure, settings | Technical |
| **Customer** | SME owner or manager deploying Odoo for their own business | Non-technical |
| **Reseller** | IT integrator or digital agency deploying Odoo for their clients | Semi-technical |
| **Sales** | Sales consultant tracking their portfolio and commissions | Non-technical |

---

## 4. Timeline & Milestones

| Milestone | Target Date |
|-----------|-------------|
| Spec & design complete | April 2026 (launch) |
| Sprint 1 — Foundation & Auth | Week 1–2 |
| Sprint 2 — Partner & User management | Week 3–4 |
| Sprint 3 — Services & Deployments | Week 5–6 |
| Sprint 4 — Credits & Payments | Week 7–8 |
| Sprint 5 — Kafka + n8n automation | Week 9–10 |
| Sprint 6 — Customer & Reseller portals | Week 11–12 |
| Sprint 7 — Marketing site (Strapi + Nuxt) | Week 13–14 |
| Sprint 8 — Monitoring, CI/CD, hardening | Week 15–16 |
| **Public launch** | **1 April 2026** |

---

## 5. Team & Resources

- **Team size:** Solo developer
- **Frontend:** Vue 3 + TypeScript (SPA), Nuxt 3 (marketing site)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime), n8n (automation)
- **Infrastructure:** Hetzner CX32 (management), CX52 nodes (customer instances)
- **Tooling:** Claude Code (AI-assisted development), VSCode Dev Container, GitHub Actions

---

## 6. Success Metrics

| Metric | Target (Month 3) | Target (Month 6) |
|--------|-----------------|-----------------|
| Paying customers | 10 | 40 |
| Active reseller accounts | 3 | 20 |
| Monthly revenue | 320,000 FCFA | 960,000 FCFA |
| Deployment success rate | >95% | >98% |
| Credit deduction accuracy | 100% | 100% |
| Uptime (platform) | Best effort | Best effort |

---

## 7. Competitive Landscape

| Competitor | Weakness | Xayma.sh advantage |
|-----------|----------|-------------------|
| Odoo.sh | EUR pricing, no African payment methods, no reseller model | FCFA pricing, Wave/Orange Money, reseller programme |
| Generic VPS providers | No managed Odoo, requires technical setup | Fully managed, one-click deploy |
| Local IT integrators | Manual setup, no self-service, no SLA | Self-service portal, automated provisioning, credit model |
| OCA hosting partners | No West Africa presence | Local market focus, local payments, local support |

**Key differentiators:**
1. Credit-based prepaid model (no subscription risk for customers)
2. Reseller programme with volume discounts and white-label capability
3. All major West African payment methods supported
4. FCFA + USD + EUR pricing
5. French + English interface
6. WhatsApp + SMS notifications (culturally appropriate for the region)

---

## 8. Product Roadmap

### v1 — Launch (current build)
Everything in the 8-sprint implementation plan. Transactional notifications only (credit alerts, deployment events, payment confirmations) via Brevo (email), RapidPro+Twilio (WhatsApp), Africa's Talking (SMS).

### v2 — Growth
- **Mautic marketing automation** (self-hosted Docker on CX32)
  - Full omnichannel customer lifecycle campaigns
  - **Channels:** Web pixel (tracking), Gmail, WhatsApp, Twitter/X, Facebook/Instagram, Google Search (via UTM + Mautic tracking), SMS
  - **Use cases:** Lead nurturing sequences, trial-to-paid conversion drips, win-back campaigns for churned customers, reseller onboarding journeys, seasonal promotions (end of fiscal year, back-to-school)
  - **Segmentation:** By partner type, plan, credit balance, deployment count, last activity, language
  - **Attribution:** Full funnel tracking from first ad click → registration → first deployment → first payment
  - Mautic replaces Brevo for marketing emails (Brevo stays for transactional)
  - Integration: Mautic syncs contacts from Supabase via n8n (nightly or on key events like registration, first deployment, suspension)
- Billing PDF generation (invoice per credit purchase)
- Odoo module marketplace (curated list of installable modules per plan)

### v3 — Scale
- Multi-region deployment (Côte d'Ivoire, Cameroon nodes)
- Public reseller API
- White-label portal (custom domain + branding per reseller)
- Stripe payments (for diaspora customers paying in EUR/USD)
- Kubernetes migration (when CX52 node count > 10)
