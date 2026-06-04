<template>
  <AppPage>
    <AppPageHeader
      :title="$t('services.title')"
      :description="$t('services.subtitle')"
    >
      <template #actions>
        <Button
          :label="$t('services.create')"
          icon="pi pi-plus-circle"
          size="large"
          data-test="create-service"
          @click="router.push('/services/new')"
        />
      </template>
    </AppPageHeader>

    <AppDataTable
      :title="$t('services.section_title')"
      :rows="services"
      :columns="columns"
      :loading="loading"
      :total-records="totalRecords"
      :page-size="PAGE_SIZE"
      :first="currentPage * PAGE_SIZE"
      lazy
      row-clickable
      export-filename="services"
      :empty-title="$t('services.empty.title')"
      :empty-description="$t('services.empty.description')"
      empty-icon="pi-box"
      @page-change="onPageChange"
      @row-click="onRowClick"
    >
      <template #filter>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ $t('common.search') }}
          </label>
          <InputText
            v-model="searchInput"
            :placeholder="$t('services.section_title')"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            {{ $t('services.columns.status') }}
          </label>
          <Dropdown
            v-model="onlyPublicInput"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('common.select')"
            class="w-full"
          />
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-outline-variant/40">
          <Button
            :label="$t('common.reset')"
            severity="secondary"
            text
            size="small"
            @click="resetFilters"
          />
          <Button
            :label="$t('common.apply')"
            size="small"
            @click="applyFilters"
          />
        </div>
      </template>

      <template #emptyAction>
        <Button
          :label="$t('services.create')"
          icon="pi pi-plus"
          @click="router.push('/services/new')"
        />
      </template>

      <template #body-name="{ data }">
        <div class="flex items-center gap-4">
          <div
            class="w-10 h-10 bg-surface-container-low rounded flex items-center justify-center border border-outline-variant/10 shrink-0"
          >
            <img
              v-if="(data as ServiceRow).logo_url"
              :src="(data as ServiceRow).logo_url!"
              :alt="(data as ServiceRow).name"
              class="w-7 h-7 object-contain"
            />
            <span v-else class="material-symbols-outlined text-primary">database</span>
          </div>
          <div>
            <p class="font-bold text-primary leading-tight">
              {{ (data as ServiceRow).name }}
            </p>
            <p class="text-[10px] font-mono text-on-surface-variant uppercase mt-0.5">
              {{ formatServiceCode(data as ServiceRow) }}
            </p>
          </div>
        </div>
      </template>

      <template #body-template="{ data }">
        <span
          v-if="getTemplateName(data as ServiceRow)"
          class="inline-block bg-surface-container text-on-surface-variant px-3 py-1 rounded text-[11px] font-bold"
        >
          {{ getTemplateName(data as ServiceRow) }}
        </span>
        <span v-else class="text-on-surface-variant/60 text-xs font-mono">—</span>
      </template>

      <template #body-plans="{ data }">
        <span class="font-mono font-medium text-on-surface">
          {{ formatCount(planCount(data as ServiceRow)) }}
        </span>
      </template>

      <template #body-version="{ data }">
        <span class="font-mono font-medium text-on-surface">{{ latestVersion(data as ServiceRow) }}</span>
      </template>

      <template #body-status="{ data }">
        <span
          v-if="(data as ServiceRow).isPubliclyAvailable"
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

      <template #rowActions="{ data }">
        <Button
          :label="$t('common.edit')"
          text
          severity="info"
          size="small"
          class="!font-bold"
          :data-test="`edit-${(data as ServiceRow).id}`"
          @click.stop="navigateToEdit((data as ServiceRow).id)"
        />
      </template>
    </AppDataTable>
  </AppPage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import AppPage from '@/components/common/AppPage.vue'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import AppDataTable, { type AppTableColumn } from '@/components/common/AppDataTable.vue'
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
const searchQuery = ref('')

// Draft filter state (only applied on Apply click)
const onlyPublicInput = ref<boolean | null>(null)
const searchInput = ref('')

const columns: AppTableColumn[] = [
  { field: 'name', header: 'services.columns.name' },
  { field: 'template', header: 'services.columns.linked_template' },
  { field: 'plans', header: 'services.columns.active_plans' },
  { field: 'version', header: 'services.columns.version_count' },
  { field: 'status', header: 'services.columns.status' },
]

const statusOptions = computed(() => [
  { label: t('services.status.active'), value: true },
  { label: t('services.status.draft'), value: false },
  { label: t('vouchers.all'), value: null },
])

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
    let rows = result.data as ServiceRow[]
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      rows = rows.filter((s) => s.name.toLowerCase().includes(q) || s.slug?.toLowerCase().includes(q))
    }
    services.value = rows
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

function navigateToEdit(id: number) {
  router.push(`/services/${id}/edit`)
}

function onRowClick(row: unknown) {
  const svc = row as ServiceRow
  if (svc?.id) router.push(`/services/${svc.id}`)
}

function onPageChange(event: { page: number }) {
  currentPage.value = event.page
  loadServices()
}

function applyFilters() {
  onlyPublic.value = onlyPublicInput.value === null ? undefined : onlyPublicInput.value
  searchQuery.value = searchInput.value
  currentPage.value = 0
  loadServices()
}

function resetFilters() {
  onlyPublicInput.value = null
  searchInput.value = ''
  onlyPublic.value = undefined
  searchQuery.value = ''
  currentPage.value = 0
  loadServices()
}

watch(onlyPublic, () => {
  currentPage.value = 0
})

onMounted(() => {
  loadServices()
})
</script>
