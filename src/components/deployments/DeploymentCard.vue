<template>
  <Card class="deployment-card border border-outline-variant h-full flex flex-col">
    <template #header>
      <div class="flex items-center justify-between px-5 pt-5 pb-0">
        <DeploymentStatusBadge :status="deployment.status" />
        <span class="text-xs text-on-surface-variant font-mono">#{{ deployment.id }}</span>
      </div>
    </template>

    <template #content>
      <div class="space-y-4">
        <div>
          <h3 class="text-base font-semibold text-on-surface leading-tight">
            {{ deployment.label }}
          </h3>
          <p class="text-sm text-on-surface-variant mt-0.5">
            {{ deployment.service?.name }}
            <span v-if="deployment.serviceplan?.label"> · {{ deployment.serviceplan.label }}</span>
          </p>
        </div>

        <!-- Domain links shown only when active -->
        <div v-if="isActive && deployment.domainNames?.length" class="space-y-1">
          <a
            v-for="domain in deployment.domainNames"
            :key="domain"
            :href="`https://${domain}`"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <i class="pi pi-external-link text-xs shrink-0" />
            <span class="truncate">{{ domain }}</span>
          </a>
        </div>

        <!-- Monthly cost meter -->
        <div v-if="monthlyCost > 0" class="space-y-1.5">
          <div class="flex items-center justify-between text-xs text-on-surface-variant">
            <span>{{ $t('deployments.card.monthly_cost') }}</span>
            <span class="font-mono font-medium text-on-surface">
              {{ monthlyCost.toLocaleString('fr-SN') }} FCFA
            </span>
          </div>
          <ProgressBar
            v-if="creditPercent !== null"
            :value="Math.min(creditPercent, 100)"
            :show-value="false"
            class="card-progress-bar"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end pt-1">
        <SplitButton
          :label="primaryActionLabel"
          :model="menuItems"
          size="small"
          :severity="primaryActionSeverity"
          :disabled="isTransitioning"
          @click="onPrimaryAction"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import SplitButton from 'primevue/splitbutton'
import ProgressBar from 'primevue/progressbar'
import DeploymentStatusBadge from './DeploymentStatusBadge.vue'

interface DeploymentCardItem {
  id: number
  label: string
  status: string
  domainNames?: string[]
  service?: { name: string }
  serviceplan?: { label?: string; monthlyCreditConsumption?: number }
  partner?: { remainingCredits?: number }
}

const props = defineProps<{ deployment: DeploymentCardItem }>()
const emit = defineEmits<{
  stop: [id: number]
  start: [id: number]
  restart: [id: number]
  delete: [id: number]
}>()

const { t } = useI18n()
const router = useRouter()

const isActive = computed(() => props.deployment.status === 'active')
const isStopped = computed(() => props.deployment.status === 'stopped')
const isTransitioning = computed(() =>
  ['deploying', 'pending_deployment', 'pending_deletion'].includes(props.deployment.status)
)

const monthlyCost = computed(
  () => props.deployment.serviceplan?.monthlyCreditConsumption ?? 0
)

const creditPercent = computed(() => {
  const balance = props.deployment.partner?.remainingCredits
  if (!balance || !monthlyCost.value) return null
  return Math.round((monthlyCost.value / balance) * 100)
})

const primaryActionLabel = computed(() => {
  if (isActive.value) return t('deployments.actions.stop')
  if (isStopped.value) return t('deployments.actions.start')
  return t('common.view')
})

const primaryActionSeverity = computed(() => {
  if (isActive.value) return 'warn'
  if (isStopped.value) return 'success'
  return 'secondary'
})

const menuItems = computed(() => [
  {
    label: t('deployments.actions.view_details'),
    icon: 'pi pi-eye',
    command: () => router.push(`/deployments/${props.deployment.id}`),
  },
  ...(isActive.value
    ? [
        {
          label: t('deployments.actions.restart'),
          icon: 'pi pi-refresh',
          command: () => emit('restart', props.deployment.id),
        },
      ]
    : []),
  { separator: true },
  {
    label: t('common.delete'),
    icon: 'pi pi-trash',
    command: () => emit('delete', props.deployment.id),
  },
])

function onPrimaryAction() {
  if (isActive.value) emit('stop', props.deployment.id)
  else if (isStopped.value) emit('start', props.deployment.id)
  else router.push(`/deployments/${props.deployment.id}`)
}
</script>

<style scoped>
:deep(.card-progress-bar.p-progressbar) {
  height: 6px;
  border-radius: 3px;
  background: var(--p-surface-200);
}
:deep(.card-progress-bar .p-progressbar-value) {
  background: var(--p-primary-color);
  border-radius: 3px;
}
</style>
