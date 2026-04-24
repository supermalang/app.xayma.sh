import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    ignores: ['dist', 'node_modules', '.vite', 'build', 'coverage'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/service_role/]',
          message: 'Do not reference the Supabase service role key in frontend code.',
        },
      ],
    },
  },
]
