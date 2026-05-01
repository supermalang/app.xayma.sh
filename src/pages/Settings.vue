<template>
  <div class="space-y-12">
    <!-- Page header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-on-background mb-2">
        {{ t('settings.title') }}
      </h1>
      <p class="text-on-surface-variant text-sm max-w-2xl">{{ t('settings.description') }}</p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <ProgressSpinner />
    </div>

    <template v-else>
      <!-- Bento grid -->
      <div class="grid grid-cols-12 gap-8">
        <!-- Infrastructure Engines -->
        <section class="col-span-12 lg:col-span-8 space-y-6">
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

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EngineConnectionCard
              :title="t('settings.workflow_engine')"
              icon="sync_alt"
              :url-label="t('settings.platform_url')"
              :url="form.WORKFLOW_ENGINE_URL"
              :secret-label="t('settings.api_key')"
              :secret="form.WORKFLOW_ENGINE_API_KEY"
              :status="workflowStatus"
              :test-disabled="!form.WORKFLOW_ENGINE_URL || !form.WORKFLOW_ENGINE_API_KEY"
              @update:url="form.WORKFLOW_ENGINE_URL = $event; workflowStatus = 'idle'"
              @update:secret="form.WORKFLOW_ENGINE_API_KEY = $event; workflowStatus = 'idle'"
              @test="testWorkflow"
            />

            <EngineConnectionCard
              :title="t('settings.deployment_engine')"
              icon="rocket"
              :url-label="t('settings.platform_url')"
              :url="form.DEPLOYMENT_ENGINE_URL"
              :secret-label="t('settings.api_key')"
              :secret="form.DEPLOYMENT_ENGINE_API_KEY"
              :status="deploymentStatus"
              :test-disabled="!form.DEPLOYMENT_ENGINE_URL || !form.DEPLOYMENT_ENGINE_API_KEY"
              @update:url="form.DEPLOYMENT_ENGINE_URL = $event; deploymentStatus = 'idle'"
              @update:secret="form.DEPLOYMENT_ENGINE_API_KEY = $event; deploymentStatus = 'idle'"
              @test="testDeployment"
            />

            <div class="md:col-span-2">
              <EngineConnectionCard
                :title="t('settings.container_management')"
                icon="grid_view"
                :url-label="t('settings.platform_url')"
                :url="form.K8S_CLUSTER_ENDPOINT"
                :secret-label="t('settings.api_key')"
                :secret="form.K8S_MANAGEMENT_SECRET"
                :status="k8sStatus"
                :test-disabled="!form.K8S_CLUSTER_ENDPOINT || !form.K8S_MANAGEMENT_SECRET"
                @update:url="form.K8S_CLUSTER_ENDPOINT = $event; k8sStatus = 'idle'"
                @update:secret="form.K8S_MANAGEMENT_SECRET = $event; k8sStatus = 'idle'"
                @test="testK8s"
              />
            </div>
          </div>
        </section>

        <!-- Credits Management -->
        <section class="col-span-12 lg:col-span-4 space-y-6">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-secondary">payments</span>
            <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
              {{ t('settings.credits_management') }}
            </h2>
          </div>

          <div class="bg-surface-container-low p-8 rounded-md border border-primary/5">
            <div class="space-y-8">
              <!-- Credit Price -->
              <div class="flex flex-col gap-2">
                <label for="credit-price" class="text-sm font-medium text-on-surface">
                  {{ t('settings.credit_price') }}
                </label>
                <div class="flex items-baseline gap-2">
                  <InputNumber
                    v-model="form.CREDIT_PRICE_FCFA"
                    input-id="credit-price"
                    :min="0"
                    :use-grouping="false"
                    :input-class="'w-24 font-mono text-2xl font-bold bg-transparent border-0 border-b-2 border-primary/20 focus:border-primary rounded-none'"
                  />
                  <span class="font-mono text-on-surface-variant">FCFA</span>
                </div>
                <p class="text-[10px] text-on-surface-variant italic">{{ t('settings.credit_price_hint') }}</p>
              </div>

              <!-- Inline numeric pair -->
              <div class="space-y-4">
                <div class="flex justify-between items-center gap-3">
                  <label for="low-credit-threshold" class="text-sm">{{ t('settings.low_credit_threshold') }}</label>
                  <div class="flex items-center gap-2">
                    <InputNumber
                      v-model="form.LOW_CREDIT_THRESHOLD"
                      input-id="low-credit-threshold"
                      :min="0"
                      :input-class="'w-24 font-mono text-sm font-medium text-right'"
                    />
                    <span class="text-[10px] text-on-surface-variant">{{ t('settings.credits_unit_short') }}</span>
                  </div>
                </div>
                <div class="flex justify-between items-center gap-3">
                  <label for="max-credit-debt" class="text-sm">{{ t('settings.max_credit_debt') }}</label>
                  <div class="flex items-center gap-2">
                    <InputNumber
                      v-model="form.MAX_CREDIT_DEBT"
                      input-id="max-credit-debt"
                      :min="0"
                      :input-class="'w-24 font-mono text-sm font-medium text-right'"
                    />
                    <span class="text-[10px] text-on-surface-variant">{{ t('settings.credits_unit_short') }}</span>
                  </div>
                </div>
              </div>

              <!-- Credit Purchase Bundles -->
              <div class="border-t border-primary/10 pt-6 space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold">{{ t('settings.credit_bundles') }}</h3>
                  <Button
                    :label="t('settings.add_bundle')"
                    icon="pi pi-plus"
                    size="small"
                    severity="secondary"
                    variant="text"
                    @click="openBundleDialog"
                  />
                </div>
                <CreditBundleList
                  :bundles="bundles"
                  @edit="editBundle"
                  @delete="removeBundle"
                />
              </div>

              <!-- Global Cost Line Items -->
              <div class="border-t border-primary/10 pt-6 space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold">{{ t('settings.line_items') }}</h3>
                  <Button
                    :label="t('settings.add_line_item')"
                    icon="pi pi-plus"
                    size="small"
                    severity="secondary"
                    variant="text"
                    @click="openLineItemDialog"
                  />
                </div>
                <p class="text-[11px] text-on-surface-variant italic">
                  {{ t('settings.line_items_hint') }}
                </p>
                <BundleLineItemList
                  :items="lineItems"
                  @edit="editLineItem"
                  @delete="removeLineItem"
                />
              </div>

              <!-- Payment Gateways -->
              <div class="border-t border-primary/10 pt-6 space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold">{{ t('settings.payment_gateways') }}</h3>
                  <Button
                    :label="t('settings.add_gateway')"
                    icon="pi pi-plus"
                    size="small"
                    severity="secondary"
                    variant="text"
                    @click="openGatewayDialog"
                  />
                </div>
                <PaymentGatewayList
                  :gateways="gateways"
                  @edit="editGateway"
                  @delete="removeGateway"
                />
              </div>
            </div>
          </div>
        </section>

        <PaymentGatewayDialog
          v-model:visible="gatewayDialogVisible"
          :gateway="editingGateway"
          @save="saveGateway"
        />
        <CreditBundleDialog
          v-model:visible="bundleDialogVisible"
          :bundle="editingBundle"
          @save="saveBundle"
        />
        <BundleLineItemDialog
          v-model:visible="lineItemDialogVisible"
          :line-item="editingLineItem"
          @save="saveLineItem"
        />

        <!-- Deployment Lifecycle -->
        <section class="col-span-12 lg:col-span-5 space-y-6">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-on-surface-variant">history</span>
            <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
              {{ t('settings.deployment_lifecycle') }}
            </h2>
          </div>

          <div class="bg-surface-container-lowest p-6 rounded-md border border-outline-variant/20 h-full">
            <div class="space-y-6">
              <div class="grid grid-cols-2 gap-x-8 gap-y-6">
                <LifecycleDayInput
                  v-model="form.ARCHIVE_DEPLOYMENTS_DAYS"
                  :label="t('settings.archive_deployments')"
                  :unit="t('settings.days')"
                />
                <LifecycleDayInput
                  v-model="form.DELETE_DEPLOYMENTS_DAYS"
                  :label="t('settings.delete_deployments')"
                  :unit="t('settings.days')"
                />
                <LifecycleDayInput
                  v-model="form.ARCHIVE_ORGANIZATIONS_DAYS"
                  :label="t('settings.archive_organizations')"
                  :unit="t('settings.days')"
                />
                <LifecycleDayInput
                  v-model="form.DELETE_ORGANIZATIONS_DAYS"
                  :label="t('settings.delete_organizations')"
                  :unit="t('settings.days')"
                />
              </div>
              <p class="text-[11px] text-on-surface-variant bg-surface-container-low p-3 rounded leading-relaxed flex items-start gap-2">
                <span class="material-symbols-outlined text-[14px] mt-0.5">info</span>
                <span>{{ t('settings.lifecycle_footnote') }}</span>
              </p>
            </div>
          </div>
        </section>

        <!-- Recent Transactions -->
        <section class="col-span-12 lg:col-span-7 space-y-6">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-on-surface-variant">receipt_long</span>
              <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                {{ t('settings.recent_transactions') }}
              </h2>
            </div>
            <Button
              as="router-link"
              :to="{ name: 'credits-history' }"
              :label="t('settings.view_all_transactions')"
              icon="pi pi-arrow-right"
              icon-pos="right"
              severity="secondary"
              variant="text"
              size="small"
              class="font-bold uppercase tracking-wider"
            />
          </div>

          <DataTable
            :value="recentTransactions"
            :pt="{ root: { class: 'bg-surface-container-lowest rounded-md border border-outline-variant/20 overflow-hidden' } }"
            data-key="id"
          >
            <template #empty>
              <div class="px-6 py-8 text-center text-sm text-on-surface-variant">
                {{ t('settings.transactions_empty') }}
              </div>
            </template>

            <Column :header="t('settings.transactions_columns.date')" field="created_at">
              <template #body="{ data }">
                <span class="font-mono text-xs text-on-surface-variant whitespace-nowrap">
                  {{ formatTimestamp(data.created_at) }}
                </span>
              </template>
            </Column>

            <Column :header="t('settings.transactions_columns.partner')" field="partner_name">
              <template #body="{ data }">
                <span class="text-sm font-medium">{{ data.partner_name }}</span>
              </template>
            </Column>

            <Column :header="t('settings.transactions_columns.type')" field="type">
              <template #body="{ data }">
                <span :class="badgeClass(data)" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 border">
                  <span class="material-symbols-outlined text-[12px]">{{ badgeIcon(data) }}</span>
                  {{ badgeLabel(data) }}
                </span>
              </template>
            </Column>

            <Column :header="t('settings.transactions_columns.amount')" field="amount" header-class="text-right" body-class="text-right">
              <template #body="{ data }">
                <span
                  class="font-mono text-sm font-semibold whitespace-nowrap"
                  :class="{ 'text-error': data.status === 'FAILED' }"
                >
                  {{ formatNumber(data.amount) }} FCFA
                </span>
              </template>
            </Column>
          </DataTable>
        </section>
      </div>

      <!-- Global actions -->
      <div class="flex items-center justify-end gap-4 border-t border-outline-variant/20 pt-8">
        <Button
          :label="t('settings.discard_changes')"
          severity="secondary"
          variant="text"
          :disabled="!isDirty || saving"
          class="font-bold"
          @click="discardChanges"
        />
        <Button
          :label="t('settings.save_platform_settings')"
          :loading="saving"
          :disabled="!isDirty"
          class="font-bold"
          @click="saveAll"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputNumber from 'primevue/inputnumber'
import ProgressSpinner from 'primevue/progressspinner'
import { useAuth } from '@/composables/useAuth'
import { useSettings } from '@/composables/useSettings'
import { listTransactions, type CreditTransactionRow } from '@/services/credits.service'
import {
  updateSetting as upsertSetting,
  getPaymentGateways,
  updatePaymentGateways,
  getCreditBundles,
  updateCreditBundles,
  getBundleLineItems,
  updateBundleLineItems,
} from '@/services/settings'
import { supabaseFrom } from '@/services/supabase'
import { testEngineConnection } from '@/services/workflow-engine'
import { useNotificationStore } from '@/stores/notifications.store'
import { formatNumber } from '@/lib/formatters'
import LifecycleDayInput from '@/components/settings/LifecycleDayInput.vue'
import EngineConnectionCard from '@/components/settings/EngineConnectionCard.vue'
import PaymentGatewayList from '@/components/settings/PaymentGatewayList.vue'
import PaymentGatewayDialog from '@/components/settings/PaymentGatewayDialog.vue'
import CreditBundleList from '@/components/settings/CreditBundleList.vue'
import CreditBundleDialog from '@/components/settings/CreditBundleDialog.vue'
import BundleLineItemList from '@/components/settings/BundleLineItemList.vue'
import BundleLineItemDialog from '@/components/settings/BundleLineItemDialog.vue'
import type { BundleLineItem, CreditBundle, PaymentGateway } from '@/types'

type ConnectionStatus = 'idle' | 'testing' | 'ok' | 'fail'

interface SettingsForm {
  WORKFLOW_ENGINE_URL: string
  WORKFLOW_ENGINE_API_KEY: string
  DEPLOYMENT_ENGINE_URL: string
  DEPLOYMENT_ENGINE_API_KEY: string
  K8S_CLUSTER_ENDPOINT: string
  K8S_MANAGEMENT_SECRET: string
  CREDIT_PRICE_FCFA: number
  LOW_CREDIT_THRESHOLD: number
  MAX_CREDIT_DEBT: number
  ARCHIVE_DEPLOYMENTS_DAYS: number
  DELETE_DEPLOYMENTS_DAYS: number
  ARCHIVE_ORGANIZATIONS_DAYS: number
  DELETE_ORGANIZATIONS_DAYS: number
}

type SettingKey = keyof SettingsForm

const DEFAULTS: SettingsForm = {
  WORKFLOW_ENGINE_URL: '',
  WORKFLOW_ENGINE_API_KEY: '',
  DEPLOYMENT_ENGINE_URL: '',
  DEPLOYMENT_ENGINE_API_KEY: '',
  K8S_CLUSTER_ENDPOINT: '',
  K8S_MANAGEMENT_SECRET: '',
  CREDIT_PRICE_FCFA: 150,
  LOW_CREDIT_THRESHOLD: 5000,
  MAX_CREDIT_DEBT: 10000,
  ARCHIVE_DEPLOYMENTS_DAYS: 30,
  DELETE_DEPLOYMENTS_DAYS: 90,
  ARCHIVE_ORGANIZATIONS_DAYS: 180,
  DELETE_ORGANIZATIONS_DAYS: 365,
}

const NUMERIC_KEYS = new Set<SettingKey>([
  'CREDIT_PRICE_FCFA',
  'LOW_CREDIT_THRESHOLD',
  'MAX_CREDIT_DEBT',
  'ARCHIVE_DEPLOYMENTS_DAYS',
  'DELETE_DEPLOYMENTS_DAYS',
  'ARCHIVE_ORGANIZATIONS_DAYS',
  'DELETE_ORGANIZATIONS_DAYS',
])

const router = useRouter()
const { t } = useI18n()
const { isAdmin } = useAuth()
const { settings, loading, loadSettings } = useSettings()
const notificationStore = useNotificationStore()

const form = reactive<SettingsForm>({ ...DEFAULTS })
const snapshot = ref<SettingsForm>({ ...DEFAULTS })
const saving = ref(false)

const gateways = ref<PaymentGateway[]>([])
const gatewaysSnapshot = ref<PaymentGateway[]>([])
const gatewayDialogVisible = ref(false)
const editingGateway = ref<PaymentGateway | null>(null)

const bundles = ref<CreditBundle[]>([])
const bundlesSnapshot = ref<CreditBundle[]>([])
const bundleDialogVisible = ref(false)
const editingBundle = ref<CreditBundle | null>(null)

const lineItems = ref<BundleLineItem[]>([])
const lineItemsSnapshot = ref<BundleLineItem[]>([])
const lineItemDialogVisible = ref(false)
const editingLineItem = ref<BundleLineItem | null>(null)

const recentTransactions = ref<Array<CreditTransactionRow & { partner_name: string }>>([])

const workflowStatus = ref<ConnectionStatus>('idle')
const deploymentStatus = ref<ConnectionStatus>('idle')
const k8sStatus = ref<ConnectionStatus>('idle')

const formDirty = computed(() =>
  (Object.keys(form) as SettingKey[]).some((k) => form[k] !== snapshot.value[k])
)
const gatewaysDirty = computed(
  () => JSON.stringify(gateways.value) !== JSON.stringify(gatewaysSnapshot.value)
)
const bundlesDirty = computed(
  () => JSON.stringify(bundles.value) !== JSON.stringify(bundlesSnapshot.value)
)
const lineItemsDirty = computed(
  () => JSON.stringify(lineItems.value) !== JSON.stringify(lineItemsSnapshot.value)
)
const isDirty = computed(
  () => formDirty.value || gatewaysDirty.value || bundlesDirty.value || lineItemsDirty.value
)

async function runTest(
  statusRef: typeof workflowStatus,
  fn: () => Promise<{ ok: boolean }>
): Promise<void> {
  statusRef.value = 'testing'
  try {
    const { ok } = await fn()
    statusRef.value = ok ? 'ok' : 'fail'
    if (!ok) notificationStore.addError(t('settings.connection_test_failed'))
  } catch {
    statusRef.value = 'fail'
    notificationStore.addError(t('settings.connection_test_failed'))
  }
}

function testWorkflow(): Promise<void> {
  return runTest(workflowStatus, () =>
    testEngineConnection(form.WORKFLOW_ENGINE_URL, form.WORKFLOW_ENGINE_API_KEY)
  )
}
function testDeployment(): Promise<void> {
  return runTest(deploymentStatus, () =>
    testEngineConnection(form.DEPLOYMENT_ENGINE_URL, form.DEPLOYMENT_ENGINE_API_KEY)
  )
}
function testK8s(): Promise<void> {
  return runTest(k8sStatus, () =>
    testEngineConnection(form.K8S_CLUSTER_ENDPOINT, form.K8S_MANAGEMENT_SECRET)
  )
}

function openGatewayDialog(): void {
  editingGateway.value = null
  gatewayDialogVisible.value = true
}

function editGateway(g: PaymentGateway): void {
  editingGateway.value = g
  gatewayDialogVisible.value = true
}

function removeGateway(id: string): void {
  gateways.value = gateways.value.filter((g) => g.id !== id)
}

function saveGateway(payload: Omit<PaymentGateway, 'id'> & { id?: string }): void {
  if (payload.id) {
    gateways.value = gateways.value.map((g) =>
      g.id === payload.id ? ({ id: payload.id, ...payload } as PaymentGateway) : g
    )
  } else {
    gateways.value = [
      ...gateways.value,
      { id: crypto.randomUUID(), ...payload } as PaymentGateway,
    ]
  }
  gatewayDialogVisible.value = false
  editingGateway.value = null
}

function openBundleDialog(): void {
  editingBundle.value = null
  bundleDialogVisible.value = true
}

function editBundle(b: CreditBundle): void {
  editingBundle.value = b
  bundleDialogVisible.value = true
}

function removeBundle(id: string): void {
  bundles.value = bundles.value.filter((b) => b.id !== id)
}

function saveBundle(payload: Omit<CreditBundle, 'id'> & { id?: string }): void {
  if (payload.id) {
    bundles.value = bundles.value.map((b) =>
      b.id === payload.id ? ({ id: payload.id, ...payload } as CreditBundle) : b
    )
  } else {
    bundles.value = [
      ...bundles.value,
      { id: crypto.randomUUID(), ...payload } as CreditBundle,
    ]
  }
  bundleDialogVisible.value = false
  editingBundle.value = null
}

function openLineItemDialog(): void {
  editingLineItem.value = null
  lineItemDialogVisible.value = true
}

function editLineItem(item: BundleLineItem): void {
  editingLineItem.value = item
  lineItemDialogVisible.value = true
}

function removeLineItem(id: string): void {
  lineItems.value = lineItems.value.filter((i) => i.id !== id)
}

function saveLineItem(payload: Omit<BundleLineItem, 'id'> & { id?: string }): void {
  if (payload.id) {
    lineItems.value = lineItems.value.map((i) =>
      i.id === payload.id ? ({ id: payload.id, ...payload } as BundleLineItem) : i
    )
  } else {
    lineItems.value = [
      ...lineItems.value,
      { id: crypto.randomUUID(), ...payload } as BundleLineItem,
    ]
  }
  lineItemDialogVisible.value = false
  editingLineItem.value = null
}

function applyRawToForm(target: SettingsForm, key: SettingKey, raw: string | undefined): void {
  if (NUMERIC_KEYS.has(key)) {
    const fallback = DEFAULTS[key] as number
    if (raw === undefined || raw === '') {
      ;(target[key] as number) = fallback
      return
    }
    const n = Number(raw)
    ;(target[key] as number) = Number.isFinite(n) ? n : fallback
  } else {
    ;(target[key] as string) = raw ?? (DEFAULTS[key] as string)
  }
}

function populateFormFromSettings(): void {
  for (const k of Object.keys(form) as SettingKey[]) {
    applyRawToForm(form, k, settings.value[k])
  }
  snapshot.value = { ...form }
}

function discardChanges(): void {
  for (const k of Object.keys(form) as SettingKey[]) {
    if (NUMERIC_KEYS.has(k)) {
      ;(form[k] as number) = snapshot.value[k] as number
    } else {
      ;(form[k] as string) = snapshot.value[k] as string
    }
  }
  gateways.value = structuredClone(toRaw(gatewaysSnapshot.value))
  bundles.value = structuredClone(toRaw(bundlesSnapshot.value))
  lineItems.value = structuredClone(toRaw(lineItemsSnapshot.value))
}

async function saveAll(): Promise<void> {
  saving.value = true
  const dirtyKeys = (Object.keys(form) as SettingKey[]).filter(
    (k) => form[k] !== snapshot.value[k]
  )
  const shouldSaveGateways = gatewaysDirty.value
  const shouldSaveBundles = bundlesDirty.value
  const shouldSaveLineItems = lineItemsDirty.value
  let savedCount = 0
  let hadError = false
  let gatewayFailed = false
  try {
    for (const k of dirtyKeys) {
      await upsertSetting(k, String(form[k]))
      settings.value[k] = String(form[k])
      snapshot.value = { ...snapshot.value, [k]: form[k] }
      savedCount++
    }
    if (shouldSaveGateways) {
      try {
        await updatePaymentGateways(gateways.value)
        gatewaysSnapshot.value = structuredClone(gateways.value.map((g) => toRaw(g)))
      } catch (gatewayErr) {
        gatewayFailed = true
        throw gatewayErr
      }
    }
    if (shouldSaveBundles) {
      await updateCreditBundles(bundles.value)
      bundlesSnapshot.value = structuredClone(bundles.value.map((b) => toRaw(b)))
    }
    if (shouldSaveLineItems) {
      await updateBundleLineItems(lineItems.value)
      lineItemsSnapshot.value = structuredClone(lineItems.value.map((i) => toRaw(i)))
    }
  } catch (err) {
    hadError = true
    console.error('Error saving platform settings:', err)
    let toastKey: string
    if (gatewayFailed && savedCount === dirtyKeys.length) {
      toastKey = 'settings.error_saving_gateways'
    } else if (savedCount > 0) {
      toastKey = 'settings.saved_partial'
    } else {
      toastKey = 'settings.error_saving'
    }
    notificationStore.addError(
      toastKey === 'settings.saved_partial'
        ? t(toastKey, { saved: savedCount, total: dirtyKeys.length })
        : t(toastKey)
    )
  } finally {
    saving.value = false
  }
  if (!hadError) {
    notificationStore.addSuccess(t('settings.saved'))
  }
}

async function loadRecentTransactions(): Promise<void> {
  try {
    const { data } = await listTransactions({ pageSize: 4, orderDirection: 'desc' })
    const partnerIds = Array.from(new Set(data.map((tx) => tx.partner_id)))
    let nameById = new Map<number, string>()
    if (partnerIds.length > 0) {
      const { data: partners } = await supabaseFrom('partners')
        .select('id, name')
        .in('id', partnerIds)
      nameById = new Map((partners ?? []).map((p) => [Number(p.id), String(p.name)]))
    }
    recentTransactions.value = data.map((tx) => ({
      ...tx,
      partner_name: nameById.get(tx.partner_id) ?? '—',
    }))
  } catch (err) {
    console.error('Error loading recent transactions:', err)
    notificationStore.addError(t('settings.error_loading_transactions'))
    recentTransactions.value = []
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function badgeLabel(tx: CreditTransactionRow): string {
  if (tx.status === 'FAILED') return t('settings.transaction_type.failed_payment')
  if (tx.type === 'TOPUP') return t('settings.transaction_type.credit_refill')
  if (tx.type === 'DEBIT') return t('settings.transaction_type.automated_debit')
  if (tx.type === 'REFUND') return t('settings.transaction_type.refund')
  return t('settings.transaction_type.expiry')
}

function badgeIcon(tx: CreditTransactionRow): string {
  if (tx.status === 'FAILED') return 'error'
  if (tx.type === 'DEBIT') return 'schedule'
  return 'check_circle'
}

function badgeClass(tx: CreditTransactionRow): string {
  if (tx.status === 'FAILED') return 'text-error border-error/20 bg-transparent'
  if (tx.type === 'DEBIT') return 'text-secondary border-secondary/20 bg-transparent'
  return 'text-tertiary border-tertiary/20 bg-transparent'
}

onMounted(async () => {
  if (!isAdmin.value) {
    router.push('/dashboard')
    return
  }

  await loadSettings()
  populateFormFromSettings()
  const [loadedGateways, loadedBundles, loadedLineItems] = await Promise.all([
    getPaymentGateways(),
    getCreditBundles(),
    getBundleLineItems(),
  ])
  gateways.value = loadedGateways
  gatewaysSnapshot.value = structuredClone(loadedGateways)
  bundles.value = loadedBundles
  bundlesSnapshot.value = structuredClone(loadedBundles)
  lineItems.value = loadedLineItems
  lineItemsSnapshot.value = structuredClone(loadedLineItems)
  await loadRecentTransactions()
})

defineExpose({
  form,
  isDirty,
  saveAll,
  discardChanges,
})
</script>
