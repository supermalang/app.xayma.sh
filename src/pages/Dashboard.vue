<template>
  <AdminDashboard v-if="isAdmin" />
  <CustomerDashboard v-else-if="isCustomer" />
  <ResellerDashboard v-else-if="isReseller" />
  <SalesDashboard v-else-if="isSales" />
  <div
    v-else
    class="text-center py-12"
  >
    <p class="text-on-surface-variant">
      {{ $t('common.no_data') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import AdminDashboard from './AdminDashboard.vue'
import CustomerDashboard from './CustomerDashboard.vue'
import ResellerDashboard from './ResellerDashboard.vue'
import SalesDashboard from './SalesDashboard.vue'

const { isAdmin, isCustomer, isReseller, isSales } = useAuth()
</script>
