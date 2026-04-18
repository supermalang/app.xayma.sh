<template>
  <div class="p-md">
    <h1>404 - Not Found</h1>
    <p>The page you are looking for does not exist.</p>
    <RouterLink to="/">
      Back to Dashboard
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
