# Settings Page Persistence Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist payment gateways through `xayma_app.settings`, make `saveAll` rebase the snapshot per-key on partial failures, and add a UX caption clarifying that connection tests are live (not persisted).

**Architecture:** Two new helpers in `src/services/settings.ts` (`getPaymentGateways` / `updatePaymentGateways`) wrap the existing `updateSetting` plumbing — gateways are stored as a JSON-stringified array under a single `PAYMENT_GATEWAYS` key. `Settings.vue` adds a parallel `gatewaysSnapshot` ref, an `OR`-combined `isDirty`, and a `saveAll` that rebases `snapshot` after each successful upsert. No new tables, no migrations, no RPCs.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), TypeScript, Supabase JS SDK, Vitest + Vue Test Utils, vue-i18n v11.

**Spec:** [`docs/superpowers/specs/2026-04-28-settings-persistence-fixes-design.md`](../specs/2026-04-28-settings-persistence-fixes-design.md)

---

## File Structure

| File | Role | Action |
|---|---|---|
| `src/services/settings.ts` | Add `getPaymentGateways` / `updatePaymentGateways` JSON helpers wrapping existing setting key API | Modify |
| `src/pages/Settings.vue` | Wire up gateway load/snapshot/dirty/save, per-key snapshot rebase in `saveAll`, partial-failure toast, render connection-test caption | Modify |
| `src/pages/Settings.test.ts` | Add tests for partial-save rebase, gateway round-trip, discard-restores-gateways | Modify |
| `src/i18n/en.ts` | Add `saved_partial`, `connection_test_caption`; remove `gateway_saved_local_only` | Modify |
| `src/i18n/fr.ts` | Add `saved_partial`, `connection_test_caption`; remove `gateway_saved_local_only` | Modify |

---

## Task 1: Service helpers — `getPaymentGateways` and `updatePaymentGateways`

Establishes the persistence boundary first so `Settings.vue` work in later tasks can wire up confidently.

**Files:**
- Modify: `src/services/settings.ts`
- Test: `src/services/settings.test.ts` (create alongside)

- [ ] **Step 1: Write the failing tests**

Create `src/services/settings.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PaymentGateway } from '@/types'

const mockUpsert = vi.fn()
const mockSelect = vi.fn()

vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(() => ({
    select: mockSelect,
    upsert: mockUpsert,
  })),
}))

import {
  getPaymentGateways,
  updatePaymentGateways,
  invalidateSettingCache,
} from './settings'

const SAMPLE_GATEWAY: PaymentGateway = {
  id: '00000000-0000-0000-0000-000000000001',
  provider: 'wave' as PaymentGateway['provider'],
  mode: 'sandbox' as PaymentGateway['mode'],
  apiKey: 'k',
  secretKey: 's',
  ipnUrl: 'https://example.test/ipn',
  successUrl: 'https://example.test/ok',
  cancelUrl: 'https://example.test/cancel',
  currency: 'XOF',
}

beforeEach(() => {
  vi.clearAllMocks()
  invalidateSettingCache()
})

describe('getPaymentGateways', () => {
  it('returns parsed array when row exists', async () => {
    mockSelect.mockReturnValueOnce({
      eq: () => ({
        single: () => Promise.resolve({
          data: { value: JSON.stringify([SAMPLE_GATEWAY]) },
          error: null,
        }),
      }),
    })
    const result = await getPaymentGateways()
    expect(result).toEqual([SAMPLE_GATEWAY])
  })

  it('returns [] when row missing', async () => {
    mockSelect.mockReturnValueOnce({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
      }),
    })
    const result = await getPaymentGateways()
    expect(result).toEqual([])
  })

  it('returns [] and logs on malformed JSON', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSelect.mockReturnValueOnce({
      eq: () => ({
        single: () => Promise.resolve({ data: { value: '{not json' }, error: null }),
      }),
    })
    const result = await getPaymentGateways()
    expect(result).toEqual([])
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})

describe('updatePaymentGateways', () => {
  it('upserts JSON-stringified array under PAYMENT_GATEWAYS key', async () => {
    mockUpsert.mockResolvedValueOnce({ error: null })
    await updatePaymentGateways([SAMPLE_GATEWAY])
    expect(mockUpsert).toHaveBeenCalledWith(
      { key: 'PAYMENT_GATEWAYS', value: JSON.stringify([SAMPLE_GATEWAY]) },
      { onConflict: 'key' }
    )
  })

  it('throws when supabase returns an error', async () => {
    mockUpsert.mockResolvedValueOnce({ error: new Error('boom') })
    await expect(updatePaymentGateways([])).rejects.toThrow('boom')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/settings.test.ts`
Expected: FAIL — `getPaymentGateways is not a function` / `updatePaymentGateways is not a function`.

- [ ] **Step 3: Implement helpers**

In `src/services/settings.ts`, add at the bottom of the file (after the existing `invalidateSettingCache`):

```ts
import type { PaymentGateway } from '@/types'

const PAYMENT_GATEWAYS_KEY = 'PAYMENT_GATEWAYS'

/**
 * Fetch payment gateways stored as JSON in xayma_app.settings.
 * Returns [] for missing rows or malformed JSON.
 */
export async function getPaymentGateways(): Promise<PaymentGateway[]> {
  const raw = (await getSetting(PAYMENT_GATEWAYS_KEY)) as string | null
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PaymentGateway[]) : []
  } catch (err) {
    console.error('Failed to parse PAYMENT_GATEWAYS:', err)
    return []
  }
}

/**
 * Persist payment gateways as JSON in xayma_app.settings.
 * Atomic — either the whole array writes or it throws.
 */
export async function updatePaymentGateways(gateways: PaymentGateway[]): Promise<void> {
  await updateSetting(PAYMENT_GATEWAYS_KEY, JSON.stringify(gateways))
}
```

The `import type` line goes at the top of the file alongside the existing `import { supabaseFrom } from './supabase'`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/settings.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Type-check**

Run: `npm run type-check`
Expected: PASS — no new type errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/settings.ts src/services/settings.test.ts
git commit -m "feat(settings): add payment gateway JSON persistence helpers"
```

---

## Task 2: i18n keys — `saved_partial` and `connection_test_caption`

Adds the strings used by Tasks 3 and 4. Done before page wiring so the template can reference them with no typing-error gap.

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/fr.ts`

- [ ] **Step 1: Update `src/i18n/en.ts`**

In the `settings` namespace (around line 845, near the existing `saved` / `error_saving`), add:

```ts
saved_partial: 'Saved {saved} of {total} settings — please retry.',
connection_test_caption: 'Connection tests are live — re-test after editing the URL or key.',
```

In the same `settings` namespace, **delete** this existing line (around line 877):

```ts
gateway_saved_local_only: 'Saved locally — backend wiring coming soon.',
```

- [ ] **Step 2: Update `src/i18n/fr.ts`**

In the `settings` namespace at the matching position, add:

```ts
saved_partial: 'Enregistré {saved} sur {total} paramètres — veuillez réessayer.',
connection_test_caption: 'Les tests de connexion sont en direct — retestez après modification de l\'URL ou de la clé.',
```

In the same `settings` namespace, **delete** the matching `gateway_saved_local_only` entry.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS — type-check should still pass; if `gateway_saved_local_only` is referenced elsewhere it will surface here. (Task 3 removes the only consumer; if type-check fails on that reference now, it confirms the cleanup target — proceed to Task 3 to fix it. If type-check passes, even better.)

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.ts src/i18n/fr.ts
git commit -m "i18n(settings): add saved_partial and connection_test_caption, drop gateway_saved_local_only"
```

---

## Task 3: Settings.vue — wire gateway persistence (load + dirty + discard)

Loads gateways on mount, tracks dirty state, restores them on discard. Save wiring comes in Task 4 to keep tasks bite-sized.

**Files:**
- Modify: `src/pages/Settings.vue`

- [ ] **Step 1: Add `getPaymentGateways` / `updatePaymentGateways` to the existing settings import**

In `src/pages/Settings.vue` line 306, change:

```ts
import { updateSetting as upsertSetting } from '@/services/settings'
```

to:

```ts
import {
  updateSetting as upsertSetting,
  getPaymentGateways,
  updatePaymentGateways,
} from '@/services/settings'
```

- [ ] **Step 2: Hoist gateway refs above dirty-tracking and split the dirty computed**

`gatewaysDirty` needs `gateways` and `gatewaysSnapshot` to exist before the computed runs, so move the gateway refs above the existing dirty computed.

**2a.** Find the block at lines 418–420:

```ts
const gateways = ref<PaymentGateway[]>([])
const gatewayDialogVisible = ref(false)
const editingGateway = ref<PaymentGateway | null>(null)
```

**Delete it from there**, and **insert the following** immediately after the `saving` ref at line 375:

```ts
const gateways = ref<PaymentGateway[]>([])
const gatewaysSnapshot = ref<PaymentGateway[]>([])
const gatewayDialogVisible = ref(false)
const editingGateway = ref<PaymentGateway | null>(null)
```

**2b.** Find the existing `isDirty` block at lines 383–385:

```ts
const isDirty = computed(() =>
  (Object.keys(form) as SettingKey[]).some((k) => form[k] !== snapshot.value[k])
)
```

Replace with:

```ts
const formDirty = computed(() =>
  (Object.keys(form) as SettingKey[]).some((k) => form[k] !== snapshot.value[k])
)
const gatewaysDirty = computed(
  () => JSON.stringify(gateways.value) !== JSON.stringify(gatewaysSnapshot.value)
)
const isDirty = computed(() => formDirty.value || gatewaysDirty.value)
```

The exported `isDirty` name is preserved (template at lines 278/285 and `defineExpose` at line 569 keep working unchanged).

- [ ] **Step 3: Update `discardChanges` to restore gateways**

Find `discardChanges` at lines 473–481 and replace it with:

```ts
function discardChanges(): void {
  for (const k of Object.keys(form) as SettingKey[]) {
    if (NUMERIC_KEYS.has(k)) {
      ;(form[k] as number) = snapshot.value[k] as number
    } else {
      ;(form[k] as string) = snapshot.value[k] as string
    }
  }
  gateways.value = structuredClone(gatewaysSnapshot.value)
}
```

- [ ] **Step 4: Update `saveGateway` — drop the local-only toast, switch to `crypto.randomUUID()`**

Find `saveGateway` at lines 436–450 and replace it with:

```ts
function saveGateway(payload: Omit<PaymentGateway, 'id'> & { id?: string }): void {
  if (payload.id) {
    gateways.value = gateways.value.map((g) =>
      g.id === payload.id ? ({ ...payload, id: payload.id } as PaymentGateway) : g
    )
  } else {
    gateways.value = [
      ...gateways.value,
      { ...payload, id: crypto.randomUUID() } as PaymentGateway,
    ]
  }
  gatewayDialogVisible.value = false
  editingGateway.value = null
}
```

Note the array-rebind (`= [...]`) instead of `.push()` — keeps the reactivity-by-replacement pattern used elsewhere in the file and ensures `gatewaysDirty`'s `JSON.stringify` compare picks up the change reliably.

- [ ] **Step 5: Load gateways on mount**

Find the `onMounted` block at lines 556–565 and replace it with:

```ts
onMounted(async () => {
  if (!isAdmin.value) {
    router.push('/dashboard')
    return
  }

  await loadSettings()
  populateFormFromSettings()
  const loadedGateways = await getPaymentGateways()
  gateways.value = loadedGateways
  gatewaysSnapshot.value = structuredClone(loadedGateways)
  await loadRecentTransactions()
})
```

- [ ] **Step 6: Type-check**

Run: `npm run type-check`
Expected: PASS — no errors. The `gateway_saved_local_only` reference is gone; the import surface for `getPaymentGateways` / `updatePaymentGateways` resolves.

- [ ] **Step 7: Run existing Settings tests to verify no regression**

Run: `npx vitest run src/pages/Settings.test.ts`
Expected: PASS — existing 5 tests still green. (We haven't yet wired `updatePaymentGateways` into `saveAll`, but the existing tests don't exercise that path. The `getPaymentGateways` call on mount returns `[]` because the mocked `supabaseFrom('settings')` chain in the test file returns no row — see Task 5 for why we'll need to extend that mock.)

If the test file's existing `supabaseFrom` mock breaks because `getPaymentGateways` calls `getSetting` (which calls `.eq().single()`), extend the mock to return a benign empty result. The current mock returns `{ select: () => { in: ... } }` only. Update it to also handle the `eq().single()` path:

```ts
vi.mock('@/services/supabase', () => ({
  supabaseFrom: vi.fn(() => ({
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  })),
}))
```

If existing tests still fail after that mock fix, that is the intended fallout of this task — fix here, not later.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Settings.vue src/pages/Settings.test.ts
git commit -m "feat(settings): load and dirty-track payment gateways from settings table"
```

---

## Task 4: Settings.vue — `saveAll` per-key rebase + gateway persistence + caption

Wires up the actual save flow with partial-failure semantics, then renders the connection-test caption.

**Files:**
- Modify: `src/pages/Settings.vue`

- [ ] **Step 1: Replace `saveAll`**

Find `saveAll` at lines 483–501 and replace it with:

```ts
async function saveAll(): Promise<void> {
  saving.value = true
  const dirtyKeys = (Object.keys(form) as SettingKey[]).filter(
    (k) => form[k] !== snapshot.value[k]
  )
  let savedCount = 0
  let hadError = false
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
  } catch (err) {
    hadError = true
    console.error('Error saving platform settings:', err)
    notificationStore.addError(
      savedCount > 0
        ? t('settings.saved_partial', { saved: savedCount, total: dirtyKeys.length })
        : t('settings.error_saving')
    )
  } finally {
    saving.value = false
  }
  if (!hadError) {
    notificationStore.addSuccess(t('settings.saved'))
  }
}
```

The `hadError` flag is a small but important detail: putting the success toast outside the `try` block prevents it from firing when an error has already been reported, while letting `finally` clean up `saving` regardless.

- [ ] **Step 2: Add the connection-test caption to the engine section**

Find the `infrastructure_engines` heading block at lines 21–26:

```vue
<div class="flex items-center gap-3">
  <span class="material-symbols-outlined text-primary">hub</span>
  <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
    {{ t('settings.infrastructure_engines') }}
  </h2>
</div>
```

Replace with:

```vue
<div class="space-y-1">
  <div class="flex items-center gap-3">
    <span class="material-symbols-outlined text-primary">hub</span>
    <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
      {{ t('settings.infrastructure_engines') }}
    </h2>
  </div>
  <p class="text-xs text-on-surface-variant/70 ms-9">
    {{ t('settings.connection_test_caption') }}
  </p>
</div>
```

`ms-9` (margin-inline-start) aligns the caption with the heading text past the icon, RTL-safe per project rules.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: PASS — no new lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.vue
git commit -m "feat(settings): per-key snapshot rebase, persist gateways on save, add test caption"
```

---

## Task 5: Tests for partial-save, gateway round-trip, and discard-restores-gateways

**Files:**
- Modify: `src/pages/Settings.test.ts`

- [ ] **Step 1: Add `updatePaymentGateways` and `getPaymentGateways` mocks**

In `src/pages/Settings.test.ts`, find the existing settings service mock at lines 33–36:

```ts
const mockUpsertSetting = vi.fn().mockResolvedValue(undefined)
vi.mock('@/services/settings', () => ({
  updateSetting: (...args: unknown[]) => mockUpsertSetting(...args),
}))
```

Replace with:

```ts
const mockUpsertSetting = vi.fn().mockResolvedValue(undefined)
const mockGetPaymentGateways = vi.fn().mockResolvedValue([])
const mockUpdatePaymentGateways = vi.fn().mockResolvedValue(undefined)
vi.mock('@/services/settings', () => ({
  updateSetting: (...args: unknown[]) => mockUpsertSetting(...args),
  getPaymentGateways: (...args: unknown[]) => mockGetPaymentGateways(...args),
  updatePaymentGateways: (...args: unknown[]) => mockUpdatePaymentGateways(...args),
}))
```

- [ ] **Step 2: Reset gateway mocks in `beforeEach`**

Update the existing `beforeEach` block (around line 80):

```ts
beforeEach(() => {
  setActivePinia(pinia)
  vi.clearAllMocks()
  mockSettings.value = {}
  mockGetPaymentGateways.mockResolvedValue([])
  mockUpsertSetting.mockResolvedValue(undefined)
  mockUpdatePaymentGateways.mockResolvedValue(undefined)
})
```

`vi.clearAllMocks()` resets `mockResolvedValue`, so re-applying defaults each test is required.

- [ ] **Step 3: Add the partial-save failure test**

Append inside the `describe('Settings', ...)` block, after the existing tests:

```ts
it('partial saveAll failure rebases successful keys but leaves the failed one dirty', async () => {
  mockSettings.value = {
    WORKFLOW_ENGINE_URL: 'https://wf.example.test',
    DEPLOYMENT_ENGINE_URL: 'https://dep.example.test',
  }
  // First key succeeds, second key fails.
  mockUpsertSetting
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error('boom'))

  const wrapper = mountSettings()
  await flushPromises()
  const vm = wrapper.vm as unknown as {
    form: Record<string, string | number>
    isDirty: boolean
    saveAll: () => Promise<void>
  }

  vm.form.WORKFLOW_ENGINE_URL = 'https://changed-1.example.test'
  vm.form.DEPLOYMENT_ENGINE_URL = 'https://changed-2.example.test'
  await flushPromises()

  await vm.saveAll()
  await flushPromises()

  // Assert both upserts were attempted in order.
  expect(mockUpsertSetting).toHaveBeenNthCalledWith(
    1, 'WORKFLOW_ENGINE_URL', 'https://changed-1.example.test'
  )
  expect(mockUpsertSetting).toHaveBeenNthCalledWith(
    2, 'DEPLOYMENT_ENGINE_URL', 'https://changed-2.example.test'
  )

  // The first key's snapshot was rebased, so editing it back to the new value isn't dirty.
  // The second key still differs from snapshot, so isDirty stays true.
  expect(vm.isDirty).toBe(true)
  // Reverting the failed key to its original snapshot value should clear isDirty.
  vm.form.DEPLOYMENT_ENGINE_URL = 'https://dep.example.test'
  await flushPromises()
  expect(vm.isDirty).toBe(false)
})
```

This test asserts the per-key rebase invariant: after partial failure, only the failed key remains dirty. Reverting it to the *original* snapshot value clears `isDirty`, which proves key 1's snapshot was rebased (otherwise reverting key 2 alone wouldn't be enough — key 1 would still differ from its un-rebased snapshot).

- [ ] **Step 4: Add the gateway round-trip test**

Append next:

```ts
it('saveAll persists dirty gateways and clears gatewaysDirty', async () => {
  const existing = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    provider: 'wave',
    mode: 'sandbox',
    apiKey: 'k',
    secretKey: 's',
    ipnUrl: 'https://example.test/ipn',
    successUrl: 'https://example.test/ok',
    cancelUrl: 'https://example.test/cancel',
    currency: 'XOF',
  }
  mockGetPaymentGateways.mockResolvedValue([existing])

  // Stub randomUUID so the test is deterministic.
  const uuidSpy = vi.spyOn(crypto, 'randomUUID')
    .mockReturnValue('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as `${string}-${string}-${string}-${string}-${string}`)

  const wrapper = mountSettings()
  await flushPromises()
  const vm = wrapper.vm as unknown as {
    isDirty: boolean
    saveAll: () => Promise<void>
    saveGateway: (payload: unknown) => void
  }

  // Add a second gateway via the existing handler.
  vm.saveGateway({
    provider: 'orange_money',
    mode: 'sandbox',
    apiKey: 'k2',
    secretKey: 's2',
    ipnUrl: 'https://example.test/ipn2',
    successUrl: 'https://example.test/ok2',
    cancelUrl: 'https://example.test/cancel2',
    currency: 'XOF',
  })
  await flushPromises()
  expect(vm.isDirty).toBe(true)

  await vm.saveAll()
  await flushPromises()

  expect(mockUpdatePaymentGateways).toHaveBeenCalledTimes(1)
  const [persisted] = mockUpdatePaymentGateways.mock.calls[0] as [Array<{ id: string }>]
  expect(persisted).toHaveLength(2)
  expect(persisted.map((g) => g.id)).toEqual([
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  ])
  expect(vm.isDirty).toBe(false)

  uuidSpy.mockRestore()
})
```

- [ ] **Step 5: Add the discard-restores-gateways test**

Append next:

```ts
it('discardChanges restores gateways to their loaded snapshot', async () => {
  const existing = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    provider: 'wave',
    mode: 'sandbox',
    apiKey: 'k',
    secretKey: 's',
    ipnUrl: 'https://example.test/ipn',
    successUrl: 'https://example.test/ok',
    cancelUrl: 'https://example.test/cancel',
    currency: 'XOF',
  }
  mockGetPaymentGateways.mockResolvedValue([existing])

  const wrapper = mountSettings()
  await flushPromises()
  const vm = wrapper.vm as unknown as {
    isDirty: boolean
    discardChanges: () => void
    saveGateway: (payload: unknown) => void
  }

  vm.saveGateway({
    provider: 'orange_money',
    mode: 'sandbox',
    apiKey: 'k2',
    secretKey: 's2',
    ipnUrl: 'https://example.test/ipn2',
    successUrl: 'https://example.test/ok2',
    cancelUrl: 'https://example.test/cancel2',
    currency: 'XOF',
  })
  await flushPromises()
  expect(vm.isDirty).toBe(true)

  vm.discardChanges()
  await flushPromises()
  expect(vm.isDirty).toBe(false)
})
```

- [ ] **Step 6: Run the full Settings test file**

Run: `npx vitest run src/pages/Settings.test.ts`
Expected: PASS — 8 tests green (5 existing + 3 new).

- [ ] **Step 7: Run the full project test suite to catch any regression**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Settings.test.ts
git commit -m "test(settings): cover partial saveAll, gateway round-trip, gateway discard"
```

---

## Task 6: `/verify-task` and visual check

**Files:** none — verification only.

- [ ] **Step 1: Run `/verify-task`**

Invoke the `verify-task` slash command from the user's tooling (per project CLAUDE.md). Expected: green — type-check, lint, unit tests, build all pass.

- [ ] **Step 2: Run `/visual-check` against the Settings mockup**

Invoke `/visual-check` to screenshot the Settings page and compare with `docs/mockups/09-admin-platform-settings.png`. The new caption sits inside the existing infrastructure-engines header — should not regress layout. Expected: no visual diffs beyond the new caption text.

- [ ] **Step 3: Manual smoke test in dev server**

Run: `npm run dev`
- Navigate to `/settings` as admin.
- Add a gateway, click **Save Platform Settings**, reload the page → gateway persists.
- Edit a numeric field, click Save → success toast.
- (Optional) Use DevTools to throw on the second `updateSetting` call → assert partial-save toast `"Saved 1 of 2 settings — please retry."` appears, and the failed field stays dirty after Save.
- Click **Discard Changes** with both form and gateway edits pending → both revert.

If the manual smoke confirms the flow, the task is complete.

- [ ] **Step 4: Final commit if any verification fixes were needed**

If verification surfaces issues, fix and commit before declaring done. Otherwise, no further commit needed for this task.

---
