/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_WORKFLOW_ENGINE_BASE_URL: string
  readonly VITE_DEPLOYMENT_ENGINE_BASE_URL: string
  readonly VITE_PAYTECH_API_KEY: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_APP_ENV: 'development' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
