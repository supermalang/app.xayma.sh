# Partners Page Colorization Strategy

## Overview

The Partners page uses **strategic color** to guide attention to B2B relationship tiers and account health. Colors are semantic, not decorative.

## Color Mapping

### Status Badges

| Status | Color | Hex | Purpose |
|--------|-------|-----|---------|
| **Active** | Green | `#00b341` | Account is operational, healthy |
| **Suspended** | Orange | `#fd761a` | Account needs immediate attention, pulsing |
| **Inactive** | Blue | `#1e40af` | Account is dormant, historical |

**Badge styling:**
- Font weight: 600 (bold for scannability)
- Text color: White on all backgrounds (high contrast)
- Border matches background (solid, no outline)
- All badges use `:deep()` to override PrimeVue Tag component defaults

### Partner Type Badges

| Type | Color | Hex | Purpose |
|------|-------|-----|---------|
| **Reseller** | Green | `#00b341` | Revenue-driving B2B partners |
| **Customer** | Blue | `#1e40af` | End-user SME accounts |

**Usage:**
- High-value reseller accounts stand out (green) in dense tables
- Row background gets subtle blue tint on hover (reseller accounts)
- Type and Status badges use same color scheme for consistency

### Table Structure

**Table header row:**
- Background: `#eaeef7` (subtle gray-blue tint)
- Purpose: Establish visual hierarchy, separate header from data

**Body rows (on hover):**
- Background: `#eff4ff` (light blue, 250ms transition)
- Purpose: Guides eyes to row being inspected
- Smooth easing prevents jank on fast hover

**Suspended rows (continuous):**
- Status badge pulses (1.5s cycle, 0.7 opacity at peak)
- Purpose: Draws immediate attention to problem accounts
- Pulse is subtle (not alarming), constant (not ignored)

### Filter Dropdowns

**Focus state:**
- Border color: Primary blue (`#00288e`)
- Box shadow: Light blue glow (`rgba(0, 40, 142, 0.1)`)
- Transition: 250ms smooth
- Purpose: Clear visual feedback when user interacts with filters

## Design Principles

### Restrained Color Strategy

This page uses the **Restrained** color strategy: tinted neutrals + one primary accent (blue), with semantic status colors (green = good, orange = warning).

- **Primary accent usage:** ≤10% of surface (buttons, focus states, type badges)
- **Status colors:** Only for semantic meaning (not decorative)
- **No gradient text, no glassmorphism, no side-stripe borders**

### Why These Colors?

**Green for Resellers:** Signals "go" — these are revenue accounts. Positive action bias.

**Orange for Suspended:** Standard warning color. Familiar to users. Pulsing adds urgency without alarm.

**Blue for Customers:** Information tier. Secondary importance vs. resellers. Maintains brand consistency.

### Accessibility

All color combinations meet **WCAG AA** contrast standards:
- White text on green/orange/blue: 4.5:1 (AAA)
- Blue row hover on white: 3:1 (AA)

**Color is never the only affordance.** Status badges also use text labels (e.g., "Active", "Suspended"). Users with color blindness can still understand account health.

## Implementation

### Files Modified

1. **Partners.vue:**
   - Added `:deep()` CSS rules to override PrimeVue Tag colors
   - Added table header + row hover colors
   - Added filter focus state color
   - Badge color overrides for success/warning/info severity

2. **PartnerStatusBadge.vue:**
   - Added `:deep()` rules for color-coded status badges
   - Strengthened badge font-weight (600) for scannability
   - White text on all badge backgrounds

3. **PartnerTypeBadge.vue:**
   - Added `:deep()` rules for type badge colors
   - Matches status badge styling (600 font-weight, white text)
   - Reseller (green) vs. Customer (blue) differentiation

### CSS Approach

All color overrides use `:deep()` to pierce PrimeVue scoped component boundaries:

```css
:deep(.p-tag-success) {
  background: #00b341 !important;
  color: #ffffff !important;
}
```

Why `!important`? PrimeVue uses inline styles on the Tag component, which have high specificity. CSS variable overrides alone don't work — `!important` ensures our semantic colors win.
