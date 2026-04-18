# Sprint 6 Responsive Testing & Accessibility Plan

## Responsive Design Strategy

All pages use Tailwind CSS responsive breakpoints + PrimeVue responsive components:

### Breakpoints Used
- **Mobile (< 768px)**: Single column, stacked layouts
- **Tablet (768px - 1024px)**: 2-column grids, medium cards
- **Desktop (> 1280px)**: 3-4 column grids, side-by-side layouts

---

## Portfolio Page Responsive Testing

### Mobile (375px)
- [ ] Filter card displays single-column layout
  - Search input spans full width
  - Plan dropdown stacks below search
  - Status dropdown stacks below plan
  - Reset button stacks below status
- [ ] DataTable uses `responsiveLayout="stack"`
  - Column headers appear above each value
  - Vertical scrolling for customer data
- [ ] Tags (plan, credit status) are readable and not truncated
- [ ] View link remains clickable and easy to tap

**CSS Classes Tested:**
```
grid-cols-1 md:grid-cols-2 lg:grid-cols-4
w-full (on all inputs)
responsive-layout="stack" (on DataTable)
```

### Tablet (768px)
- [ ] Filter card displays 2-column layout
  - Search + Plan in first row
  - Status + Reset in second row
- [ ] DataTable shows 2-3 columns per row (horizontal scroll if needed)
- [ ] Card headers remain visible
- [ ] Pagination controls accessible

### Desktop (1280px)
- [ ] Filter card displays 4-column layout
  - All filters visible in one row
- [ ] DataTable displays all columns without scrolling
- [ ] 20-row paginator fully visible
- [ ] No truncation of customer names or dates

---

## Commissions Page Responsive Testing

### Mobile (375px)
- [ ] Stat cards (4 cards) stack vertically
  - Each card spans full width
  - Icons, labels, values readable
  - Trend indicators visible
- [ ] LineChart adjusts to mobile width (no overflow)
  - Tooltip still accessible on tap
  - Legend readable below chart
- [ ] Accordion headers are tappable (minimum 44px height)
  - "Customer Name (Plan) - Amount" fits in one line with ellipsis if needed
  - Expand/collapse icons visible
- [ ] Accordion content sections stack properly
  - Acquisition bonus box full width
  - Renewal box full width
  - Customer total box full width
- [ ] Commission history DataTable stacks
  - Date, customer, type, percentage, amount in vertical order

**CSS Classes Tested:**
```
grid-cols-1 md:grid-cols-2 lg:grid-cols-4 (stat cards)
responsive-layout="stack" (DataTable)
autoresize (on LineChart for mobile width)
```

### Tablet (768px)
- [ ] Stat cards display 2-2 grid
  - First row: Total Earnings, Pending Commission
  - Second row: Acquisition Bonus, Renewal Income
- [ ] LineChart resizes to tablet viewport
- [ ] Accordion header text wraps gracefully
- [ ] Commission detail table shows 3-4 columns (horizontal scroll if needed)

### Desktop (1280px)
- [ ] Stat cards display 4-column layout
  - All visible in one row
- [ ] LineChart full width with proper aspect ratio
- [ ] Accordion headers fit without truncation
- [ ] Commission history table shows all 6 columns
  - Date | Customer | Type | Rate | Amount | Status

---

## Accessibility Testing Checklist

### 1. Keyboard Navigation
- [ ] **Portfolio Page**
  - Tab through filter inputs (Search → Plan → Status → Reset)
  - Keyboard focuses each dropdown with outline
  - Enter/Space activates Reset button
  - Tab through DataTable rows
  - Tab to "View" links, Enter opens partner detail
- [ ] **Commissions Page**
  - Tab through stat cards (visually focused)
  - Tab through accordion headers
  - Enter/Space expands/collapses accordion sections
  - Tab through detail table rows
  - Arrow keys navigate within accordion (if supported by PrimeVue)

### 2. Focus Indicators
- [ ] All interactive elements have visible focus rings
  - Portfolio: InputText, Dropdown, Button, Links
  - Commissions: Accordion headers, DataTable links
  - Focus color: Primary (#00288e) with 2px outline
  - Outline offset: 2px (visible outside element)

### 3. ARIA Labels
- [ ] **Portfolio Page**
  - Reset button: `aria-label="Reset all filters to default values"`
  - Search input has accessible label or placeholder
  - Dropdowns have proper `aria-label` attributes
- [ ] **Commissions Page**
  - Accordion: `aria-label="Commission breakdown by customer"`
  - Stat cards have semantic structure (heading + value)
  - Links in DataTable have descriptive text

### 4. Color Contrast (WCAG AA ≥ 4.5:1)
- [ ] Text on cards: on-surface text on surface-container-low ✓ (verified in design system)
- [ ] Table headers: on-surface text on surface-container-high ✓
- [ ] Tag text: checked on both "success" (green), "warning" (orange), "danger" (red) backgrounds
- [ ] Link color: Primary color on light backgrounds ✓

### 5. Semantic HTML
- [ ] Portfolio page
  - `<h3>` for section headers ("Filters", "Portfolio Customers")
  - `<span class="font-mono">` for monospace dates (correct styling)
  - Proper heading hierarchy maintained
- [ ] Commissions page
  - StatCard component has proper heading structure
  - Accordion tabs have semantic `<button>` elements (PrimeVue)
  - Table headers use `<th>` scope attributes

### 6. Mobile Tap Targets
- [ ] Buttons have minimum 44×44px clickable area
  - Reset button on Portfolio: 44px+ height ✓
  - View links: Rendered as proper links, not just text
- [ ] DataTable rows: Full width tappable (no shrinking)
- [ ] Accordion headers: Full width, 44px+ height ✓

### 7. Text Alternatives
- [ ] Icons have adjacent text labels
  - Portfolio: Reset button has "pi-refresh" icon + text label ✓
  - Commissions: Stat cards have text labels for all icons ✓
- [ ] No icon-only buttons without aria-label

### 8. Form Labels
- [ ] Filter inputs in Portfolio
  - Search has `placeholder="Search"` (accessible)
  - Dropdowns have :placeholder-label visible
  - All inputs have distinct purpose

---

## Testing Method

### Option 1: Browser DevTools (Recommended)
1. Open Portfolio or Commissions page in browser
2. Open DevTools (F12)
3. Use Device Toolbar (Ctrl+Shift+M) to test breakpoints:
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1280px)
4. Verify each checkbox from responsive section above

### Option 2: Playwright E2E Test
```bash
npm run test:e2e
# Test file: tests/e2e/sales-pages.spec.ts
```

### Option 3: Visual Regression (Screenshots)
```bash
npm run test:e2e:ui -- --config=tests/e2e/config/sales-pages.ts
```

---

## Known Responsive Behaviors

### DataTable Stack Mode
- When `responsive-layout="stack"` is active:
  - Headers move above each value in mobile view
  - Example output at 375px:
    ```
    Customer Name: Logistics Plus
    Plan: Enterprise
    Credit Status: Healthy
    Last Payment: Mar 15, 2026
    Renewal Date: Apr 15, 2026
    ```

### LineChart Auto-Resize
- Vue-echarts automatically resizes to parent container width
- Mobile: Full viewport width minus padding
- Tablet: 100% of card width
- Desktop: Same, full width responsive

### Grid Stacking
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`:
  - < 768px: 1 column (each filter input spans full width)
  - 768px - 1023px: 2 columns
  - ≥ 1024px: 4 columns

---

## Screenshot Acceptance Criteria

Each page should have screenshots at 3 viewports:

### Portfolio Screenshots
- **portfolio-mobile-375px.png** - Mobile vertical layout
- **portfolio-tablet-768px.png** - Tablet 2-column layout
- **portfolio-desktop-1280px.png** - Desktop full-width layout

### Commissions Screenshots
- **commissions-mobile-375px.png** - Mobile stacked stat cards, accordion, table
- **commissions-tablet-768px.png** - Tablet 2-column stat cards
- **commissions-desktop-1280px.png** - Desktop 4-column stat cards, full chart

---

## Accessibility Compliance Target

**WCAG 2.1 Level AA** for all Sprint 6 pages:

- ✅ Level A (minimum): Text alternatives, operable keyboard, distinguishable
- ✅ Level AA (target): Enhanced contrast (≥4.5:1), keyboard shortcuts, focus visible, error prevention

**Not In Scope for Sprint 6 (defer to v1.1):**
- Dark mode contrast testing (listed as 6.10 - DEFER)
- Screenreader full audit (complex Accordion testing)
- Page structure semantic overhaul (beyond scope of responsive polish)

---

## Testing Timeline

- [ ] 10 min: Mobile responsiveness (375px)
- [ ] 5 min: Tablet responsiveness (768px)
- [ ] 5 min: Desktop verification (1280px)
- [ ] 10 min: Keyboard navigation & focus testing
- [ ] 5 min: Color contrast spot-check
- [ ] 5 min: Screenshot capture for regression testing

**Total:** ~40 minutes for full responsive + accessibility verification

---

## Sign-Off Criteria

Sprint 6.12 & 6.13 are complete when:
- ✅ All responsive checkboxes verified (mobile/tablet/desktop)
- ✅ All accessibility checkboxes verified (keyboard/focus/contrast)
- ✅ Type-check passes with zero errors
- ✅ E2E tests pass (responsive + accessibility)
- ✅ Screenshots captured and committed

---

**Next:** Run `/verify-task 6.12-6.13` before marking as complete.
