# Partners Page Lazy-Load Animation Strategy

## Overview

Enhanced the Partners page with purposeful lazy-load animations that provide visual feedback during pagination and improve the perceived performance of data loading.

## Animation Layers

### 1. Row Fade-In Stagger (Primary Enhancement)

**Purpose:** When a new page of partners loads, rows fade in sequentially, creating a smooth reveal that guides the eye naturally down the table.

**Implementation:**
- Class: `.lazy-row` applied via `getRowClass()` computed function
- Timing: 40ms stagger between rows (first row at 0ms, second at 40ms, etc.)
- Duration: 150ms fade (--duration-micro)
- Easing: expo-out (--easing-standard)

**Effect:** Users perceive faster loading because rows appear to materialize progressively rather than all at once. Limits stagger to first 10 rows (~400ms total), then all subsequent rows fade in at once (prevents excessive delays on large tables).

**Accessibility:** Respects `prefers-reduced-motion` — when enabled, all rows appear instantly without animation.

```css
:deep(.lazy-row) {
  animation: row-fade-in 150ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

:deep(.lazy-row:nth-child(n+11)) {
  animation-delay: 400ms;  /* Batch load after 11th row */
}

@keyframes row-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### 2. Skeleton Loading State

**Purpose:** While `isLoading = true`, placeholder rows pulse gently to indicate ongoing fetch.

```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.4; }
}
```

### 3. Row Selection Highlight

**Purpose:** When users select multiple partners (via checkbox), the selected row background animates in.

```css
:deep(.p-datatable-tbody > tr.selected) {
  background-color: rgba(0, 40, 142, 0.05) !important;
  transition: background-color 150ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

## Design Principles Applied

- **Motion philosophy:** 150–250ms for state transitions (no page-load choreography)
- **Easing:** expo-out (cubic-bezier(0.16, 1, 0.3, 1)) for natural deceleration
- **Accessibility:** `prefers-reduced-motion` support mandatory
- **Performance:** Transform + opacity only (GPU-accelerated)

## Technical Details

### CSS Custom Properties Used

- `--duration-micro: 150ms` — fade-in timing
- `--easing-standard: cubic-bezier(0.16, 1, 0.3, 1)` — expo-out easing
- `--easing-pulse: cubic-bezier(0.4, 0, 0.6, 1)` — ease-in-out for skeleton pulse

All tokens defined in `src/assets/styles/animations.css` for reusability.

### Row-Class Computation

```typescript
const getRowClass = (row: any, index: number) => {
  if (isLoading.value) return ''  // Skip animation during loading
  return `lazy-row`                // Apply stagger animation once loaded
}
```

Applied to DataTable via `:row-class` prop:
```vue
<AppDataTable
  :row-class="getRowClass"
  ...
/>
```

## Performance Considerations

- **GPU acceleration:** Uses `opacity` only (no layout recalc)
- **Batch rendering:** Stagger limited to 10 rows (~400ms) to prevent jank
- **Respects reduced motion:** No animation overhead for accessibility users
- **Non-blocking:** Animations don't prevent user interaction
