# Xayma Design System Documentation

## Overview
**Creative North Star:** "The Technical Editorial"

This design system moves away from the "bubble-gum" aesthetic of modern SaaS to embrace a sophisticated, high-precision layout reminiscent of architectural blueprints and Swiss editorial design.

## Key Principles

### 1. No Shadows, No Gradients
- Use **Tonal Layering** instead of shadows for depth
- All colors must be flat
- Depth through typography and spacing, not color blending

### 2. Surface Hierarchy
- **Level 0 (Base):** `surface` (#f8f9ff)
- **Level 1 (Sub-section):** `surface-container-low` (#eff4ff)
- **Level 2 (Active/Emphasis):** `surface-container-high` (#dce9ff)
- **Level 3 (Interactive):** `surface-container-lowest` (#ffffff)

### 3. No Borders Rule
- Strictly prohibit 1px solid borders for general sectioning
- Use background color shifts to define zones
- Exception: Data tables may use `outline_variant` at 20% opacity for accessibility

### 4. Color Palette
- **Primary:** #00288e (Deep blue - "Ink")
- **Primary Container:** #1e40af (Action blue)
- **Secondary:** #9d4300 (Orange-brown)
- **Secondary Container:** #fd761a (Bright orange - "Highlight")
- **Tertiary:** #003d28 (Dark green)
- **Error:** #ba1a1a

## Typography: The Dual-Font System

### Inter (UI)
- Headlines & navigation labels
- Weight scale: 400 (Regular) to 700 (Bold)
- Letter-spacing: -0.02em for headlines

### IBM Plex Mono (Data)
- **ONLY** for: FCFA currency, ISO 8601 timestamps, Billing IDs, Database keys
- Regular weight, 0.875rem
- Never use for UI labels

### Type Scale
| Level | Font | Size | Weight | Use |
|-------|------|------|--------|-----|
| Display-LG | Inter | 3.5rem | Bold | Hero headers |
| Headline-MD | Inter | 1.75rem | Semi-Bold | Section starters |
| Title-SM | Inter | 1rem | Medium | Card titles |
| Body-MD | Inter | 0.875rem | Regular | General UI text |
| Label-MD | Inter | 0.75rem | Bold ALL-CAPS | Table headers |
| Data-Mono | IBM Plex | 0.875rem | Regular | Transaction data |

## Components

### Buttons
- **Primary:** `primary_container` background with `on_primary` text
- **Secondary:** Outlined with `outline_variant` at 40% opacity
- **Tertiary:** Text-link style using `primary` color
- **Corners:** 0.375rem (md) for all buttons

### Status Badges
- Fully rounded (pill shape)
- **Success:** `tertiary_container` bg with `on_tertiary_fixed_variant` text
- **Danger:** `error_container` bg with `on_error_container` text
- Include 16px icon (2px stroke) inside badge

### Credit Meter (Linear Progress)
- Track: `surface_container_highest`, 4px height
- Fill: `primary` (#00288e)
- Sharp-edged fill, no rounded caps
- Label: Current value in IBM Plex Mono (top-right)

### Data Tables
- Header: `surface_container_high` bg with `label-md` (All Caps)
- Rows: Alternating `surface` and `surface_container_low`
- No divider lines; use background color shifts
- Numeric cells: IBM Plex Mono, right-aligned

### Input Fields
- Container: `surface_container_lowest` (white) with 1px `outline_variant` border
- Focus: 2px border with `primary` color
- Error: 2px border with `error` color
- No shadows or glows

## Spacing
- 8px baseline grid (0.5rem increments)
- Tight groupings: 0.5rem (4px)
- Section breathing room: 1.75rem (28px)
- Asymmetric gutters encouraged (64px/28px left margins)

## Interaction
- Hover: Jump one level up in surface hierarchy (e.g., surface → surface_container_low)
- Active: `primary_container` background with `on_primary_container` text
- Transition: 150ms Linear (machine-like, no bounce)

## Do's
- Use ISO 8601 dates (YYYY-MM-DD HH:mm)
- Append FCFA to currency values
- Use typography weight for hierarchy, not just size
- Right-align numeric data in IBM Plex Mono

## Don'ts
- No border-radius (all 0px)
- No transparency on text (use color tokens)
- No generic filled icons
- No shadows, gradients, or "grey" colors
- 3-size constraint: Max 3 font sizes per view

## Named Colors
Comprehensive color palette available in design system. Use CSS variables from the theme.
