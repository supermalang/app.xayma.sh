/**
 * Vue 3 application entry point
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import * as Sentry from '@sentry/vue'
import PrimeVue from 'primevue/config'
import { definePreset } from '@primeuix/themes'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

import App from './App.vue'
import router from './router'
import enMessages from './i18n/en'
import frMessages from './i18n/fr'

// Styles
import './assets/styles/main.css'
import './assets/styles/animations.css'
import './assets/styles/primevue-theme.css'
import 'primeicons/primeicons.css'

// i18n configuration
const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'en',
  fallbackLocale: 'en',
  messages: {
    en: enMessages,
    fr: frMessages,
  },
})

// Create app
const app = createApp(App)

// Initialize Sentry for error tracking
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_APP_ENV || 'development',
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: import.meta.env.VITE_APP_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}

app.use(createPinia())
app.use(router)
app.use(i18n)
const XaymaPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '0',
      sm: '0',
      md: '0',
      lg: '0',
      xl: '0',
    },
    // Blue palette derived from design token primary-container (#1e40af)
    blue: {
      50:  '#eff4ff',
      100: '#dce9ff',
      200: '#b8c4ff',
      300: '#7b96f5',
      400: '#4d6fdf',
      500: '#1e40af',
      600: '#00288e',
      700: '#001f6e',
      800: '#001550',
      900: '#000c32',
      950: '#000618',
    },
  },
  semantic: {
    primary: {
      50:  '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
  },
  components: {
    card: {
      root: {
        borderRadius: '0',
        shadow: 'none',
      },
    },
    button: {
      root: {
        borderRadius: '0',
      },
      colorScheme: {
        light: {
          root: {
            secondary: {
              hoverBackground: '{primary.color}',
              hoverBorderColor: '{primary.color}',
              hoverColor: '{primary.contrast.color}',
            },
          },
        },
      },
    },
    inputtext: {
      root: {
        borderRadius: '0',
      },
    },
  },
})

app.use(PrimeVue, {
  theme: {
    preset: XaymaPreset,
    options: {
      darkModeSelector: '.dark',
    },
  },
})
app.use(ToastService)
app.use(ConfirmationService)

app.mount('#app')
