<template>
  <div class="-mt-8 -mx-8">
    <!-- Editorial header: left primary border, generous gutter -->
    <div class="px-12 pt-12 pb-8 max-w-screen-2xl mx-auto w-full">
      <div class="border-l-4 border-primary ps-8">
        <h1 class="text-4xl font-bold tracking-tight text-on-surface">
          {{ isEdit ? $t('services.edit_page.title') : $t('services.create_page.title') }}
        </h1>
        <p class="text-on-surface-variant max-w-2xl font-medium mt-2">
          {{ isEdit ? $t('services.edit_page.subtitle') : $t('services.create_page.subtitle') }}
        </p>
      </div>
    </div>

    <div v-if="loading" class="px-12 pb-16 max-w-screen-2xl mx-auto w-full space-y-16" data-test="service-form-loading">
      <div class="grid grid-cols-12 gap-8">
        <div class="col-span-12 md:col-span-4 space-y-3">
          <Skeleton width="60%" height="14px" />
          <Skeleton width="90%" height="10px" />
        </div>
        <div class="col-span-12 md:col-span-8 space-y-4">
          <Skeleton height="44px" />
          <Skeleton height="44px" />
          <Skeleton height="80px" />
        </div>
      </div>
      <div class="grid grid-cols-12 gap-8">
        <div class="col-span-12 md:col-span-4 space-y-3">
          <Skeleton width="60%" height="14px" />
          <Skeleton width="90%" height="10px" />
        </div>
        <div class="col-span-12 md:col-span-8">
          <Skeleton height="220px" />
        </div>
      </div>
    </div>

    <Message
      v-else-if="loadError"
      severity="error"
      :closable="false"
      class="mx-12 max-w-screen-2xl"
      data-test="service-form-error"
    >
      {{ loadError }}
    </Message>

    <form
      v-else
      class="px-12 pb-16 max-w-screen-2xl mx-auto w-full space-y-16"
      @submit.prevent="handleSave"
    >
      <!-- ============== 01. Basic Info ============== -->
      <section class="grid grid-cols-12 gap-8">
        <div class="col-span-12 md:col-span-4">
          <h3 class="text-sm font-bold uppercase tracking-widest text-primary mb-2">
            {{ $t('services.sections.basic_info.num') }} {{ $t('services.sections.basic_info.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            {{ $t('services.sections.basic_info.description') }}
          </p>
        </div>
        <div class="col-span-12 md:col-span-8 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2" data-test="service-name">
              <label class="text-[10px] font-bold uppercase tracking-wider text-outline">
                {{ $t('services.form.name') }}
              </label>
              <InputText
                v-model="form.name"
                :placeholder="$t('services.form.name_placeholder')"
                class="w-full !border-0 !bg-surface-container-low !p-3 !text-sm font-medium"
              />
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase tracking-wider text-outline">
                {{ $t('services.form.slug') }}
              </label>
              <div
                data-test="service-slug"
                class="font-mono text-xs bg-surface-container p-3 flex items-center justify-between gap-2"
              >
                <span class="text-on-surface-variant">{{ slug || '—' }}</span>
                <div class="flex items-center gap-2">
                  <span
                    v-if="isEdit"
                    class="material-symbols-outlined text-xs text-outline"
                    :title="$t('services.slug_locked_tooltip')"
                    data-test="service-slug-lock"
                  >
                    lock
                  </span>
                  <button
                    v-if="slug"
                    type="button"
                    class="material-symbols-outlined text-xs cursor-pointer"
                    aria-label="copy slug"
                    @click="copySlug"
                  >
                    content_copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-bold uppercase tracking-wider text-outline">
              {{ $t('services.form.description') }}
            </label>
            <Textarea
              v-model="form.description"
              :rows="3"
              :placeholder="$t('services.form.description_placeholder')"
              class="w-full !border-0 !bg-surface-container-low !p-3 !text-sm font-medium"
            />
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-bold uppercase tracking-wider text-outline">
              {{ $t('services.form.deployment_template') }}
            </label>
            <Select
              v-model="form.deployment_template"
              :options="deploymentTemplates"
              option-label="name"
              data-key="id"
              :loading="templatesLoading"
              :disabled="templatesLoading || templatesError || deploymentTemplates.length === 0"
              :placeholder="
                templatesLoading
                  ? $t('services.form.deployment_template_loading')
                  : templatesError
                    ? $t('services.form.deployment_template_error')
                    : deploymentTemplates.length === 0
                      ? $t('services.form.deployment_template_empty')
                      : $t('services.form.deployment_template_placeholder')
              "
              data-test="deployment-template"
              class="w-full"
            />
            <p v-if="templatesError" class="text-[10px] text-error">
              {{ $t('services.form.deployment_template_error') }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-bold uppercase tracking-wider text-outline">
              {{ $t('services.form.logo') }}
            </label>
            <input
              ref="logoInputEl"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              class="hidden"
              data-test="service-logo-input"
              @change="handleLogoUpload"
            />
            <div
              v-if="form.logo_url"
              data-test="service-logo-preview"
              class="flex items-center gap-4 bg-surface-container-low p-3"
            >
              <img :src="form.logo_url" alt="" class="w-12 h-12 object-contain bg-white" />
              <div class="flex-1 truncate font-mono text-[10px] text-on-surface-variant">
                {{ form.logo_url }}
              </div>
              <button
                type="button"
                class="text-[10px] font-bold uppercase tracking-widest text-on-surface hover:text-primary"
                @click="triggerLogoPicker"
              >
                {{ $t('services.form.logo_replace') }}
              </button>
              <button
                type="button"
                data-test="service-logo-remove"
                class="text-[10px] font-bold uppercase tracking-widest text-outline hover:text-error"
                @click="form.logo_url = ''"
              >
                {{ $t('services.form.logo_remove') }}
              </button>
            </div>
            <button
              v-else
              type="button"
              data-test="service-logo-upload"
              :disabled="logoUploading"
              class="w-full bg-surface-container-low border-2 border-dashed border-outline-variant/30 p-6 flex flex-col items-center justify-center gap-2 hover:border-primary-container transition-colors disabled:opacity-50"
              @click="triggerLogoPicker"
            >
              <span class="material-symbols-outlined text-outline-variant text-3xl">cloud_upload</span>
              <p class="text-[11px] font-bold text-outline-variant uppercase tracking-wider">
                {{ logoUploading ? $t('services.form.logo_uploading') : $t('services.form.logo_upload_cta') }}
              </p>
            </button>
            <p class="text-[10px] text-on-surface-variant">{{ $t('services.form.logo_hint') }}</p>
            <details class="text-[10px] text-on-surface-variant">
              <summary class="cursor-pointer">{{ $t('services.form.logo_url_or') }}</summary>
              <InputText
                v-model="form.logo_url"
                :placeholder="$t('services.form.logo_url_placeholder')"
                class="w-full !border-0 !bg-surface-container-low !p-3 !text-sm font-medium mt-2"
              />
            </details>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <ToggleSwitch v-model="form.isPubliclyAvailable" />
            <label class="text-xs font-medium text-on-surface">
              {{ $t('services.form.isPubliclyAvailable') }}
            </label>
          </div>
        </div>
      </section>

      <div class="h-px bg-outline-variant/20"></div>

      <!-- ============== 02. Service Plans ============== -->
      <section class="grid grid-cols-12 gap-8">
        <div class="col-span-12 md:col-span-4">
          <h3 class="text-sm font-bold uppercase tracking-widest text-primary mb-2">
            {{ $t('services.sections.plans.num') }} {{ $t('services.sections.plans.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            {{ $t('services.sections.plans.description') }}
          </p>
          <button
            type="button"
            data-test="add-tier"
            class="mt-6 flex items-center gap-2 text-xs font-bold text-secondary-container hover:text-secondary"
            @click="addTier"
          >
            <span class="material-symbols-outlined text-sm">add_circle</span>
            {{ $t('services.plans.add_tier') }}
          </button>
        </div>
        <div class="col-span-12 md:col-span-8">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="(plan, idx) in draftPlans"
              :key="idx"
              data-test="tier-card"
              class="bg-surface-container-lowest p-6 flex flex-col justify-between min-h-[220px]"
            >
              <div class="space-y-3">
                <div class="flex justify-between items-start gap-3">
                  <div class="flex-1" :data-test="`tier-label-${idx}`">
                    <InputText
                      v-model="plan.label"
                      :placeholder="$t('services.plans.tier_label_placeholder')"
                      class="!border-0 !bg-transparent !p-0 !text-sm !font-bold !text-on-surface w-full"
                    />
                  </div>
                  <span class="font-mono text-[10px] px-2 py-0.5 bg-surface-container-high text-primary whitespace-nowrap">
                    {{ $t('services.plans.tier_id_prefix') }}{{ idx + 1 }}
                  </span>
                </div>
                <Textarea
                  v-model="plan.optionsRaw"
                  :rows="3"
                  :placeholder="$t('services.plans.tier_options_placeholder')"
                  class="w-full !border-0 !bg-surface-container-low !p-2 !text-[11px]"
                />
              </div>
              <div class="flex justify-between items-end pt-4 border-t border-outline-variant/10">
                <div class="flex items-baseline gap-1">
                  <div :data-test="`tier-credits-${idx}`">
                    <InputNumber
                      v-model="plan.monthlyCreditConsumption"
                      :use-grouping="false"
                      :min="0"
                      input-class="!border-0 !bg-transparent !p-0 !w-24 font-mono !text-lg !font-bold !text-on-surface"
                    />
                  </div>
                  <span class="font-mono text-[10px] text-outline">{{ $t('services.plans.tier_credits') }}</span>
                </div>
                <button
                  type="button"
                  :data-test="`remove-tier-${idx}`"
                  class="text-outline hover:text-error transition-colors"
                  @click="removeTier(idx)"
                >
                  <span class="material-symbols-outlined text-lg">delete_outline</span>
                </button>
              </div>
            </div>

            <!-- Empty drop-zone-style card encouraging next tier -->
            <button
              type="button"
              class="bg-surface-container-low border-2 border-dashed border-outline-variant/30 p-6 flex flex-col items-center justify-center text-center min-h-[220px] hover:border-primary-container transition-colors"
              @click="addTier"
            >
              <span class="material-symbols-outlined text-outline-variant mb-2 text-3xl">post_add</span>
              <p class="text-[11px] font-bold text-outline-variant uppercase tracking-wider">
                {{ $t('services.plans.configure_new_tier') }}
              </p>
            </button>
          </div>
        </div>
      </section>

      <div class="h-px bg-outline-variant/20"></div>

      <!-- ============== 03. Versions ============== -->
      <section class="grid grid-cols-12 gap-8">
        <div class="col-span-12 md:col-span-4">
          <h3 class="text-sm font-bold uppercase tracking-widest text-primary mb-2">
            {{ $t('services.sections.versions.num') }} {{ $t('services.sections.versions.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            {{ $t('services.sections.versions.description') }}
          </p>
        </div>
        <div class="col-span-12 md:col-span-8">
          <InputChips
            v-model="versionList"
            data-test="service-versions"
            :placeholder="$t('services.versions_section.input_placeholder')"
            separator=","
            :add-on-blur="true"
            class="w-full"
            :pt="{
              root: '!w-full !border-0 !rounded-none !bg-surface-container-lowest !p-3',
              inputItemField: '!text-xs !font-mono !text-primary',
            }"
          />
          <p class="mt-2 text-[10px] text-on-surface-variant">
            {{ $t('services.versions_section.hint') }}
          </p>
        </div>
      </section>

      <div class="h-px bg-outline-variant/20"></div>

      <!-- ============== 04. Technical Tags ============== -->
      <section class="grid grid-cols-12 gap-8">
        <div class="col-span-12 md:col-span-4">
          <h3 class="text-sm font-bold uppercase tracking-widest text-primary mb-2">
            {{ $t('services.sections.tags.num') }} {{ $t('services.sections.tags.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            {{ $t('services.sections.tags.description') }}
          </p>
        </div>
        <div class="col-span-12 md:col-span-8">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="tag in lifecycleTags"
              :key="tag.key"
              class="p-4 bg-surface-container-low border border-transparent hover:border-primary-container transition-all"
            >
              <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-primary text-lg">{{ tag.icon }}</span>
                <span class="text-[11px] font-bold uppercase text-on-surface">
                  {{ $t(`services.tags_section.${tag.key}`) }}
                </span>
              </div>
              <InputText
                v-model="lifecycleTagValues[tag.key]"
                :data-test="`tag-command-${tag.key}`"
                :placeholder="$t(`services.tags_section.${tag.key}_placeholder`)"
                class="w-full !border-0 !rounded-none !bg-surface-container-lowest !p-2 !text-[10px] !font-mono !text-primary"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- ============== Footer ============== -->
      <div class="pt-8 flex justify-end gap-4 border-t border-outline-variant/30">
        <button
          type="button"
          class="px-8 py-3 text-sm font-bold text-on-surface hover:bg-surface-container transition-colors"
          @click="handleDiscard"
        >
          {{ $t('services.discard') }}
        </button>
        <button
          type="submit"
          data-test="save-service"
          :disabled="!canSave || saving"
          class="px-10 py-3 bg-primary-container text-on-primary font-bold text-sm tracking-widest hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ saveLabel }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import InputChips from 'primevue/inputchips'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import Skeleton from 'primevue/skeleton'
import Message from 'primevue/message'
import {
  createService,
  getService,
  readServicePlans,
  updateService,
  uploadServiceLogo,
} from '@/services/services.service'
import { useSettings } from '@/composables/useSettings'
import {
  fetchDeploymentTemplates,
  type DeploymentTemplate,
} from '@/services/workflow-engine'
import { slugify } from '@/utils/slug'

interface BasicInfoForm {
  name: string
  description: string
  logo_url: string
  isPubliclyAvailable: boolean
  deployment_template: DeploymentTemplate | null
}

interface PlanDraft {
  label: string
  description: string
  optionsRaw: string
  monthlyCreditConsumption: number
}

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const toast = useToast()

const editIdParam = Number(route.params.id)
const editId = ref<number | null>(
  Number.isInteger(editIdParam) && editIdParam > 0 ? editIdParam : null,
)
const isEdit = computed(() => editId.value !== null)

const form = reactive<BasicInfoForm>({
  name: '',
  description: '',
  logo_url: '',
  isPubliclyAvailable: false,
  deployment_template: null,
})

const draftPlans = ref<PlanDraft[]>([])
const versionList = ref<string[]>([])
const saving = ref(false)
const logoUploading = ref(false)
const logoInputEl = ref<HTMLInputElement | null>(null)

const loading = ref(isEdit.value)
const loadError = ref<string | null>(null)
const loadedSlug = ref<string>('')

const { settings, loadSettings } = useSettings()
const deploymentTemplates = ref<DeploymentTemplate[]>([])
const templatesLoading = ref(false)
const templatesError = ref(false)

const slug = computed(() => (isEdit.value ? loadedSlug.value : slugify(form.name)))
const canSave = computed(() => form.name.trim().length > 0)
const saveLabel = computed(() => {
  if (saving.value) return '…'
  return isEdit.value ? t('services.update') : t('services.save')
})

const lifecycleTags = [
  { key: 'start', icon: 'play_arrow' },
  { key: 'stop', icon: 'stop' },
  { key: 'restart', icon: 'refresh' },
  { key: 'suspend', icon: 'pause' },
  { key: 'archive', icon: 'archive' },
  { key: 'domain', icon: 'dns' },
] as const

const lifecycleTagValues = reactive<Record<string, string>>(
  Object.fromEntries(lifecycleTags.map((t) => [t.key, ''])),
)

async function loadDeploymentTemplates() {
  templatesLoading.value = true
  templatesError.value = false
  try {
    if (!Object.keys(settings.value).length) await loadSettings()
    const url = settings.value.DEPLOYMENT_ENGINE_URL || ''
    const token = settings.value.DEPLOYMENT_ENGINE_API_KEY || ''
    if (!url || !token) {
      templatesError.value = true
      return
    }
    deploymentTemplates.value = await fetchDeploymentTemplates(url, token)
  } catch {
    templatesError.value = true
    deploymentTemplates.value = []
  } finally {
    templatesLoading.value = false
  }
}

async function loadServiceForEdit(id: number) {
  loading.value = true
  loadError.value = null
  try {
    const svc = await getService(id)
    if (!svc) {
      loadError.value = t('services.errors.load_failed')
      return
    }
    form.name = svc.name ?? ''
    form.description = svc.description ?? ''
    form.logo_url = svc.logo_url ?? ''
    form.isPubliclyAvailable = Boolean(svc.isPubliclyAvailable)
    loadedSlug.value = svc.slug ?? ''

    versionList.value = Array.isArray(svc.versions)
      ? svc.versions.filter((v: unknown): v is string => typeof v === 'string')
      : []

    draftPlans.value = readServicePlans(svc).map((p) => ({
      label: p.label,
      description: p.description ?? '',
      optionsRaw: p.options.join('\n'),
      monthlyCreditConsumption: p.monthlyCreditConsumption,
    }))

    const lc = (svc.lifecycle_commands ?? {}) as Record<string, unknown>
    for (const tag of lifecycleTags) {
      const v = lc[tag.key]
      lifecycleTagValues[tag.key] = typeof v === 'string' ? v : ''
    }

    const dt = svc.deployment_template as { id?: string | number } | null
    if (dt && (dt.id ?? null) !== null) {
      const match = deploymentTemplates.value.find((tpl) => tpl.id === dt.id)
      if (match) form.deployment_template = match
    }
  } catch {
    loadError.value = t('services.errors.load_failed')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadDeploymentTemplates()
  if (isEdit.value && editId.value !== null) {
    await loadServiceForEdit(editId.value)
  }
})

function addTier() {
  draftPlans.value.push({
    label: '',
    description: '',
    optionsRaw: '',
    monthlyCreditConsumption: 0,
  })
}

function removeTier(idx: number) {
  draftPlans.value.splice(idx, 1)
}

function triggerLogoPicker() {
  logoInputEl.value?.click()
}

async function handleLogoUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  logoUploading.value = true
  try {
    form.logo_url = await uploadServiceLogo(file)
  } catch {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('services.form.logo_upload_failed'),
      life: 4000,
    })
  } finally {
    logoUploading.value = false
    target.value = ''
  }
}

async function copySlug() {
  try {
    await navigator.clipboard.writeText(slug.value)
  } catch {
    /* clipboard unavailable */
  }
}

function handleDiscard() {
  if (isEdit.value) {
    router.push(`/services/${editId.value}`)
    return
  }
  if (
    form.name ||
    form.description ||
    form.logo_url ||
    draftPlans.value.length ||
    versionList.value.length
  ) {
    if (!window.confirm(t('services.confirm_discard'))) return
  }
  router.back()
}

async function handleSave() {
  if (!canSave.value) return
  saving.value = true
  try {
    const lifecycle_commands = Object.fromEntries(
      Object.entries(lifecycleTagValues)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v.length > 0),
    )

    const usedSlugs = new Set<string>()
    const plans = draftPlans.value.map((p, idx) => {
      const baseLabel = p.label.trim() || `${t('services.plans.tier_label_placeholder')} ${idx + 1}`
      let baseSlug = slugify(p.label) || `plan-${idx + 1}`
      let slugCandidate = baseSlug
      let n = 2
      while (usedSlugs.has(slugCandidate)) {
        slugCandidate = `${baseSlug}-${n++}`
      }
      usedSlugs.add(slugCandidate)
      return {
        slug: slugCandidate,
        label: baseLabel,
        description: p.description.trim() || null,
        monthlyCreditConsumption: Number(p.monthlyCreditConsumption) || 0,
        options: p.optionsRaw.split('\n').map((s) => s.trim()).filter(Boolean),
      }
    })

    const versions = versionList.value.map((v) => v.trim()).filter(Boolean)

    const deployment_template = form.deployment_template
      ? {
          id: form.deployment_template.id,
          url: form.deployment_template.url,
          name: form.deployment_template.name,
        }
      : null

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      logo_url: form.logo_url.trim() || null,
      isPubliclyAvailable: form.isPubliclyAvailable,
      lifecycle_commands,
      plans,
      versions,
      deployment_template,
    }

    let serviceId: number
    if (isEdit.value && editId.value !== null) {
      await updateService(editId.value, payload)
      serviceId = editId.value
    } else {
      const created = await createService({ ...payload, slug: slug.value })
      serviceId = (created as { id: number }).id
    }

    toast.add({ severity: 'success', summary: t('common.success'), life: 3000 })
    router.push(`/services/${serviceId}`)
  } catch {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: t('errors.fetch_failed'),
      life: 4000,
    })
  } finally {
    saving.value = false
  }
}

defineExpose({ form })
</script>
