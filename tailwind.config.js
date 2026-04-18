/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary
        'primary':               'var(--primary)',
        'primary-container':     'var(--primary-container)',
        'on-primary':            'var(--on-primary)',
        'on-primary-container':  'var(--on-primary-container)',
        // Secondary
        'secondary':              'var(--secondary)',
        'secondary-container':    'var(--secondary-container)',
        'on-secondary':           'var(--on-secondary)',
        'on-secondary-container': 'var(--on-secondary-container)',
        // Tertiary
        'tertiary':              'var(--tertiary)',
        'tertiary-container':    'var(--tertiary-container)',
        'on-tertiary':           'var(--on-tertiary)',
        'on-tertiary-container': 'var(--on-tertiary-container)',
        // Error
        'error':              'var(--error)',
        'error-container':    'var(--error-container)',
        'on-error':           'var(--on-error)',
        'on-error-container': 'var(--on-error-container)',
        // Surfaces
        'background':                'var(--background)',
        'surface':                   'var(--surface)',
        'surface-dim':               'var(--surface-dim)',
        'surface-bright':            'var(--surface-bright)',
        'surface-container-lowest':  'var(--surface-container-lowest)',
        'surface-container-low':     'var(--surface-container-low)',
        'surface-container':         'var(--surface-container)',
        'surface-container-high':    'var(--surface-container-high)',
        'surface-container-highest': 'var(--surface-container-highest)',
        'surface-variant':           'var(--surface-variant)',
        // On-surface & background
        'on-surface':         'var(--on-surface)',
        'on-surface-variant': 'var(--on-surface-variant)',
        'on-background':      'var(--on-background)',
        // Outlines
        'outline':         'var(--outline)',
        'outline-variant': 'var(--outline-variant)',
        // Inverse
        'inverse-surface':    'var(--inverse-surface)',
        'inverse-on-surface': 'var(--inverse-on-surface)',
        'inverse-primary':    'var(--inverse-primary)',
      },
      fontFamily: {
        headline: ['Inter', 'sans-serif'],
        body:     ['Inter', 'sans-serif'],
        label:    ['Inter', 'sans-serif'],
        mono:     ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        sm:  '0.125rem',
        md:  '0.375rem',
        lg:  '0.5rem',
        xl:  '0.5rem',
        full: '9999px',
      },
      spacing: {
        xs:  'var(--spacing-xs)',
        sm:  'var(--spacing-sm)',
        md:  'var(--spacing-md)',
        lg:  'var(--spacing-lg)',
        xl:  'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
        '4xl': 'var(--spacing-4xl)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
