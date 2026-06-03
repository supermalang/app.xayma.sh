<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :modal="true"
    :closable="!loading"
    :draggable="false"
    :style="{ width: '420px' }"
    :header="t('vouchers.redeem.title')"
  >
    <div class="space-y-4">
      <p class="text-sm text-on-surface-variant">{{ t('vouchers.redeem.description') }}</p>

      <div>
        <label for="voucher-code" class="block text-sm font-medium mb-2">
          {{ t('vouchers.redeem.code_label') }}
        </label>
        <InputText
          id="voucher-code"
          v-model="code"
          class="w-full font-mono"
          placeholder="XAYMA-XXXX-XXXX"
          :disabled="loading"
          autocomplete="off"
          @keyup.enter="submit"
        />
      </div>

      <Message v-if="errorKey" severity="error" :closable="false">
        {{ t(errorKey) }}
      </Message>
    </div>

    <template #footer>
      <Button
        :label="t('common.cancel')"
        severity="secondary"
        :disabled="loading"
        @click="$emit('update:visible', false)"
      />
      <Button
        :label="t('vouchers.redeem.submit')"
        :loading="loading"
        :disabled="!code.trim()"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { redeemVoucher, WorkflowEngineError } from '@/services/workflow-engine'

const props = defineProps<{ visible: boolean; partnerId: number }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void; (e: 'redeemed'): void }>()

const { t } = useI18n()
const toast = useToast()

const code = ref('')
const loading = ref(false)
const errorKey = ref<string | null>(null)

watch(
  () => props.visible,
  (v) => {
    if (v) {
      code.value = ''
      errorKey.value = null
    }
  },
)

const KNOWN_ERROR_KEYS = new Set([
  'vouchers.errors.not_found',
  'vouchers.errors.inactive',
  'vouchers.errors.expired',
  'vouchers.errors.fully_redeemed',
  'vouchers.errors.wrong_type',
  'vouchers.errors.already_redeemed',
  'vouchers.errors.partner_not_found',
])

async function submit() {
  const trimmed = code.value.trim()
  if (!trimmed) return
  loading.value = true
  errorKey.value = null
  try {
    await redeemVoucher({ voucherCode: trimmed, partnerId: String(props.partnerId) })
    toast.add({
      severity: 'success',
      summary: t('vouchers.redeem.success'),
      life: 3000,
    })
    emit('redeemed')
    emit('update:visible', false)
  } catch (err) {
    if (err instanceof WorkflowEngineError && typeof err.originalError === 'string') {
      errorKey.value = KNOWN_ERROR_KEYS.has(err.originalError)
        ? err.originalError
        : 'vouchers.errors.generic'
    } else {
      errorKey.value = 'vouchers.errors.generic'
    }
  } finally {
    loading.value = false
  }
}
</script>
