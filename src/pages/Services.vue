<template>
  <div class="space-y-12">
    <header
      class="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant/20 pb-8"
    >
      <div class="space-y-2">
        <nav
          class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
        >
          <span>{{ $t('services.breadcrumb_root') }}</span>
          <span class="material-symbols-outlined text-[12px]">chevron_right</span>
          <span class="text-primary">{{ $t('services.title') }}</span>
        </nav>
        <h1 class="text-4xl font-extrabold tracking-tighter text-primary leading-none">
          {{ $t('services.title') }}
        </h1>
        <p class="text-on-surface-variant text-sm max-w-xl font-medium leading-relaxed">
          {{ $t('services.subtitle') }}
        </p>
      </div>
      <Button
        :label="$t('services.create')"
        icon="pi pi-plus-circle"
        size="large"
        data-test="create-service"
        @click="router.push('/services/new')"
      />
    </header>

    <section class="bg-surface-container-lowest overflow-hidden">
      <div
        class="px-6 py-5 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <h2 class="font-bold text-on-surface flex items-center gap-2">
          <span
            class="material-symbols-outlined text-primary"
            style="font-variation-settings: 'FILL' 1"
          >
            list_alt
          </span>
          {{ $t('services.section_title') }}
        </h2>
        <div class="flex items-center gap-2">
          <Button
            :label="$t('services.export_csv')"
            icon="pi pi-download"
            text
            severity="secondary"
            size="small"
            class="!text-xs !font-bold !uppercase !tracking-widest"
            @click="exportCsv"
          />
          <Button
            :label="$t('services.filter')"
            icon="pi pi-filter"
            text
            :severity="onlyPublic === undefined ? 'secondary' : 'info'"
            size="small"
            class="!text-xs !font-bold !uppercase !tracking-widest"
            @click="cycleFilter"
          />
        </div>
      </div>

      <DataTable
        :value="services"
        :loading="loading"
        data-key="id"
        striped-rows
        class="services-registry-table"
      >
        <template #empty>
          <span class="text-on-surface-variant text-sm">{{ $t('services.empty') }}</span>
        </template>

        <Column field="name" :header="$t('services.columns.name')" header-class="!ps-8">
          <template #body="{ data }">
            <button
              type="button"
              class="ps-2 flex items-center gap-4 text-start hover:opacity-80 transition-opacity"
              @click="navigateToDetail(data.id)"
            >
              <div
                class="w-10 h-10 bg-surface-container-low rounded flex items-center justify-center border border-outline-variant/10 shrink-0"
              >
                <img
                  v-if="data.logo_url"
                  :src="data.logo_url"
                  :alt="data.name"
                  class="w-7 h-7 object-contain"
                />
                <span v-else class="material-symbols-outlined text-primary">database</span>
              </div>
              <div>
                <p
                  class="font-bold text-primary leading-tight underline-offset-4 hover:underline"
                >
                  {{ data.name }}
                </p>
                <p class="text-[10px] font-mono text-on-surface-variant uppercase mt-0.5">
                  {{ formatServiceCode(data) }}
                </p>
              </div>
            </button>
          </template>
        </Column>

        <Column :header="$t('services.columns.linked_template')">
          <template #body="{ data }">
            <span
              v-if="getTemplateName(data)"
              class="inline-block bg-surface-container text-on-surface-variant px-3 py-1 rounded text-[11px] font-bold"
            >
              {{ getTemplateName(data) }}
            </span>
            <span v-else class="text-on-surface-variant/60 text-xs font-mono">—</span>
          </template>
        </Column>

        <Column :header="$t('services.columns.active_plans')">
          <template #body="{ data }">
            <span class="font-mono font-medium text-on-surface">
              {{ formatCount(planCount(data)) }}
            </span>
          </template>
        </Column>

        <Column :header="$t('services.columns.version_count')">
          <template #body="{ data }">
            <span class="font-mono font-medium text-on-surface">{{ latestVersion(data) }}</span>
          </template>
        </Column>

        <Column :header="$t('services.columns.status')">
          <template #body="{ data }">
            <span
              v-if="data.isPubliclyAvailable"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-tertiary-container text-tertiary-container text-[10px] font-black uppercase tracking-tighter"
            >
              <span class="material-symbols-outlined text-[14px]">check_circle</span>
              {{ $t('services.status.active') }}
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-outline text-on-surface-variant text-[10px] font-black uppercase tracking-tighter"
            >
              <span class="material-symbols-outlined text-[14px]">edit_note</span>
              {{ $t('services.status.draft') }}
            </span>
          </template>
        </Column>

        <Column
          :header="$t('services.columns.actions')"
          header-style="text-align: end"
          body-style="text-align: end"
          header-class="!pe-8"
        >
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-3 pe-2">
              <Button
                :label="$t('common.edit')"
                text
                severity="info"
                size="small"
                class="!font-bold"
                :data-test="`edit-${data.id}`"
                @click="navigateToEdit(data.id)"
              />
            </div>
          </template>
        </Column>
      </DataTable>

      <div
        class="px-6 py-5 border-t border-outline-variant/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface-container-lowest"
      >
        <div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
          {{ $t('services.showing_count', { shown: shownCount, total: totalRecords }) }}
        </div>
        <div class="flex items-center gap-1">
          <Button
            :label="$t('services.previous')"
            text
            severity="secondary"
            size="small"
            :disabled="currentPage === 0 || loading"
            class="!text-xs !font-black !uppercase !tracking-widest"
            @click="prevPage"
          />
          <div class="font-mono text-xs font-bold px-4 text-on-surface tabular-nums">
            {{ pageDisplay }}
          </div>
          <Button
            :label="$t('services.next')"
            text
            severity="secondary"
            size="small"
            :disabled="currentPage + 1 >= totalPages || loading"
            class="!text-xs !font-black !uppercase !tracking-widest"
            @click="nextPage"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import { listServices, readServicePlans } from '@/services/services.service'

const PAGE_SIZE = 10

const router = useRouter()
const { t, locale } = useI18n()
const toast = useToast()

interface ServiceRow {
  id: number
  name: string
  slug: string
  logo_url: string | null
  isPubliclyAvailable: boolean | null
  plans: unknown
  versions: unknown
  deployment_template: unknown
}

const services = ref<ServiceRow[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const currentPage = ref(0)
const onlyPublic = ref<boolean | undefined>(undefined)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalRecords.value / PAGE_SIZE)),
)
const shownCount = computed(() => services.value.length)
const pageDisplay = computed(
  () => `${pad(currentPage.value + 1)} / ${pad(totalPages.value)}`,
)

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

async function loadServices() {
  loading.value = true
  try {
    const result = await listServices({
      page: currentPage.value + 1,
      pageSize: PAGE_SIZE,
      isPubliclyAvailable: onlyPublic.value,
    })
    services.value = result.data as ServiceRow[]
    totalRecords.value = result.count
  } catch {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('errors.fetch_failed'),
      life: 4000,
    })
  } finally {
    loading.value = false
  }
}

function planCount(svc: ServiceRow): number {
  return readServicePlans(svc as { plans?: unknown }).length
}

function latestVersion(svc: ServiceRow): string {
  const v = svc.versions
  if (!Array.isArray(v) || v.length === 0) return '—'
  const last = v[v.length - 1]
  return typeof last === 'string' && last ? `v${last}` : '—'
}

function getTemplateName(svc: ServiceRow): string | null {
  const tpl = svc.deployment_template as { name?: string } | null
  return tpl && typeof tpl.name === 'string' && tpl.name ? tpl.name : null
}

function formatServiceCode(svc: ServiceRow): string {
  return svc.slug ? svc.slug.toUpperCase() : `SVC-${pad(svc.id)}`
}

function formatCount(n: number): string {
  return n.toLocaleString(locale.value === 'fr' ? 'fr-SN' : 'en-US')
}

function navigateToDetail(id: number) {
  router.push(`/services/${id}`)
}

function navigateToEdit(id: number) {
  router.push(`/services/${id}/edit`)
}

function prevPage() {
  if (currentPage.value === 0) return
  currentPage.value -= 1
  loadServices()
}

function nextPage() {
  if (currentPage.value + 1 >= totalPages.value) return
  currentPage.value += 1
  loadServices()
}

function cycleFilter() {
  // undefined → true (public only) → false (drafts only) → undefined
  if (onlyPublic.value === undefined) onlyPublic.value = true
  else if (onlyPublic.value === true) onlyPublic.value = false
  else onlyPublic.value = undefined
}

watch(onlyPublic, () => {
  currentPage.value = 0
  loadServices()
})

function exportCsv() {
  if (!services.value.length) return
  const header = [
    t('services.columns.name'),
    t('services.columns.linked_template'),
    t('services.columns.active_plans'),
    t('services.columns.version_count'),
    t('services.columns.status'),
  ]
  const rows = services.value.map((s) => [
    `${s.name} (${formatServiceCode(s)})`,
    getTemplateName(s) ?? '',
    String(planCount(s)),
    latestVersion(s),
    s.isPubliclyAvailable ? t('services.status.active') : t('services.status.draft'),
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `services-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadServices()
})
</script>

<style scoped>
.services-registry-table :deep(.p-datatable-thead > tr > th) {
  background: var(--surface-container-low);
  color: var(--on-surface-variant);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding-block: 1.25rem;
  border-bottom: 1px solid var(--outline-variant);
}

.services-registry-table :deep(.p-datatable-tbody > tr > td) {
  padding-block: 1.25rem;
  border-bottom: 1px solid var(--outline-variant);
  border-bottom-width: 1px;
}

.services-registry-table :deep(.p-datatable-tbody > tr:hover) {
  background: var(--surface-container-high);
}
</style>
