<template>
  <div>
    <AppSidebar />
    <AppHeader />
    <main class="ml-64 pt-16 p-8 min-h-screen bg-surface">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSidebar from '@/components/common/AppSidebar.vue'
import AppHeader from '@/components/common/AppHeader.vue'
</script>
