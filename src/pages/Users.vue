<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-on-surface">{{ $t('users.title') }}</h1>
      <Button
        :label="$t('common.create')"
        icon="pi pi-plus"
        @click="showCreateDialog"
      />
    </div>

    <!-- Filter by role -->
    <div class="flex gap-4 flex-wrap">
      <Dropdown
        v-model="filters.user_role"
        :options="roleOptions"
        option-label="label"
        option-value="value"
        :placeholder="$t('users.form.role')"
        class="w-40"
        show-clear
        @change="applyFilters"
      />
    </div>

    <!-- DataTable -->
    <AppDataTable
      :rows="users"
      :columns="tableColumns"
      :loading="isLoading"
      :total-records="totalRecords"
      :page-size="pageSize"
      paginator
      lazy
      @page-change="handlePageChange"
      @search="handleSearch"
    >
      <!-- Role column -->
      <template #body-user_role="{ data }">
        <Tag :value="getRoleLabel(data.user_role)" :severity="getRoleSeverity(data.user_role)" />
      </template>

      <!-- Partner column -->
      <template #body-partner="{ data }">
        {{ getPartnerName(data.company_id) }}
      </template>

      <!-- Actions column -->
      <template #actions="{ data }">
        <div class="flex gap-2">
          <Button
            icon="pi pi-eye"
            class="p-button-rounded p-button-text p-button-sm"
            :title="$t('common.view')"
            @click="goToUserDetail(data.id)"
          />
          <Button
            icon="pi pi-pencil"
            class="p-button-rounded p-button-text p-button-sm"
            :title="$t('common.edit')"
            @click="editUser(data)"
          />
          <Button
            icon="pi pi-trash"
            class="p-button-rounded p-button-text p-button-sm p-button-danger"
            :title="$t('common.delete')"
            @click="deleteUser(data.id)"
          />
        </div>
      </template>
    </AppDataTable>

    <!-- Create/Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="isEditingUser ? $t('common.edit') : $t('common.create')"
      modal
      :style="{ width: '90vw', maxWidth: '600px' }"
    >
      <UserForm
        :initial-data="editingUser"
        :partners="partners"
        :is-loading="isSubmitting"
        @submit="handleFormSubmit"
        @cancel="closeDialog"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import AppDataTable from '@/components/common/AppDataTable.vue'
import UserForm from '@/components/users/UserForm.vue'
import * as userService from '@/services/users.service'
import * as partnerService from '@/services/partners.service'

const router = useRouter()
const { t } = useI18n()

// State
const isLoading = ref(false)
const isSubmitting = ref(false)
const showDialog = ref(false)
const editingUser = ref<any>(null)
const pageSize = ref(20)
const totalRecords = ref(0)
const users = ref<any[]>([])
const partners = ref<any[]>([])

const filters = ref({
  user_role: '',
  search: '',
})

// Options
const roleOptions = [
  { label: t('users.roles.ADMIN'), value: 'ADMIN' },
  { label: t('users.roles.CUSTOMER'), value: 'CUSTOMER' },
  { label: t('users.roles.RESELLER'), value: 'RESELLER' },
  { label: t('users.roles.SALES'), value: 'SALES' },
  { label: t('users.roles.SUPPORT'), value: 'SUPPORT' },
]

const tableColumns = [
  { field: 'firstname', header: 'users.table.firstname' },
  { field: 'email', header: 'users.table.email' },
  { field: 'user_role', header: 'users.table.role' },
  { field: 'partner', header: 'users.table.partner' },
]

const isEditingUser = computed(() => !!editingUser.value?.id)

// Load users
const loadUsers = async (page = 1) => {
  try {
    isLoading.value = true
    const result = await userService.listUsers({
      page,
      pageSize: pageSize.value,
      ...filters.value,
    })
    users.value = result.data
    totalRecords.value = result.count
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    isLoading.value = false
  }
}

// Load partners for form dropdown
const loadPartners = async () => {
  try {
    const result = await partnerService.listPartners({ pageSize: 1000 })
    partners.value = result.data
  } catch (error) {
    console.error('Failed to load partners:', error)
  }
}

// Get partner name by company_id
const getPartnerName = (companyId: number) => {
  const partner = partners.value.find((p) => p.id === companyId)
  return partner?.name || '-'
}

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

// Handle page change
const handlePageChange = (event: any) => {
  const page = event.first / event.rows + 1
  loadUsers(page)
}

// Handle search
const handleSearch = (search: string) => {
  filters.value.search = search
  loadUsers(1)
}

// Apply filters
const applyFilters = () => {
  loadUsers(1)
}

// Dialog handlers
const showCreateDialog = () => {
  editingUser.value = null
  showDialog.value = true
}

const editUser = (user: any) => {
  editingUser.value = user
  showDialog.value = true
}

const closeDialog = () => {
  editingUser.value = null
  showDialog.value = false
}

// Form submission
const handleFormSubmit = async (values: any) => {
  try {
    isSubmitting.value = true
    if (isEditingUser.value) {
      await userService.updateUser(editingUser.value.id, values)
    } else {
      await userService.createUser(values)
    }
    closeDialog()
    loadUsers(1)
  } catch (error) {
    console.error('Failed to save user:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Delete user
const deleteUser = async (id: string) => {
  if (confirm(t('users.confirm_delete'))) {
    try {
      await userService.deleteUser(id)
      loadUsers(1)
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }
}

// Navigate to user detail
const goToUserDetail = (id: string) => {
  router.push(`/users/${id}`)
}

// Lifecycle
onMounted(async () => {
  await loadPartners()
  loadUsers()
})
</script>

<style scoped>
:deep(.p-datatable) {
  --p-datatable-border-color: var(--outline-variant);
}
</style>
