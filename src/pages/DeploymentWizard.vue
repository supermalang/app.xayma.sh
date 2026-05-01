<template>
  <div class="space-y-12">
    <!-- Page header -->
    <header>
      <h1 class="text-4xl font-extrabold tracking-tight text-primary mb-2">
        {{ $t('deployments.create') }}
      </h1>
      <p class="text-on-surface-variant font-medium">
        {{ $t('deployments.wizard.page_subtitle') }}
      </p>
    </header>

    <!-- Stepper (visual progress only) -->
    <nav
      class="flex flex-wrap items-center gap-x-4 gap-y-3"
      :aria-label="$t('deployments.create')"
    >
      <div
        v-for="(step, idx) in stepperItems"
        :key="step.key"
        class="flex items-center gap-3"
      >
        <div
          class="flex items-center gap-3"
          :class="
            idx < activeStep
              ? 'text-tertiary'
              : idx === activeStep
                ? 'text-primary'
                : 'text-on-surface-variant'
          "
        >
          <div
            class="w-8 h-8 rounded flex items-center justify-center font-bold text-sm transition-colors"
            :class="
              idx < activeStep
                ? 'bg-tertiary-container text-on-tertiary-container'
                : idx === activeStep
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-highest text-on-surface'
            "
          >
            <i v-if="idx < activeStep" class="pi pi-check text-xs" />
            <span v-else>{{ idx + 1 }}</span>
          </div>
          <span
            class="text-sm font-bold uppercase tracking-wider"
            :class="idx <= activeStep ? '' : 'opacity-60'"
          >
            {{ step.label }}
          </span>
        </div>
        <div
          v-if="idx < stepperItems.length - 1"
          class="h-0.5 w-12 transition-colors"
          :class="idx < activeStep ? 'bg-tertiary-container' : 'bg-surface-container-highest'"
        />
      </div>
    </nav>

    <!-- 01. Service Selection -->
    <section>
      <header class="mb-8">
        <h2 class="text-xl font-bold tracking-tight text-on-surface uppercase mb-1">
          {{ $t('deployments.wizard.service_section_title') }}
        </h2>
        <p class="text-on-surface-variant text-sm">
          {{ $t('deployments.wizard.service_section_subtitle') }}
        </p>
      </header>

      <div v-if="isLoadingServices" class="flex justify-center py-12">
        <ProgressSpinner style="width: 40px; height: 40px" stroke-width="4" />
      </div>

      <Message
        v-else-if="services.length === 0"
        severity="info"
        :closable="false"
      >
        {{ $t('services.empty') }}
      </Message>

      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <button
          v-for="service in services"
          :key="service.id"
          type="button"
          class="group relative p-6 rounded-lg text-start cursor-pointer transition-all border-b-4 border-transparent focus:outline-none focus-visible:border-primary"
          :class="
            form.serviceId === service.id
              ? 'bg-surface-container-lowest border-primary'
              : 'bg-surface-container-low hover:bg-surface-container-lowest'
          "
          @click="selectService(service)"
        >
          <div class="flex justify-center mb-6">
            <div
              class="service-logo w-24 h-24 rounded-2xl flex items-center justify-center transition-colors overflow-hidden"
              :class="
                form.serviceId === service.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant'
              "
            >
              <img
                v-if="service.logo_url && !logoLoadFailed.has(service.id)"
                :src="service.logo_url"
                :alt="service.name"
                class="w-full h-full object-contain p-3"
                @error="logoLoadFailed.add(service.id)"
              />
              <i v-else :class="serviceIcon(service)" class="text-4xl" aria-hidden="true" />
            </div>
          </div>
          <h3 class="text-lg font-bold mb-2 text-center text-on-surface">
            {{ service.name }}
          </h3>
          <p class="text-sm text-on-surface-variant leading-relaxed text-center">
            {{ service.description }}
          </p>
          <div class="mt-8 flex items-center justify-between">
            <span
              class="text-[10px] font-bold uppercase tracking-widest"
              :class="form.serviceId === service.id ? 'text-primary' : 'text-on-surface-variant opacity-60'"
            >
              {{ form.serviceId === service.id ? $t('deployments.wizard.selected') : $t('deployments.wizard.select') }}
            </span>
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              :class="form.serviceId === service.id ? 'border-primary' : 'border-outline-variant'"
            >
              <div
                v-if="form.serviceId === service.id"
                class="w-2.5 h-2.5 bg-primary rounded-full"
              />
            </div>
          </div>
        </button>
      </div>
    </section>

    <!-- 02. Service Plan -->
    <section>
      <header class="mb-8">
        <h2 class="text-xl font-bold tracking-tight text-on-surface uppercase mb-1">
          {{ $t('deployments.wizard.plan_section_title') }}
        </h2>
        <p class="text-on-surface-variant text-sm">
          {{ $t('deployments.wizard.plan_section_subtitle') }}
        </p>
      </header>

      <div v-if="!form.serviceId" class="p-6 rounded-lg bg-surface-container-low text-on-surface-variant text-sm">
        {{ $t('deployments.wizard.service_not_selected') }}
      </div>

      <div v-else-if="isLoadingPlans" class="flex justify-center py-12">
        <ProgressSpinner style="width: 40px; height: 40px" stroke-width="4" />
      </div>

      <Message
        v-else-if="plans.length === 0"
        severity="warn"
        :closable="false"
      >
        {{ $t('services.plans.empty') }}
      </Message>

      <div v-else class="space-y-4">
        <button
          v-for="(plan, idx) in plans"
          :key="plan.slug"
          type="button"
          class="w-full flex items-center justify-between p-6 rounded-lg cursor-pointer text-start transition-colors border-s-4"
          :class="
            form.planSlug === plan.slug
              ? 'bg-surface-container-lowest border-primary'
              : 'bg-surface-container-low border-transparent hover:bg-surface-container-lowest'
          "
          @click="selectPlan(plan)"
        >
          <div class="flex items-center gap-6">
            <div
              class="w-12 h-12 flex items-center justify-center rounded-full transition-colors"
              :class="
                form.planSlug === plan.slug
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant'
              "
            >
              <i :class="planIcon(idx)" />
            </div>
            <div>
              <h4 class="font-bold text-lg text-on-surface">{{ plan.label }}</h4>
              <p class="text-xs text-on-surface-variant uppercase tracking-wider">
                {{ plan.description }}
              </p>
            </div>
          </div>
          <div class="text-end">
            <div class="font-mono font-medium text-xl text-primary">
              {{ plan.monthlyCreditConsumption.toLocaleString() }}
              <span class="text-xs text-on-surface-variant font-normal ms-1">/{{ $t('services.plans.credits_per_month') }}</span>
            </div>
            <span
              v-if="idx === 0"
              class="inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-widest text-on-tertiary-container px-2 py-0.5 bg-tertiary-container rounded-full"
            >
              <i class="pi pi-star-fill text-[8px]" />
              {{ $t('deployments.wizard.recommended') }}
            </span>
          </div>
        </button>
      </div>
    </section>

    <!-- 03. Version  +  04. Configuration -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <section class="lg:col-span-4">
        <header class="mb-8">
          <h2 class="text-xl font-bold tracking-tight text-on-surface uppercase mb-1">
            {{ $t('deployments.wizard.version_section_title') }}
          </h2>
          <p class="text-on-surface-variant text-sm">
            {{ $t('deployments.wizard.version_section_subtitle') }}
          </p>
        </header>

        <div class="space-y-3">
          <label
            v-for="version in versions"
            :key="version.value"
            class="relative flex items-center p-4 bg-surface-container-lowest rounded-lg cursor-pointer transition-colors hover:bg-surface-container-low"
          >
            <RadioButton
              v-model="form.serviceVersion"
              :input-id="`version-${version.value}`"
              :value="version.value"
              name="serviceVersion"
            />
            <span class="ms-4 font-bold text-on-surface">{{ version.label }}</span>
            <span
              v-if="version.latest"
              class="ms-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-tertiary-container text-on-tertiary-container px-1.5 py-0.5 rounded"
            >
              <i class="pi pi-bolt text-[8px]" />
              {{ $t('deployments.wizard.latest') }}
            </span>
          </label>
        </div>
      </section>

      <section class="lg:col-span-8">
        <header class="mb-8">
          <h2 class="text-xl font-bold tracking-tight text-on-surface uppercase mb-1">
            {{ $t('deployments.wizard.config_section_title') }}
          </h2>
          <p class="text-on-surface-variant text-sm">
            {{ $t('deployments.wizard.config_section_subtitle') }}
          </p>
        </header>

        <div class="space-y-6">
          <div class="space-y-2">
            <label
              for="deployment-name"
              class="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              {{ $t('deployments.wizard.field_deployment_name') }}
            </label>
            <InputText
              id="deployment-name"
              v-model="form.label"
              type="text"
              class="w-full"
              :placeholder="$t('deployments.wizard.placeholder_deployment_name')"
            />
          </div>

          <div class="space-y-2">
            <label
              for="prefixed-domain"
              class="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              {{ $t('deployments.wizard.field_prefixed_domain') }}
            </label>
            <div class="flex">
              <InputText
                id="prefixed-domain"
                v-model="form.prefixedDomain"
                type="text"
                class="flex-1 rounded-e-none"
                :placeholder="$t('deployments.wizard.placeholder_prefixed_domain')"
              />
              <span class="inline-flex items-center px-4 bg-surface-container-high rounded-e text-sm font-medium text-on-surface-variant">
                .xayma.sh
              </span>
            </div>
            <p class="text-[10px] text-on-surface-variant italic">
              {{ $t('deployments.wizard.field_prefixed_domain_hint') }}
            </p>
          </div>

          <div class="space-y-2">
            <label
              for="custom-domain"
              class="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              {{ $t('deployments.wizard.field_custom_domain') }}
            </label>
            <InputText
              id="custom-domain"
              v-model="form.customDomain"
              type="text"
              class="w-full"
              :placeholder="$t('deployments.wizard.placeholder_custom_domain')"
            />
          </div>

          <div class="space-y-2">
            <label
              for="description"
              class="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              {{ $t('deployments.wizard.field_description') }}
              <span class="text-on-surface-variant opacity-60 ms-1">{{ $t('deployments.wizard.field_description_optional') }}</span>
            </label>
            <Textarea
              id="description"
              v-model="form.description"
              :rows="4"
              class="w-full"
              :placeholder="$t('deployments.wizard.placeholder_description')"
            />
          </div>
        </div>
      </section>
    </div>

    <!-- Validation messages -->
    <Message
      v-if="domainValidationError"
      severity="error"
      :closable="false"
    >
      {{ domainValidationError }}
    </Message>

    <Message
      v-if="form.planSlug && !hasSufficientCredits"
      severity="error"
      :closable="false"
    >
      {{ $t('deployments.errors.insufficient_credits') }}
    </Message>

    <!-- Footer actions -->
    <div class="pt-12 border-t border-outline-variant/40 flex items-center justify-between flex-wrap gap-4">
      <Button
        :label="$t('deployments.wizard.save_as_template')"
        text
        disabled
        :title="$t('deployments.wizard.save_as_template_coming_soon')"
        class="font-bold uppercase tracking-widest text-sm"
      />
      <div class="flex gap-4">
        <Button
          :label="$t('deployments.wizard.cancel')"
          text
          class="font-bold uppercase tracking-widest text-sm"
          @click="cancel"
        />
        <Button
          :label="$t('deployments.wizard.initialize_deployment')"
          icon="pi pi-rocket"
          icon-pos="right"
          class="font-bold uppercase tracking-widest text-sm"
          :disabled="!canSubmit"
          :loading="isDeploying || isDomainValidating"
          @click="submitDeployment"
        />
      </div>
    </div>

    <!-- Technical footer -->
    <div class="mt-8 p-8 bg-surface-container-low rounded-lg grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="flex items-start gap-4">
        <div class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-primary/10 text-primary">
          <i class="pi pi-globe text-sm" />
        </div>
        <div>
          <div class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
            {{ $t('deployments.wizard.footer_region') }}
          </div>
          <span class="text-sm font-semibold text-on-surface">
            {{ $t('deployments.wizard.footer_region_value') }}
          </span>
        </div>
      </div>
      <div class="flex items-start gap-4">
        <div class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-tertiary-container text-on-tertiary-container">
          <i class="pi pi-calendar text-sm" />
        </div>
        <div>
          <div class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
            {{ $t('deployments.wizard.footer_billing_cycle') }}
          </div>
          <span class="text-sm font-semibold text-on-surface font-mono">
            {{ $t('deployments.wizard.footer_billing_cycle_value', { date: billingStartDate }) }}
          </span>
        </div>
      </div>
      <div class="flex items-start gap-4">
        <div class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-secondary-container/20 text-secondary">
          <i class="pi pi-clock text-sm" />
        </div>
        <div>
          <div class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
            {{ $t('deployments.wizard.footer_estimated_setup') }}
          </div>
          <span class="text-sm font-semibold text-on-surface">
            {{ $t('deployments.wizard.footer_estimated_setup_value') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
type Service = {
  id: number
  name: string
  description: string
  status: string
  isPubliclyAvailable: boolean
  logo_url?: string | null
}

type ServicePlan = {
  slug: string
  label: string
  description: string | null
  monthlyCreditConsumption: number
  options: string[]
}

type PlanInfo = {
  slug?: string
  monthlyCreditConsumption?: number
  label?: string
}
</script>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import RadioButton from 'primevue/radiobutton'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { listServices, getServicePlansByServiceId } from '@/services/services.service'
import type { ServicePlan as ServicePlanShape } from '@/services/services.service'
import { validateDomains as validateDomainsService } from '@/services/deployments.service'
import { useDeployments } from '@/composables/useDeployments'
import { usePartnerStore } from '@/stores/partner.store'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notifications.store'

const router = useRouter()
const { t } = useI18n()
const partnerStore = usePartnerStore()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const { createDeployment } = useDeployments()

const services = ref<Service[]>([])
const logoLoadFailed = reactive(new Set<number>())
const plans = ref<ServicePlan[]>([])
const isLoadingServices = ref(false)
const isLoadingPlans = ref(false)
const isDeploying = ref(false)
const isDomainValidating = ref(false)
const domainValidationError = ref<string | null>(null)
const selectedPlan = ref<PlanInfo | null>(null)

const form = ref({
  serviceId: null as number | null,
  planSlug: null as string | null,
  serviceVersion: '17.0',
  label: '',
  prefixedDomain: '',
  customDomain: '',
  description: '',
})

const versions = [
  { value: '17.0', label: 'v17.0', latest: true },
  { value: '16.0', label: 'v16.0', latest: false },
  { value: '15.0', label: 'v15.0', latest: false },
  { value: '14.0', label: 'v14.0', latest: false },
]

const stepperItems = computed(() => [
  { key: 'service', label: t('deployments.wizard.step_label_service') },
  { key: 'plan', label: t('deployments.wizard.step_label_plan') },
  { key: 'version', label: t('deployments.wizard.step_label_version') },
  { key: 'config', label: t('deployments.wizard.step_label_config') },
])

const activeStep = computed(() => {
  if (!form.value.serviceId) return 0
  if (!form.value.planSlug) return 1
  if (!form.value.serviceVersion) return 2
  if (form.value.label.trim() && form.value.prefixedDomain.trim()) return 3
  return 2
})

const hasSufficientCredits = computed(() => {
  if (!selectedPlan.value) return true
  const balance = partnerStore.selectedPartnerCredits
  const cost = selectedPlan.value.monthlyCreditConsumption ?? 0
  if (cost === 0) return true
  return balance >= cost
})

const canSubmit = computed(() => {
  return (
    !!form.value.serviceId &&
    !!form.value.planSlug &&
    !!form.value.serviceVersion &&
    form.value.label.trim().length > 0 &&
    form.value.prefixedDomain.trim().length > 0 &&
    hasSufficientCredits.value &&
    !isDeploying.value &&
    !isDomainValidating.value
  )
})

const billingStartDate = computed(() => {
  const today = new Date()
  return today.toISOString().slice(0, 10)
})

function serviceIcon(service: Service): string {
  const name = service.name.toLowerCase()
  if (name.includes('community')) return 'pi pi-server'
  if (name.includes('enterprise')) return 'pi pi-building'
  if (name.includes('custom')) return 'pi pi-cog'
  return 'pi pi-box'
}

function planIcon(idx: number): string {
  switch (idx) {
    case 0:
      return 'pi pi-bolt'
    case 1:
      return 'pi pi-briefcase'
    default:
      return 'pi pi-building'
  }
}

function defaultPrefixedDomain(): string {
  const handle = (authStore.profile?.firstname ?? '').toLowerCase().trim()
  return handle.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 32)
}

onMounted(async () => {
  await loadServices()
  if (!form.value.prefixedDomain) {
    form.value.prefixedDomain = defaultPrefixedDomain()
  }
})

async function loadServices() {
  isLoadingServices.value = true
  try {
    const result = await listServices({ isPubliclyAvailable: true, pageSize: 100 })
    services.value = result.data as unknown as Service[]
  } catch (error) {
    console.error('Error loading services:', error)
    notificationStore.addError(t('errors.fetch_failed'))
  } finally {
    isLoadingServices.value = false
  }
}

async function selectService(service: Service) {
  form.value.serviceId = service.id
  form.value.planSlug = null
  selectedPlan.value = null
  plans.value = []

  isLoadingPlans.value = true
  try {
    const result = await getServicePlansByServiceId(service.id)
    plans.value = result as unknown as ServicePlan[]
  } catch (error) {
    console.error('Error loading plans:', error)
    notificationStore.addError(t('errors.fetch_failed'))
  } finally {
    isLoadingPlans.value = false
  }
}

function selectPlan(plan: ServicePlanShape | ServicePlan) {
  form.value.planSlug = plan.slug
  selectedPlan.value = {
    slug: plan.slug,
    label: plan.label,
    monthlyCreditConsumption: plan.monthlyCreditConsumption,
  }
}

function buildDomainNames(): string[] {
  const result: string[] = []
  const prefixed = form.value.prefixedDomain.trim()
  if (prefixed) {
    result.push(`${prefixed}.xayma.sh`)
  }
  const custom = form.value.customDomain.trim()
  if (custom) {
    result.push(custom)
  }
  return result
}

async function validateDomains(domainNames: string[]): Promise<boolean> {
  if (domainNames.length === 0) {
    domainValidationError.value = t('deployments.errors.invalid_domain')
    return false
  }
  domainValidationError.value = null
  isDomainValidating.value = true
  try {
    const isValid = await validateDomainsService(domainNames)
    if (!isValid) {
      domainValidationError.value = t('deployments.errors.invalid_domain')
      return false
    }
    return true
  } catch (error) {
    console.error('Domain validation error:', error)
    domainValidationError.value = t('deployments.errors.invalid_domain')
    return false
  } finally {
    isDomainValidating.value = false
  }
}

function cancel() {
  router.push('/deployments')
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

  const domainNames = buildDomainNames()
  const domainsValid = await validateDomains(domainNames)
  if (!domainsValid) return

  isDeploying.value = true
  try {
    const result = await createDeployment(
      {
        serviceId: form.value.serviceId,
        planSlug: form.value.planSlug,
        label: form.value.label,
        domainNames,
        serviceVersion: form.value.serviceVersion,
      },
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
