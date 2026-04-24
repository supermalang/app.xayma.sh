<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-3xl font-bold text-on-surface mb-2">{{ $t('settings.title') }}</h1>
      <p class="text-on-surface-variant text-sm">{{ $t('settings.description') }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Settings Card with Accordion -->
    <Card v-else class="border border-outline-variant/20">
      <template #content>
        <Accordion :value="['payments']" :multiple="true">
          <!-- Payments Tab -->
          <AccordionTab :header="$t('settings.payments_header')" value="payments">
            <div class="space-y-6">
              <!-- Payment Gateway API Key -->
              <div class="space-y-2">
                <label for="payment-gateway-key" class="block text-sm font-medium text-on-surface">
                  {{ $t('settings.payment_gateway_api_key') }}
                </label>
                <p class="text-xs text-on-surface-variant mb-2">
                  {{ $t('settings.payment_gateway_api_key_hint') }}
                </p>
                <InputText
                  id="payment-gateway-key"
                  v-model="paymentGatewayKey"
                  type="password"
                  class="w-full max-w-md"
                  @blur="saveSetting('PAYMENT_GATEWAY_API_KEY', paymentGatewayKey)"
                />
              </div>

              <!-- Wave Merchant ID -->
              <div class="space-y-2">
                <label for="wave-merchant-id" class="block text-sm font-medium text-on-surface">
                  {{ $t('settings.wave_merchant_id') }}
                </label>
                <InputText
                  id="wave-merchant-id"
                  v-model="waveMerchantId"
                  class="w-full max-w-md"
                  @blur="saveSetting('WAVE_MERCHANT_ID', waveMerchantId)"
                />
              </div>

              <!-- Orange Merchant ID -->
              <div class="space-y-2">
                <label for="orange-merchant-id" class="block text-sm font-medium text-on-surface">
                  {{ $t('settings.orange_merchant_id') }}
                </label>
                <InputText
                  id="orange-merchant-id"
                  v-model="orangeMerchantId"
                  class="w-full max-w-md"
                  @blur="saveSetting('ORANGE_MERCHANT_ID', orangeMerchantId)"
                />
              </div>
            </div>
          </AccordionTab>

          <!-- Notifications Tab -->
          <AccordionTab :header="$t('settings.notifications_header')" value="notifications">
            <div class="space-y-6">
              <!-- Credit Warning Threshold -->
              <div class="space-y-2">
                <label for="credit-warning-threshold" class="block text-sm font-medium text-on-surface">
                  {{ $t('settings.credit_warning_threshold') }}
                </label>
                <p class="text-xs text-on-surface-variant mb-2">
                  {{ $t('settings.credit_warning_threshold_hint') }}
                </p>
                <div class="flex items-center gap-2 max-w-md">
                  <InputNumber
                    id="credit-warning-threshold"
                    v-model="creditWarningThreshold"
                    :min="1"
                    :max="100"
                    input-class="w-full"
                    @blur="saveSetting('CREDIT_WARNING_THRESHOLD', String(creditWarningThreshold))"
                  />
                  <span class="text-sm text-on-surface-variant">%</span>
                </div>
              </div>

              <!-- Enable Email Notifications -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-on-surface">
                  {{ $t('settings.enable_email_notifications') }}
                </label>
                <ToggleButton
                  v-model="enableEmailNotifications"
                  on-label="Enabled"
                  off-label="Disabled"
                  @change="saveSetting('ENABLE_EMAIL_NOTIFICATIONS', String(enableEmailNotifications))"
                />
              </div>

              <!-- Enable SMS Notifications -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-on-surface">
                  {{ $t('settings.enable_sms_notifications') }}
                </label>
                <ToggleButton
                  v-model="enableSmsNotifications"
                  on-label="Enabled"
                  off-label="Disabled"
                  @change="saveSetting('ENABLE_SMS_NOTIFICATIONS', String(enableSmsNotifications))"
                />
              </div>
            </div>
          </AccordionTab>

          <!-- Limits Tab -->
          <AccordionTab :header="$t('settings.limits_header')" value="limits">
            <div class="space-y-6">
              <!-- Max Deployments per Partner -->
              <div class="space-y-2">
                <label for="max-deployments" class="block text-sm font-medium text-on-surface">
                  {{ $t('settings.max_deployments_per_partner') }}
                </label>
                <InputNumber
                  id="max-deployments"
                  v-model="maxDeploymentsPerPartner"
                  :min="1"
                  input-class="w-full max-w-md"
                  @blur="saveSetting('MAX_DEPLOYMENTS_PER_PARTNER', String(maxDeploymentsPerPartner))"
                />
              </div>

              <!-- Max Users per Partner -->
              <div class="space-y-2">
                <label for="max-users" class="block text-sm font-medium text-on-surface">
                  {{ $t('settings.max_users_per_partner') }}
                </label>
                <InputNumber
                  id="max-users"
                  v-model="maxUsersPerPartner"
                  :min="1"
                  input-class="w-full max-w-md"
                  @blur="saveSetting('MAX_USERS_PER_PARTNER', String(maxUsersPerPartner))"
                />
              </div>
            </div>
          </AccordionTab>

          <!-- Infrastructure Tab -->
          <AccordionTab :header="$t('settings.infrastructure_header')" value="infrastructure">
            <div class="space-y-6">
              <!-- Deployment Engine URL -->
              <div class="space-y-2">
                <label for="deployment-engine-url" class="block text-sm font-medium text-on-surface">
                  {{ $t('settings.deployment_engine_url') }}
                </label>
                <p class="text-xs text-on-surface-variant mb-2">
                  {{ $t('settings.deployment_engine_url_hint') }}
                </p>
                <InputText
                  id="deployment-engine-url"
                  v-model="deploymentEngineUrl"
                  type="url"
                  class="w-full max-w-lg font-mono text-xs"
                  @blur="saveSetting('DEPLOYMENT_ENGINE_URL', deploymentEngineUrl)"
                />
              </div>

              <!-- Workflow Engine URL -->
              <div class="space-y-2">
                <label for="workflow-engine-url" class="block text-sm font-medium text-on-surface">
                  {{ $t('settings.workflow_engine_url') }}
                </label>
                <InputText
                  id="workflow-engine-url"
                  v-model="workflowEngineUrl"
                  type="url"
                  class="w-full max-w-lg font-mono text-xs"
                  @blur="saveSetting('WORKFLOW_ENGINE_URL', workflowEngineUrl)"
                />
              </div>

              <!-- Kafka Brokers -->
              <div class="space-y-2">
                <label for="kafka-brokers" class="block text-sm font-medium text-on-surface">
                  {{ $t('settings.kafka_brokers') }}
                </label>
                <p class="text-xs text-on-surface-variant mb-2">
                  {{ $t('settings.kafka_brokers_hint') }}
                </p>
                <InputText
                  id="kafka-brokers"
                  v-model="kafkaBrokers"
                  :placeholder="'broker1:9092,broker2:9092'"
                  class="w-full max-w-lg font-mono text-xs"
                  @blur="saveSetting('KAFKA_BROKERS', kafkaBrokers)"
                />
              </div>
            </div>
          </AccordionTab>
        </Accordion>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import ToggleButton from 'primevue/togglebutton'
import ProgressSpinner from 'primevue/progressspinner'
import { useAuth } from '@/composables/useAuth'
import { useSettings } from '@/composables/useSettings'

const router = useRouter()
const { isAdmin } = useAuth()
const { settings, loading, loadSettings, updateSetting } = useSettings()

// Form state - Payments
const paymentGatewayKey = ref('')
const waveMerchantId = ref('')
const orangeMerchantId = ref('')

// Form state - Notifications
const creditWarningThreshold = ref(20)
const enableEmailNotifications = ref(false)
const enableSmsNotifications = ref(false)

// Form state - Limits
const maxDeploymentsPerPartner = ref(10)
const maxUsersPerPartner = ref(5)

// Form state - Infrastructure
const deploymentEngineUrl = ref('')
const workflowEngineUrl = ref('')
const kafkaBrokers = ref('')

async function saveSetting(key: string, value: string): Promise<void> {
  await updateSetting(key, value)
}

function populateFormFromSettings(): void {
  paymentGatewayKey.value = settings.value['PAYMENT_GATEWAY_API_KEY'] || ''
  waveMerchantId.value = settings.value['WAVE_MERCHANT_ID'] || ''
  orangeMerchantId.value = settings.value['ORANGE_MERCHANT_ID'] || ''

  creditWarningThreshold.value = parseInt(settings.value['CREDIT_WARNING_THRESHOLD'] || '20', 10)
  enableEmailNotifications.value = settings.value['ENABLE_EMAIL_NOTIFICATIONS'] === 'true'
  enableSmsNotifications.value = settings.value['ENABLE_SMS_NOTIFICATIONS'] === 'true'

  maxDeploymentsPerPartner.value = parseInt(settings.value['MAX_DEPLOYMENTS_PER_PARTNER'] || '10', 10)
  maxUsersPerPartner.value = parseInt(settings.value['MAX_USERS_PER_PARTNER'] || '5', 10)

  deploymentEngineUrl.value = settings.value['DEPLOYMENT_ENGINE_URL'] || ''
  workflowEngineUrl.value = settings.value['WORKFLOW_ENGINE_URL'] || ''
  kafkaBrokers.value = settings.value['KAFKA_BROKERS'] || ''
}

onMounted(async () => {
  // Admin-only guard
  if (!isAdmin.value) {
    router.push('/dashboard')
    return
  }

  await loadSettings()
  populateFormFromSettings()
})
</script>

<style scoped>
:deep(.p-accordion .p-accordion-header-link) {
  background-color: var(--surface-container-high);
}

:deep(.p-accordion .p-accordion-header-link:hover) {
  background-color: var(--surface-container);
}

:deep(.p-accordion .p-accordioncontent) {
  padding: 1.5rem;
}
</style>
