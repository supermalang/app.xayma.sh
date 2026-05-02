<template>
  <div class="p-lg w-full max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
      <button
        type="button"
        class="hover:text-primary transition-colors"
        @click="goBack"
      >
        {{ t('credits.page_title') }}
      </button>
      <span class="material-symbols-outlined text-[10px]">chevron_right</span>
      <span class="text-primary">{{ t('credits.detail.breadcrumb') }}</span>
    </nav>

    <div v-if="loading" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>

    <Message
      v-else-if="loadError"
      severity="error"
      :closable="false"
    >
      {{ loadError }}
    </Message>

    <template v-else-if="transaction">
      <!-- Header -->
      <header
        class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-outline-variant/20 pb-8"
      >
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-on-background mb-3">
            {{ t('credits.detail.title') }}
          </h1>
          <div class="flex flex-wrap items-center gap-3">
            <span
              class="font-mono text-sm bg-surface-container-low text-primary px-3 py-1 rounded"
            >
              {{ formattedTxId }}
            </span>
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              :class="statusBadgeClass"
            >
              <span class="material-symbols-outlined text-xs filled">
                {{ statusIcon }}
              </span>
              {{ t(`credits.detail.status.${transaction.status.toLowerCase()}`) }}
            </span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <Button
            :label="t('credits.detail.export_invoice')"
            icon="pi pi-download"
            severity="secondary"
            outlined
            @click="exportInvoice"
          />
          <Button
            :label="t('credits.detail.raise_dispute')"
            severity="primary"
            @click="raiseDispute"
          />
        </div>
      </header>

      <!-- Bento grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Account + Financials, then Payment Metadata -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Account + Financial Breakdown -->
          <section
            class="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/40"
          >
            <div class="flex items-start justify-between mb-10 gap-6">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  {{ t('credits.detail.account_entity') }}
                </p>
                <h2 class="text-xl font-bold text-on-background">
                  {{ partner?.name ?? '—' }}
                </h2>
                <p v-if="partner?.address" class="text-sm text-on-surface-variant mt-1">
                  {{ partner.address }}
                </p>
              </div>
              <div class="text-end shrink-0">
                <p class="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  {{ t('credits.detail.current_balance') }}
                </p>
                <p class="font-mono text-2xl font-bold text-primary tabular-nums">
                  {{ formattedCurrentBalance }}
                </p>
              </div>
            </div>

            <div class="space-y-4">
              <h3 class="text-xs font-bold uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/40 pb-2">
                {{ t('credits.detail.financial_breakdown') }}
              </h3>

              <div class="grid grid-cols-2 py-2">
                <span class="text-sm text-on-surface-variant">
                  {{ t('credits.detail.previous_balance') }}
                </span>
                <span class="font-mono text-sm text-on-surface text-end tabular-nums">
                  {{ previousBalance !== null ? formatCredits(previousBalance) : '—' }}
                </span>
              </div>

              <div class="grid grid-cols-2 py-4 px-4 -mx-4 bg-surface-container-low/60 rounded items-center">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-on-background">
                    {{ t('credits.detail.transaction_amount') }}
                  </span>
                  <span
                    class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    :class="typeChipClass"
                  >
                    {{ t(`credits.detail.type_chip.${transaction.type.toLowerCase()}`) }}
                  </span>
                </div>
                <span
                  class="font-mono text-lg font-bold text-end tabular-nums"
                  :class="amountClass"
                >
                  {{ formattedSignedAmount }}
                </span>
              </div>

              <div class="grid grid-cols-2 pt-2 border-t border-outline-variant/40">
                <span class="text-sm font-bold text-on-background">
                  {{ t('credits.detail.resulting_balance') }}
                </span>
                <span class="font-mono text-sm font-bold text-end tabular-nums">
                  {{ transaction.balanceAfter !== null ? formatCredits(transaction.balanceAfter) : '—' }}
                </span>
              </div>
            </div>
          </section>

          <!-- Payment & Metadata -->
          <section
            class="bg-surface-container-low p-8 rounded-lg border border-outline-variant/40"
          >
            <h3 class="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-6">
              {{ t('credits.detail.payment_metadata') }}
            </h3>
            <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div class="space-y-1">
                <dt class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {{ t('credits.detail.payment_method') }}
                </dt>
                <dd class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-base text-primary">
                    {{ paymentMethodIcon }}
                  </span>
                  <span class="text-sm font-bold text-on-surface">
                    {{ paymentMethodLabel }}
                  </span>
                </dd>
              </div>

              <div class="space-y-1">
                <dt class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {{ t('credits.detail.transaction_datetime') }}
                </dt>
                <dd class="font-mono text-sm text-on-surface tabular-nums">
                  {{ formattedDateTime }}
                </dd>
              </div>

              <div class="space-y-1">
                <dt class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {{ t('credits.detail.reference_id') }}
                </dt>
                <dd
                  class="font-mono text-sm break-all"
                  :class="transaction.reference ? 'text-primary underline decoration-primary/30' : 'text-on-surface-variant'"
                >
                  {{ transaction.reference ?? '—' }}
                </dd>
              </div>

              <div class="space-y-1">
                <dt class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {{ t('credits.detail.transaction_type') }}
                </dt>
                <dd class="text-sm font-medium text-on-surface">
                  {{ t(`credits.type_${transaction.type.toLowerCase()}`) }}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <!-- Right: Audit Lifecycle -->
        <aside class="lg:col-span-1">
          <section
            class="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/40 h-full"
          >
            <h3 class="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-8">
              {{ t('credits.detail.audit_lifecycle') }}
            </h3>

            <ol class="relative space-y-8 ps-6 border-s-2 border-outline-variant/40">
              <li
                v-for="(event, idx) in auditEvents"
                :key="idx"
                class="relative"
              >
                <span
                  class="absolute -start-[33px] top-0 w-3.5 h-3.5 rounded-full border-4 border-surface-container-lowest"
                  :class="event.dotClass"
                />
                <p class="text-sm font-bold text-on-background">
                  {{ event.title }}
                </p>
                <p class="font-mono text-[10px] text-on-surface-variant mt-1 tabular-nums">
                  {{ event.timestamp }}
                </p>
                <p class="text-xs text-on-surface-variant mt-2 leading-relaxed">
                  {{ event.description }}
                </p>
              </li>
            </ol>
          </section>
        </aside>
      </div>

      <!-- Footer attribution -->
      <footer class="mt-16 pt-8 border-t border-outline-variant/40 text-center md:text-start">
        <p class="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant/70">
          {{ t('credits.detail.footer_label') }}
        </p>
        <p class="mt-3 text-xs text-on-surface-variant max-w-xl">
          {{ t('credits.detail.footer_disclaimer') }}
        </p>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { getTransaction, type CreditTransactionRow } from '@/services/credits.service'
import { getPartner, type Partner } from '@/services/partners.service'
import { usePartnerCredits } from '@/composables/usePartnerCredits'
import { formatNumber, formatDateTime } from '@/lib/formatters'
import { downloadCsv } from '@/lib/csv'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const transaction = ref<CreditTransactionRow | null>(null)
const partner = ref<Partner | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)

const partnerIdRef = computed(() => String(transaction.value?.partner_id ?? ''))
const { credits: partnerCredits } = usePartnerCredits(partnerIdRef)

const localeKey = computed(() => (locale.value === 'fr' ? 'fr-SN' : 'en-US'))

const formattedTxId = computed(() => {
  if (!transaction.value) return ''
  return `TX-${String(transaction.value.id).padStart(6, '0')}`
})

function formatCredits(amount: number): string {
  return `${formatNumber(amount, localeKey.value)} ${t('credits.credits')}`
}

const formattedCurrentBalance = computed(() =>
  formatCredits(partnerCredits.value?.remainingCredits ?? 0),
)

const formattedSignedAmount = computed(() => {
  if (!transaction.value) return ''
  const sign = isInflow(transaction.value.type) ? '+' : '-'
  return `${sign}${formatCredits(transaction.value.amount)}`
})

const previousBalance = computed<number | null>(() => {
  if (!transaction.value || transaction.value.balanceAfter === null) return null
  const effect = isInflow(transaction.value.type)
    ? transaction.value.amount
    : -transaction.value.amount
  return transaction.value.balanceAfter - effect
})

const formattedDateTime = computed(() => {
  if (!transaction.value) return ''
  return formatDateTime(transaction.value.created_at, localeKey.value, { withSeconds: true })
})

const statusBadgeClass = computed(() => {
  if (!transaction.value) return ''
  switch (transaction.value.status) {
    case 'COMPLETED':
      return 'bg-tertiary-container/30 text-tertiary'
    case 'PENDING':
      return 'bg-secondary-container/30 text-secondary'
    case 'FAILED':
      return 'bg-error-container text-error'
    default:
      return 'bg-surface-container text-on-surface-variant'
  }
})

const statusIcon = computed(() => {
  if (!transaction.value) return 'help'
  switch (transaction.value.status) {
    case 'COMPLETED':
      return 'check_circle'
    case 'PENDING':
      return 'schedule'
    case 'FAILED':
      return 'cancel'
    default:
      return 'help'
  }
})

const typeChipClass = computed(() => {
  if (!transaction.value) return ''
  return isInflow(transaction.value.type)
    ? 'bg-tertiary/10 text-tertiary'
    : 'bg-error/10 text-error'
})

const amountClass = computed(() => {
  if (!transaction.value) return ''
  return isInflow(transaction.value.type) ? 'text-tertiary' : 'text-error'
})

const paymentMethodIcon = computed(() => {
  const method = transaction.value?.payment_method?.toLowerCase() ?? ''
  if (method.includes('wave')) return 'waves'
  if (method.includes('orange')) return 'phone_iphone'
  if (method.includes('voucher')) return 'redeem'
  return 'account_balance'
})

const paymentMethodLabel = computed(() => {
  return transaction.value?.payment_method ?? t('credits.detail.no_payment_method')
})

interface AuditEvent {
  title: string
  timestamp: string
  description: string
  dotClass: string
}

const auditEvents = computed<AuditEvent[]>(() => {
  if (!transaction.value) return []

  const tx = transaction.value
  const ts = formattedDateTime.value
  const events: AuditEvent[] = []

  if (tx.status === 'COMPLETED') {
    events.push({
      title: t('credits.detail.event.applied.title'),
      timestamp: ts,
      description: t('credits.detail.event.applied.description'),
      dotClass: 'bg-tertiary-container',
    })
    events.push({
      title: t('credits.detail.event.confirmed.title'),
      timestamp: ts,
      description: t('credits.detail.event.confirmed.description'),
      dotClass: 'bg-tertiary-container',
    })
  } else if (tx.status === 'FAILED') {
    events.push({
      title: t('credits.detail.event.failed.title'),
      timestamp: ts,
      description: t('credits.detail.event.failed.description'),
      dotClass: 'bg-error-container',
    })
  } else {
    events.push({
      title: t('credits.detail.event.pending.title'),
      timestamp: ts,
      description: t('credits.detail.event.pending.description'),
      dotClass: 'bg-secondary-container',
    })
  }

  events.push({
    title: t('credits.detail.event.initiated.title'),
    timestamp: ts,
    description: t('credits.detail.event.initiated.description'),
    dotClass: 'bg-primary/30',
  })

  return events
})

function isInflow(type: CreditTransactionRow['type']): boolean {
  return type === 'TOPUP' || type === 'REFUND'
}

function goBack() {
  router.push({ name: 'credits-history' })
}

function exportInvoice() {
  if (!transaction.value) return
  const tx = transaction.value
  const csv = [
    'invoice,date,amount,type,status,reference,payment_method',
    [
      formattedTxId.value,
      tx.created_at,
      tx.amount,
      tx.type,
      tx.status,
      tx.reference ?? '',
      tx.payment_method ?? '',
    ].join(','),
  ].join('\n')
  downloadCsv(csv, `${formattedTxId.value}.csv`)
}

function raiseDispute() {
  toast.add({
    severity: 'info',
    summary: t('credits.detail.dispute_toast_title'),
    detail: t('credits.detail.dispute_toast_detail'),
    life: 4000,
  })
}

async function load() {
  const idParam = Number(route.params.id)
  if (!Number.isFinite(idParam) || idParam <= 0) {
    loadError.value = t('errors.not_found')
    loading.value = false
    return
  }

  try {
    loading.value = true
    loadError.value = null
    const tx = await getTransaction(idParam)
    transaction.value = tx
    if (tx?.partner_id) {
      partner.value = await getPartner(tx.partner_id)
    }
  } catch (err) {
    console.error('Error loading transaction:', err)
    loadError.value = t('errors.fetch_failed')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.material-symbols-outlined.filled {
  font-variation-settings: 'FILL' 1;
}
</style>
