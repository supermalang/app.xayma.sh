# Design System Implementation Guide — Xayma.sh

> **This is the implementation guide.** The design specification is in [docs/mockups/DESIGN-SYSTEM.md](../mockups/DESIGN-SYSTEM.md) (source of truth).
>
> This file explains HOW to use the design tokens and components in code. Design tokens are defined in `src/design-system/tokens.json`.

---

## 🎯 Core Design Principles

The design system follows **"The Technical Editorial"** aesthetic — sophisticated, high-precision, architectural. Key rules:

| Principle | Rule |
|-----------|------|
| **No Shadows** | Use tonal layering (surface hierarchy) for depth, not shadows |
| **No Gradients** | All colors flat |
| **No Generic Borders** | Use background color shifts; exception: Data table outlines at 20% opacity |
| **Tonal Layering** | 5 surface levels (lowest → highest) for depth hierarchy |
| **Typography Weight** | Use font weight for hierarchy, not just size |
| **Monospace Data** | IBM Plex Mono ONLY for FCFA, ISO 8601 dates, IDs, billing data |

See [docs/mockups/DESIGN-SYSTEM.md](../mockups/DESIGN-SYSTEM.md) for complete philosophy.

---

## Color Palette

All colors defined in `src/design-system/tokens.json`.

### Primary (Deep Blue "Ink")
- **primary**: `#00288e` — CTA buttons, active states, focus rings
- **primary-container**: `#1e40af` — Action blue, hover states
- **on-primary**: `#ffffff` — Text on primary backgrounds

### Secondary (Orange)
- **secondary**: `#9d4300` — Secondary actions
- **secondary-container**: `#fd761a` — Bright orange highlight
- **on-secondary**: `#ffffff` — Text on secondary backgrounds

### Tertiary (Dark Green)
- **tertiary**: `#003d28` — Success states, approve actions
- **tertiary-container**: `#00f8a0` — Success containers
- **on-tertiary**: `#ffffff` — Text on tertiary backgrounds

### Error (Red)
- **error**: `#ba1a1a` — Destructive actions, errors
- **error-container**: `#ffdad6` — Error backgrounds
- **on-error**: `#ffffff` — Text on error backgrounds

### Surface Hierarchy (Tonal Layering for Depth)
| Level | Color | Use Case |
|-------|-------|----------|
| **0 (Base)** | `#f8f9ff` `surface` | Page background |
| **1 (Sub)** | `#eff4ff` `surface-container-low` | Card backgrounds |
| **2 (Active)** | `#dce9ff` `surface-container-high` | Headers, emphasis |
| **3 (Lowest)** | `#ffffff` `surface-container-lowest` | Input fields, interactive |
| **4 (Highest)** | `#cfe1ff` `surface-container-highest` | Nested containers |

### Other
- **outline**: `#79747e` — Borders (general)
- **outline-variant**: `#cac4d0` — Secondary borders (data table outlines at 20% opacity)
- **on-surface**: `#1a1b1f` — Primary text
- **on-surface-variant**: `#49454e` — Secondary text

---

## Typography

### Font Families
- **UI**: Inter (headlines, labels, nav) — NO serif
- **Data**: IBM Plex Mono (ONLY for FCFA, ISO 8601, IDs, billing)

### Type Scale
| Level | Size | Weight | Use Case |
|-------|------|--------|----------|
| **Display-LG** | 3.5rem | Bold | Hero headers |
| **Headline-MD** | 1.75rem | Semi-Bold | Section starters, page titles |
| **Title-SM** | 1rem | Medium | Card titles, form labels |
| **Body-MD** | 0.875rem | Regular | Body text, UI labels |
| **Label-MD** | 0.75rem | Bold ALL-CAPS | Table headers, badges |
| **Data-Mono** | 0.875rem | Regular | Transactions, billing data (monospace) |

**Letter spacing**: Headlines get `-0.02em` for tight, editorial feel.

---

## Spacing (8px Baseline Grid)

| Token | Value | Use Case |
|-------|-------|----------|
| **xs** | 0.25rem (4px) | Tight groupings |
| **sm** | 0.5rem (8px) | Component padding, gaps |
| **md** | 1rem (16px) | Standard padding |
| **lg** | 1.5rem (24px) | Section spacing, asymmetric gutters |
| **xl** | 1.75rem (28px) | Breathing room between sections |
| **2xl** | 2rem (32px) | Major section breaks |
| **3xl** | 2.5rem (40px) | Page-level spacing |
| **4xl** | 4rem (64px) | Full-page spacing (asymmetric left margins) |

**No hardcoded pixels.** Use Tailwind utilities: `p-4`, `m-2`, `gap-3`, etc.

---

## Shape (No Rounded Corners)

All radius tokens set to `0px` except interactive elements:

| Token | Value | Use Case |
|-------|-------|----------|
| **none** | 0 | Default (no rounding) |
| **sm** | 0.375rem (3px) | Buttons, inputs |
| **md** | 0.375rem (3px) | Form controls |
| **lg** | 0.5rem (4px) | Cards, modals |
| **full** | 9999px | Fully rounded (badges, pills) |

**No shadows. No gradients.** Use surface hierarchy instead.

---

## Component Patterns

### Buttons

#### Primary Button
```vue
<Button label="Submit" class="p-button-primary" />
```
- **Background**: `primary` (`#00288e`)
- **Text**: White
- **Radius**: `sm` (0.375rem)
- **Padding**: Vertical `sm`, horizontal `md`
- **Hover**: Jump to `primary-container` (`#1e40af`)
- **Transition**: 150ms linear (sharp, not bouncy)

#### Secondary Button (Outlined)
```vue
<Button label="Cancel" class="p-button-secondary" />
```
- **Background**: `surface-container-lowest`
- **Border**: 1px `outline-variant` at 40% opacity
- **Text**: `primary`
- **Hover**: `surface-container-low`

#### Danger Button (Destructive)
```vue
<Button label="Delete" severity="danger" @click="handleDelete" />
```
- **Background**: `error` (`#ba1a1a`)
- **Text**: White
- **Hover**: Darker shade of error

### Input Fields
```vue
<InputText v-model="value" />
```
- **Background**: `surface-container-lowest` (white)
- **Border**: 1px `outline` (`#79747e`)
- **Border Radius**: `sm` (0.375rem)
- **Padding**: `0.5rem 0.75rem`
- **Focus**: 2px `primary` border, no shadow
- **Error**: 2px `error` border, no shadow
- **No placeholder colors** — use labels instead

### Status Badges
```vue
<Tag :value="status" :severity="getSeverity(status)" />
```
- **Shape**: Fully rounded (pill)
- **Success**: `tertiary-container` bg, `on-tertiary` text
- **Error**: `error-container` bg, `on-error-container` text
- **Pending**: `secondary-container` bg, `on-secondary-container` text
- **Icon**: 16px (2px stroke) inside badge

### Data Tables
```vue
<DataTable :value="rows" scrollHeight="flex">
  <Column field="name" header="NAME" />
  <Column field="amount" header="AMOUNT" dataType="numeric" />
</DataTable>
```
- **Header**: `surface-container-high` bg, `label-md` text (all caps)
- **Rows**: Alternating `surface` + `surface-container-low`
- **No divider lines** — use background shifts for rows
- **Numeric cells**: IBM Plex Mono, right-aligned
- **Hover**: Jump one level in surface hierarchy
- **Borders**: None; exception: `outline-variant` at 20% opacity for accessibility

### Cards
```vue
<Card>
  <template #content>Content</template>
</Card>
```
- **Background**: `surface-container-low` (`#eff4ff`)
- **No border** (use surface color to define edge)
- **Padding**: `lg` (`1.5rem`)
- **Radius**: `lg` (0.5rem)
- **No shadow** — tonal layering provides depth
- **Hover**: Jump to `surface-container-high`, no scale

### Credit Meter (Linear Progress)
```vue
<ProgressBar :value="50" class="credit-meter" />
```
- **Track**: `surface-container-highest` (light), 4px height
- **Fill**: `primary` (`#00288e`)
- **Sharp edges** (no rounded caps)
- **Label**: IBM Plex Mono, top-right corner

### Forms
- **Label above input** (not inline)
- **Label**: `title-sm`, medium weight
- **Vertical stack** for mobile/tablet
- **2-column grid** for desktop (if related fields)
- **Input height**: 44px (touch-friendly)
- **Error message**: `body-md`, `error` color, below input

---

## Interaction & Motion

### Transitions
- **Hover**: 150ms linear (no bounce, machine-like feel)
- **Button colors**: Jump one level in hierarchy
- **Dropdowns**: 150ms linear open/close
- **Page nav**: 300ms fade (via Vue Router)

### Hover States
- **Buttons**: Jump background color (no shadow add)
- **Cards**: Jump to next surface level
- **Rows**: Jump to next surface level
- **Links**: Underline + color change

### Focus States
- **Outline**: 2px `primary` border
- **Offset**: 2px from element
- **Always visible** (critical for a11y)
- **No removal** (never `:focus { outline: none }`)

### Disabled States
- **Opacity**: 50%
- **Cursor**: `not-allowed`
- **No hover effects**

---

## Accessibility (WCAG AA)

- **Color contrast**: 4.5:1 text, 3:1 UI components
- **Touch targets**: 44px minimum (buttons, links, inputs)
- **Keyboard nav**: Tab order matches visual; Escape closes modals
- **Focus visible**: Always show (never remove)
- **ARIA labels**: `aria-label` on icons, `aria-hidden` on decorative elements
- **Semantic HTML**: `<button>`, `<form>`, `<nav>`, `<main>` (not `<div>`)
- **i18n**: All UI strings from `src/i18n/` (EN + FR)

---

## Implementation Rules

### CSS Variables
Use CSS variables from `src/design-system/tokens.json`:

```css
/* CORRECT */
.button {
  background-color: var(--primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
}

/* WRONG */
.button {
  background-color: #00288e;
  padding: 1rem;
  border-radius: 3px;
}
```

### Tailwind CSS
Integrate tokens into Tailwind config:

```vue
<!-- CORRECT: Utility classes from design tokens -->
<div class="bg-surface-low p-4 rounded-sm hover:bg-surface-container-low">
  Content
</div>

<!-- WRONG: Hardcoded values -->
<div style="background: #eff4ff; padding: 16px; border-radius: 0.375rem;">
  Content
</div>
```

### PrimeVue Components
Apply tokens via `primevue-theme.css`:

```css
/* src/assets/styles/primevue-theme.css */
:root {
  --p-primary-color: var(--primary);
  --p-surface-card: var(--surface-container-lowest);
  --p-surface-border: var(--outline-variant);
}
```

**Never inline styles.** Never use `!important`.

---

## Do's & Don'ts

### Do's ✅
- Use ISO 8601 dates (YYYY-MM-DD HH:mm)
- Append FCFA to all currency values
- Use typography weight for hierarchy
- Right-align numeric data in monospace
- Use surface hierarchy for depth
- Keep borders minimal (data tables only)

### Don'ts ❌
- No shadows (use tonal layering)
- No gradients (use flat colors)
- No generic filled icons (outline only)
- No generic "grey" colors (use surface hierarchy)
- No transparency on text (use color tokens)
- No 3+ font sizes per view
- No rounded corners (except badges/pills)

---

## Maintenance

**Never modify `src/design-system/tokens.json` without approval** — impacts all screens.

For design changes:
1. Update [docs/mockups/DESIGN-SYSTEM.md](../mockups/DESIGN-SYSTEM.md) (source of truth)
2. Update `src/design-system/tokens.json` (token values)
3. Update `primevue-theme.css` (PrimeVue mappings)
4. Run `/visual-check` for all affected screens
5. Commit with "design: update [component] styling"

---

## Reference

- **Design Spec**: [docs/mockups/DESIGN-SYSTEM.md](../mockups/DESIGN-SYSTEM.md)
- **Token Source**: [src/design-system/tokens.json](../../src/design-system/tokens.json)
- **PrimeVue Theme**: [src/assets/styles/primevue-theme.css](../../src/assets/styles/primevue-theme.css)
- **Tailwind Config**: [tailwind.config.js](../../tailwind.config.js)
