# Settings Page — Persistence Fixes

**Date:** 2026-04-28
**Scope:** [src/pages/Settings.vue](../../../src/pages/Settings.vue), [src/services/settings.ts](../../../src/services/settings.ts), i18n, unit tests
**Status:** Approved (brainstorm)

## Problem

A read of the admin Settings page surfaced three issues with the **Save Platform Settings** button (`saveAll` at [Settings.vue:483](../../../src/pages/Settings.vue#L483)):

1. **Payment gateways are not persisted.** `saveGateway` mutates a local ref and toasts `gateway_saved_local_only`. `saveAll` never touches gateways. They vanish on reload.
2. **`saveAll` is not atomic and does not partial-rebase.** Keys are upserted in a `for` loop. If key 3 of 5 fails, keys 1–2 are persisted but `snapshot` is only rebased after the full loop completes — so the form does not reflect what actually saved.
3. **Connection-test status (`workflowStatus` / `deploymentStatus` / `k8sStatus`) is local-only.** Resets to `'idle'` on reload. Surfaced in the read-out as a flagged item; in design we reframed it as **correct behavior that needs UX clarification**, not persistence.

This spec covers fixes for (1) and (2), and a small UX caption for (3).

## Goals

- Gateways round-trip through Supabase using the existing `xayma_app.settings` table — no new table, no migration.
- After `saveAll` returns, `isDirty` reflects **exactly** which keys failed to save. User clicks Save again → only those are retried.
- Set correct expectations for connection tests (live probe, not persisted state).

## Non-goals

- No `xayma_app.payment_gateways` table. No `update_settings_bulk` RPC. No audit trigger work.
- No auto-test of engine connections on mount.
- No persisted last-tested timestamp.
- No refactor of the existing settings caching layer in [settings.ts](../../../src/services/settings.ts).

## Design

### 1. Payment gateways — JSON in `xayma_app.settings`

**New setting key:** `PAYMENT_GATEWAYS` — value is a JSON-stringified `PaymentGateway[]`.

**Service helpers** added to [src/services/settings.ts](../../../src/services/settings.ts), reusing the existing `getSetting` / `updateSetting` plumbing (cache invalidation included):

```ts
export async function getPaymentGateways(): Promise<PaymentGateway[]>
export async function updatePaymentGateways(gateways: PaymentGateway[]): Promise<void>
```

`getPaymentGateways` reads the row, runs `JSON.parse` inside a try/catch, and returns `[]` for missing/empty/malformed values. `updatePaymentGateways` `JSON.stringify`s the array and calls the existing `updateSetting('PAYMENT_GATEWAYS', json)`.

**ID generation** in `saveGateway` ([Settings.vue:436](../../../src/pages/Settings.vue#L436)) switches from
`local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` to `crypto.randomUUID()`. Stable IDs, no "local-" semantics now that gateways persist.

**Settings.vue state changes:**
- Add `gatewaysSnapshot` ref alongside `gateways`.
- Add `gatewaysDirty` computed: `JSON.stringify(gateways.value) !== JSON.stringify(gatewaysSnapshot.value)`.
- The existing form-only dirty check at [Settings.vue:383-385](../../../src/pages/Settings.vue#L383-L385) is split into an internal `formDirty` computed; the exported `isDirty` is redefined as `formDirty.value || gatewaysDirty.value`. The public name `isDirty` (consumed by the template at [Settings.vue:278,285](../../../src/pages/Settings.vue#L278) and the test exposes at [Settings.vue:569](../../../src/pages/Settings.vue#L569)) is unchanged.
- In `onMounted`, after `loadSettings()`, call `getPaymentGateways()` and assign both `gateways` and `gatewaysSnapshot`.
- `saveGateway` and `removeGateway` keep mutating only the local ref — no immediate persist. The `gateway_saved_local_only` notification is removed (the message would be misleading once save is unified — gateways now save on the global Save button like everything else).
- `discardChanges` ([Settings.vue:473](../../../src/pages/Settings.vue#L473)) also restores `gateways` from `gatewaysSnapshot` (deep clone via `structuredClone` or `JSON.parse(JSON.stringify(...))`).

### 2. `saveAll` — per-key snapshot rebase, gateways last

Replace [Settings.vue:483-501](../../../src/pages/Settings.vue#L483-L501):

```ts
async function saveAll(): Promise<void> {
  saving.value = true
  const dirtyKeys = (Object.keys(form) as SettingKey[]).filter(
    (k) => form[k] !== snapshot.value[k]
  )
  let savedCount = 0
  try {
    for (const k of dirtyKeys) {
      await upsertSetting(k, String(form[k]))
      settings.value[k] = String(form[k])
      snapshot.value = { ...snapshot.value, [k]: form[k] }
      savedCount++
    }
    if (gatewaysDirty.value) {
      await updatePaymentGateways(gateways.value)
      gatewaysSnapshot.value = structuredClone(gateways.value)
    }
    notificationStore.addSuccess(t('settings.saved'))
  } catch (err) {
    console.error('Error saving platform settings:', err)
    notificationStore.addError(
      savedCount > 0
        ? t('settings.saved_partial', { saved: savedCount, total: dirtyKeys.length })
        : t('settings.error_saving')
    )
  } finally {
    saving.value = false
  }
}
```

**Invariant:** after `saveAll` returns, `isDirty` is true only for keys/gateways that failed or were not attempted. Each successful upsert immediately rebases its slot in `snapshot`. Gateways persist as one atomic JSON write at the end, so they cannot partial-fail.

Order matters: form keys first, then gateways. If a form key fails mid-loop, gateways are left untouched and stay dirty for the next Save attempt.

### 3. Connection-test status — UX caption, no persistence

`workflowStatus` / `deploymentStatus` / `k8sStatus` remain local refs that reset on mount. To set expectations, add `t('settings.connection_test_caption')` rendered once in the engine-connections section (placement: under the section header or as a help slot on `EngineConnectionCard` — implementation can choose whichever fits cleanly).

Copy: *"Connection tests are live — re-test after editing the URL or key."*

No change to status refs.

### 4. i18n keys

Add to both [src/i18n/en.ts](../../../src/i18n/en.ts) and [src/i18n/fr.ts](../../../src/i18n/fr.ts) under the `settings` namespace:

| Key | EN | FR |
|---|---|---|
| `saved_partial` | `Saved {saved} of {total} settings — please retry.` | `Enregistré {saved} sur {total} paramètres — veuillez réessayer.` |
| `connection_test_caption` | `Connection tests are live — re-test after editing the URL or key.` | `Les tests de connexion sont en direct — retestez après modification de l'URL ou de la clé.` |

Remove `gateway_saved_local_only` from both files (it has exactly one consumer, removed in §1).

### 5. Tests

[src/pages/Settings.test.ts](../../../src/pages/Settings.test.ts) gains three cases:

1. **Partial save failure rebases per-key.** Mock `updateSetting` to resolve for the first dirty key and reject for the second. Assert: snapshot for key 1 is updated; snapshot for key 2 is unchanged; `isDirty` is true; `addError` is called with the `saved_partial` message; `addSuccess` is not called.
2. **Gateway round-trip.** Mock `getPaymentGateways` to return one gateway. Mutate `gateways` (add a second), call `saveAll`. Assert `updatePaymentGateways` was called with both gateways, `gatewaysSnapshot` is updated, `gatewaysDirty` is false.
3. **Discard restores both.** Set form and gateways dirty. Call `discardChanges`. Assert form and gateways match their snapshots, and `isDirty` is false.

## Risks & open questions

- **JSON-blob settings have no schema enforcement.** A bad write (or manual `psql` edit) could leave malformed JSON in the row. Mitigation: `getPaymentGateways` returns `[]` on parse failure with a `console.error`. The Settings UI then shows an empty list rather than crashing — acceptable for an admin-only page.
- **Concurrent admin edits.** Two admins editing gateways simultaneously last-write-wins. This is the same semantics as the rest of the settings page today — not a regression.
- **`structuredClone` availability.** Supported in all evergreen browsers and Node 17+. Vite targets cover this. Fallback `JSON.parse(JSON.stringify(...))` is acceptable if needed.

## Architecture compliance

- ✅ DB read via Supabase JS SDK (`getSetting`).
- ✅ DB write via existing `updateSetting` service (settings is config — direct Supabase write, not n8n; matches current pattern at [settings.ts:65](../../../src/services/settings.ts#L65)).
- ✅ Schema prefix preserved (`xayma_app.settings`).
- ✅ All UI strings via i18n, both EN and FR.
- ✅ No new table → no audit trigger needed.
- ✅ Role check via `useAuth` already in place at [Settings.vue:556](../../../src/pages/Settings.vue#L556).
