<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold text-on-surface">
      {{ $t('deployments.create') }}
    </h1>

    <Card>
      <Steps
        v-model:active-step="activeStep"
        :items="steps"
      />

      <div class="mt-8">
        <!-- Step 1: Select Service -->
        <div
          v-if="activeStep === 0"
          class="space-y-4"
        >
          <h2 class="text-xl font-bold">
            {{ $t('deployments.wizard.step_1') }}
          </h2>
          <p class="text-on-surface-variant">
            {{ $t('deployments.wizard.select_service') }}
          </p>
          <!-- TODO: Implement DataView grid of service cards -->
          <Message
            severity="info"
            text="Service selection - Coming soon"
          />
        </div>

        <!-- Step 2: Choose Plan -->
        <div
          v-if="activeStep === 1"
          class="space-y-4"
        >
          <h2 class="text-xl font-bold">
            {{ $t('deployments.wizard.step_2') }}
          </h2>
          <p class="text-on-surface-variant">
            {{ $t('deployments.wizard.select_plan') }}
          </p>
          <!-- TODO: Implement SelectButton for plan selection -->
          <Message
            severity="info"
            text="Plan selection - Coming soon"
          />
        </div>

        <!-- Step 3: Configure Domain -->
        <div
          v-if="activeStep === 2"
          class="space-y-4"
        >
          <h2 class="text-xl font-bold">
            {{ $t('deployments.wizard.step_3') }}
          </h2>
          <p class="text-on-surface-variant">
            {{ $t('deployments.wizard.enter_domains') }}
          </p>

          <div>
            <label
              for="label"
              class="block text-sm font-medium mb-2"
            >{{ $t('deployments.form.label') }}</label>
            <InputText
              id="label"
              v-model="form.label"
              type="text"
              class="w-full"
            />
          </div>

          <div>
            <label
              for="domains"
              class="block text-sm font-medium mb-2"
            >{{ $t('deployments.form.domains') }}</label>
            <Chips
              id="domains"
              v-model="form.domainNames"
              separator=","
              :placeholder="$t('deployments.form.domain_placeholder')"
            />
          </div>
        </div>

        <!-- Step 4: Review & Deploy -->
        <div
          v-if="activeStep === 3"
          class="space-y-4"
        >
          <h2 class="text-xl font-bold">
            {{ $t('deployments.wizard.step_4') }}
          </h2>
          <p class="text-on-surface-variant">
            {{ $t('deployments.wizard.review_deployment') }}
          </p>

          <Message
            v-if="!hasSufficientCredits"
            severity="error"
            :text="$t('deployments.errors.insufficient_credits')"
          />

          <!-- TODO: Show summary of deployment config -->
          <Message
            severity="info"
            text="Review summary - Coming soon"
          />
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex justify-between mt-8">
        <Button
          :label="$t('common.back')"
          icon="pi pi-arrow-left"
          class="p-button-secondary"
          :disabled="activeStep === 0"
          @click="previousStep"
        />
        <div class="flex gap-2">
          <Button
            v-if="activeStep < 3"
            :label="$t('deployments.wizard.next')"
            icon="pi pi-arrow-right"
            icon-pos="right"
            :disabled="!canProceed"
            @click="nextStep"
          />
          <Button
            v-else
            :label="$t('deployments.wizard.deploy')"
            icon="pi pi-check"
            :disabled="!hasSufficientCredits || isDeploying"
            :loading="isDeploying"
            @click="submitDeployment"
          />
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Steps from 'primevue/steps'
import InputText from 'primevue/inputtext'
import Chips from 'primevue/chips'
import Message from 'primevue/message'
import { useDeployments } from '@/composables/useDeployments'
import { usePartnerStore } from '@/stores/partner.store'
import { useNotificationStore } from '@/stores/notification.store'

interface PlanInfo {
  id?: number
  monthlyCreditConsumption?: number
  label?: string
}

const router = useRouter()
const { t } = useI18n()
const partnerStore = usePartnerStore()
const notificationStore = useNotificationStore()
const { createDeployment } = useDeployments()

const activeStep = ref(0)
const form = ref({
  serviceId: null as number | null,
  servicePlanId: null as number | null,
  label: '',
  domainNames: [],
})
const isDeploying = ref(false)
const selectedPlan = ref<PlanInfo | null>(null)

const steps = [
  { label: t('deployments.wizard.step_1') },
  { label: t('deployments.wizard.step_2') },
  { label: t('deployments.wizard.step_3') },
  { label: t('deployments.wizard.step_4') },
]

const canProceed = computed(() => {
  if (activeStep.value === 0) return form.value.serviceId
  if (activeStep.value === 1) return form.value.servicePlanId
  if (activeStep.value === 2) return form.value.label && form.value.domainNames.length > 0
  return true
})

const hasSufficientCredits = computed(() => {
  if (!selectedPlan.value) return false
  const balance = partnerStore.selectedPartnerCredits
  const cost = selectedPlan.value.monthlyCreditConsumption ?? 0
  if (cost === 0) return true
  return balance >= cost
})

function previousStep() {
  if (activeStep.value > 0) {
    activeStep.value--
  }
}

function nextStep() {
  if (canProceed.value && activeStep.value < 3) {
    activeStep.value++
  }
}

async function submitDeployment() {
  const partnerId = partnerStore.selectedPartner?.id
  if (!partnerId) {
    notificationStore.addError(t('errors.fetch_failed'))
    return
  }

  if (!selectedPlan.value) {
    notificationStore.addError(t('deployments.errors.insufficient_credits'))
    return
  }

  isDeploying.value = true
  try {
    const result = await createDeployment(
      form.value,
      partnerId,
      selectedPlan.value.monthlyCreditConsumption ?? 0
    )
    if (result) {
      router.push('/deployments')
    }
  } finally {
    isDeploying.value = false
  }
}
</script>
