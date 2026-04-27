# Dashboard Cache Design

## Context

Dashboard composables (`useAdminDashboard`, `useCustomerDashboard`, `useActivityLog`) use local `ref()` state with `onMounted` fetch logic. Because local refs don't survive component unmount, every navigation away from and back to the dashboard triggers a full re-fetch — 13 parallel queries for admin, 6+ for customer, 1 for activity log.

The goal is to eliminate redundant network calls by caching results in Pinia stores (which survive navigation), showing cached data instantly on back-navigation, then silently refreshing in the background with a subtle UI indicator.

---

## Architecture

### New Pinia Stores

Three new stores replace the local state inside the three composables:

| Store | File | Replaces |
|---|---|---|
| `useAdminDashboardStore` | `src/stores/admin-dashboard.store.ts` | local refs in `useAdminDashboard` |
| `useCustomerDashboardStore` | `src/stores/customer-dashboard.store.ts` | local refs in `useCustomerDashboard` |
| `useActivityLogStore` | `src/stores/activity-log.store.ts` | local refs in `useActivityLog` |

Each store carries the same state shape as the composable it replaces, plus two new fields:
- `fetchedAt: number | null` — epoch ms of last successful fetch
- `isRefreshing: boolean` — true during a background refresh (data already present)

### Shared TTL Constant

```ts
// src/stores/constants.ts
export const DASHBOARD_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
```

Imported by all three stores.

### Composables Become Thin Wrappers

`useAdminDashboard`, `useCustomerDashboard`, and `useActivityLog` keep their existing signatures and return shapes. All logic moves into the stores. The composables call the store action and expose store state — no logic lives in the composable anymore. Existing call sites in pages/components require no changes.

---

## Fetch Logic

Each store's `fetchAll()` action follows this decision tree:

```
fetchAll() called (on component mount)
  │
  ├─ data exists AND age < 10 min?
  │     ├─ YES → return immediately (isLoading stays false)
  │     │         set isRefreshing = true
  │     │         run queries in background
  │     │         on complete → update state, fetchedAt, isRefreshing = false
  │     │
  │     └─ NO (stale or first load) → isLoading = true
  │                                    run queries
  │                                    on complete → update state, fetchedAt, isLoading = false
  │
  └─ if no company_id (customer store only) → return early, no fetch
```

**`isLoading` vs `isRefreshing`:**
- `isLoading = true` → skeleton loaders shown (first load or stale cache)
- `isRefreshing = true` → small spinner badge shown, existing data stays visible

---

## UI: Refreshing Indicator

A new shared component `src/components/RefreshingBadge.vue` renders the subtle indicator:

```vue
<RefreshingBadge :visible="isRefreshing" />
```

- Uses PrimeVue `ProgressSpinner` (small) inline with muted "Updating..." text
- Absolutely positioned in the top-right of the dashboard header area — no layout shift
- Hidden via `v-if` when `isRefreshing` is false

Used in:
- `src/pages/AdminDashboard.vue` — `adminDashboardStore.isRefreshing`
- `src/pages/CustomerDashboard.vue` — `customerDashboardStore.isRefreshing`
- Activity log section of each dashboard — `activityLogStore.isRefreshing`

i18n key `dashboard.refreshing` ("Updating..." / "Mise à jour...") must be added to both `src/i18n/en.ts` and `src/i18n/fr.ts`.

---

## Logout Cleanup

In `authStore.signOut()` (`src/stores/auth.store.ts:166-175`), after clearing `user` and `profile`:

```ts
adminDashboardStore.$reset()
customerDashboardStore.$reset()
activityLogStore.$reset()
```

This prevents a subsequent user on the same browser from seeing cached data from the previous session.

---

## Critical Files

| File | Change |
|---|---|
| `src/stores/admin-dashboard.store.ts` | **New** — Pinia store with all admin dashboard state + TTL logic |
| `src/stores/customer-dashboard.store.ts` | **New** — Pinia store with all customer dashboard state + TTL logic |
| `src/stores/activity-log.store.ts` | **New** — Pinia store with activity log state + TTL logic |
| `src/stores/constants.ts` | **New** — shared `DASHBOARD_CACHE_TTL_MS` |
| `src/components/RefreshingBadge.vue` | **New** — subtle background-refresh indicator |
| `src/composables/useAdminDashboard.ts` | **Modified** — thin wrapper over admin-dashboard store |
| `src/composables/useCustomerDashboard.ts` | **Modified** — thin wrapper over customer-dashboard store |
| `src/composables/useActivityLog.ts` | **Modified** — thin wrapper over activity-log store |
| `src/stores/auth.store.ts` | **Modified** — call `$reset()` on all three stores in `signOut()` |
| `src/pages/AdminDashboard.vue` | **Modified** — add `<RefreshingBadge>` |
| `src/pages/CustomerDashboard.vue` | **Modified** — add `<RefreshingBadge>` |

---

## Reusable Patterns

- `usePartnerCredits.ts` — reference for Realtime subscription + cleanup pattern (not changed)
- `partner.store.ts` — reference for Pinia store structure in this codebase
- `auth.store.ts` — reference for `initialize()` guard pattern (replicated in store `fetchAll()`)

---

## Verification

1. `npm run type-check` — zero errors
2. `npm run test:run` — existing tests pass
3. Manual flow:
   - Login → dashboard loads with skeleton → data appears
   - Navigate to Deployments → back to Dashboard → data instant, small spinner appears briefly then disappears
   - Wait 10+ min → navigate away and back → skeleton reappears (TTL expired, full re-fetch)
   - Logout → login as different role → no stale data from previous session
4. Unit tests co-located with each new store:
   - `src/stores/admin-dashboard.store.test.ts`
   - `src/stores/customer-dashboard.store.test.ts`
   - `src/stores/activity-log.store.test.ts`
   - Covering: first fetch, cache hit within TTL, TTL expiry, background refresh flag lifecycle, logout reset
