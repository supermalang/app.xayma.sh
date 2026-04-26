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

          <div v-if="isLoadingServices" class="flex justify-center py-8">
            <ProgressSpinner style="width: 40px; height: 40px" stroke-width="4" />
          </div>

          <div v-else-if="services.length === 0" class="py-8">
            <Message
              severity="info"
              :text="$t('services.empty')"
            />
          </div>

          <div
            v-else
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div
              v-for="service in services"
              :key="service.id"
              class="p-4 border-2 rounded-lg cursor-pointer transition-all"
              :class="
                form.serviceId === service.id
                  ? 'border-primary bg-primary/10'
                  : 'border-surface-border bg-surface-card hover:border-primary/50'
              "
              @click="selectService(service)"
            >
              <h3 class="font-semibold text-on-surface">{{ service.name }}</h3>
              <p class="text-sm text-on-surface-variant mt-2">{{ service.description }}</p>
              <div class="mt-3">
                <span
                  class="inline-block px-2 py-1 text-xs rounded"
                  :class="
                    service.status === 'active'
                      ? 'bg-success/20 text-success'
                      : 'bg-surface-variant/20 text-on-surface-variant'
                  "
                >
                  {{ $t(`services.status.${service.status}`) }}
                </span>
              </div>
            </div>
          </div>
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

          <div v-if="isLoadingPlans" class="flex justify-center py-8">
            <ProgressSpinner style="width: 40px; height: 40px" stroke-width="4" />
          </div>

          <div v-else-if="plans.length === 0" class="py-8">
            <Message
              severity="warn"
              :text="$t('services.plans.empty')"
            />
          </div>

          <div
            v-else
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div
              v-for="plan in plans"
              :key="plan.id"
              class="p-4 border-2 rounded-lg cursor-pointer transition-all"
              :class="
                form.servicePlanId === plan.id
                  ? 'border-primary bg-primary/10'
                  : 'border-surface-border bg-surface-card hover:border-primary/50'
              "
              @click="selectPlan(plan)"
            >
              <h3 class="font-semibold text-on-surface">{{ plan.label }}</h3>
              <p class="text-sm text-on-surface-variant mt-2">{{ plan.description }}</p>
              <p class="mt-3 text-lg font-bold text-primary">
                {{ plan.monthlyCreditConsumption }} {{ $t('services.plans.credits_per_month') }}
              </p>
            </div>
          </div>
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

          <div v-if="isDomainValidating" class="flex items-center gap-2 text-sm text-on-surface-variant">
            <ProgressSpinner style="width: 20px; height: 20px" stroke-width="4" />
            {{ $t('deployments.wizard.domain_validating') }}
          </div>

          <Message
            v-if="domainValidationError"
            severity="error"
            :text="domainValidationError"
          />
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

          <Card class="bg-surface-raised">
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-sm text-on-surface-variant">{{ $t('deployments.form.service') }}</p>
                  <p class="font-semibold text-on-surface">{{ selectedServiceName }}</p>
                </div>
                <div>
                  <p class="text-sm text-on-surface-variant">{{ $t('deployments.form.plan') }}</p>
                  <p class="font-semibold text-on-surface">{{ selectedPlan?.label }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-sm text-on-surface-variant">{{ $t('deployments.form.label') }}</p>
                  <p class="font-semibold text-on-surface">{{ form.label }}</p>
                </div>
                <div>
                  <p class="text-sm text-on-surface-variant">{{ $t('services.plans.credits_per_month') }}</p>
                  <p class="text-lg font-bold text-primary">
                    {{ selectedPlan?.monthlyCreditConsumption }}
                  </p>
                </div>
              </div>

              <div>
                <p class="text-sm text-on-surface-variant mb-2">{{ $t('deployments.form.domains') }}</p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="(domain, idx) in form.domainNames"
                    :key="idx"
                    class="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm"
                  >
                    {{ domain }}
                  </span>
                </div>
              </div>

              <div class="border-t border-surface-border pt-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-on-surface-variant">{{ $t('credits.balance') }}</p>
                    <p class="text-lg font-bold" :class="hasSufficientCredits ? 'text-success' : 'text-error'">
                      {{ partnerStore.selectedPartnerCredits }} FCFA
                    </p>
                  </div>
                  <div
                    v-if="!hasSufficientCredits"
                    class="text-center"
                  >
                    <p class="text-sm text-error font-semibold">
                      {{ $t('deployments.errors.insufficient_credits') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Message
            v-if="!hasSufficientCredits"
            severity="error"
            :text="$t('deployments.errors.insufficient_credits')"
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
            :disabled="!canProceed || isDomainValidating"
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

<script lang="ts">
type Service = {
  id: number
  name: string
  description: string
  status: string
  isPubliclyAvailable: boolean
}

type ServicePlan = {
  id: number
  label: string
  description: string
  monthlyCreditConsumption: number
  service_id: number
}

type PlanInfo = {
  id?: number
  monthlyCreditConsumption?: number
  label?: string
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Steps from 'primevue/steps'
import InputText from 'primevue/inputtext'
import Chips from 'primevue/chips'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { listServices, getServicePlansByServiceId } from '@/services/services.service'
import { validateDomains as validateDomainsService } from '@/services/deployments.service'
import { useDeployments } from '@/composables/useDeployments'
import { usePartnerStore } from '@/stores/partner.store'
import { useNotificationStore } from '@/stores/notifications.store'

const router = useRouter()
const { t } = useI18n()
const partnerStore = usePartnerStore()
const notificationStore = useNotificationStore()
const { createDeployment } = useDeployments()

const activeStep = ref(0)
const services = ref<Service[]>([])
const plans = ref<ServicePlan[]>([])
const isLoadingServices = ref(false)
const isLoadingPlans = ref(false)
const isDeploying = ref(false)
const isDomainValidating = ref(false)
const domainValidationError = ref<string | null>(null)
const selectedPlan = ref<PlanInfo | null>(null)

const form = ref({
  serviceId: null as number | null,
  servicePlanId: null as number | null,
  label: '',
  domainNames: [] as string[],
})

const steps = [
  { label: t('deployments.wizard.step_1') },
  { label: t('deployments.wizard.step_2') },
  { label: t('deployments.wizard.step_3') },
  { label: t('deployments.wizard.step_4') },
]

const selectedServiceName = computed(() => {
  const service = services.value.find((s) => s.id === form.value.serviceId)
  return service?.name || ''
})

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

onMounted(async () => {
  await loadServices()
})

async function loadServices() {
  isLoadingServices.value = true
  try {
    const result = await listServices({ isPubliclyAvailable: true, pageSize: 100 })
    services.value = result.data
  } catch (error) {
    console.error('Error loading services:', error)
    notificationStore.addError(t('errors.fetch_failed'))
  } finally {
    isLoadingServices.value = false
  }
}

async function selectService(service: Service) {
  form.value.serviceId = service.id
  form.value.servicePlanId = null
  selectedPlan.value = null
  plans.value = []

  isLoadingPlans.value = true
  try {
    const result = await getServicePlansByServiceId(service.id)
    plans.value = result
  } catch (error) {
    console.error('Error loading plans:', error)
    notificationStore.addError(t('errors.fetch_failed'))
  } finally {
    isLoadingPlans.value = false
  }

  // Auto-advance to next step after selection
  activeStep.value = 1
}

function selectPlan(plan: ServicePlan) {
  form.value.servicePlanId = plan.id
  selectedPlan.value = {
    id: plan.id,
    label: plan.label,
    monthlyCreditConsumption: plan.monthlyCreditConsumption,
  }

  // Auto-advance to next step after selection
  activeStep.value = 2
}

function previousStep() {
  if (activeStep.value > 0) {
    activeStep.value--
  }
}

async function nextStep() {
  // Step 3 requires domain validation
  if (activeStep.value === 2) {
    await validateDomains()
    if (domainValidationError.value) {
      return
    }
  }

  if (canProceed.value && activeStep.value < 3) {
    activeStep.value++
  }
}

async function validateDomains() {
  if (!form.value.domainNames || form.value.domainNames.length === 0) {
    domainValidationError.value = t('deployments.errors.invalid_domain')
    return
  }

  domainValidationError.value = null
  isDomainValidating.value = true

  try {
    const isValid = await validateDomainsService(form.value.domainNames)
    domainValidationError.value = isValid ? null : t('deployments.errors.invalid_domain')
  } catch (error) {
    console.error('Domain validation error:', error)
    domainValidationError.value = t('deployments.errors.invalid_domain')
  } finally {
    isDomainValidating.value = false
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
