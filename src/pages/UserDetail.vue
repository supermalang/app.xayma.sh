<template>
  <AppPage>
    <!-- Back button (above header for detail page) -->
    <Button
      icon="pi pi-arrow-left"
      class="p-button-text p-button-rounded self-start"
      @click="goBack"
    />

    <!-- Header -->
    <AppPageHeader
      :title="`${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim()"
      :description="user?.email ?? ''"
    >
      <template #actions>
        <Button
          :label="$t('common.edit')"
          icon="pi pi-pencil"
          @click="showEditDialog"
        />
      </template>
    </AppPageHeader>

    <!-- Role and Partner badges -->
    <div class="flex gap-4">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-on-surface-variant">{{ $t('users.form.role') }}:</span>
        <Tag :value="getRoleLabel(user?.user_role)" :severity="getRoleSeverity(user?.user_role)" />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-on-surface-variant">{{ $t('users.form.partner') }}:</span>
        <span class="text-on-surface">{{ partnerName }}</span>
      </div>
    </div>

    <!-- User details card -->
    <div v-if="user" class="bg-surface-container-low p-6 rounded-lg space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-on-surface-variant mb-1">
            {{ $t('users.form.firstname') }}
          </label>
          <p class="text-on-surface">{{ user.firstname }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-on-surface-variant mb-1">
            {{ $t('auth.lastname') }}
          </label>
          <p class="text-on-surface">{{ user.lastname || '-' }}</p>
        </div>
        <div class="col-span-2">
          <label class="block text-sm font-medium text-on-surface-variant mb-1">
            {{ $t('users.form.email') }}
          </label>
          <p class="text-on-surface">{{ user.email }}</p>
        </div>
      </div>
    </div>

    <!-- Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="$t('common.edit')"
      modal
      :style="{ width: '90vw', maxWidth: '600px' }"
    >
      <UserForm
        v-if="user"
        :initial-data="user"
        :partners="partners"
        :is-loading="isSubmitting"
        @submit="handleFormSubmit"
        @cancel="closeDialog"
      />
    </Dialog>
  </AppPage>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import AppPage from '@/components/common/AppPage.vue'
import AppPageHeader from '@/components/common/AppPageHeader.vue'
import UserForm from '@/components/users/UserForm.vue'
import * as userService from '@/services/users.service'
import * as partnerService from '@/services/partners.service'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

// State
const isLoading = ref(false)
const isSubmitting = ref(false)
const showDialog = ref(false)
const user = ref<any>(null)
const partners = ref<any[]>([])

const userId = computed(() => route.params.id as string)

const partnerName = computed(() => {
  if (!user.value) return '-'
  const partner = partners.value.find((p) => p.id === user.value.company_id)
  return partner?.name || '-'
})

// Get role label
const getRoleLabel = (role: string) => {
  const roleMap: Record<string, string> = {
    ADMIN: t('users.roles.ADMIN'),
    CUSTOMER: t('users.roles.CUSTOMER'),
    RESELLER: t('users.roles.RESELLER'),
    SALES: t('users.roles.SALES'),
    SUPPORT: t('users.roles.SUPPORT'),
  }
  return roleMap[role] || role
}

// Get role severity for badge
const getRoleSeverity = (role: string) => {
  const severityMap: Record<string, string> = {
    ADMIN: 'danger',
    CUSTOMER: 'info',
    RESELLER: 'success',
    SALES: 'warning',
    SUPPORT: 'secondary',
  }
  return severityMap[role] || 'secondary'
}

// Load user and partners
const loadData = async () => {
  try {
    isLoading.value = true
    const [userData, partnersData] = await Promise.all([
      userService.getUser(userId.value),
      partnerService.listPartners({ pageSize: 1000 }),
    ])
    user.value = userData
    partners.value = partnersData.data
  } catch (error) {
    console.error('Failed to load data:', error)
  } finally {
    isLoading.value = false
  }
}

// Dialog handlers
const showEditDialog = () => {
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
}

// Form submission
const handleFormSubmit = async (values: any) => {
  try {
    isSubmitting.value = true
    await userService.updateUser(userId.value, values)
    closeDialog()
    await loadData()
  } catch (error) {
    console.error('Failed to update user:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Navigate back
const goBack = () => {
  router.back()
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>
