<template>
  <div class="-mt-8 -mx-8">
    <!-- Editorial header: left primary border, generous gutter -->
    <div class="px-12 pt-12 pb-8 max-w-6xl mx-auto w-full">
      <div class="border-l-4 border-primary ps-8">
        <h1 class="text-4xl font-bold tracking-tight text-on-surface">
          {{ $t('services.create_page.title') }}
        </h1>
        <p class="text-on-surface-variant max-w-2xl font-medium mt-2">
          {{ $t('services.create_page.subtitle') }}
        </p>
      </div>
    </div>

    <form class="px-12 pb-16 max-w-6xl mx-auto w-full space-y-16" @submit.prevent="handleSave">
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
                class="font-mono text-xs bg-surface-container p-3 flex items-center justify-between"
              >
                <span class="text-on-surface-variant">{{ slug || '—' }}</span>
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
            <!-- Visual stub: column not in DB. Disabled to avoid suggesting it persists. -->
            <Dropdown
              :options="[]"
              :placeholder="$t('services.form.deployment_template_placeholder')"
              disabled
              class="w-full"
            />
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-bold uppercase tracking-wider text-outline">
              {{ $t('services.form.logo_url') }}
            </label>
            <InputText
              v-model="form.logo_url"
              :placeholder="$t('services.form.logo_url_placeholder')"
              class="w-full !border-0 !bg-surface-container-low !p-3 !text-sm font-medium"
            />
            <p class="text-[10px] text-on-surface-variant">{{ $t('services.form.logo_hint') }}</p>
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

      <!-- ============== 03. Versions (visual stub) ============== -->
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
          <p class="text-xs text-on-surface-variant italic mb-4">
            {{ $t('services.versions_section.placeholder') }}
          </p>
          <button
            type="button"
            disabled
            class="flex items-center gap-2 py-2 text-[10px] font-bold text-primary uppercase tracking-widest opacity-50 cursor-not-allowed"
          >
            <span class="material-symbols-outlined text-sm">add_circle</span>
            {{ $t('services.versions_section.register') }}
          </button>
        </div>
      </section>

      <div class="h-px bg-outline-variant/20"></div>

      <!-- ============== 04. Technical Tags (visual stub) ============== -->
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
              <div class="font-mono text-[10px] text-primary bg-surface-container-lowest p-2">
                {{ $t('services.tags_section.placeholder') }}
              </div>
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
          {{ saving ? '…' : $t('services.save') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import ToggleSwitch from 'primevue/toggleswitch'
import { createService, createServicePlan } from '@/services/services.service'
import { slugify } from '@/utils/slug'

interface BasicInfoForm {
  name: string
  description: string
  logo_url: string
  isPubliclyAvailable: boolean
}

interface PlanDraft {
  label: string
  description: string
  optionsRaw: string
  monthlyCreditConsumption: number
}

const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const form = reactive<BasicInfoForm>({
  name: '',
  description: '',
  logo_url: '',
  isPubliclyAvailable: false,
})

const draftPlans = ref<PlanDraft[]>([])
const saving = ref(false)

const slug = computed(() => slugify(form.name))
const canSave = computed(() => form.name.trim().length > 0)

const lifecycleTags = [
  { key: 'start', icon: 'play_arrow' },
  { key: 'stop', icon: 'stop' },
  { key: 'restart', icon: 'refresh' },
  { key: 'suspend', icon: 'pause' },
  { key: 'archive', icon: 'archive' },
  { key: 'domain', icon: 'dns' },
]

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

async function copySlug() {
  try {
    await navigator.clipboard.writeText(slug.value)
  } catch {
    /* clipboard unavailable */
  }
}

function handleDiscard() {
  if (form.name || form.description || form.logo_url || draftPlans.value.length) {
    if (!window.confirm(t('services.confirm_discard'))) return
  }
  router.back()
}

async function handleSave() {
  if (!canSave.value) return
  saving.value = true
  try {
    const created = await createService({
      name: form.name.trim(),
      slug: slug.value,
      description: form.description.trim() || null,
      logo_url: form.logo_url.trim() || null,
      isPubliclyAvailable: form.isPubliclyAvailable,
    })

    const serviceId = (created as { id: number }).id

    for (const p of draftPlans.value) {
      await createServicePlan({
        service_id: serviceId,
        label: p.label.trim() || t('services.plans.tier_label_placeholder'),
        slug: slugify(p.label) || `plan-${Date.now()}`,
        description: p.description.trim() || null,
        monthlyCreditConsumption: Number(p.monthlyCreditConsumption) || 0,
        options: p.optionsRaw.split('\n').map((s) => s.trim()).filter(Boolean),
      })
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
</script>
