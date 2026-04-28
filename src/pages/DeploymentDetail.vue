<template>
  <main class="space-y-8">
    <ConfirmDialog />
    <Button
      icon="pi pi-arrow-left"
      text
      :aria-label="$t('common.back')"
      @click="goBack"
    />

    <!-- Loading skeleton -->
    <div
      v-if="isLoading && !deployment"
      class="space-y-8"
    >
      <div class="flex items-center justify-between gap-6 mb-12">
        <div class="space-y-3">
          <Skeleton width="14rem" height="2rem" />
          <Skeleton width="20rem" height="1rem" />
        </div>
        <div class="flex gap-3">
          <Skeleton width="8rem" height="2.5rem" />
          <Skeleton width="10rem" height="2.5rem" />
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-4 space-y-8">
          <Skeleton height="14rem" />
          <Skeleton height="11rem" />
        </div>
        <div class="lg:col-span-8">
          <Skeleton height="26rem" />
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Skeleton height="8rem" />
        <Skeleton height="8rem" />
        <Skeleton height="8rem" />
      </div>
    </div>

    <!-- Not found -->
    <Message
      v-else-if="!isLoading && !deployment"
      severity="warn"
      :closable="false"
    >
      {{ $t('deployments.errors.not_found') }}
    </Message>

    <!-- Loaded -->
    <template v-else-if="deployment">
      <!-- Hero header -->
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-3xl font-extrabold tracking-tighter text-on-surface">
              {{ deployment.label }}
            </h1>
            <DeploymentStatusBadge :status="deployment.status ?? ''" />
          </div>
          <p class="flex flex-wrap items-center gap-2 text-on-surface-variant">
            <span class="font-mono text-xs bg-surface-container px-2 py-0.5 rounded">
              {{ $t('deployments.detail.id_prefix') }}: {{ deployment.slug }}
            </span>
            <span class="text-outline-variant text-xs">•</span>
            <span class="text-sm">
              {{ $t('deployments.detail.last_deployed') }}: {{ formattedCreated }}
            </span>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <Button
            v-if="isActive"
            :label="$t('deployments.detail.actions.stop_instance')"
            icon="pi pi-pause"
            outlined
            :loading="isLoading"
            :disabled="isLoading"
            @click="stopDeployment"
          />
          <Button
            v-else-if="isStopped || isSuspended"
            :label="$t('deployments.detail.actions.start_instance')"
            icon="pi pi-play"
            outlined
            :loading="isLoading"
            :disabled="isLoading"
            @click="startDeployment"
          />
          <Button
            :label="$t('deployments.detail.actions.manage_instance')"
            icon="pi pi-cog"
            :disabled="isLoading"
            aria-haspopup="true"
            aria-controls="manage_menu"
            @click="toggleManageMenu"
          />
          <Menu
            id="manage_menu"
            ref="menu"
            :model="manageMenuItems"
            :popup="true"
          />
        </div>
      </header>

      <EditInstanceDialog
        v-model:visible="editDialogVisible"
        :deployment="deployment"
        @save="onEditInstanceSave"
      />

      <!-- Top dashboard grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left column -->
        <div class="lg:col-span-4 space-y-8">
          <!-- Specs -->
          <section class="bg-surface-container-lowest border border-outline-variant/40 p-6 rounded-md">
            <h2 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-6">
              {{ $t('deployments.detail.specs.title') }}
            </h2>
            <div class="space-y-6">
              <div class="flex items-start gap-4">
                <span class="p-2 bg-surface-container-low rounded inline-flex">
                  <i class="pi pi-box text-primary" />
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-on-surface-variant font-medium mb-0.5">
                    {{ $t('deployments.detail.specs.service') }}
                  </p>
                  <p class="text-sm font-bold text-on-surface">
                    {{ imageLabel }}
                  </p>
                  <p class="text-xs text-on-surface-variant mt-1">
                    {{ $t('deployments.detail.specs.plan') }}:
                    <span class="font-semibold text-on-surface">{{ planLabel }}</span>
                  </p>
                </div>
                <Button
                  :label="$t('deployments.detail.actions.upgrade_plan')"
                  icon="pi pi-arrow-up-right"
                  outlined
                  size="small"
                  class="shrink-0"
                  @click="onUpgradePlan"
                />
              </div>
              <div class="flex items-start gap-4">
                <span class="p-2 bg-surface-container-low rounded inline-flex">
                  <i class="pi pi-globe text-primary" />
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-on-surface-variant font-medium mb-0.5">
                    {{ $t('deployments.detail.specs.domains') }}
                  </p>
                  <p
                    v-if="customDomain"
                    class="text-sm font-bold text-on-surface break-all"
                  >
                    {{ customDomain }}
                  </p>
                  <p
                    v-else
                    class="text-xs italic text-on-surface-variant"
                  >
                    {{ $t('deployments.detail.specs.no_custom_domain') }}
                  </p>
                  <p class="text-xs font-mono text-on-surface-variant mt-1 break-all">
                    {{ prefixedDomain }}
                  </p>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <span class="p-2 bg-surface-container-low rounded inline-flex">
                  <i class="pi pi-chart-bar text-primary" />
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-on-surface-variant font-medium mb-0.5">
                    {{ $t('deployments.detail.specs.insights') }}
                  </p>
                  <Button
                    :label="$t('deployments.detail.actions.view_insights')"
                    icon="pi pi-external-link"
                    text
                    size="small"
                    class="mt-2 -ms-2"
                    @click="onViewInsights"
                  />
                </div>
              </div>
            </div>
          </section>

          <!-- Uptime -->
          <section class="bg-surface-container-lowest border border-outline-variant/40 p-6 rounded-md">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {{ $t('deployments.detail.uptime.title') }}
              </h2>
              <span class="font-mono text-sm font-bold text-tertiary-container">99.9%</span>
            </div>
            <div class="space-y-4">
              <div class="h-4 w-full bg-surface-container-low rounded-sm overflow-hidden flex gap-0.5">
                <div class="h-full bg-tertiary-container w-[15%]" />
                <div class="h-full bg-tertiary-container w-[20%]" />
                <div class="h-full bg-tertiary-container w-[5%]" />
                <div class="h-full bg-tertiary-container w-[30%]" />
                <div class="h-full bg-tertiary-container w-[29.9%]" />
                <div class="h-full bg-surface-container w-[0.1%]" />
              </div>
              <div class="flex justify-between text-[10px] font-mono text-on-surface-variant uppercase">
                <span>{{ $t('deployments.detail.uptime.scale_start') }}</span>
                <span>{{ $t('deployments.detail.uptime.scale_end') }}</span>
              </div>
            </div>
            <div class="mt-6 pt-6 border-t border-outline-variant/20">
              <div class="flex items-center justify-between">
                <span class="text-xs text-on-surface-variant">
                  {{ $t('deployments.detail.uptime.last_incident') }}
                </span>
                <span class="font-mono text-xs text-on-surface">
                  {{ $t('deployments.detail.uptime.last_incident_placeholder') }}
                </span>
              </div>
            </div>
          </section>
        </div>

        <!-- Right column: Console -->
        <div class="lg:col-span-8">
          <section class="bg-slate-900 rounded-md border border-slate-800 h-full flex flex-col overflow-hidden">
            <div class="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="pi pi-desktop text-tertiary-container text-sm" />
                <h2 class="text-xs font-bold uppercase tracking-widest text-slate-300">
                  {{ $t('deployments.detail.console.title') }}
                </h2>
              </div>
              <div class="flex gap-1.5">
                <div class="w-2 h-2 rounded-full bg-slate-600" />
                <div class="w-2 h-2 rounded-full bg-slate-600" />
                <div class="w-2 h-2 rounded-full bg-slate-600" />
              </div>
            </div>
            <div class="p-6 flex-1 font-mono text-[13px] leading-relaxed text-slate-300 overflow-y-auto">
              <div class="space-y-2">
                <p
                  v-for="(line, index) in consoleLines"
                  :key="index"
                  :class="{ 'animate-pulse': index === consoleLines.length - 1 }"
                >
                  <span :class="levelClass(line.level)">[{{ line.level }}]</span>
                  <span class="ml-1">{{ line.text }}</span>
                </p>
                <span class="inline-block w-2 h-4 bg-slate-500 ml-1 align-middle" />
              </div>
            </div>
            <div class="p-4 bg-slate-950 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between uppercase">
              <span>{{ $t('deployments.detail.console.connection') }}</span>
              <span>{{ $t('deployments.detail.console.region') }}</span>
            </div>
          </section>
        </div>
      </div>

      <!-- Bottom infrastructure row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <section class="bg-surface-container-lowest border border-outline-variant/40 p-6 rounded-md group hover:bg-surface-container-low transition-colors">
          <div class="flex items-center justify-between mb-4">
            <i class="pi pi-database text-primary text-3xl" />
            <i class="pi pi-arrow-right text-outline-variant group-hover:text-primary transition-colors" />
          </div>
          <h3 class="font-bold text-on-surface mb-1">
            {{ $t('deployments.detail.infra.db.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            {{ $t('deployments.detail.infra.db.desc') }}
          </p>
        </section>

        <button
          type="button"
          class="bg-surface-container-lowest border border-outline-variant/40 p-6 rounded-md group hover:bg-surface-container-low transition-colors text-start"
          @click="onModulesClick"
        >
          <div class="flex items-center justify-between mb-4">
            <i class="pi pi-th-large text-primary text-3xl" />
            <i class="pi pi-arrow-right text-outline-variant group-hover:text-primary transition-colors" />
          </div>
          <h3 class="font-bold text-on-surface mb-1">
            {{ $t('deployments.detail.infra.modules.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            {{ $t('deployments.detail.infra.modules.desc') }}
          </p>
        </button>

        <section class="bg-surface-container-lowest border border-outline-variant/40 p-6 rounded-md group hover:bg-surface-container-low transition-colors">
          <div class="flex items-center justify-between mb-4">
            <i class="pi pi-shield text-primary text-3xl" />
            <i class="pi pi-arrow-right text-outline-variant group-hover:text-primary transition-colors" />
          </div>
          <h3 class="font-bold text-on-surface mb-1">
            {{ $t('deployments.detail.infra.firewall.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            {{ $t('deployments.detail.infra.firewall.desc') }}
          </p>
        </section>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import ConfirmDialog from 'primevue/confirmdialog'
import DeploymentStatusBadge from '@/components/deployments/DeploymentStatusBadge.vue'
import EditInstanceDialog from '@/components/deployments/EditInstanceDialog.vue'
import { useDeployments } from '@/composables/useDeployments'
import { useNotificationStore } from '@/stores/notifications.store'

type LogLevel = 'INFO' | 'SUCCESS' | 'DEBUG'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const confirm = useConfirm()
const { loadDeployment, performDeploymentAction, terminateDeployment, subscribeToDeploymentUpdates, selectedDeployment } = useDeployments()
const notificationStore = useNotificationStore()

const isLoading = ref(false)
const menu = ref<InstanceType<typeof Menu> | null>(null)
const editDialogVisible = ref(false)

const deployment = computed(() => selectedDeployment.value)
const isActive = computed(() => deployment.value?.status === 'active')
const isStopped = computed(() => deployment.value?.status === 'stopped')
const isSuspended = computed(() => deployment.value?.status === 'suspended')

const formattedCreated = computed(() =>
  deployment.value?.created ? new Date(deployment.value.created).toLocaleString() : '—',
)

const imageLabel = computed(() => {
  const name = deployment.value?.service?.name ?? '—'
  const version = deployment.value?.serviceVersion
  return version ? `${name} ${version}` : name
})

const planLabel = computed(() => deployment.value?.serviceplan?.label ?? '—')

const customDomain = computed(() => deployment.value?.domainNames?.[0] ?? '')

const prefixedDomain = computed(() =>
  deployment.value?.slug ? `${deployment.value.slug}.xayma.sh` : '—',
)

const logLevels: LogLevel[] = ['INFO', 'INFO', 'INFO', 'SUCCESS', 'INFO', 'DEBUG', 'INFO', 'INFO']

const consoleLines = computed(() =>
  logLevels.map((level, idx) => ({
    level,
    text: t(`deployments.detail.console.lines.${idx + 1}`),
  })),
)

const manageMenuItems = computed(() => [
  {
    label: t('deployments.detail.actions.edit_instance'),
    icon: 'pi pi-pencil',
    command: () => openEditDialog(),
  },
  {
    label: t('deployments.detail.actions.restart'),
    icon: 'pi pi-replay',
    visible: isActive.value,
    command: () => restartDeployment(),
  },
  {
    label: t('deployments.detail.actions.delete'),
    icon: 'pi pi-trash',
    class: 'text-error',
    command: () => confirmDelete(),
  },
])

function levelClass(level: LogLevel): string {
  if (level === 'INFO') return 'text-blue-400'
  if (level === 'SUCCESS') return 'text-tertiary-container'
  return 'text-slate-400'
}

function toggleManageMenu(event: Event) {
  menu.value?.toggle(event)
}

function goBack() {
  router.push('/deployments')
}

async function stopDeployment() {
  if (!deployment.value) return
  isLoading.value = true
  try {
    await performDeploymentAction(deployment.value.id, 'stop')
  } finally {
    isLoading.value = false
  }
}

async function restartDeployment() {
  if (!deployment.value) return
  isLoading.value = true
  try {
    await performDeploymentAction(deployment.value.id, 'restart')
  } finally {
    isLoading.value = false
  }
}

async function startDeployment() {
  if (!deployment.value) return
  isLoading.value = true
  try {
    await performDeploymentAction(deployment.value.id, 'start')
  } finally {
    isLoading.value = false
  }
}

function confirmDelete() {
  if (!deployment.value) return
  confirm.require({
    message: t('common.confirm_delete'),
    header: t('common.delete'),
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteDeployment(),
  })
}

function notifyComingSoon() {
  notificationStore.addInfo(t('common.coming_soon'))
}

function onUpgradePlan() {
  notifyComingSoon()
}

function onViewInsights() {
  notifyComingSoon()
}

function onModulesClick() {
  notifyComingSoon()
}

function openEditDialog() {
  editDialogVisible.value = true
}

function onEditInstanceSave() {
  editDialogVisible.value = false
  notifyComingSoon()
}

async function deleteDeployment() {
  if (!deployment.value) return
  isLoading.value = true
  try {
    await terminateDeployment(deployment.value.id)
    router.push('/deployments')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  const deploymentId = Number(route.params.id)
  if (!isNaN(deploymentId)) {
    isLoading.value = true
    try {
      await loadDeployment(deploymentId)
      if (deployment.value?.partner_id) {
        subscribeToDeploymentUpdates(deployment.value.partner_id)
      }
    } catch {
      notificationStore.addError(t('errors.fetch_failed'))
    } finally {
      isLoading.value = false
    }
  }
})
</script>
