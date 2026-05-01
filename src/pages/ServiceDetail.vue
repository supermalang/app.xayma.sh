<template>
  <div class="space-y-8">
    <Button
      icon="pi pi-arrow-left"
      text
      :label="$t('common.back')"
      class="-ms-2"
      @click="router.back()"
    />

    <div v-if="loading && !service" class="space-y-3">
      <Skeleton width="240px" height="14px" />
      <Skeleton width="420px" height="44px" />
      <Skeleton width="280px" height="20px" />
    </div>

    <Message v-else-if="error" severity="error" :text="error" />

    <template v-if="service">
      <!-- Header -->
      <header
        class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/20 pb-8"
      >
        <div>
          <nav
            class="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-4 uppercase tracking-wider"
          >
            <RouterLink to="/services" class="hover:text-primary">
              {{ $t('services.detail.breadcrumb_root') }}
            </RouterLink>
            <span class="material-symbols-outlined text-[10px]">chevron_right</span>
            <span class="text-primary font-bold">{{ service.name }}</span>
          </nav>
          <h1 class="text-4xl font-extrabold tracking-tighter text-on-surface mb-2">
            {{ service.name }}
          </h1>
          <div class="flex items-center gap-3 font-mono text-xs text-on-surface-variant">
            <span class="bg-surface-container-high px-2 py-1 rounded">
              {{ $t('services.detail.id_prefix') }}{{ formattedId }}
            </span>
            <span class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse" />
              {{ $t('services.detail.system_active') }}
            </span>
          </div>
        </div>
        <Button
          icon="pi pi-pencil"
          :label="$t('services.detail.edit')"
          severity="secondary"
          data-test="edit-service"
        />
      </header>

      <!-- Bento grid -->
      <div class="grid grid-cols-12 gap-6">
        <!-- Left column -->
        <div class="col-span-12 lg:col-span-8 space-y-8">
          <!-- Metadata card -->
          <section
            class="bg-surface-container-lowest p-8 border-s-4 border-primary space-y-8"
          >
            <div class="flex flex-col md:flex-row gap-8">
              <div
                class="w-24 h-24 bg-surface-container-low rounded-lg flex items-center justify-center border border-outline-variant/10 shrink-0"
              >
                <img
                  v-if="service.logo_url"
                  :src="service.logo_url"
                  :alt="service.name"
                  class="w-16 h-16 object-contain"
                />
                <span
                  v-else
                  class="material-symbols-outlined text-primary text-4xl"
                  style="font-variation-settings: 'FILL' 1"
                >
                  inventory_2
                </span>
              </div>
              <div class="flex-1 space-y-6">
                <p
                  v-if="service.description"
                  class="text-on-surface-variant text-lg leading-relaxed max-w-2xl"
                >
                  {{ service.description }}
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div v-if="service.deploymentEngineJobTemplateId">
                    <label
                      class="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1"
                    >
                      {{ $t('services.detail.deployment_engine_label') }}
                    </label>
                    <div class="font-mono text-sm text-primary flex items-center gap-2">
                      <span class="material-symbols-outlined text-sm">architecture</span>
                      {{ service.deploymentEngineJobTemplateId }}
                    </div>
                  </div>
                  <div v-if="service.created">
                    <label
                      class="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1"
                    >
                      {{ $t('services.detail.created_label') }}
                    </label>
                    <div class="font-mono text-sm text-on-surface">
                      {{ formatDate(service.created) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Service Plans -->
          <section class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-sm uppercase tracking-widest text-on-surface-variant">
                {{ $t('services.detail.sections.plans') }}
              </h3>
              <Button
                icon="pi pi-plus"
                :label="$t('services.plans.add')"
                size="small"
                @click="startAddPlan"
              />
            </div>

            <DataTable
              :value="plans"
              :loading="plansLoading"
              edit-mode="row"
              :editing-rows="editingRows"
              data-key="slug"
              @row-edit-save="onRowEditSave"
              @row-edit-cancel="onRowEditCancel"
            >
              <template #empty>
                <span class="text-on-surface-variant">{{ $t('services.plans.empty') }}</span>
              </template>

              <Column
                field="label"
                :header="$t('service_plans.form.label')"
                style="min-width: 200px"
              >
                <template #body="{ data }">
                  <div class="space-y-0.5">
                    <div class="font-bold text-on-surface">{{ data.label }}</div>
                    <div class="font-mono text-[11px] text-on-surface-variant">{{ data.slug }}</div>
                  </div>
                </template>
                <template #editor="{ data }">
                  <div class="space-y-2">
                    <InputText v-model="data.label" autofocus class="w-full" />
                    <InputText
                      v-model="data.slug"
                      :placeholder="$t('service_plans.form.slug')"
                      class="w-full !text-[11px] !font-mono"
                    />
                  </div>
                </template>
              </Column>

              <Column
                field="description"
                :header="$t('service_plans.form.description')"
              >
                <template #body="{ data }">
                  <span class="text-xs text-on-surface-variant">{{ data.description }}</span>
                </template>
                <template #editor="{ data, field }">
                  <InputText v-model="data[field]" class="w-full" />
                </template>
              </Column>

              <Column
                field="monthlyCreditConsumption"
                :header="$t('services.plans.credits_header')"
                style="min-width: 180px"
                body-style="text-align: end"
                header-style="text-align: end"
              >
                <template #body="{ data }">
                  <span class="font-mono text-primary font-bold">
                    {{ (data.monthlyCreditConsumption ?? 0).toLocaleString('fr-SN') }}
                  </span>
                  <span class="ms-1 text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {{ $t('services.plans.credits_per_month') }}
                  </span>
                </template>
                <template #editor="{ data, field }">
                  <InputNumber v-model="data[field]" :use-grouping="false" class="w-full" />
                </template>
              </Column>

              <Column :row-editor="true" style="width: 8rem" body-style="text-align: end" />

              <Column style="width: 4rem" body-style="text-align: end">
                <template #body="{ data }">
                  <Button
                    icon="pi pi-trash"
                    text
                    severity="danger"
                    size="small"
                    @click="confirmDeletePlan(data)"
                  />
                </template>
              </Column>
            </DataTable>
          </section>

          <!-- Deployment Engine Config -->
          <section
            v-if="service.control_node_id || service.deploymentEngineJobTemplateId"
            class="space-y-4"
          >
            <h3 class="font-bold text-sm uppercase tracking-widest text-on-surface-variant">
              {{ $t('services.detail.sections.deployment_config') }}
            </h3>
            <div class="space-y-2">
              <div
                v-if="service.control_node_id"
                class="bg-surface-container-lowest p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors"
              >
                <span class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {{ $t('services.form.control_node_id') }}
                </span>
                <span class="font-mono text-sm text-primary">{{ service.control_node_id }}</span>
              </div>
              <div
                v-if="service.deploymentEngineJobTemplateId"
                class="bg-surface-container-lowest p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors"
              >
                <span class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {{ $t('services.deployment_engine.job_template_id') }}
                </span>
                <span class="font-mono text-sm text-primary">
                  {{ service.deploymentEngineJobTemplateId }}
                </span>
              </div>
            </div>
          </section>
        </div>

        <!-- Right column -->
        <div class="col-span-12 lg:col-span-4 space-y-6">
          <!-- Performance card -->
          <section class="bg-surface-container-high p-6 space-y-6">
            <h3 class="font-bold text-xs uppercase tracking-widest text-on-surface-variant">
              {{ $t('services.detail.performance.title') }}
            </h3>
            <div class="space-y-4">
              <div class="bg-surface-container-lowest p-4">
                <label
                  class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2"
                >
                  {{ $t('services.detail.performance.active_deployments') }}
                </label>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-extrabold tracking-tighter text-on-surface">
                    {{ activeDeploymentCount.toLocaleString('fr-SN') }}
                  </span>
                </div>
              </div>
              <div class="bg-surface-container-lowest p-4">
                <label
                  class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2"
                >
                  {{ $t('services.detail.performance.total_plans') }}
                </label>
                <div class="text-2xl font-mono font-bold text-primary">
                  {{ plans.length }}
                </div>
              </div>
            </div>
          </section>

          <!-- Technical Hooks (dark) -->
          <section class="bg-on-background text-white p-6 space-y-6">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary-container">terminal</span>
              <h3 class="font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                {{ $t('services.detail.hooks.title') }}
              </h3>
            </div>
            <p class="text-[11px] text-on-surface-variant leading-relaxed">
              {{ $t('services.lifecycle_section.hint') }}
            </p>
            <div class="space-y-4">
              <div v-for="tag in lifecycleTags" :key="tag.key" class="group">
                <div class="text-[10px] font-mono text-on-surface-variant mb-1">
                  {{ $t(`services.detail.hooks.events.${tag.key}`) }}
                </div>
                <InputText
                  v-model="lifecycleTagValues[tag.key]"
                  :data-test="`tag-command-${tag.key}`"
                  :placeholder="$t('services.tags_section.command_placeholder')"
                  :pt="{
                    root: `!w-full !border-0 !rounded-none !bg-inverse-surface !text-[11px] !font-mono !text-white !p-2 !border-s-2 ${tag.accent}`,
                  }"
                />
              </div>
            </div>
            <Button
              :label="$t('services.lifecycle_section.save')"
              :loading="lifecycleSaving"
              :disabled="!lifecycleDirty"
              data-test="save-lifecycle"
              size="small"
              class="w-full"
              @click="saveLifecycleCommands"
            />
          </section>
        </div>
      </div>
    </template>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import ConfirmDialog from 'primevue/confirmdialog'
import {
  getService,
  readServicePlans,
  setServicePlans,
  updateService,
  type ServicePlan,
} from '@/services/services.service'
import { listDeployments } from '@/services/deployments.service'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const confirm = useConfirm()
const toast = useToast()

const service = ref<any>(null)
const plans = ref<ServicePlan[]>([])
const loading = ref(false)
const plansLoading = ref(false)
const error = ref<string | null>(null)
const editingRows = ref<ServicePlan[]>([])
const activeDeploymentCount = ref(0)

const lifecycleTags = [
  { key: 'start', accent: '!border-primary-container' },
  { key: 'stop', accent: '!border-primary-container' },
  { key: 'restart', accent: '!border-secondary-container' },
  { key: 'suspend', accent: '!border-primary-container' },
  { key: 'archive', accent: '!border-primary-container' },
  { key: 'domain', accent: '!border-secondary-container' },
] as const

const lifecycleTagValues = reactive<Record<string, string>>(
  Object.fromEntries(lifecycleTags.map((tag) => [tag.key, ''])),
)
const lifecycleBaseline = ref<Record<string, string>>({})
const lifecycleSaving = ref(false)

const lifecycleDirty = computed(() => {
  for (const tag of lifecycleTags) {
    if ((lifecycleTagValues[tag.key] || '') !== (lifecycleBaseline.value[tag.key] || '')) {
      return true
    }
  }
  return false
})

const formattedId = computed(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? String(id).padStart(4, '0') : ''
})

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

onMounted(async () => {
  const id = Number(route.params.id)
  loading.value = true
  try {
    service.value = await getService(id)
    hydrateLifecycleCommands(service.value?.lifecycle_commands)
    plans.value = readServicePlans(service.value)
    void loadActiveDeploymentCount(id)
  } catch {
    error.value = t('errors.fetch_failed')
  } finally {
    loading.value = false
  }
})

async function loadActiveDeploymentCount(serviceId: number) {
  try {
    const result = await listDeployments({
      service_id: serviceId,
      status: 'active',
      pageSize: 1,
    })
    activeDeploymentCount.value = result.count
  } catch {
    activeDeploymentCount.value = 0
  }
}

function hydrateLifecycleCommands(stored: unknown) {
  const source = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>
  const next: Record<string, string> = {}
  for (const tag of lifecycleTags) {
    const v = source[tag.key]
    next[tag.key] = typeof v === 'string' ? v : ''
    lifecycleTagValues[tag.key] = next[tag.key]
  }
  lifecycleBaseline.value = next
}

async function saveLifecycleCommands() {
  const id = Number(route.params.id)
  const lifecycle_commands = Object.fromEntries(
    Object.entries(lifecycleTagValues)
      .map(([k, v]) => [k, v.trim()])
      .filter(([, v]) => v.length > 0),
  )
  lifecycleSaving.value = true
  try {
    await updateService(id, { lifecycle_commands } as any)
    if (service.value) service.value.lifecycle_commands = lifecycle_commands
    hydrateLifecycleCommands(lifecycle_commands)
    toast.add({
      severity: 'success',
      summary: t('common.success'),
      detail: t('services.lifecycle_section.saved'),
      life: 3000,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('errors.fetch_failed'),
      life: 4000,
    })
  } finally {
    lifecycleSaving.value = false
  }
}

async function persistPlans(next: ServicePlan[]) {
  const id = Number(route.params.id)
  const saved = await setServicePlans(id, next)
  plans.value = saved
  if (service.value) service.value.plans = saved
}

async function onRowEditSave(event: any) {
  const { newData, index } = event as { newData: ServicePlan; index: number }
  const previous = plans.value
  const next = previous.map((p, i) => (i === index ? { ...p, ...newData } : p))
  try {
    await persistPlans(next)
    toast.add({ severity: 'success', summary: t('common.success'), life: 3000 })
  } catch {
    plans.value = previous
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('errors.fetch_failed'),
      life: 4000,
    })
  }
}

function onRowEditCancel() {
  // PrimeVue restores original data automatically
}

async function startAddPlan() {
  const used = new Set(plans.value.map((p) => p.slug))
  let candidate = 'plan'
  let n = plans.value.length + 1
  while (used.has(candidate)) candidate = `plan-${n++}`
  const newPlan: ServicePlan = {
    slug: candidate,
    label: t('services.plans.tier_label_placeholder'),
    description: null,
    monthlyCreditConsumption: 0,
    options: [],
  }
  plans.value = [newPlan, ...plans.value]
  editingRows.value = [newPlan]
}

function confirmDeletePlan(plan: ServicePlan) {
  confirm.require({
    message: t('common.confirm_delete'),
    header: t('common.delete'),
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      const previous = plans.value
      const next = previous.filter((p) => p.slug !== plan.slug)
      try {
        await persistPlans(next)
        toast.add({ severity: 'success', summary: t('common.success'), life: 3000 })
      } catch {
        plans.value = previous
        toast.add({
          severity: 'error',
          summary: t('common.error'),
          detail: t('errors.fetch_failed'),
          life: 4000,
        })
      }
    },
  })
}
</script>
