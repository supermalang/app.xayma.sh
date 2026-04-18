import { config } from '@vue/test-utils'
import { beforeEach } from 'vitest'
import PrimeVue from 'primevue/config'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

// matchMedia stub — PrimeVue Select uses it but jsdom doesn't implement it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} } })

beforeEach(() => {
  const pinia = createPinia()
  setActivePinia(pinia)
  config.global.plugins = [
    [PrimeVue, { ripple: false }],
    i18n,
    pinia,
  ]
})
