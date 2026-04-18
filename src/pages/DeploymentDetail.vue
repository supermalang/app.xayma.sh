<template>
  <div class="space-y-6">
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
        <DeploymentStatusBadge :status="deployment.status" />
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

        <!-- Timeline/Logs -->
        <Card>
          <template #title>
            Status History
          </template>
          <!-- TODO: Implement Timeline component -->
          <Message
            severity="info"
            text="Timeline coming soon"
          />
        </Card>
      </div>

      <!-- Actions -->
      <Card v-if="isActive">
        <template #title>
          Actions
        </template>
        <div class="flex gap-2">
          <Button
            label="Stop"
            icon="pi pi-pause"
            class="p-button-secondary"
            @click="stopDeployment"
          />
          <Button
            label="Restart"
            icon="pi pi-replay"
            class="p-button-secondary"
            @click="restartDeployment"
          />
          <Button
            label="Delete"
            icon="pi pi-trash"
            class="p-button-danger"
            @click="deleteDeployment"
          />
        </div>
      </Card>
    </div>

    <Message
      v-else
      severity="warn"
      text="Deployment not found"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import DeploymentStatusBadge from '@/components/deployments/DeploymentStatusBadge.vue'

const router = useRouter()
const route = useRoute()

const deployment = ref<any>(null)
const isActive = ref(false)

function goBack() {
  router.push('/deployments')
}

function stopDeployment() {
  // TODO: Implement
  console.log('Stop deployment')
}

function restartDeployment() {
  // TODO: Implement
  console.log('Restart deployment')
}

function deleteDeployment() {
  // TODO: Implement
  console.log('Delete deployment')
}

onMounted(async () => {
  // TODO: Load deployment by ID
  const deploymentId = route.params.id
  console.log('Load deployment:', deploymentId)
})
</script>
