import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    ignores: ['dist', 'node_modules', '.vite', 'build', 'coverage'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
]
