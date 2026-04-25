<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import '@/assets/styles/a11y.css'

const authStore = useAuthStore()
let authSubscription: any

onMounted(() => {
  // Note: authStore.initialize() is already called by router guard before routes render
  // Only set up the real-time auth listener here
  authSubscription = authStore.setupAuthListener()
})

onUnmounted(() => {
  authSubscription?.unsubscribe()
})
</script>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
