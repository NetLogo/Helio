import prettierConfig from '@vue/eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

import { customIgnores } from '@repo/eslint-config/ignores'
import { customRulesVue, nuxtTypescriptOverrides } from '@repo/eslint-config/nuxt'

export default [
  customIgnores,
  prettierConfig,
  ...pluginVue.configs['flat/recommended'],
  {
    rules: {
      ...customRulesVue.rules,
      'vue/max-attributes-per-line': ['error', { singleline: 5, multiline: 1 }],
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
    },
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      ...nuxtTypescriptOverrides.plugins,
    },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    rules: nuxtTypescriptOverrides.rules,
  },
  {
    ignores: ['dist/**/*'],
  },
]
