# DESIGN.md — Xayma.sh Design System

Extracted from `src/design-system/tokens.json`. Single source of truth for all visual values.

---

## Color Palette

**Strategy:** Restrained. Tinted neutrals + one primary accent for interactive elements.

### Core Colors

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#00288e` | CTAs, active states, brand highlight |
| `primary-container` | `#1e40af` | Secondary actions, hover states |
| `on-primary` | `#ffffff` | Text on primary backgrounds |
| `secondary` | `#9d4300` | Tertiary actions, less emphasis |
| `secondary-container` | `#fd761a` | Secondary highlights (warnings, alerts) |
| `on-secondary` | `#ffffff` | Text on secondary backgrounds |
| `tertiary` | `#003d28` | Success states, positive feedback |
| `tertiary-container` | `#00f8a0` | Light success accent |
| `on-tertiary` | `#ffffff` | Text on tertiary |
| `error` | `#ba1a1a` | Error states, destructive actions |
| `error-container` | `#ffdad6` | Error background, light |
| `on-error` | `#ffffff` | Text on error |
| `on-error-container` | `#410e0b` | Text on light error bg |

### Surface/Neutral

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | `#f8f9ff` | Page background |
| `surface-container-lowest` | `#ffffff` | Cards, raised elements |
| `surface-container-low` | `#eff4ff` | Subtle backgrounds |
| `surface-container` | `#eaeef7` | Grouped sections |
| `surface-container-high` | `#dce9ff` | High-contrast sections |
| `surface-container-highest` | `#cfe1ff` | Maximum contrast |
| `on-surface` | `#1a1b1f` | Primary text |
| `on-surface-variant` | `#49454e` | Secondary text, labels |
| `outline` | `#79747e` | Borders, dividers |
| `outline-variant` | `#cac4d0` | Light borders, subtle separations |
| `scrim` | `#000000` | Overlay/backdrop tint |

### Semantic Mapping

- **Success:** tertiary (`#003d28`) or tertiary-container (`#00f8a0`)
- **Warning:** secondary (`#9d4300`) or secondary-container (`#fd761a`)
- **Error:** error (`#ba1a1a`) or error-container (`#ffdad6`)
- **Info:** primary (`#00288e`)

---

## Spacing

12px base grid. Align all padding and margin to multiples of 12px.

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 0.25rem (3px) | Icon-to-text, tight microspacing |
| `sm` | 0.5rem (6px) | Between form fields, label spacing |
| `md` | 1rem (12px) | Base padding inside components |
| `lg` | 1.5rem (18px) | Section padding |
| `xl` | 1.75rem (21px) | Card padding |
| `2xl` | 2rem (24px) | Container padding |
| `3xl` | 2.5rem (30px) | Section spacing |
| `4xl` | 4rem (48px) | Major section gaps |

**Usage patterns:**
- Card internal padding: `2xl` (24px)
- Form field margin: `lg` (18px)
- Horizontal page margins: `2xl` (24px) on desktop, `lg` (18px) on tablet, `md` (12px) on mobile
- Between sections: `4xl` (48px)
- Icon + text gap: `sm` (6px)

---

## Border Radius

Subtle, modern. Not rounded-pill by default.

| Token | Value | Usage |
|-------|-------|-------|
| `none` | 0 | Sharp edges (rare; banners, stripes) |
| `sm` | 0.375rem (6px) | Buttons, input fields, small components |
| `md` | 0.375rem (6px) | **Same as sm** — consolidate to `sm` |
| `lg` | 0.5rem (8px) | Cards, modals, larger containers |
| `full` | 9999px | Pill buttons, circular avatars |

**Consolidation note:** `sm` and `md` are identical. Use `sm` for inputs/buttons, `lg` for cards/containers.

---

## Typography

Hierarchy through scale + weight contrast (≥1.25 ratio). Fixed scale, no intermediate values.

### Font Families

```css
--font-ui: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-data: 'IBM Plex Mono', 'Courier New', monospace;
```

- **UI (all scales except data):** Inter + system fallbacks
- **Data (monospace):** IBM Plex Mono for domains, IPs, credentials, code

### Type Scale

| Scale | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `display-lg` | 3.5rem | 700 | 1.2 | -0.02em | Page titles, hero headings (rare) |
| `headline-md` | 1.75rem | 600 | 1.3 | 0 | Section headings, card titles |
| `title-sm` | 1rem | 500 | 1.4 | 0.01em | Subsection titles, modal headers |
| `body-md` | 0.875rem | 400 | 1.5 | 0.03em | Body text, descriptions, help text |
| `label-md` | 0.75rem | 700 | 1.3 | 0.04em | Form labels, badges, status tags (uppercase) |
| `data-mono` | 0.875rem | 400 | 1.4 | 0 | Domains, IPs, credentials, monospace content |

**Hierarchy ratios:**
- `display-lg` → `headline-md`: 2.0x
- `headline-md` → `title-sm`: 1.75x
- `title-sm` → `body-md`: 1.14x (tight; prefer weight contrast here)
- `body-md` → `label-md`: 1.17x

**Reading line length:** 70–80ch for body text. Column width ≤90ch.

---

## Component Patterns

### Buttons

- **Primary CTA:** `primary` bg, `on-primary` text, `sm` radius
- **Secondary:** `primary-container` bg, `on-primary` text
- **Tertiary:** transparent, `primary` text, underline on hover
- **Destructive:** `error` bg, `on-error` text
- **Padding:** `md` vertical, `xl` horizontal (12px × 21px)
- **Disabled:** opacity 50%, no pointer-events

### Form Fields

- **Background:** `surface-container-lowest`
- **Border:** 1px `outline`
- **Padding:** `md` (12px)
- **Radius:** `sm` (6px)
- **Label:** `label-md`, `on-surface-variant`, margin-bottom `sm`
- **Focus state:** Border becomes `primary`
- **Error state:** Border `error`, help text `error`

### Cards

- **Background:** `surface-container-lowest`
- **Padding:** `2xl` (24px)
- **Border radius:** `lg` (8px)
- **Shadow:** 1px 2px 4px rgba(0, 0, 0, 0.05) — subtle
- **Divider between sections:** 1px `outline-variant`
- **No nested cards** — use dividers or color contrast instead

### Data Tables

- **Header row:** `surface-container` bg, `on-surface-variant` text
- **Body rows:** `surface-container-lowest` bg, alternate every row with `surface-container-low` (20% opacity)
- **Borders:** 1px `outline-variant` between rows
- **Padding:** `md` (12px) per cell
- **Sticky header:** position fixed, z-index 10, shadow below
- **Line-height:** 1.5 (generous vertical breathing room)

### Status Badges

| Status | Background | Text | Icon |
|--------|------------|------|------|
| Active | `tertiary-container` | `tertiary` | ✓ |
| Pending | `secondary-container` | `secondary` | ⏳ |
| Error | `error-container` | `error` | ✗ |
| Info | `surface-container-high` | `primary` | ℹ |

- Padding: `sm` vertical, `md` horizontal
- Border radius: `sm`
- Label: `label-md` (uppercase)

### Alerts / Callouts

- **Background:** container variant (e.g., `error-container`)
- **Text:** on-color variant (e.g., `on-error-container`)
- **Border-left:** NO. Use full background or icon prefix instead.
- **Padding:** `2xl`
- **Icon prefix:** Leading icon (24×24) + 12px gap to text

### Modals

- **Backdrop:** `scrim` at 40% opacity
- **Card:** `surface-container-lowest`, `lg` radius, shadow (2px 8px 12px rgba(0, 0, 0, 0.1))
- **Padding:** `3xl` (30px)
- **Max width:** 600px
- **Close button:** Top-right corner, ghost style
- **Actions:** Right-aligned, primary + secondary buttons

### Navigation

- **Background:** `surface-container-lowest`
- **Active link:** `primary` text, bold weight
- **Hover:** `surface-container-high` background
- **Icon + label:** 6px gap (`sm`)
- **Dividers:** 1px `outline-variant`

---

## Motion

**Philosophy:** Motion clarifies, never distracts. Used only for state transitions.

### Timing

- **Fast (micro-interactions):** 150ms, `ease-out` (expo or quart)
- **Standard (state changes):** 250ms, `ease-out`
- **Slow (large layout shifts):** 350ms, `ease-out`

**Easing:** Prefer `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) or `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (quart-out). No bounce, no elastic.

### Transitions

- Fade in/out: opacity 150ms
- Color change: all 250ms (not just color property — allows background + text together)
- Expand/collapse: max-height 250ms (not height — avoid layout thrash)
- Slide (modal, drawer): transform 250ms

### **Banned Motions**

- ❌ Animating `width`, `height`, `left`, `top`, `margin` (forces layout recalc)
- ❌ Bounce easing on state transitions (feels cheap)
- ❌ Staggered animations on list items (slows perception of app)
- ❌ Parallax or excessive micro-animations (distracting)

---

## Dark Mode

**Not implemented yet.** Light mode is the only supported theme. If dark mode is needed, create a parallel color palette (50% saturation reduction, inverted neutrals) and toggle via CSS custom properties.

---

## Accessibility

- **Color contrast:** All text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- **Focus states:** All interactive elements have visible focus ring (2px `primary` border or outline)
- **Icons + text:** Never rely on icon alone; pair with label
- **Form labels:** Always associated via `<label for>` or aria-label
- **ARIA landmarks:** `<nav>`, `<main>`, `<footer>` on all pages
- **Skip links:** Navigation skip link to `<main>` on every page
- **Keyboard navigation:** Tab order must follow visual flow; never `tabindex > 0`

---

## Responsive Breakpoints

Match Tailwind breakpoints. Mobile-aware, desktop-led.

| Breakpoint | Width | Primary Use |
|------------|-------|-------------|
| `sm` | 640px | Small phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktops |
| `xl` | 1280px | Large desktops |
| `2xl` | 1536px | Ultra-wide |

**Mobile-first approach:** Write base mobile styles, then progressively enhance with `sm:`, `md:`, etc.

### Responsive Typography

- **Display-lg:** 2.5rem on mobile → 3.5rem on desktop
- **Headline-md:** 1.5rem on mobile → 1.75rem on desktop
- **Body-md:** 0.875rem everywhere (readable at all sizes)

### Responsive Spacing

- **Horizontal margins:** 12px (mobile) → 18px (tablet) → 24px (desktop)
- **Vertical spacing:** Same scale, independent of device
- **Card padding:** 16px (mobile) → 24px (desktop)

---

## Implementation Rules

### CSS Variables

Root CSS file (`src/assets/styles/app.css` or similar) exports all tokens as CSS custom properties:

```css
:root {
  /* Colors */
  --color-primary: #00288e;
  --color-primary-container: #1e40af;
  /* ... rest of colors ... */

  /* Spacing */
  --space-xs: 0.25rem;
  --space-md: 1rem;
  /* ... rest of spacing ... */

  /* Radius */
  --radius-sm: 0.375rem;
  --radius-lg: 0.5rem;

  /* Typography */
  --font-ui: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-data: 'IBM Plex Mono', 'Courier New', monospace;
}
```

### Tailwind Overrides

Extend `tailwind.config.js` to inject tokens:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#00288e',
        'primary-container': '#1e40af',
        // ... rest of colors ...
      },
      spacing: {
        xs: '0.25rem',
        md: '1rem',
        // ... rest of spacing ...
      },
      borderRadius: {
        sm: '0.375rem',
        lg: '0.5rem',
      },
    },
  },
};
```

### Component Library

PrimeVue components are themed via CSS variables in `primevue-theme.css`:

```css
/* primevue-theme.css */
:root {
  --p-primary-color: var(--color-primary);
  --p-surface-card: var(--color-surface-lowest);
  --p-text-color: var(--color-on-surface);
}
```

Never override PrimeVue inline. Always via the theme file.

### Never

- ❌ Hardcode a hex color (use CSS variable)
- ❌ Hardcode pixel spacing (use Tailwind class)
- ❌ Use `ml-*` / `mr-*` (use `ms-*` / `me-*` for RTL safety)
- ❌ Inline `!important` overrides (extend theme instead)
- ❌ Nested cards (use dividers or color contrast)
- ❌ Side-stripe borders (use full borders or background tints)
- ❌ Gradient text (use solid color + weight)

---

## Audit Checklist

Before shipping any UI:

- [ ] All text uses a type scale value (not arbitrary font-size)
- [ ] All spacing uses a spacing token (not arbitrary px/rem)
- [ ] All colors use a palette token (not arbitrary hex)
- [ ] All border-radius uses a radius token
- [ ] Focus states visible on all interactive elements
- [ ] Color contrast ≥4.5:1 for body text
- [ ] No modals without inline/progressive alternative first
- [ ] Buttons have clear hover + active states
- [ ] Forms have labels and error messages
- [ ] Mobile layout tested at 375px width
- [ ] Dark mode support (if applicable)
- [ ] Accessibility tested with keyboard-only navigation

---

## Reference

- **Design tokens:** `src/design-system/tokens.json`
- **Mockups/reference:** `docs/mockups/`
- **Component specs:** `docs/design-system.md` (in CLAUDE.md)
- **Tailwind config:** `tailwind.config.js`
- **PrimeVue theme:** `src/assets/styles/primevue-theme.css`

