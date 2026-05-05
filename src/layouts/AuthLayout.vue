<template>
  <div class="auth-shell min-h-screen flex flex-col justify-between bg-surface text-on-surface relative overflow-hidden">
    <!-- Decorative ambient glows -->
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] bg-primary/5"></div>
      <div class="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full blur-[120px] bg-secondary/5"></div>
    </div>

    <!-- Decorative corner glyphs -->
    <div class="pointer-events-none select-none fixed bottom-10 right-10 z-0 opacity-10">
      <div class="grid grid-cols-2 gap-4">
        <span class="material-symbols-outlined !text-[120px]">developer_board</span>
        <span class="material-symbols-outlined !text-[120px]">hub</span>
      </div>
    </div>

    <!-- Header -->
    <header class="w-full flex justify-center py-12 relative z-10">
      <div class="flex flex-col items-center gap-2">
        <span class="font-mono text-xs tracking-[0.2em] uppercase text-primary">
          {{ t('auth.enterprise_infrastructure') }}
        </span>
        <h1 class="text-3xl font-extrabold tracking-tighter text-primary">Xayma.sh</h1>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-grow flex items-center justify-center px-6 pb-24 relative z-10">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer
      class="w-full px-8 py-10 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-outline-variant/10 relative z-10"
    >
      <div class="flex items-center gap-6">
        <div class="flex flex-col">
          <span class="text-[10px] font-mono uppercase tracking-widest text-outline mb-1">
            {{ t('auth.system_version') }}
          </span>
          <span class="text-xs font-mono font-medium text-primary">v{{ appVersion }}</span>
        </div>
        <div class="h-8 w-px bg-outline-variant/40"></div>
        <div class="flex flex-col">
          <span class="text-[10px] font-mono uppercase tracking-widest text-outline mb-1">
            {{ t('auth.status') }}
          </span>
          <span class="flex items-center gap-2 text-xs font-mono font-medium text-on-tertiary-fixed-variant">
            <span class="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim block"></span>
            {{ t('auth.operational') }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-8">
        <nav class="flex gap-6">
          <a class="text-xs font-medium text-outline hover:text-primary transition-colors" href="#">
            {{ t('auth.privacy_policy') }}
          </a>
          <a class="text-xs font-medium text-outline hover:text-primary transition-colors" href="#">
            {{ t('auth.service_terms') }}
          </a>
          <a class="text-xs font-medium text-outline hover:text-primary transition-colors" href="#">
            {{ t('auth.infrastructure_log') }}
          </a>
        </nav>
        <div class="hidden md:block h-4 w-px bg-outline-variant/40"></div>
        <p class="text-xs font-mono text-outline">{{ t('auth.copyright', { year }) }}</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import pkg from '../../package.json'

const { t } = useI18n()
const appVersion = pkg.version
const year = computed(() => new Date().getFullYear())
</script>

<style scoped>
.auth-shell {
  background-image:
    linear-gradient(to right, rgba(184, 196, 255, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(184, 196, 255, 0.1) 1px, transparent 1px);
  background-size: 40px 40px;
}
</style>
