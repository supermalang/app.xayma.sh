<template>
  <div class="p-lg w-full">
    <!-- Page header -->
    <header class="mb-12">
      <h1 class="text-4xl font-extrabold tracking-tight text-on-background mb-2">
        {{ t('credits.top_up.title') }}
      </h1>
      <p class="text-on-surface-variant max-w-2xl">
        {{ t('credits.top_up.description') }}
      </p>
    </header>

    <!-- Reseller discount banner -->
    <div
      v-if="isReseller && applicableDiscount"
      class="mb-8 p-4 bg-tertiary-container/10 border border-tertiary/30 rounded-lg"
    >
      <p class="text-sm text-tertiary font-semibold">
        {{ t('credits.reseller_discount') }}:
        <span class="font-mono">{{ applicableDiscount.discountPercent }}%</span>
        {{ t('credits.automatically_applied') }}
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>

    <!-- Error -->
    <Message v-if="error" severity="error" :closable="true" class="mb-6">{{ error }}</Message>

    <!-- Main two-column grid -->
    <div v-if="!loading" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- LEFT: selection column -->
      <div class="lg:col-span-2 space-y-10">
        <!-- Current balance -->
        <section>
          <div class="bg-surface-container-lowest p-6 border border-outline-variant/40 rounded-lg flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-on-surface-variant mb-1">
                {{ t('credits.top_up.current_balance') }}
              </p>
              <div class="flex items-baseline gap-2">
                <span class="font-mono text-3xl font-bold text-primary">
                  {{ formattedBalance }}
                </span>
                <span class="font-mono text-lg font-medium text-primary">
                  {{ t('credits.credits') }}
                </span>
              </div>
            </div>
            <div class="h-12 w-12 rounded-full bg-tertiary-container/20 flex items-center justify-center">
              <span class="material-symbols-outlined text-tertiary">payments</span>
            </div>
          </div>
        </section>

        <!-- Step 1: amount -->
        <section>
          <h2 class="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">
            {{ t('credits.top_up.step_amount') }}
          </h2>

          <div v-if="bundles.length === 0" class="text-center py-8 text-on-surface-variant">
            {{ t('credits.top_up.no_bundles') }}
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              v-for="bundle in bundles"
              :key="bundle.id"
              type="button"
              :aria-pressed="selectedBundleId === bundle.id"
              class="group p-6 rounded-lg text-start relative overflow-hidden transition-all"
              :class="
                selectedBundleId === bundle.id
                  ? 'border-2 border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
                  : 'border border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-surface-container-low'
              "
              @click="selectBundle(bundle)"
            >
              <span
                v-if="selectedBundleId === bundle.id"
                class="absolute top-2 end-2 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center"
                :aria-label="t('credits.top_up.selected_indicator')"
              >
                <span class="material-symbols-outlined text-base">check</span>
              </span>
              <p
                class="text-xs mb-2"
                :class="selectedBundleId === bundle.id ? 'text-primary font-semibold' : 'text-on-surface-variant'"
              >
                {{ bundle.label }}
              </p>
              <span
                class="font-mono text-xl font-bold transition-colors"
                :class="selectedBundleId === bundle.id ? 'text-primary' : 'group-hover:text-primary'"
              >
                {{ formatPrice(bundle.priceXOF) }} FCFA
              </span>
              <p
                v-if="bundle.discountPercent > 0"
                class="text-[11px] text-tertiary mt-2 font-semibold"
              >
                -{{ bundle.discountPercent }}%
              </p>
            </button>
          </div>
        </section>

        <!-- Step 2: payment method -->
        <section>
          <h2 class="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">
            {{ t('credits.top_up.step_payment') }}
          </h2>

          <div v-if="gateways.length === 0" class="text-center py-8 text-on-surface-variant">
            {{ t('credits.top_up.no_payment_methods') }}
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              v-for="gateway in gateways"
              :key="gateway.id"
              type="button"
              :aria-pressed="selectedGatewayId === gateway.id"
              class="relative flex flex-col items-center justify-center p-8 rounded-lg gap-4 group transition-all"
              :class="
                selectedGatewayId === gateway.id
                  ? 'border-2 border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
                  : 'border border-outline-variant/60 bg-surface-container-lowest hover:border-primary hover:bg-surface-container-low'
              "
              @click="selectedGatewayId = gateway.id"
            >
              <span
                v-if="selectedGatewayId === gateway.id"
                class="absolute top-2 end-2 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center"
                :aria-label="t('credits.top_up.selected_indicator')"
              >
                <span class="material-symbols-outlined text-base">check</span>
              </span>
              <div
                class="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden bg-white border border-outline-variant/40"
              >
                <img
                  v-if="gateway.logoUrl"
                  :src="gateway.logoUrl"
                  :alt="gatewayLabel(gateway)"
                  class="w-full h-full object-contain p-2"
                />
                <span v-else class="material-symbols-outlined text-3xl text-primary">
                  {{ providerIcon(gateway.provider) }}
                </span>
              </div>
              <span
                class="font-bold text-center"
                :class="selectedGatewayId === gateway.id ? 'text-primary' : 'text-on-surface'"
              >
                {{ gatewayLabel(gateway) }}
              </span>
            </button>
          </div>
        </section>
      </div>

      <!-- RIGHT: sticky transaction summary -->
      <aside class="lg:col-span-1">
        <div class="lg:sticky lg:top-24 space-y-6">
          <div class="bg-surface-container-lowest border border-outline-variant/40 rounded-lg overflow-hidden">
            <div class="bg-primary p-6">
              <h3 class="text-on-primary font-bold text-lg">
                {{ t('credits.top_up.summary_title') }}
              </h3>
              <p class="text-on-primary text-xs opacity-80">
                {{ t('credits.top_up.order_ref') }}: {{ orderRef }}
              </p>
            </div>

            <div class="p-6 space-y-4">
              <div class="flex justify-between items-center">
                <span class="text-sm text-on-surface-variant">
                  {{ t('credits.top_up.selected_credits') }}
                </span>
                <span class="font-mono font-semibold">
                  {{ selectedBundle ? formatPrice(selectedBundle.priceXOF) + ' FCFA' : '—' }}
                </span>
              </div>

              <!-- Dynamic line items -->
              <div
                v-for="row in summaryLineItems"
                :key="row.item.id"
                class="flex justify-between items-center"
              >
                <span class="text-sm text-on-surface-variant flex items-center gap-2">
                  {{ row.item.title }}
                  <span
                    v-if="row.item.mode === 'INCLUDED'"
                    class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-outline-variant/40 text-on-surface-variant"
                  >
                    {{ t('credits.top_up.included_badge') }}
                  </span>
                </span>
                <span
                  class="font-mono font-semibold"
                  :class="row.item.mode === 'INCLUDED' ? 'text-on-surface-variant' : ''"
                >
                  {{ selectedBundle ? formatPrice(row.amount) + ' FCFA' : '—' }}
                </span>
              </div>

              <div class="pt-4 border-t border-outline-variant/40 flex justify-between items-baseline">
                <span class="font-bold text-on-surface">
                  {{ t('credits.top_up.total_due') }}
                </span>
                <div class="text-end">
                  <span class="font-mono text-2xl font-bold text-primary">
                    {{ selectedBundle ? formatPrice(totalDue) : '—' }}
                  </span>
                  <span class="font-mono text-sm font-bold text-primary ms-1">FCFA</span>
                </div>
              </div>
            </div>

            <div class="p-6 pt-0">
              <Button
                :label="t('credits.top_up.complete_purchase')"
                icon="pi pi-arrow-right"
                iconPos="right"
                class="w-full"
                :disabled="!canCheckout"
                :loading="checkoutLoading"
                @click="completePurchase"
              />
              <p class="mt-4 text-[10px] text-center text-on-surface-variant leading-relaxed px-4">
                {{ t('credits.top_up.terms_notice') }}
              </p>
              <p
                v-if="!selectedBundle"
                class="mt-3 text-xs text-center text-on-surface-variant italic"
              >
                {{ t('credits.top_up.select_amount_first') }}
              </p>
              <p
                v-else-if="!selectedGatewayId"
                class="mt-3 text-xs text-center text-on-surface-variant italic"
              >
                {{ t('credits.top_up.select_payment_first') }}
              </p>
            </div>
          </div>

          <!-- Trust indicator -->
          <div class="bg-tertiary-container/10 border border-tertiary/30 p-4 rounded-lg flex gap-3">
            <span class="material-symbols-outlined text-tertiary">verified_user</span>
            <div>
              <h4 class="text-xs font-bold text-tertiary mb-1">
                {{ t('credits.top_up.secure_title') }}
              </h4>
              <p class="text-[10px] text-tertiary opacity-80">
                {{ t('credits.top_up.secure_description') }}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth.store'
import { usePartnerCredits } from '@/composables/usePartnerCredits'
import { useCurrency } from '@/composables/useCurrency'
import { supabaseFrom } from '@/services/supabase'
import { calculateDiscountedPrice, getApplicableDiscount } from '@/services/credits.service'
import {
  getBundleLineItems,
  getCreditBundles,
  getPaymentGateways,
} from '@/services/settings'
import { initiateCheckout } from '@/services/workflow-engine'
import type {
  BundleLineItem,
  CreditBundle,
  PaymentGateway,
  PaymentGatewayProvider,
} from '@/types'

const { t } = useI18n()
const { userRole } = useAuth()
const authStore = useAuthStore()
const { formatSymbol } = useCurrency()

const partnerId = computed(() => String(authStore.profile?.company_id ?? ''))
const { credits: partnerCredits, refresh: refreshCredits } = usePartnerCredits(partnerId)

const bundles = ref<CreditBundle[]>([])
const gateways = ref<PaymentGateway[]>([])
const lineItems = ref<BundleLineItem[]>([])

const loading = ref(true)
const error = ref<string | null>(null)
const checkoutLoading = ref(false)

const selectedBundleId = ref<string | null>(null)
const selectedGatewayId = ref<string | null>(null)

const applicableDiscount = ref<{ discountPercent: number } | null>(null)
const isReseller = computed(() => userRole.value === 'RESELLER')

const orderRef = ref<string>(generateOrderRef())

function generateOrderRef(): string {
  const r = Math.floor(100000 + Math.random() * 900000).toString()
  return `XAY-${r.slice(0, 3)}-${r.slice(3)}`
}

function withId<T extends { id?: string | null }>(item: T): T & { id: string } {
  if (item.id && String(item.id).trim()) return item as T & { id: string }
  return { ...item, id: crypto.randomUUID() }
}

const selectedBundle = computed<CreditBundle | null>(() => {
  return bundles.value.find((b) => b.id === selectedBundleId.value) ?? null
})

interface SummaryRow {
  item: BundleLineItem
  amount: number
}

const sortedLineItems = computed(() =>
  [...lineItems.value].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
)

const summaryLineItems = computed<SummaryRow[]>(() => {
  if (!selectedBundle.value) return []
  const price = selectedBundle.value.priceXOF
  return sortedLineItems.value.map((item) => ({
    item,
    amount: item.type === 'PERCENT'
      ? Math.round((price * item.amount) / 100)
      : item.amount,
  }))
})

const totalDue = computed(() => {
  if (!selectedBundle.value) return 0
  const additional = summaryLineItems.value
    .filter((row) => row.item.mode === 'ADDITIONAL')
    .reduce((sum, row) => sum + row.amount, 0)
  return selectedBundle.value.priceXOF + additional
})

const formattedBalance = computed(() => {
  return formatSymbol(partnerCredits.value?.remainingCredits ?? 0, 'XOF')
})

const canCheckout = computed(() => {
  return Boolean(
    selectedBundle.value &&
      selectedGatewayId.value &&
      !checkoutLoading.value
  )
})

function formatPrice(amount: number): string {
  return formatSymbol(amount, 'XOF')
}

function selectBundle(bundle: CreditBundle): void {
  selectedBundleId.value = bundle.id
}

function gatewayLabel(g: PaymentGateway): string {
  if (g.displayName && g.displayName.trim()) return g.displayName
  return t(`credits.payment_methods.${g.provider}` as never) as string
}

function providerIcon(provider: PaymentGatewayProvider): string {
  switch (provider) {
    case 'wave': return 'waves'
    case 'orange_money': return 'phone_iphone'
    case 'paytech': return 'credit_card'
    default: return 'account_balance'
  }
}

async function loadAll(): Promise<void> {
  try {
    loading.value = true
    error.value = null

    if (!authStore.profile?.company_id) {
      error.value = t('errors.unauthorized')
      return
    }

    // Defense in depth: composable watches partnerId, but explicitly refresh
    // here too so the balance is guaranteed fresh by the time the page renders.
    await refreshCredits()

    const [loadedBundles, loadedGateways, loadedLineItems] = await Promise.all([
      getCreditBundles(),
      getPaymentGateways(),
      getBundleLineItems(),
    ])

    // Defensive: legacy records may be missing `id`. Without unique ids the
    // selection comparison (selectedId === item.id) collapses to
    // `undefined === undefined` and every tile renders as selected.
    let bundlesToShow = loadedBundles.map((b) => withId(b))
    const gatewaysWithIds = loadedGateways.map((g) => withId(g))
    const lineItemsWithIds = loadedLineItems.map((i) => withId(i))

    if (isReseller.value) {
      const { data: deployments } = await supabaseFrom('deployments')
        .select('id')
        .eq('partner_id', authStore.profile.company_id)
        .eq('status', 'active' as unknown as 'active')

      const instanceCount = deployments?.length || 0
      const discount = await getApplicableDiscount('RESELLER', instanceCount)

      if (discount) {
        applicableDiscount.value = { discountPercent: discount.discountPercent }
        bundlesToShow = bundlesToShow.map((bundle) => {
          const { discountedPrice } = calculateDiscountedPrice(
            bundle.priceXOF,
            discount.discountPercent
          )
          return {
            ...bundle,
            priceXOF: discountedPrice,
            discountPercent: discount.discountPercent,
          }
        })
      }
    }

    bundles.value = bundlesToShow
    gateways.value = gatewaysWithIds.filter((g) => g.mode === 'live')
    lineItems.value = lineItemsWithIds

    if (bundles.value.length > 0 && !selectedBundleId.value) {
      selectedBundleId.value = bundles.value[0].id
    }
    if (gateways.value.length > 0 && !selectedGatewayId.value) {
      selectedGatewayId.value = gateways.value[0].id
    }
  } catch (err) {
    console.error('Error loading checkout data:', err)
    error.value = t('errors.fetch_failed')
  } finally {
    loading.value = false
  }
}

async function completePurchase(): Promise<void> {
  if (!selectedBundle.value || !selectedGatewayId.value || !authStore.profile?.company_id) {
    error.value = t('errors.unauthorized')
    return
  }

  try {
    checkoutLoading.value = true
    error.value = null

    const result = await initiateCheckout({
      bundleId: selectedBundle.value.id,
      partnerId: String(authStore.profile.company_id),
      paymentGatewayId: selectedGatewayId.value,
    })

    if (result.paymentUrl) {
      sessionStorage.setItem('pendingTransactionId', result.transactionId)
      window.location.href = result.paymentUrl
    } else {
      error.value = t('errors.webhook_failed')
    }
  } catch (err) {
    console.error('Error initiating checkout:', err)
    error.value = t('errors.webhook_failed')
  } finally {
    checkoutLoading.value = false
  }
}

onMounted(() => {
  loadAll()
})
</script>

<style scoped>
.font-mono {
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
}
</style>
