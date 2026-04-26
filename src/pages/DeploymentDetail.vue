<template>
  <div class="space-y-6">
    <ConfirmDialog />
    <Button
      icon="pi pi-arrow-left"
      class="p-button-text"
      @click="goBack"
    />

    <div
      v-if="deployment"
      class="space-y-6"
    >
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-on-surface">
            {{ deployment.label }}
          </h1>
          <p class="text-on-surface-variant">
            {{ deployment.service?.name }}
          </p>
        </div>
        <DeploymentStatusBadge :status="deployment.status ?? ''" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Details -->
        <Card>
          <template #title>
            {{ $t('common.details') }}
          </template>
          <div class="space-y-4">
            <div>
              <span class="text-sm font-medium text-on-surface-variant">{{ $t('deployments.form.service') }}</span>
              <p class="text-on-surface">
                {{ deployment.service?.name }}
              </p>
            </div>
            <div>
              <span class="text-sm font-medium text-on-surface-variant">{{ $t('deployments.form.plan') }}</span>
              <p class="text-on-surface">
                {{ deployment.serviceplan?.label }}
              </p>
            </div>
            <div>
              <span class="text-sm font-medium text-on-surface-variant">{{ $t('deployments.form.domains') }}</span>
              <div
                v-for="domain in deployment.domainNames"
                :key="domain"
                class="text-on-surface"
              >
                <a
                  :href="`https://${domain}`"
                  target="_blank"
                  class="text-primary hover:underline"
                >{{ domain }}</a>
              </div>
            </div>
          </div>
        </Card>

        <!-- Timeline/Status -->
        <Card>
          <template #title>
            {{ $t('common.status') }}
          </template>
          <div class="text-center py-4">
            <p class="text-on-surface-variant text-sm mb-2">
              {{ $t('deployments.table.created') }}
            </p>
            <p class="text-on-surface font-medium">
              {{ deployment.created ? new Date(deployment.created).toLocaleString() : '—' }}
            </p>
          </div>
        </Card>
      </div>

      <!-- Actions -->
      <Card v-if="isActive || isStopped || isSuspended">
        <template #title>
          {{ $t('common.actions') }}
        </template>
        <div class="flex gap-2">
          <Button
            v-if="isActive"
            :label="$t('deployments.actions.stop')"
            icon="pi pi-pause"
            class="p-button-secondary"
            :loading="isLoading"
            :disabled="isLoading"
            @click="stopDeployment"
          />
          <Button
            v-if="isActive"
            :label="$t('deployments.actions.restart')"
            icon="pi pi-replay"
            class="p-button-secondary"
            :loading="isLoading"
            :disabled="isLoading"
            @click="restartDeployment"
          />
          <Button
            v-if="isStopped || isSuspended"
            :label="$t('deployments.actions.start')"
            icon="pi pi-play"
            class="p-button-secondary"
            :loading="isLoading"
            :disabled="isLoading"
            @click="startDeployment"
          />
          <Button
            :label="$t('common.delete')"
            icon="pi pi-trash"
            class="p-button-danger"
            :loading="isLoading"
            :disabled="isLoading"
            @click="confirmDelete"
          />
        </div>
      </Card>
    </div>

    <Message
      v-else
      severity="warn"
      :text="$t('deployments.errors.not_found')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import ConfirmDialog from 'primevue/confirmdialog'
import DeploymentStatusBadge from '@/components/deployments/DeploymentStatusBadge.vue'
import { useDeployments } from '@/composables/useDeployments'
import { useNotificationStore } from '@/stores/notifications.store'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const confirm = useConfirm()
const { loadDeployment, performDeploymentAction, terminateDeployment, subscribeToDeploymentUpdates, selectedDeployment } = useDeployments()
const notificationStore = useNotificationStore()

const isLoading = ref(false)
const deployment = computed(() => selectedDeployment.value)
const isActive = computed(() => deployment.value?.status === 'active')
const isStopped = computed(() => deployment.value?.status === 'stopped')
const isSuspended = computed(() => deployment.value?.status === 'suspended')

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
    } catch (error) {
      notificationStore.addError(t('errors.fetch_failed'))
    } finally {
      isLoading.value = false
    }
  }
})
</script>
