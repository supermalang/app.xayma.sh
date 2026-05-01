<template>
  <div class="space-y-6">
    <!-- Back + header -->
    <div>
      <Button
        icon="pi pi-arrow-left"
        text
        :label="$t('common.back')"
        class="mb-3 -ms-2"
        @click="router.back()"
      />
      <div v-if="service">
        <h1 class="text-3xl font-bold text-on-surface">{{ service.name }}</h1>
        <p v-if="service.description" class="mt-1 text-on-surface-variant">
          {{ service.description }}
        </p>
      </div>
      <div v-else-if="loading" class="space-y-2">
        <Skeleton width="300px" height="36px" />
        <Skeleton width="200px" height="20px" />
      </div>
      <Message v-else-if="error" severity="error" :text="error" />
    </div>

    <!-- Tabs -->
    <TabView v-if="service">
      <!-- Plans tab -->
      <TabPanel :value="$t('services.tabs.plans')">
        <div class="space-y-4">
          <div class="flex justify-end">
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

            <Column field="label" :header="$t('service_plans.form.label')" style="min-width: 160px">
              <template #editor="{ data, field }">
                <InputText v-model="data[field]" autofocus class="w-full" />
              </template>
            </Column>

            <Column field="slug" :header="$t('service_plans.form.slug')" style="min-width: 140px">
              <template #editor="{ data, field }">
                <InputText v-model="data[field]" class="w-full" />
              </template>
            </Column>

            <Column
              field="monthlyCreditConsumption"
              :header="$t('service_plans.form.monthlyCreditConsumption')"
              style="min-width: 180px"
            >
              <template #body="{ data }">
                <span class="font-mono">
                  {{ (data.monthlyCreditConsumption ?? 0).toLocaleString('fr-SN') }}
                </span>
                <span class="ms-1 text-xs text-on-surface-variant">
                  {{ $t('services.plans.credits_per_month') }}
                </span>
              </template>
              <template #editor="{ data, field }">
                <InputNumber v-model="data[field]" :use-grouping="false" class="w-full" />
              </template>
            </Column>

            <Column field="description" :header="$t('service_plans.form.description')">
              <template #editor="{ data, field }">
                <InputText v-model="data[field]" class="w-full" />
              </template>
            </Column>

            <Column
              :row-editor="true"
              style="width: 8rem"
              body-style="text-align: right"
            />

            <Column style="width: 4rem" body-style="text-align: right">
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
        </div>
      </TabPanel>

      <!-- Lifecycle Commands tab -->
      <TabPanel :value="$t('services.tabs.lifecycle_commands')">
        <div class="space-y-6 max-w-3xl">
          <p class="text-sm text-on-surface-variant">{{ $t('services.lifecycle_section.hint') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="tag in lifecycleTags"
              :key="tag.key"
              class="p-4 bg-surface-container-low border border-transparent hover:border-primary-container transition-all"
            >
              <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-primary text-lg">{{ tag.icon }}</span>
                <span class="text-[11px] font-bold uppercase text-on-surface">
                  {{ $t(`services.tags_section.${tag.key}`) }}
                </span>
              </div>
              <InputText
                v-model="lifecycleTagValues[tag.key]"
                :data-test="`tag-command-${tag.key}`"
                :placeholder="$t('services.tags_section.command_placeholder')"
                class="w-full !border-0 !rounded-none !bg-surface-container-lowest !p-2 !text-[10px] !font-mono !text-primary"
              />
            </div>
          </div>
          <div class="flex justify-end">
            <Button
              :label="$t('services.lifecycle_section.save')"
              :loading="lifecycleSaving"
              :disabled="!lifecycleDirty"
              data-test="save-lifecycle"
              @click="saveLifecycleCommands"
            />
          </div>
        </div>
      </TabPanel>

      <!-- Deployment Engine Config tab -->
      <TabPanel :value="$t('services.tabs.deployment_engine_config')">
        <div class="space-y-4 max-w-lg">
          <div v-if="service.control_node_id">
            <p class="text-sm font-medium text-on-surface-variant mb-1">
              {{ $t('services.form.control_node_id') }}
            </p>
            <p class="font-mono text-on-surface">{{ service.control_node_id }}</p>
          </div>

          <div v-if="service.deploymentEngineJobTemplateId">
            <p class="text-sm font-medium text-on-surface-variant mb-1">
              {{ $t('services.deployment_engine.job_template_id') }}
            </p>
            <p class="font-mono text-on-surface">{{ service.deploymentEngineJobTemplateId }}</p>
          </div>

          <Message
            v-if="!service.control_node_id && !service.deploymentEngineJobTemplateId"
            severity="info"
            :text="$t('services.deployment_engine.not_configured')"
          />
        </div>
      </TabPanel>
    </TabView>

    <!-- Delete plan confirmation dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
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

const lifecycleTags = [
  { key: 'start', icon: 'play_arrow' },
  { key: 'stop', icon: 'stop' },
  { key: 'restart', icon: 'refresh' },
  { key: 'suspend', icon: 'pause' },
  { key: 'archive', icon: 'archive' },
  { key: 'domain', icon: 'dns' },
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

onMounted(async () => {
  const id = Number(route.params.id)
  loading.value = true
  try {
    service.value = await getService(id)
    hydrateLifecycleCommands(service.value?.lifecycle_commands)
    plans.value = readServicePlans(service.value)
  } catch {
    error.value = t('errors.fetch_failed')
  } finally {
    loading.value = false
  }
})

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
    toast.add({ severity: 'error', summary: t('common.error'), detail: t('errors.fetch_failed'), life: 4000 })
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
    toast.add({ severity: 'error', summary: t('common.error'), detail: t('errors.fetch_failed'), life: 4000 })
  }
}

function onRowEditCancel() {
  // no-op — PrimeVue restores original data automatically
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
        toast.add({ severity: 'error', summary: t('common.error'), detail: t('errors.fetch_failed'), life: 4000 })
      }
    },
  })
}
</script>
