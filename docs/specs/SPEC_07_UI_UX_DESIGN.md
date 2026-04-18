# SPEC 07 — UI/UX Design
> Xayma.sh · v2 · Last updated: March 2026

---

## 1. Design System

| Layer | Choice | Notes |
|-------|--------|-------|
| UI library | PrimeVue 4 | Rich component set, good TypeScript support |
| CSS framework | Tailwind CSS | Utility-first; used for layout, spacing, custom components |
| Charts | Apache ECharts (vue-echarts) | Credit usage, revenue, deployment stats |
| Icons | PrimeIcons + Heroicons | PrimeIcons for PrimeVue components; Heroicons for custom |
| Font | Inter (primary), JetBrains Mono (code/stats) | Google Fonts |
| Motion | CSS transitions + Vue Transition | Minimal; no heavy animation libraries |
| Mockups | `/mockups` folder in repo | Claude Code reads these as reference during development |

---

## 2. Brand Guidelines (Partial)

| Element | Value | Notes |
|---------|-------|-------|
| Name | Xayma.sh | ".sh" references shell/tech; "Xayma" is locally resonant |
| Logo | Exists (to be provided) | SVG format required |
| Primary color | TBD (recommend deep teal #0D7490 or indigo #4338CA) | West African tech aesthetic |
| Accent color | TBD (recommend amber #F59E0B) | CTA buttons, highlights |
| Neutral | Gray-900 to Gray-50 | Dark mode friendly |
| Error | Red-600 (#DC2626) | Credit warnings, failures |
| Success | Green-600 (#16A34A) | Active deployments, confirmed payments |
| Dark mode | Supported | Toggle in header |
| Languages | FR (default) + EN | Toggle in header |
| Currencies | FCFA, USD, EUR | User preference in profile |

---

## 3. Key Screens

### Management App (app.xayma.sh)

#### All Roles
| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/login` | Email + password; forgot password link |
| Register | `/register` | Name, email, company, phone; sends verification email |
| Dashboard | `/` | Role-specific stats and quick actions |
| Profile | `/profile` | User info, language, currency, password change |
| Notifications | `/notifications` | In-app notification feed |

#### Admin Only
| Screen | Route | Description |
|--------|-------|-------------|
| Users list | `/users` | DataTable with search, filter, export |
| User detail | `/users/:id` | Edit, deactivate, role change |
| Partners list | `/partners` | All partners with status filters |
| Partner detail | `/partners/:id` | Full profile, deployments, credit history |
| Services | `/services` | Service catalogue management |
| Service detail | `/services/:id` | Plans, AWX config, tags |
| Control nodes | `/control-nodes` | Hetzner node management |
| Settings | `/settings` | Platform-wide key/value config |
| Audit log | `/audit` | Filterable audit trail |
| Credit purchase options | `/credit-options` | Volume discount tiers |

#### Customer
| Screen | Route | Description |
|--------|-------|-------------|
| My deployments | `/deployments` | Active/suspended instances with credit meter |
| New deployment | `/deployments/new` | Service picker → plan → config wizard |
| Deployment detail | `/deployments/:id` | Status, domain, logs, actions (stop/start/restart) |
| Buy credits | `/credits/buy` | Credit bundle selector + Paytech checkout |
| Credit history | `/credits/history` | Transaction ledger |

#### Reseller
| Screen | Route | Description |
|--------|-------|-------------|
| All deployments | `/deployments` | All client instances in one view |
| Buy credits | `/credits/buy` | Bundle picker with discount tiers displayed |
| Credit usage | `/credits/usage` | Per-deployment credit breakdown |

#### Sales
| Screen | Route | Description |
|--------|-------|-------------|
| My portfolio | `/portfolio` | Customers in portfolio with status |
| Commission tracker | `/commissions` | Acquisition bonus + renewal earnings |

### Marketing Site (xayma.sh — Strapi + Nuxt)

| Page | Description |
|------|-------------|
| Home | Hero, features, pricing table, testimonials, CTA |
| Pricing | Detailed plan comparison (Starter/Pro/Enterprise + Reseller) |
| Features | What Xayma.sh does, how it works |
| About | Company story, West Africa focus |
| Blog | Managed by Strapi |
| Contact | Form + WhatsApp link |
| Legal | Terms of service, Privacy policy |

---

## 4. Layout Pattern

### Management App
```
┌──────────────────────────────────────────────────────┐
│  Header: Logo | Breadcrumb | Notifications | Profile  │
├────────────┬─────────────────────────────────────────┤
│            │                                         │
│  Sidebar   │  Main content area                      │
│  (fixed,   │  (DataTables, Forms, Charts)            │
│  collaps.) │                                         │
│            │                                         │
│  Nav items │                                         │
│  per role  │                                         │
│            │                                         │
└────────────┴─────────────────────────────────────────┘
```

- Sidebar collapses to icon-only on tablet
- Sidebar becomes bottom drawer on mobile
- Content area is scrollable; header is sticky
- Dashboard uses 12-column grid for stat cards and charts

### Marketing Site (Nuxt)
- Full-width sections
- Sticky top navigation
- Mobile hamburger menu
- Footer with links and social

---

## 5. Responsive Requirements

| Breakpoint | Behavior |
|-----------|---------|
| Mobile (< 640px) | Sidebar → bottom navigation; DataTables → card list; forms full-width |
| Tablet (640–1024px) | Sidebar collapsed to icons; tables show fewer columns |
| Desktop (> 1024px) | Full sidebar; all columns visible; multi-column dashboards |

All layouts use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`). PrimeVue DataTable uses `responsiveLayout="stack"` on mobile.

---

## 6. Key UI Patterns

### Credit Burn Meter
```
┌─────────────────────────────────────────┐
│  Credits remaining: 847 / 1000          │
│  ████████████████████░░░░░░  84.7%      │
│  At current rate: ~25 days remaining    │
│  Expires: 15 April 2026                 │
└─────────────────────────────────────────┘
```
Color: green > 30%, amber 10–30%, red < 10%

### Deployment Status Card
```
┌──────────────────────────────────────────┐
│  🟢 ACTIVE    Fatou Boutique Odoo        │
│  starter.xayma.sh  |  Odoo 17 Starter   │
│  10 credits/day  |  Created 2 weeks ago  │
│  [Stop]  [Restart]  [Open App →]         │
└──────────────────────────────────────────┘
```

### Role-based Dashboard Cards
- **Admin:** Total partners, active deployments, revenue today, failed deployments
- **Customer:** Credit balance, active deployments, days remaining, last payment
- **Reseller:** Total deployments, credit pool, clients at risk, this month's spend
- **Sales:** Portfolio size, this month's new customers, pending commissions, at-risk customers

---

## 7. Accessibility

| Standard | Target |
|----------|--------|
| WCAG | AA for marketing site; A for management app (internal tool) |
| Keyboard navigation | All interactive elements reachable via Tab |
| Screen reader | Semantic HTML, ARIA labels on icons and status indicators |
| Color contrast | 4.5:1 minimum for text |
| Focus indicators | Visible focus ring on all inputs and buttons |
| Form errors | Announced via aria-live regions |

---

## 8. Mockups Folder Convention

```
/mockups
  /app
    /dashboard
      admin-dashboard.png
      customer-dashboard.png
      reseller-dashboard.png
    /deployments
      deployment-list.png
      deployment-new-wizard.png
      deployment-detail.png
    /credits
      credit-buy.png
      credit-history.png
    /partners
      partner-list.png
      partner-detail.png
  /marketing
    home.png
    pricing.png
    features.png
  README.md   ← explains mockup conventions for Claude Code
```

Claude Code will reference these mockups when implementing screens. The `/mockups/README.md` should specify: color tokens used, component names from PrimeVue, and any deviation notes.
