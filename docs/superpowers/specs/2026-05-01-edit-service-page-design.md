# Edit Service Page — Design

**Date:** 2026-05-01
**Status:** Approved (pending implementation)
**Origin:** Vibe annotation `vibe_1777644602869_pm78gylio` — the "Edit Service" button on `/services/:id` had no click handler.

## Problem

The `ServiceDetail` page renders an "Edit Service" button ([src/pages/ServiceDetail.vue:47-52](src/pages/ServiceDetail.vue#L47-L52)) that does nothing. There is no edit route, no edit page, and no edit flow. Admins cannot modify an existing service after creation without going to the database.

## Goal

Allow ADMIN users to edit any field of an existing service through the same UI used to create one, with one exception: the `slug` is immutable after creation.

## Non-Goals

- Versioned edits / change history (the existing `general_audit` trigger covers audit needs).
- Edit-while-deployments-running guards (out of scope; admin's responsibility for now).
- Inline edit on the detail page itself (rejected during brainstorming — duplicates the form).
- Permission expansion (still ADMIN-only, matches `services/new`).

## Approach

Reuse `CreateService.vue` as a unified create/edit page, branching on the route. Adds one new route, one mode flag, one fetch path, and one update path. No new files.

## Architecture

### Routing

Add to [src/router/index.ts](src/router/index.ts) immediately after the existing `services/:id` route:

```ts
{
  path: 'services/:id/edit',
  component: CreateService,
  meta: { requiredRole: ['ADMIN'] },
},
```

### Component changes — [src/pages/CreateService.vue](src/pages/CreateService.vue)

1. **Mode detection.** Read `useRoute().params.id`. If present and parses to a positive integer, `editId` is that number; otherwise `null`. `isEdit = computed(() => editId.value !== null)`.

2. **Initial load (edit mode only).** In `onMounted`, when `isEdit`, call `getService(editId.value)`:
   - On success: prefill `form.name`, `form.description`, `form.logo_url`, `form.isPubliclyAvailable`, `draftPlans`, `versionList`, `lifecycleTagValues`. Resolve `form.deployment_template` by matching `deploymentEngineJobTemplateId` against the loaded `deploymentTemplates` list (loadDeploymentTemplates already runs in onMounted; sequence the prefill after both have settled).
   - On failure: set `loadError` ref to the i18n string; hide the form, show a `Message severity="error"`.

3. **Loading state.** Replace the form with a `Skeleton`-based layout matching the section structure (header skeleton + 4 section skeletons) while `loading.value` is true. Form renders only when `!loading && !loadError`.

4. **Slug lock.** When `isEdit`, the displayed slug is `service.slug` (the persisted value), NOT the recomputed `slugify(form.name)`. The slug display row gains a small lock icon + tooltip explaining it cannot be changed. The `slug` computed becomes:
   ```ts
   const slug = computed(() => isEdit.value ? loadedSlug.value : slugify(form.name))
   ```
   where `loadedSlug` captures the persisted slug at fetch time.

5. **Save branching.** `handleSave` builds the same payload, then:
   - **Create:** unchanged. Calls `createService(payload)`, navigates to `/services/${created.id}`.
   - **Edit:** calls `updateService(editId.value, payload)` (omitting `slug` from the update — slug is immutable). On success, navigate to `/services/${editId.value}`.

6. **Discard.** In edit mode, `handleDiscard` navigates to `/services/${editId.value}` (not `router.back()`). Confirmation prompt fires only if the form was modified — for edit mode, dirty detection compares current form state against the loaded snapshot (deep equal on the same fields).

7. **Title / button labels.** Switch on `isEdit`:
   - Page title: `services.edit_page.title` vs `services.create_page.title`
   - Subtitle: `services.edit_page.subtitle` vs `services.create_page.subtitle`
   - Submit button: `services.update` vs `services.save`

### Wire up the trigger — [src/pages/ServiceDetail.vue:47-52](src/pages/ServiceDetail.vue#L47-L52)

Add `@click="router.push(\`/services/\${service.id}/edit\`)"` to the existing button. No new state needed; `router` is already imported.

## Data flow

```
ServiceDetail
  └─ click Edit → router.push(/services/:id/edit)
       └─ CreateService (isEdit=true)
            ├─ onMounted: loadDeploymentTemplates() ─┐
            │              getService(id)            ├─→ prefill form + draftPlans + versionList + lifecycleTagValues
            │                                        ┘
            └─ handleSave → updateService(id, payload) → router.push(/services/:id)
```

No changes to `services.service.ts` — `getService` and `updateService` already exist and match the shape we need.

## i18n

Add to BOTH [src/i18n/en.ts](src/i18n/en.ts) and [src/i18n/fr.ts](src/i18n/fr.ts):

| Key | EN | FR |
|---|---|---|
| `services.edit_page.title` | "Edit service" | "Modifier le service" |
| `services.edit_page.subtitle` | "Update configuration, plans, versions and lifecycle commands." | "Mettre à jour la configuration, les forfaits, les versions et les commandes de cycle de vie." |
| `services.update` | "Update" | "Mettre à jour" |
| `services.slug_locked_tooltip` | "Slug is permanent and cannot be changed after creation." | "Le slug est permanent et ne peut pas être modifié après la création." |
| `services.errors.load_failed` | "Failed to load service." | "Impossible de charger le service." |

## Error handling

- **Service not found / fetch fails:** show `Message severity="error"` with `services.errors.load_failed`. No form, no save button. User can navigate via the sidebar / back.
- **Update fails:** existing toast pattern (`severity: 'error'`, `errors.fetch_failed`). Form stays populated so the user can retry.
- **Invalid `:id` param** (non-numeric): treat as create mode (`editId = null`, page renders create form). Avoids 500/blank screen on bad URLs.

## Testing

- Unit / component test (Vitest + Vue Test Utils) co-located: `CreateService.test.ts`
  - Mounts with route `/services/6/edit`, mocks `getService` returning a fixture, asserts form fields prefill correctly.
  - Asserts slug input is locked (read-only) in edit mode.
  - Asserts `handleSave` calls `updateService(6, ...)` with the modified payload (no `slug` key).
  - Asserts discard in edit mode navigates to `/services/6`.
- E2E (Playwright) — extend the existing services suite to cover: open detail → click Edit → modify name → Update → land on detail page with new name visible.
- Run `/verify-task` before sign-off.

## Architecture rules — compliance

- ✅ No custom REST backend.
- ✅ Writes via existing `services.service.ts` helpers (`updateService`). Note: `services.service.ts` writes to Supabase directly today — this is the established pattern in the codebase. Out of scope to migrate to `workflow-engine.ts` here.
- ✅ Uses `useAuth()` indirectly via route `requiredRole: ['ADMIN']` meta.
- ✅ All UI strings i18n keys, both `en.ts` and `fr.ts`.
- ✅ No new tables → no new audit triggers needed.

## File touch list

| File | Change |
|---|---|
| [src/router/index.ts](src/router/index.ts) | +1 route |
| [src/pages/CreateService.vue](src/pages/CreateService.vue) | mode flag, fetch path, slug lock, branched save/discard, conditional labels, skeleton loading |
| [src/pages/ServiceDetail.vue](src/pages/ServiceDetail.vue) | wire click handler on Edit button |
| [src/i18n/en.ts](src/i18n/en.ts) | +5 keys |
| [src/i18n/fr.ts](src/i18n/fr.ts) | +5 keys |
| `src/pages/CreateService.test.ts` | new (or extended) |

## Open questions

None.
