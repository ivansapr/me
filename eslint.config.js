import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    ignores: [
      '.svelte-kit/**',
      'build/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**'
    ]
  },
  {
    files: ['**/*.svelte'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    rules: { 'svelte/no-navigation-without-resolve': 'off' }
  },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    }
  }
);
