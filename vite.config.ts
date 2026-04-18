import { defineConfig, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import fs from 'fs'

/**
 * Security plugin: Prevent Supabase service role key in bundle
 * Service role key must ONLY be used in n8n (backend), never in frontend
 */
const securityPlugin: Plugin = {
  name: 'security-check',
  apply: 'build',
  enforce: 'post',
  async generateBundle(options, bundle) {
    const serviceRoleKeyPattern = /SUPABASE_SERVICE_ROLE_KEY|supabase.*service.*role/i

    for (const [filename, asset] of Object.entries(bundle)) {
      if (typeof asset === 'object' && 'source' in asset) {
        const source = typeof asset.source === 'string' ? asset.source : asset.source.toString()

        if (serviceRoleKeyPattern.test(source)) {
          throw new Error(
            `❌ SECURITY VIOLATION: Service role key detected in ${filename}\n` +
            'Service role key must ONLY be used in n8n environment variables (backend).\n' +
            'Never commit or bundle in frontend code.\n' +
            'See docs/runbook.md for secure credential handling.'
          )
        }
      }
    }
  },
}

export default defineConfig({
  plugins: [vue(), securityPlugin],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
  build: {
    sourcemap: false,
    minify: 'terser',
  },
})
