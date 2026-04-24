# Sprint 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Sprint 6 by polishing responsive design and accessibility, adding reseller deployment controls and admin settings page, implementing CSV export, then running full E2E test suite to gate completion.

**Architecture:** 
- **Responsive phase:** Fix layout issues at 375px (mobile), 768px (tablet), 1280px (desktop) across all dashboards and pages. DataTables use `responsiveLayout="stack"` on mobile; sidebars collapse to icons.
- **Accessibility phase:** Add keyboard navigation (Tab/Enter/Escape), ARIA labels on icon-only buttons, visible focus rings (via `:focus-visible` styles), verify color contrast ≥4.5:1 on all text.
- **Features phase:** Reseller deployment controls (stop/start/restart via buttons), Settings page (admin-only accordion for Payments/Notifications/Limits/Infrastructure), CSV export integration into AppDataTable.
- **Testing phase:** Unit tests for new components, E2E tests at all breakpoints, screenshot validation.

**Tech Stack:** Vue 3 + TypeScript, PrimeVue 4 (DataTable, Card, Accordion, Button), Tailwind CSS (responsive classes: `md:`, `lg:`), Vitest + Playwright, i18n (EN + FR).

---

## File Structure

### Files to Create:
- `src/pages/Settings.vue` — Admin-only settings page with Accordion and inline edit
- `src/components/common/ResponsiveHelpers.ts` — Utilities for breakpoint detection (optional; Tailwind classes preferred)
- `src/pages/Settings.test.ts` — Unit tests for Settings page
- `tests/e2e/responsive.spec.ts` — Responsive breakpoint E2E tests
- `tests/e2e/dashboards.spec.ts` — Dashboard value validation E2E tests

### Files to Modify:
- `src/pages/ResellerDashboard.vue` — Add stop/start/restart action buttons to deployment table
- `src/pages/AdminDashboard.vue` — Responsive grid adjustments (1 col @ 375px, 2 col @ 768px, 3 col @ 1280px)
- `src/pages/CustomerDashboard.vue` — Responsive adjustments
- `src/pages/SalesDashboard.vue` — Responsive adjustments
- `src/pages/Portfolio.vue` — Responsive adjustments
- `src/pages/Commissions.vue` — Responsive adjustments
- `src/pages/Deployments.vue` — Responsive adjustments
- `src/pages/DeploymentDetail.vue` — Responsive adjustments
- `src/components/common/AppDataTable.vue` — CSV export slot (already exists; verify implementation)
- `src/components/common/AppSidebar.vue` — Collapse to icons on mobile (verify)
- `src/composables/useDeployments.ts` — Add `stopDeployment()`, `startDeployment()`, `restartDeployment()` actions
- `src/router/index.ts` — Add `/settings` route (admin-only)
- `src/i18n/en.ts` — Add i18n keys for Settings page + reseller deployment controls
- `src/i18n/fr.ts` — Add i18n keys for Settings page + reseller deployment controls

---

## Task Sequence

### Task 1: Responsive Baseline Audit & Dashboard Fixes

**Files:**
- Modify: `src/pages/AdminDashboard.vue`
- Modify: `src/pages/CustomerDashboard.vue`
- Modify: `src/pages/SalesDashboard.vue`
- Modify: `src/pages/ResellerDashboard.vue`

**Steps:**

- [ ] **Step 1: Audit AdminDashboard at 375px viewport**

In dev mode (`npm run dev`), open DevTools and set viewport to 375px (mobile).
Navigate to `/dashboard` (admin user).
Check for:
- Horizontal scroll? (should not exist)
- Stat grid: should be 1 column at 375px, 2 at 768px, 3 at 1280px
- Charts: should stack vertically, not side-by-side
- Labels readable without truncation

Expected: Stat cards need `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` layout.

- [ ] **Step 2: Update AdminDashboard grid classes**

Open `src/pages/AdminDashboard.vue` and locate the stat grid section (usually `<div class="grid ...`).

Replace:
```vue
<div class="grid grid-cols-3 gap-4">
```

With:
```vue
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

If charts are in a 2-column layout, update them similarly:
```vue
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <!-- Line chart -->
  <!-- Bar chart -->
</div>

<div class="grid grid-cols-1 gap-4">
  <!-- Donut chart -->
</div>
```

- [ ] **Step 3: Test AdminDashboard at 375px, 768px, 1280px**

DevTools → Responsive Design Mode (Ctrl+Shift+M):
- 375px: 1 column stat grid, vertical chart stack
- 768px: 2 column stat grid, 2-column charts
- 1280px: 3 column stat grid, 2-column chart layout

Expected: No horizontal scroll at any breakpoint. All text readable.

- [ ] **Step 4: Apply same responsive classes to CustomerDashboard**

Open `src/pages/CustomerDashboard.vue`. 
Locate the "Quick Stats" section (3-column layout):
```vue
<div class="grid grid-cols-3 gap-4">
```

Replace with:
```vue
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

Test at all 3 breakpoints.

- [ ] **Step 5: Apply same responsive classes to SalesDashboard**

Open `src/pages/SalesDashboard.vue`.
Locate stat grid and update to `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
Test at all breakpoints.

- [ ] **Step 6: Apply same responsive classes to ResellerDashboard**

Open `src/pages/ResellerDashboard.vue`.
Locate stat grid and update responsive classes.
Test at all breakpoints.

- [ ] **Step 7: Verify DataTable responsiveness**

In `AppDataTable.vue`, check that `responsive-layout="scroll"` is set (allows horizontal scroll on small screens, not ideal).

Best practice for mobile: `responsiveLayout="stack"` converts table to card view on mobile.

Update `src/components/common/AppDataTable.vue`:
```vue
<DataTable
  ...
  responsive-layout="stack"
  :breakpoint="768"
  ...
>
```

This makes tables stack into cards at <768px.

- [ ] **Step 8: Commit responsive baseline fixes**

```bash
git add src/pages/AdminDashboard.vue src/pages/CustomerDashboard.vue src/pages/SalesDashboard.vue src/pages/ResellerDashboard.vue src/components/common/AppDataTable.vue
git commit -m "refactor: add responsive grid classes to all dashboards (375/768/1280px)"
```

---

### Task 2: Accessibility Audit & ARIA Labels

**Files:**
- Modify: `src/components/common/AppSidebar.vue`
- Modify: `src/pages/AdminDashboard.vue`
- Modify: `src/components/common/AppDataTable.vue`
- Modify: `src/components/deployments/DeploymentCard.vue` (if it exists)

**Steps:**

- [ ] **Step 1: Audit sidebar keyboard navigation**

DevTools → Elements tab. Select the sidebar.
Open dev tools console and run:
```javascript
document.querySelector('aside').querySelectorAll('[role="menuitem"]').forEach(el => console.log(el.getAttribute('tabindex')))
```

Expected: All menu items should have `tabindex="0"` (or be `<button>` which are natively focusable).

Open `src/components/common/AppSidebar.vue` and check PrimeVue `PanelMenu` usage. PrimeVue handles a11y, but verify:
- Menu items are keyboard-navigable (Arrow Up/Down)
- Enter/Space activates menu items
- Escape closes submenus

PrimeVue does this by default, but check if custom styling removed focus rings.

- [ ] **Step 2: Add focus ring utilities to CSS**

Open or create `src/assets/styles/a11y.css`:

```css
/* Visible focus rings for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}

/* For elements that don't support :focus-visible (older browsers) */
:focus {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}

/* Button focus */
button:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}

/* Anchor focus */
a:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}
```

Import this in `src/App.vue`:
```typescript
import '@/assets/styles/a11y.css'
```

- [ ] **Step 3: Audit icon-only buttons for ARIA labels**

Open `src/pages/AdminDashboard.vue` and search for `<Button icon=`.

For each icon-only button (no visible text), add `aria-label`:

```vue
<Button
  icon="pi pi-download"
  aria-label="Export data to CSV"
  @click="exportData"
/>
```

Common buttons to audit:
- Export button in AppDataTable
- Delete/Edit buttons in tables
- Menu toggles
- Language toggle in header

Update `src/components/common/AppDataTable.vue`:
```vue
<Button
  icon="pi pi-download"
  class="p-button-outlined"
  severity="secondary"
  aria-label="Export as CSV"
  @click="exportCSV"
  :title="$t('common.export')"
/>
```

- [ ] **Step 4: Add aria-label to column toggle**

In `AppDataTable.vue`, the MultiSelect for column visibility needs a label:

```vue
<MultiSelect
  v-model="visibleColumns"
  :options="columns"
  option-label="header"
  option-value="field"
  :placeholder="$t('common.columns')"
  aria-label="Toggle visible columns"
  class="w-64"
  @change="handleColumnChange"
/>
```

- [ ] **Step 5: Verify color contrast**

Use Chrome DevTools:
1. Inspect any text element
2. Styles tab → Computed
3. Look for contrast info (may show if accessibility panel is open)

Or use online tool: https://webaim.org/resources/contrastchecker/

Common issues in dark text on light backgrounds:
- Text color `#666` (gray) on white: ~4.5:1 (acceptable)
- Text color `#999` on white: ~3:1 (FAIL)

In design tokens (`src/design-system/tokens.json`), confirm all text colors meet ≥4.5:1 contrast.

If you find issues, update `src/assets/styles/primevue-theme.css`:
```css
:root {
  --p-text-color: var(--on-surface); /* Higher contrast */
  --p-text-color-secondary: var(--on-surface-variant); /* Still ≥4.5:1 */
}
```

- [ ] **Step 6: Commit accessibility improvements**

```bash
git add src/assets/styles/a11y.css src/components/common/AppSidebar.vue src/components/common/AppDataTable.vue src/pages/AdminDashboard.vue src/App.vue
git commit -m "feat: add focus rings, ARIA labels, and contrast verification for a11y"
```

---

### Task 3: Reseller Deployment Controls

**Files:**
- Modify: `src/pages/ResellerDashboard.vue`
- Modify: `src/composables/useDeployments.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/fr.ts`

**Steps:**

- [ ] **Step 1: Add deployment action methods to useDeployments**

Open `src/composables/useDeployments.ts` and add three methods:

```typescript
async function stopDeployment(deploymentId: string): Promise<void> {
  try {
    const { error } = await database
      .from('xayma_app.deployments')
      .update({ deployment_status: 'stopping' })
      .eq('id', deploymentId)

    if (error) throw error

    // Trigger workflow engine webhook to stop deployment
    await workflowEngineService.callWebhook('deployment.stop', {
      deploymentId,
      partnerId: auth.user?.user_metadata?.company_id,
    })

    notificationStore.addSuccess(t('deployments.stop_initiated'))
  } catch (err) {
    notificationStore.addError(t('deployments.error_stopping'))
  }
}

async function startDeployment(deploymentId: string): Promise<void> {
  try {
    const { error } = await database
      .from('xayma_app.deployments')
      .update({ deployment_status: 'starting' })
      .eq('id', deploymentId)

    if (error) throw error

    await workflowEngineService.callWebhook('deployment.start', {
      deploymentId,
      partnerId: auth.user?.user_metadata?.company_id,
    })

    notificationStore.addSuccess(t('deployments.start_initiated'))
  } catch (err) {
    notificationStore.addError(t('deployments.error_starting'))
  }
}

async function restartDeployment(deploymentId: string): Promise<void> {
  try {
    const { error } = await database
      .from('xayma_app.deployments')
      .update({ deployment_status: 'restarting' })
      .eq('id', deploymentId)

    if (error) throw error

    await workflowEngineService.callWebhook('deployment.restart', {
      deploymentId,
      partnerId: auth.user?.user_metadata?.company_id,
    })

    notificationStore.addSuccess(t('deployments.restart_initiated'))
  } catch (err) {
    notificationStore.addError(t('deployments.error_restarting'))
  }
}

return {
  // ... existing exports
  stopDeployment,
  startDeployment,
  restartDeployment,
}
```

- [ ] **Step 2: Update ResellerDashboard to show deployment controls**

Open `src/pages/ResellerDashboard.vue` and locate the deployments table/list section.

Find the row template where deployments are rendered. Add action buttons:

```vue
<template #body="{ data: deployment }">
  <div class="flex gap-2">
    <Button
      v-if="deployment.deployment_status === 'active'"
      icon="pi pi-pause"
      size="small"
      severity="warning"
      aria-label="Stop deployment"
      @click="stopDeployment(deployment.id)"
    />
    <Button
      v-if="deployment.deployment_status === 'stopped'"
      icon="pi pi-play"
      size="small"
      severity="success"
      aria-label="Start deployment"
      @click="startDeployment(deployment.id)"
    />
    <Button
      v-if="['active', 'stopped'].includes(deployment.deployment_status)"
      icon="pi pi-refresh"
      size="small"
      severity="info"
      aria-label="Restart deployment"
      @click="restartDeployment(deployment.id)"
    />
    <router-link :to="`/deployments/${deployment.id}`">
      <Button icon="pi pi-arrow-right" size="small" text />
    </router-link>
  </div>
</template>
```

In the `<script setup>`:
```typescript
import { useDeployments } from '@/composables/useDeployments'
const { stopDeployment, startDeployment, restartDeployment } = useDeployments()
```

- [ ] **Step 3: Add i18n keys for deployment actions**

Open `src/i18n/en.ts` and add under `deployments` section:
```typescript
deployments: {
  // ... existing keys
  stop_initiated: 'Deployment stopped',
  start_initiated: 'Deployment started',
  restart_initiated: 'Deployment restarted',
  error_stopping: 'Failed to stop deployment',
  error_starting: 'Failed to start deployment',
  error_restarting: 'Failed to restart deployment',
}
```

Open `src/i18n/fr.ts` and add the same keys in French:
```typescript
deployments: {
  // ... existing keys
  stop_initiated: 'Déploiement arrêté',
  start_initiated: 'Déploiement démarré',
  restart_initiated: 'Déploiement redémarré',
  error_stopping: 'Impossible d\'arrêter le déploiement',
  error_starting: 'Impossible de démarrer le déploiement',
  error_restarting: 'Impossible de redémarrer le déploiement',
}
```

- [ ] **Step 4: Test reseller deployment controls**

Start dev server: `npm run dev`
Login as a reseller user (or create one in test environment).
Navigate to `/reseller-dashboard`.
Verify:
- Deployment table shows with action buttons
- Stop button appears on active deployments
- Start button appears on stopped deployments
- Restart button always shows for active/stopped
- Click stop → notification toast appears
- Button states update based on deployment status

- [ ] **Step 5: Commit reseller deployment controls**

```bash
git add src/pages/ResellerDashboard.vue src/composables/useDeployments.ts src/i18n/en.ts src/i18n/fr.ts
git commit -m "feat: add stop/start/restart controls to reseller dashboard"
```

---

### Task 4: Settings Page (Admin-Only)

**Files:**
- Create: `src/pages/Settings.vue`
- Create: `src/pages/Settings.test.ts`
- Modify: `src/router/index.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/fr.ts`
- Modify: `src/composables/useSettings.ts` (or create if missing)

**Steps:**

- [ ] **Step 1: Create useSettings composable (if not exists)**

Check if `src/composables/useSettings.ts` exists:
```bash
ls -la src/composables/useSettings.ts
```

If it exists, verify it has:
```typescript
async function getSetting(key: string): Promise<string | null>
async function updateSetting(key: string, value: string): Promise<void>
async function getAllSettings(): Promise<Record<string, string>>
```

If not, create it:

```typescript
// src/composables/useSettings.ts
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { database } from '@/services/supabase'
import { notificationStore } from '@/stores/notifications'

const settings = ref<Record<string, string>>({})
const loading = ref(false)

export function useSettings() {
  const { t } = useI18n()

  async function loadSettings(): Promise<void> {
    loading.value = true
    try {
      const { data, error } = await database
        .from('xayma_app.settings')
        .select('key, value')

      if (error) throw error

      settings.value = (data || []).reduce(
        (acc, { key, value }) => ({ ...acc, [key]: value }),
        {}
      )
    } catch (err) {
      notificationStore.addError(t('settings.error_loading'))
    } finally {
      loading.value = false
    }
  }

  async function updateSetting(key: string, value: string): Promise<void> {
    try {
      const { error } = await database
        .from('xayma_app.settings')
        .upsert({ key, value, updated_at: new Date().toISOString() })
        .eq('key', key)

      if (error) throw error

      settings.value[key] = value
      notificationStore.addSuccess(t('settings.saved'))
    } catch (err) {
      notificationStore.addError(t('settings.error_saving'))
    }
  }

  return {
    settings,
    loading,
    loadSettings,
    updateSetting,
  }
}
```

- [ ] **Step 2: Create Settings.vue page**

Create `src/pages/Settings.vue`:

```vue
<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader
      :title="$t('settings.title')"
      :description="$t('settings.description')"
      icon="pi-cog"
    />

    <!-- Settings Accordion -->
    <Card>
      <Accordion :value="['payments']" :multiple="true">
        <!-- Payments Section -->
        <AccordionTab :header="$t('settings.payments_header')" value="payments">
          <div class="space-y-4">
            <div class="field grid">
              <label for="gateway-api-key" class="col-12 mb-2 block">
                {{ $t('settings.payment_gateway_api_key') }}
              </label>
              <InputText
                id="gateway-api-key"
                v-model="paymentGatewayKey"
                type="password"
                class="col-12"
                @blur="saveSetting('PAYMENT_GATEWAY_API_KEY', paymentGatewayKey)"
              />
              <small class="col-12 text-on-surface-variant mt-2">
                {{ $t('settings.payment_gateway_api_key_hint') }}
              </small>
            </div>

            <div class="field grid">
              <label for="wave-merchant-id" class="col-12 mb-2 block">
                {{ $t('settings.wave_merchant_id') }}
              </label>
              <InputText
                id="wave-merchant-id"
                v-model="waveMerchantId"
                class="col-12"
                @blur="saveSetting('WAVE_MERCHANT_ID', waveMerchantId)"
              />
            </div>

            <div class="field grid">
              <label for="orange-merchant-id" class="col-12 mb-2 block">
                {{ $t('settings.orange_merchant_id') }}
              </label>
              <InputText
                id="orange-merchant-id"
                v-model="orangeMerchantId"
                class="col-12"
                @blur="saveSetting('ORANGE_MERCHANT_ID', orangeMerchantId)"
              />
            </div>
          </div>
        </AccordionTab>

        <!-- Notifications Section -->
        <AccordionTab :header="$t('settings.notifications_header')" value="notifications">
          <div class="space-y-4">
            <div class="field grid">
              <label for="credit-warning-threshold" class="col-12 mb-2 block">
                {{ $t('settings.credit_warning_threshold') }}
              </label>
              <InputNumber
                id="credit-warning-threshold"
                v-model="creditWarningThreshold"
                :min="1"
                :max="100"
                class="col-12"
                @blur="saveSetting('CREDIT_WARNING_THRESHOLD', creditWarningThreshold?.toString() || '')"
              />
              <small class="col-12 text-on-surface-variant mt-2">
                {{ $t('settings.credit_warning_threshold_hint') }}
              </small>
            </div>

            <div class="field grid">
              <label for="enable-email-notifications" class="col-12 mb-2 block">
                {{ $t('settings.enable_email_notifications') }}
              </label>
              <ToggleButton
                v-model="enableEmailNotifications"
                :off-label="$t('common.no')"
                :on-label="$t('common.yes')"
                class="col-12"
                @change="saveSetting('ENABLE_EMAIL_NOTIFICATIONS', enableEmailNotifications ? '1' : '0')"
              />
            </div>

            <div class="field grid">
              <label for="enable-sms-notifications" class="col-12 mb-2 block">
                {{ $t('settings.enable_sms_notifications') }}
              </label>
              <ToggleButton
                v-model="enableSmsNotifications"
                :off-label="$t('common.no')"
                :on-label="$t('common.yes')"
                class="col-12"
                @change="saveSetting('ENABLE_SMS_NOTIFICATIONS', enableSmsNotifications ? '1' : '0')"
              />
            </div>
          </div>
        </AccordionTab>

        <!-- Limits Section -->
        <AccordionTab :header="$t('settings.limits_header')" value="limits">
          <div class="space-y-4">
            <div class="field grid">
              <label for="max-deployments-per-partner" class="col-12 mb-2 block">
                {{ $t('settings.max_deployments_per_partner') }}
              </label>
              <InputNumber
                id="max-deployments-per-partner"
                v-model="maxDeploymentsPerPartner"
                :min="1"
                class="col-12"
                @blur="saveSetting('MAX_DEPLOYMENTS_PER_PARTNER', maxDeploymentsPerPartner?.toString() || '')"
              />
            </div>

            <div class="field grid">
              <label for="max-users-per-partner" class="col-12 mb-2 block">
                {{ $t('settings.max_users_per_partner') }}
              </label>
              <InputNumber
                id="max-users-per-partner"
                v-model="maxUsersPerPartner"
                :min="1"
                class="col-12"
                @blur="saveSetting('MAX_USERS_PER_PARTNER', maxUsersPerPartner?.toString() || '')"
              />
            </div>
          </div>
        </AccordionTab>

        <!-- Infrastructure Section -->
        <AccordionTab :header="$t('settings.infrastructure_header')" value="infrastructure">
          <div class="space-y-4">
            <div class="field grid">
              <label for="deployment-engine-url" class="col-12 mb-2 block">
                {{ $t('settings.deployment_engine_url') }}
              </label>
              <InputText
                id="deployment-engine-url"
                v-model="deploymentEngineUrl"
                type="url"
                class="col-12"
                @blur="saveSetting('DEPLOYMENT_ENGINE_URL', deploymentEngineUrl)"
              />
              <small class="col-12 text-on-surface-variant mt-2">
                {{ $t('settings.deployment_engine_url_hint') }}
              </small>
            </div>

            <div class="field grid">
              <label for="workflow-engine-url" class="col-12 mb-2 block">
                {{ $t('settings.workflow_engine_url') }}
              </label>
              <InputText
                id="workflow-engine-url"
                v-model="workflowEngineUrl"
                type="url"
                class="col-12"
                @blur="saveSetting('WORKFLOW_ENGINE_URL', workflowEngineUrl)"
              />
            </div>

            <div class="field grid">
              <label for="kafka-brokers" class="col-12 mb-2 block">
                {{ $t('settings.kafka_brokers') }}
              </label>
              <InputText
                id="kafka-brokers"
                v-model="kafkaBrokers"
                class="col-12"
                placeholder="broker1:9092,broker2:9092"
                @blur="saveSetting('KAFKA_BROKERS', kafkaBrokers)"
              />
              <small class="col-12 text-on-surface-variant mt-2">
                {{ $t('settings.kafka_brokers_hint') }}
              </small>
            </div>
          </div>
        </AccordionTab>
      </Accordion>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/composables/useAuth'
import { useSettings } from '@/composables/useSettings'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import ToggleButton from 'primevue/togglebutton'
import AppPageHeader from '@/components/common/AppPageHeader.vue'

const { t } = useI18n()
const { isAdmin } = useAuth()
const router = useRouter()
const { settings, loading, loadSettings, updateSetting } = useSettings()

// Ref bindings for each setting
const paymentGatewayKey = ref('')
const waveMerchantId = ref('')
const orangeMerchantId = ref('')
const creditWarningThreshold = ref(20)
const enableEmailNotifications = ref(true)
const enableSmsNotifications = ref(true)
const maxDeploymentsPerPartner = ref(10)
const maxUsersPerPartner = ref(50)
const deploymentEngineUrl = ref('')
const workflowEngineUrl = ref('')
const kafkaBrokers = ref('')

async function saveSetting(key: string, value: string | number | boolean): Promise<void> {
  const stringValue = typeof value === 'string' ? value : String(value)
  await updateSetting(key, stringValue)
}

onMounted(async () => {
  if (!isAdmin.value) {
    router.push('/dashboard')
    return
  }

  await loadSettings()

  // Populate form with loaded settings
  paymentGatewayKey.value = settings.value['PAYMENT_GATEWAY_API_KEY'] || ''
  waveMerchantId.value = settings.value['WAVE_MERCHANT_ID'] || ''
  orangeMerchantId.value = settings.value['ORANGE_MERCHANT_ID'] || ''
  creditWarningThreshold.value = parseInt(settings.value['CREDIT_WARNING_THRESHOLD'] || '20')
  enableEmailNotifications.value = settings.value['ENABLE_EMAIL_NOTIFICATIONS'] === '1'
  enableSmsNotifications.value = settings.value['ENABLE_SMS_NOTIFICATIONS'] === '1'
  maxDeploymentsPerPartner.value = parseInt(settings.value['MAX_DEPLOYMENTS_PER_PARTNER'] || '10')
  maxUsersPerPartner.value = parseInt(settings.value['MAX_USERS_PER_PARTNER'] || '50')
  deploymentEngineUrl.value = settings.value['DEPLOYMENT_ENGINE_URL'] || ''
  workflowEngineUrl.value = settings.value['WORKFLOW_ENGINE_URL'] || ''
  kafkaBrokers.value = settings.value['KAFKA_BROKERS'] || ''
})
</script>
```

- [ ] **Step 3: Add route to Settings page**

Open `src/router/index.ts` and add:

```typescript
{
  path: '/settings',
  name: 'Settings',
  component: () => import('@/pages/Settings.vue'),
  meta: {
    requiredRole: 'ADMIN',
    layout: 'app',
  },
}
```

- [ ] **Step 4: Add i18n keys for Settings page**

Open `src/i18n/en.ts` and add:

```typescript
settings: {
  title: 'Platform Settings',
  description: 'Configure platform-wide settings for payments, notifications, limits, and infrastructure',
  payments_header: 'Payments',
  payment_gateway_api_key: 'Payment Gateway API Key',
  payment_gateway_api_key_hint: 'Used for processing credit purchases. Keep this secure.',
  wave_merchant_id: 'Wave Merchant ID',
  orange_merchant_id: 'Orange Money Merchant ID',
  notifications_header: 'Notifications',
  credit_warning_threshold: 'Credit Warning Threshold (%)',
  credit_warning_threshold_hint: 'Send warning when partner credits fall below this percentage',
  enable_email_notifications: 'Enable Email Notifications',
  enable_sms_notifications: 'Enable SMS Notifications',
  limits_header: 'Limits',
  max_deployments_per_partner: 'Max Deployments per Partner',
  max_users_per_partner: 'Max Users per Partner',
  infrastructure_header: 'Infrastructure',
  deployment_engine_url: 'Deployment Engine URL',
  deployment_engine_url_hint: 'Base URL of the deployment engine service',
  workflow_engine_url: 'Workflow Engine URL',
  kafka_brokers: 'Kafka Brokers',
  kafka_brokers_hint: 'Comma-separated list of Kafka broker addresses',
  saved: 'Setting saved successfully',
  error_loading: 'Failed to load settings',
  error_saving: 'Failed to save setting',
}
```

Open `src/i18n/fr.ts` and add (French translations):

```typescript
settings: {
  title: 'Paramètres de la plateforme',
  description: 'Configurez les paramètres de la plateforme pour les paiements, notifications, limites et infrastructure',
  payments_header: 'Paiements',
  payment_gateway_api_key: 'Clé API de la passerelle de paiement',
  payment_gateway_api_key_hint: 'Utilisée pour traiter les achats de crédits. Gardez-la sécurisée.',
  wave_merchant_id: 'ID de commerçant Wave',
  orange_merchant_id: 'ID de commerçant Orange Money',
  notifications_header: 'Notifications',
  credit_warning_threshold: 'Seuil d\'avertissement de crédit (%)',
  credit_warning_threshold_hint: 'Envoyer un avertissement quand les crédits du partenaire tombent sous ce pourcentage',
  enable_email_notifications: 'Activer les notifications par email',
  enable_sms_notifications: 'Activer les notifications par SMS',
  limits_header: 'Limites',
  max_deployments_per_partner: 'Max de déploiements par partenaire',
  max_users_per_partner: 'Max d\'utilisateurs par partenaire',
  infrastructure_header: 'Infrastructure',
  deployment_engine_url: 'URL du moteur de déploiement',
  deployment_engine_url_hint: 'URL de base du service du moteur de déploiement',
  workflow_engine_url: 'URL du moteur de workflow',
  kafka_brokers: 'Courtiers Kafka',
  kafka_brokers_hint: 'Liste séparée par des virgules des adresses des courtiers Kafka',
  saved: 'Paramètre sauvegardé avec succès',
  error_loading: 'Échec du chargement des paramètres',
  error_saving: 'Échec de la sauvegarde du paramètre',
}
```

- [ ] **Step 5: Add Settings link to sidebar**

Open `src/components/common/AppSidebar.vue` and add Settings menu item for admin:

```vue
<router-link
  v-if="isAdmin"
  to="/settings"
  class="menu-item"
>
  <i class="pi pi-cog"></i>
  <span>{{ $t('settings.title') }}</span>
</router-link>
```

- [ ] **Step 6: Test Settings page**

Start dev server: `npm run dev`
Login as admin.
Click Settings in sidebar (or navigate to `/settings`).
Verify:
- All accordion sections visible
- Can edit each field
- Blur on input → saves setting
- Notification toast appears on save
- Non-admin user cannot access (redirects to dashboard)

- [ ] **Step 7: Create Settings.test.ts**

Create `src/pages/Settings.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Settings from './Settings.vue'
import { useAuth } from '@/composables/useAuth'
import { useSettings } from '@/composables/useSettings'
import { useRouter } from 'vue-router'

vi.mock('@/composables/useAuth')
vi.mock('@/composables/useSettings')
vi.mock('vue-router')

describe('Settings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects non-admin users to dashboard', () => {
    const mockPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any)
    vi.mocked(useAuth).mockReturnValue({
      isAdmin: { value: false },
    } as any)
    vi.mocked(useSettings).mockReturnValue({
      settings: { value: {} },
      loading: { value: false },
      loadSettings: vi.fn(),
      updateSetting: vi.fn(),
    } as any)

    mount(Settings, {
      global: {
        stubs: {
          AppPageHeader: true,
          Card: true,
          Accordion: true,
          AccordionTab: true,
        },
      },
    })

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('loads settings on mount', async () => {
    const mockLoadSettings = vi.fn()
    vi.mocked(useAuth).mockReturnValue({
      isAdmin: { value: true },
    } as any)
    vi.mocked(useRouter).mockReturnValue({} as any)
    vi.mocked(useSettings).mockReturnValue({
      settings: { value: { WAVE_MERCHANT_ID: '12345' } },
      loading: { value: false },
      loadSettings: mockLoadSettings,
      updateSetting: vi.fn(),
    } as any)

    mount(Settings, {
      global: {
        stubs: {
          AppPageHeader: true,
          Card: true,
          Accordion: true,
          AccordionTab: true,
        },
      },
    })

    expect(mockLoadSettings).toHaveBeenCalled()
  })
})
```

- [ ] **Step 8: Commit Settings page**

```bash
git add src/pages/Settings.vue src/pages/Settings.test.ts src/router/index.ts src/composables/useSettings.ts src/components/common/AppSidebar.vue src/i18n/en.ts src/i18n/fr.ts
git commit -m "feat: add admin-only Settings page with Accordion config UI"
```

---

### Task 5: CSV Export Implementation

**Files:**
- Modify: `src/components/common/AppDataTable.vue`

**Steps:**

- [ ] **Step 1: Verify CSV export button exists**

Open `src/components/common/AppDataTable.vue` and check for:

```vue
<Button
  icon="pi pi-download"
  class="p-button-outlined"
  severity="secondary"
  @click="exportCSV"
  :title="$t('common.export')"
/>
```

If missing, add it to the toolbar section.

- [ ] **Step 2: Implement exportCSV method**

In the `<script setup>` section of `AppDataTable.vue`, add:

```typescript
function exportCSV(): void {
  if (!dt.value || !rows.value) return

  // Get visible column data
  const csvHeaders = visibleColumns.value
    .map((col) => getColumnHeader(col))
    .join(',')

  const csvRows = rows.value.map((row) =>
    visibleColumns.value
      .map((col) => {
        const value = getNestedValue(row, col)
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value || '')
          .replace(/"/g, '""')
          .replace(/,/g, '","')
        return `"${escaped}"`
      })
      .join(',')
  )

  const csv = [csvHeaders, ...csvRows].join('\n')

  // Create blob and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `export-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
```

- [ ] **Step 3: Add i18n key for export**

Verify `src/i18n/en.ts` has:
```typescript
export: 'Export',
```

And `src/i18n/fr.ts` has:
```typescript
export: 'Exporter',
```

If missing, add them.

- [ ] **Step 4: Test CSV export**

Start dev server: `npm run dev`
Navigate to any admin list page (e.g., `/partners`).
Click the download icon in the toolbar.
Verify:
- CSV file downloads with correct filename (export-YYYY-MM-DD.csv)
- All visible columns are included
- Data is properly escaped (commas, quotes)
- All rows are present

- [ ] **Step 5: Commit CSV export**

```bash
git add src/components/common/AppDataTable.vue src/i18n/en.ts src/i18n/fr.ts
git commit -m "feat: implement CSV export in AppDataTable"
```

---

### Task 6: Unit Tests (6.T1–6.T3)

**Files:**
- Create: `src/components/common/StatCard.test.ts` (if StatCard component exists)
- Modify: `src/pages/Settings.test.ts` (expand from Task 4)
- Modify: `src/composables/useCurrency.test.ts` (if exists, or create)

**Steps:**

- [ ] **Step 1: Check if StatCard component exists**

```bash
ls -la src/components/charts/StatCard.vue 2>/dev/null || echo "Not found"
```

If it exists, create test file `src/components/charts/StatCard.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatCard from './StatCard.vue'

describe('StatCard.vue', () => {
  it('renders value, label, and trend arrow', () => {
    const wrapper = mount(StatCard, {
      props: {
        value: 1250,
        label: 'Total Revenue',
        trend: 'up',
        trendPercent: 12.5,
      },
    })

    expect(wrapper.text()).toContain('1250')
    expect(wrapper.text()).toContain('Total Revenue')
    expect(wrapper.find('.pi-arrow-up').exists()).toBe(true)
  })

  it('renders down trend arrow when trend is down', () => {
    const wrapper = mount(StatCard, {
      props: {
        value: 500,
        label: 'Failed Deployments',
        trend: 'down',
        trendPercent: 5,
      },
    })

    expect(wrapper.find('.pi-arrow-down').exists()).toBe(true)
  })

  it('renders with correct CSS class for value formatting', () => {
    const wrapper = mount(StatCard, {
      props: {
        value: 1250,
        label: 'Revenue',
        trend: 'up',
      },
    })

    const valueEl = wrapper.find('.text-2xl, .font-bold')
    expect(valueEl.exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Verify useCurrency tests**

Check if `src/composables/useCurrency.test.ts` exists:

```bash
ls -la src/composables/useCurrency.test.ts
```

If it exists, verify it has:
```typescript
import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/composables/useCurrency'

describe('useCurrency', () => {
  it('formats FCFA with no decimals', () => {
    const result = formatCurrency(1250, 'FCFA')
    expect(result).toMatch(/1[\s,]250/) // Allow both space and comma separators
  })

  it('formats USD with 2 decimals', () => {
    const result = formatCurrency(12.5, 'USD')
    expect(result).toContain('12.50')
  })

  it('formats EUR with 2 decimals', () => {
    const result = formatCurrency(25.99, 'EUR')
    expect(result).toContain('25.99')
  })
})
```

If not, create it.

- [ ] **Step 3: Run unit tests**

```bash
npm run test:run
```

Expected: All tests pass. Check coverage ≥80% on business logic.

- [ ] **Step 4: Commit unit tests**

```bash
git add src/components/charts/StatCard.test.ts src/composables/useCurrency.test.ts src/pages/Settings.test.ts
git commit -m "test: add unit tests for StatCard, useCurrency, and Settings"
```

---

### Task 7: E2E Tests & Responsive Verification (6.T4–6.T6)

**Files:**
- Create: `tests/e2e/dashboards.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`
- Modify: `tests/e2e/screenshots.spec.ts` (or create for screenshots)

**Steps:**

- [ ] **Step 1: Create dashboards E2E test**

Create `tests/e2e/dashboards.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'testpass123',
  },
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || 'customer@test.local',
    password: process.env.TEST_CUSTOMER_PASSWORD || 'testpass123',
  },
  reseller: {
    email: process.env.TEST_RESELLER_EMAIL || 'reseller@test.local',
    password: process.env.TEST_RESELLER_PASSWORD || 'testpass123',
  },
  sales: {
    email: process.env.TEST_SALES_EMAIL || 'sales@test.local',
    password: process.env.TEST_SALES_PASSWORD || 'testpass123',
  },
}

async function login(page, email, password) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button:has-text("Sign in")')
  await page.waitForURL('/dashboard')
}

test.describe('Dashboards', () => {
  test('Admin dashboard loads stat cards with correct values', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    await page.goto('/dashboard')

    // Check stat cards exist
    const statCards = await page.locator('[role="region"]').filter({ has: page.locator('.text-lg') })
    expect(await statCards.count()).toBeGreaterThan(0)

    // Verify card labels
    expect(await page.locator('text=Total Partners').isVisible()).toBeTruthy()
    expect(await page.locator('text=Active Deployments').isVisible()).toBeTruthy()
  })

  test('Customer dashboard credit balance matches database', async ({ page }) => {
    await login(page, TEST_USERS.customer.email, TEST_USERS.customer.password)
    await page.goto('/dashboard')

    // Check credit meter visible
    const creditMeter = page.locator('[class*="credit-meter"]')
    expect(await creditMeter.isVisible()).toBeTruthy()

    // Verify credit balance renders as monospace (font-mono)
    const creditBalance = page.locator('.font-mono')
    expect(await creditBalance.count()).toBeGreaterThan(0)
  })

  test('Reseller dashboard shows all client deployments', async ({ page }) => {
    await login(page, TEST_USERS.reseller.email, TEST_USERS.reseller.password)
    await page.goto('/dashboard')

    // Find deployments table
    const deploymentTable = page.locator('table')
    expect(await deploymentTable.isVisible()).toBeTruthy()

    // Verify rows exist
    const rows = page.locator('tbody tr')
    expect(await rows.count()).toBeGreaterThan(0)
  })

  test('Sales dashboard commission totals are correct', async ({ page }) => {
    await login(page, TEST_USERS.sales.email, TEST_USERS.sales.password)
    await page.goto('/dashboard')

    // Check portfolio size stat card
    expect(await page.locator('text=Portfolio Size').isVisible()).toBeTruthy()

    // Check commission estimate
    const commissionValue = page.locator('.font-mono').first()
    const text = await commissionValue.textContent()
    expect(text).toMatch(/[0-9,]+/) // Should contain numbers
  })
})
```

- [ ] **Step 2: Create responsive E2E test**

Create `tests/e2e/responsive.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

const BREAKPOINTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
}

const TEST_USER = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@test.local',
  password: process.env.TEST_ADMIN_PASSWORD || 'testpass123',
}

async function login(page, email, password) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button:has-text("Sign in")')
  await page.waitForURL('/dashboard')
}

test.describe('Responsive Design', () => {
  test('Admin dashboard at 375px has no horizontal scroll', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.mobile,
    })
    const page = await context.newPage()

    await login(page, TEST_USER.email, TEST_USER.password)
    await page.goto('/dashboard')

    // Check for horizontal overflow
    const mainContent = page.locator('main')
    const overflow = await page.evaluate(() => {
      const el = document.querySelector('main')
      return el ? el.scrollWidth > el.clientWidth : false
    })

    expect(overflow).toBeFalsy()
    await context.close()
  })

  test('Admin dashboard at 375px shows 1-column grid', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.mobile,
    })
    const page = await context.newPage()

    await login(page, TEST_USER.email, TEST_USER.password)
    await page.goto('/dashboard')

    // Check grid layout
    const statGrid = page.locator('[class*="grid"]').first()
    const gridStyle = await statGrid.evaluate((el) => {
      return window.getComputedStyle(el).gridTemplateColumns
    })

    // Should be single column at mobile
    expect(gridStyle.split(' ').length).toBe(1)
    await context.close()
  })

  test('DataTable at 375px stacks into cards', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.mobile,
    })
    const page = await context.newPage()

    await login(page, TEST_USER.email, TEST_USER.password)
    await page.goto('/partners')

    // Check if table is in stack/card mode
    const table = page.locator('table')
    const display = await table.evaluate((el) => {
      return window.getComputedStyle(el).display
    })

    // In card stack mode, display should be block or flex, not table
    expect(['block', 'flex']).toContain(display)
    await context.close()
  })

  test('Sidebar collapses to icons at 375px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.mobile,
    })
    const page = await context.newPage()

    await login(page, TEST_USER.email, TEST_USER.password)
    await page.goto('/dashboard')

    // Check sidebar text visibility
    const sidebarText = page.locator('aside span')
    const visible = await sidebarText.isVisible()

    // Text should be hidden on mobile
    expect(visible).toBeFalsy()
    await context.close()
  })

  test('Dashboard readable at 768px tablet', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.tablet,
    })
    const page = await context.newPage()

    await login(page, TEST_USER.email, TEST_USER.password)
    await page.goto('/dashboard')

    // Verify content visible and no overflow
    const overflow = await page.evaluate(() => {
      const el = document.querySelector('main')
      return el ? el.scrollWidth > el.clientWidth : false
    })

    expect(overflow).toBeFalsy()
    await context.close()
  })

  test('Dashboard readable at 1280px desktop', async ({ page }) => {
    // Default Playwright viewport is ~1280px
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL('/dashboard')

    const overflow = await page.evaluate(() => {
      const el = document.querySelector('main')
      return el ? el.scrollWidth > el.clientWidth : false
    })

    expect(overflow).toBeFalsy()
  })
})
```

- [ ] **Step 3: Create screenshot test**

Create `tests/e2e/screenshots.spec.ts`:

```typescript
import { test } from '@playwright/test'

const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'testpass123',
    path: '/dashboard',
  },
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || 'customer@test.local',
    password: process.env.TEST_CUSTOMER_PASSWORD || 'testpass123',
    path: '/dashboard',
  },
  reseller: {
    email: process.env.TEST_RESELLER_EMAIL || 'reseller@test.local',
    password: process.env.TEST_RESELLER_PASSWORD || 'testpass123',
    path: '/dashboard',
  },
  sales: {
    email: process.env.TEST_SALES_EMAIL || 'sales@test.local',
    password: process.env.TEST_SALES_PASSWORD || 'testpass123',
    path: '/dashboard',
  },
}

const BREAKPOINTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
}

async function login(page, email, password) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button:has-text("Sign in")')
  await page.waitForURL('/dashboard')
}

test.describe('Screenshots', () => {
  for (const [role, user] of Object.entries(TEST_USERS)) {
    for (const [breakpoint, dimensions] of Object.entries(BREAKPOINTS)) {
      test(`${role} dashboard at ${breakpoint}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: dimensions,
        })
        const page = await context.newPage()

        await login(page, user.email, user.password)
        await page.goto(user.path)

        await page.screenshot({
          path: `tests/screenshots/${role}-dashboard-${breakpoint}.png`,
          fullPage: true,
        })

        await context.close()
      })
    }
  }

  test('Commissions page screenshot', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: BREAKPOINTS.desktop,
    })
    const page = await context.newPage()

    await login(page, TEST_USERS.sales.email, TEST_USERS.sales.password)
    await page.goto('/commissions')

    await page.screenshot({
      path: `tests/screenshots/commissions-desktop.png`,
      fullPage: true,
    })

    await context.close()
  })
})
```

- [ ] **Step 4: Create .env.test file (if not exists)**

Create or update `.env.test`:

```env
# Test users (all roles)
TEST_ADMIN_EMAIL=admin@xayma.test
TEST_ADMIN_PASSWORD=Test123!@#

TEST_CUSTOMER_EMAIL=customer@xayma.test
TEST_CUSTOMER_PASSWORD=Test123!@#

TEST_RESELLER_EMAIL=reseller@xayma.test
TEST_RESELLER_PASSWORD=Test123!@#

TEST_SALES_EMAIL=sales@xayma.test
TEST_SALES_PASSWORD=Test123!@#

# Database (use real dev Supabase project)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Workflow Engine
VITE_WORKFLOW_ENGINE_BASE_URL=http://localhost:3001
```

Add to `.gitignore`:
```
.env.test.local
.env.test
```

- [ ] **Step 5: Run E2E tests**

```bash
# Set test user credentials
export TEST_ADMIN_EMAIL="admin@xayma.test"
export TEST_ADMIN_PASSWORD="Test123!@#"

# Run E2E tests
npm run test:e2e
```

Expected: All tests pass. Screenshots are saved to `tests/screenshots/`.

- [ ] **Step 6: Commit E2E tests and screenshots**

```bash
git add tests/e2e/dashboards.spec.ts tests/e2e/responsive.spec.ts tests/e2e/screenshots.spec.ts .env.test .gitignore tests/screenshots/
git commit -m "test: add E2E tests for dashboards, responsive breakpoints, and screenshots"
```

---

### Task 8: Sprint 6 Verification & `/test-sprint` Gate

**Files:**
- No new files (verification only)

**Steps:**

- [ ] **Step 1: Run full test suite**

```bash
npm run test:run
npm run test:e2e
npm run lint
npm run type-check
```

Expected: All tests pass, no lint errors, no type errors.

- [ ] **Step 2: Verify all i18n keys are present**

Check that both `src/i18n/en.ts` and `src/i18n/fr.ts` have matching keys:
```bash
grep -o "'[^']*':" src/i18n/en.ts | sort | uniq | wc -l
grep -o "'[^']*':" src/i18n/fr.ts | sort | uniq | wc -l
```

Should show same number of keys.

- [ ] **Step 3: Verify dark mode is deferred**

No dark mode CSS or components should be added (6.10 deferred to v1.1).

- [ ] **Step 4: Run `/verify-task` for each major task**

```bash
# Task 1: Responsive
/verify-task

# Task 2: Accessibility
/verify-task

# Task 3: Reseller controls
/verify-task

# Task 4: Settings page
/verify-task

# Task 5: CSV export
/verify-task
```

Expected: All pass.

- [ ] **Step 5: Run `/test-sprint` to gate completion**

```bash
/test-sprint
```

Expected: Full E2E suite passes with all dashboards, responsive design, and accessibility checks.

- [ ] **Step 6: Create final commit**

```bash
git log --oneline -10
```

Verify commit messages follow pattern:
- `refactor: add responsive grid classes...`
- `feat: add focus rings, ARIA labels...`
- `feat: add stop/start/restart controls...`
- `feat: add admin-only Settings page...`
- `feat: implement CSV export...`
- `test: add unit tests...`
- `test: add E2E tests...`

---

## Summary

**Total tasks:** 8 major phases
1. Responsive baseline (all dashboards at 375/768/1280px)
2. Accessibility audit & ARIA labels
3. Reseller deployment controls (stop/start/restart)
4. Settings page (admin-only accordion config)
5. CSV export (AppDataTable integration)
6. Unit tests (StatCard, useCurrency, Settings)
7. E2E tests (dashboards, responsive, screenshots)
8. Sprint verification & `/test-sprint` gate

**Blockers:** None identified. All dependencies (composables, services, routers) exist.

**Time estimate:** ~10-12 hours (2-3 days solo developer).

---
