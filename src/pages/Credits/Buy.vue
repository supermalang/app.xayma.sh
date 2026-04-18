<template>
  <div class="p-lg space-y-8">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-on-background mb-2">
        {{ $t('credits.buy_credits') }}
      </h1>
      <p class="text-on-surface-variant max-w-2xl">
        {{ $t('credits.buy_description') }}
      </p>
    </div>

    <!-- Discount info for resellers -->
    <div v-if="isReseller && applicableDiscount" class="p-4 bg-tertiary-container/10 border border-tertiary/30 rounded">
      <p class="text-sm text-tertiary font-semibold">
        {{ $t('credits.reseller_discount') }}:
        <span class="font-mono">{{ applicableDiscount.discountPercent }}%</span>
        {{ $t('credits.automatically_applied') }}
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Error state -->
    <Message v-if="error" severity="error" :text="error" closable />

    <!-- Credit bundles grid -->
    <div v-if="!loading && bundles.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <CreditBundleCard
        v-for="bundle in bundles"
        :key="bundle.id"
        :bundle="bundle"
        @select="handleSelectBundle"
      />
    </div>

    <!-- No bundles -->
    <div v-if="!loading && bundles.length === 0" class="text-center py-12">
      <p class="text-on-surface-variant">{{ $t('common.no_data') }}</p>
    </div>

    <!-- Voucher redemption section -->
    <div v-if="showVoucherTab" class="space-y-4 pt-8 border-t border-outline/20">
      <h2 class="text-lg font-semibold text-on-background">
        {{ $t('credits.have_voucher') }}
      </h2>
      <div class="flex gap-2 max-w-md">
        <InputText
          v-model="voucherCode"
          :placeholder="$t('credits.voucher_placeholder')"
          class="flex-1"
          @keyup.enter="redeemVoucher"
        />
        <Button
          :label="$t('credits.redeem')"
          @click="redeemVoucher"
          :loading="voucherLoading"
        />
      </div>
      <Message v-if="voucherError" severity="error" :text="voucherError" />
      <Message v-if="voucherSuccess" severity="success" :text="voucherSuccess" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/composables/useAuth'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import CreditBundleCard from '@/components/credits/CreditBundleCard.vue'
import { supabaseFrom } from '@/services/supabase'
import { getApplicableDiscount, calculateDiscountedPrice } from '@/services/credits.service'
import { initiateCheckout, redeemVoucher as callRedeemVoucher } from '@/services/n8n'

interface CreditBundle {
  id: string
  credits_amount: number
  price_xof: number
  price_usd?: number
  price_eur?: number
  discount_percent: number
  validity_days: number
  max_instances?: number
  description?: string
  status: 'ACTIVE' | 'INACTIVE'
}

const router = useRouter()
const { t } = useI18n()
const { userRole } = useAuth()

const bundles = ref<CreditBundle[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const voucherCode = ref('')
const voucherLoading = ref(false)
const voucherError = ref<string | null>(null)
const voucherSuccess = ref<string | null>(null)
const showVoucherTab = ref(true)

const applicableDiscount = ref<{ discountPercent: number } | null>(null)
const isReseller = computed(() => userRole.value === 'RESELLER')

// Fetch credit bundles
async function fetchBundles() {
  try {
    loading.value = true
    error.value = null

    const { data, error: fetchError } = await supabaseFrom('credit_bundles')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('credits_amount', { ascending: true })

    if (fetchError) throw fetchError

    let bundlesToShow = data || []

    // Apply reseller discount if applicable
    if (isReseller.value) {
      // Fetch active deployment count for this partner
      // TODO: Get actual partner ID from auth context
      const partnerId = 'temp-partner-id'
      const { data: deployments } = await supabaseFrom('deployments')
        .select('id')
        .eq('partner_id', partnerId)
        .eq('status', 'ACTIVE')

      const instanceCount = deployments?.length || 0

      // Get applicable discount tier
      const discount = await getApplicableDiscount('RESELLER', instanceCount)
      if (discount) {
        applicableDiscount.value = {
          discountPercent: discount.discountPercent,
        }

        // Apply discount to all bundles
        bundlesToShow = bundlesToShow.map((bundle) => {
          const { discountedPrice, savings } = calculateDiscountedPrice(
            bundle.price_xof,
            discount.discountPercent
          )

          return {
            ...bundle,
            // Override with discounted price
            price_xof: discountedPrice,
            // Store original discount for display
            discount_percent: discount.discountPercent,
          }
        })
      }
    }

    bundles.value = bundlesToShow
  } catch (err) {
    console.error('Error fetching credit bundles:', err)
    error.value = t('errors.fetch_failed')
  } finally {
    loading.value = false
  }
}

// Handle bundle selection
async function handleSelectBundle(bundleId: string) {
  try {
    // Get current partner ID from auth context
    // TODO: Implement proper partner ID from useAuth/store
    const partnerId = 'temp-partner-id'

    // Call n8n webhook to initiate checkout
    const result = await initiateCheckout({
      bundleId,
      partnerId,
    })

    // Redirect to Paytech payment URL
    if (result.paymentUrl) {
      // Store transaction ID in session for success page
      sessionStorage.setItem('pendingTransactionId', result.transactionId)
      window.location.href = result.paymentUrl
    } else {
      error.value = t('errors.webhook_failed')
    }
  } catch (err) {
    console.error('Error initiating checkout:', err)
    error.value = t('errors.webhook_failed')
  }
}

// Handle voucher redemption
async function redeemVoucher() {
  if (!voucherCode.value.trim()) {
    voucherError.value = t('credits.voucher_required')
    return
  }

  try {
    voucherLoading.value = true
    voucherError.value = null
    voucherSuccess.value = null

    // TODO: Get current partner ID from auth context
    const partnerId = 'temp-partner-id'

    await callRedeemVoucher({
      voucherCode: voucherCode.value.trim(),
      partnerId,
    })

    voucherSuccess.value = t('credits.voucher_redeemed')
    voucherCode.value = ''

    // Refresh partner credit balance via Realtime
  } catch (err) {
    console.error('Error redeeming voucher:', err)
    voucherError.value = t('errors.webhook_failed')
  } finally {
    voucherLoading.value = false
  }
}

onMounted(() => {
  fetchBundles()
})
</script>

<style scoped>
/* Monospace styling for prices */
:deep(.font-mono) {
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
}
</style>
