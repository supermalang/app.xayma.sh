# PRODUCT.md — Xayma.sh Design Context

## Users

**Primary roles:**
- **Admin:** Platform operators managing deployments, credits, partners, and system health
- **Reseller:** B2B partners distributing credits and managing sub-customers
- **Customer:** SMEs deploying applications; credit consumption is their primary concern
- **Sales:** Internal team managing partner relationships and onboarding

**Geographic context:** West Africa (primarily Francophone); FCFA payments via Wave/Orange Money.

---

## Product Purpose

Credit-based SaaS platform enabling SMEs to deploy web applications and containerized software with automatic scaling and billing. Frictionless, fast, transparent.

**Core promise:** Deploy in minutes. Pay per resource used. No setup fees.

---

## Brand Tone

- **Confident, not arrogant.** We know what we're doing; we don't brag.
- **Clear, not corporate.** Plain English/French; no buzzwords or empty promises.
- **Helpful, not patronizing.** Users are smart; we assume competence.
- **Fast and efficient.** No unnecessary steps. Every interaction earns its place.

---

## Anti-References

❌ SaaS cliché design (hero metrics, gradient text, glassmorphism, identical card grids)
❌ Dark mode for decorative effect (only when functional purpose demands it)
❌ Modals as default (inline and progressive disclosure first)
❌ Over-animated interfaces (motion only when it clarifies, never distracts)
❌ Inconsistent states or missing error messages

---

## Strategic Principles

1. **Trust through transparency.** Credit balance, pricing, status—all visible, never hidden.
2. **One action per screen.** Focused forms, clear outcomes, no cognitive load.
3. **Assume competence.** Users know what a domain is, what a port is, what memory means. Don't over-explain.
4. **Bilingual parity.** English and French are equal citizens. Not translation; true parity.
5. **Mobile-aware but desktop-led.** Most ops happen at desks; mobile is checking status on the go.

---

## Register

**product** — this is an admin/dashboard application. Design serves the user's operational goals, not brand identity.

---

## Design Constraints

- **Color palette:** Tinted neutrals + one accent color (brand primary). Restrained strategy.
- **Typography:** System fonts for legibility; brand serif headlines for warmth.
- **Spacing:** Generous (12px base grid); anti-cramped, pro-breathing room.
- **Elevation:** Subtle shadows (1–2 distinct z-levels); avoid card spam.
- **Motion:** Minimal; only transition timing between states (150–300ms, ease-out).
- **Components:** PrimeVue + Tailwind; extend via design tokens, never fork.

---

## Known Design Decisions

- Dashboard uses SparkMini charts (lightweight, dense data) over large ECharts visualizations for KPIs.
- Partner lists default to table view (denser) with optional card view for mobile.
- Wizards use Steps component (linear clarity) over collapsed accordions.
- Notifications use Toast (non-blocking, auto-dismiss) for transient messages; modals for critical actions.
- RTL-aware spacing (`ms-*`/`me-*` instead of `ml-*`/`mr-*`) for future Arabic support.

---

## Color Strategy

**Restrained.** Tinted neutrals (warm gray-brown) + brand primary (vibrant blue) for interactive elements only.

- **Neutral base:** RGB tinted toward cool-brown (chroma ~0.01)
- **Primary accent:** Vibrant blue for CTAs, highlights, active states (chroma 0.15+)
- **Status colors:** Green (success), amber (warning), red (error)—desaturated for professional tone
- **Backgrounds:** Off-white (raised cards), slightly warmer white (page bg)
- **Dark mode candidate:** Only if customer base demands it (not yet)

---

## Typography Strategy

- **Headlines:** Serif (system serif fallback, e.g., Georgia/Constantia)
- **Body:** System sans-serif (Inter, SF Pro Display, Segoe UI)
- **Monospace:** SF Mono/Monaco for domain names, IP addresses, credentials
- **Scale:** 16px base; 1.25 ratio (tight scale, clear hierarchy without noise)

---

## Layout Rules

- **Grid base:** 12px (matches Tailwind spacing scale)
- **Padding inside cards:** 24px (breathing room)
- **Horizontal margins:** 32px on desktop; 16px on tablet; 12px on mobile
- **Section gaps:** 48px between major sections
- **Line length:** 70–80ch for reading-heavy content (compliance copy, guides)

---

## Glossary

- **Credit:** Unit of platform consumption (1 credit ≈ 1 hour of 2GB RAM instance)
- **Deployment:** Running instance of user's application
- **Partner:** Reseller or VAR with sub-customers and credit allocation
- **Webhook:** Workflow engine HTTP callback (not user-facing)
- **RLS:** Row-Level Security (database access control; enforce role limits)

