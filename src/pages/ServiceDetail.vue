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
      <div v-if="service" class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-on-surface">{{ service.name }}</h1>
          <p v-if="service.description" class="mt-1 text-on-surface-variant">
            {{ service.description }}
          </p>
        </div>
        <Tag
          :value="$t(`services.status.${service.status}`)"
          :severity="statusSeverity"
          class="mt-1"
        />
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
      <TabPanel :header="$t('services.tabs.plans')">
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
            data-key="id"
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

      <!-- AWX Config tab -->
      <TabPanel :header="$t('services.tabs.awx_config')">
        <div class="space-y-4 max-w-lg">
          <div v-if="service.control_node_id">
            <p class="text-sm font-medium text-on-surface-variant mb-1">
              {{ $t('services.form.control_node_id') }}
            </p>
            <p class="font-mono text-on-surface">{{ service.control_node_id }}</p>
          </div>

          <div v-if="service.awxJobTemplateId">
            <p class="text-sm font-medium text-on-surface-variant mb-1">
              {{ $t('services.awx.job_template_id') }}
            </p>
            <p class="font-mono text-on-surface">{{ service.awxJobTemplateId }}</p>
          </div>

          <Message
            v-if="!service.control_node_id && !service.awxJobTemplateId"
            severity="info"
            :text="$t('services.awx.not_configured')"
          />
        </div>
      </TabPanel>
    </TabView>

    <!-- Delete plan confirmation dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import ConfirmDialog from 'primevue/confirmdialog'
import {
  getService,
  getServicePlansByServiceId,
  updateServicePlan,
  createServicePlan,
  deleteServicePlan,
} from '@/services/services.service'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const confirm = useConfirm()
const toast = useToast()

const service = ref<any>(null)
const plans = ref<any[]>([])
const loading = ref(false)
const plansLoading = ref(false)
const error = ref<string | null>(null)
const editingRows = ref<any[]>([])

const statusSeverity = computed(() => {
  if (service.value?.status === 'active') return 'success'
  if (service.value?.status === 'inactive') return 'warn'
  return 'secondary'
})

onMounted(async () => {
  const id = Number(route.params.id)
  loading.value = true
  try {
    service.value = await getService(id)
    await loadPlans(id)
  } catch {
    error.value = t('errors.fetch_failed')
  } finally {
    loading.value = false
  }
})

async function loadPlans(serviceId: number) {
  plansLoading.value = true
  try {
    plans.value = await getServicePlansByServiceId(serviceId)
  } finally {
    plansLoading.value = false
  }
}

async function onRowEditSave(event: any) {
  const { newData } = event
  try {
    await updateServicePlan(newData.id, {
      label: newData.label,
      slug: newData.slug,
      description: newData.description,
      monthlyCreditConsumption: newData.monthlyCreditConsumption,
    })
    const idx = plans.value.findIndex((p) => p.id === newData.id)
    if (idx !== -1) plans.value[idx] = { ...plans.value[idx], ...newData }
    toast.add({ severity: 'success', summary: t('common.success'), life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: t('common.error'), detail: t('errors.fetch_failed'), life: 4000 })
  }
}

function onRowEditCancel() {
  // no-op — PrimeVue restores original data automatically
}

async function startAddPlan() {
  const id = Number(route.params.id)
  try {
    const newPlan = await createServicePlan({
      service_id: id,
      label: 'New Plan',
      slug: `plan-${Date.now()}`,
      monthlyCreditConsumption: 0,
    })
    plans.value = [newPlan, ...plans.value]
    editingRows.value = [newPlan]
  } catch {
    toast.add({ severity: 'error', summary: t('common.error'), detail: t('errors.fetch_failed'), life: 4000 })
  }
}

function confirmDeletePlan(plan: any) {
  confirm.require({
    message: t('common.confirm_delete'),
    header: t('common.delete'),
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        await deleteServicePlan(plan.id)
        plans.value = plans.value.filter((p) => p.id !== plan.id)
        toast.add({ severity: 'success', summary: t('common.success'), life: 3000 })
      } catch {
        toast.add({ severity: 'error', summary: t('common.error'), detail: t('errors.fetch_failed'), life: 4000 })
      }
    },
  })
}
</script>
