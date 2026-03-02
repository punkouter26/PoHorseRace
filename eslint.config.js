// eslint.config.js
// Constitution Principle I: zero-warnings policy
// ESLint 9 flat config format (no defineConfig wrapper — that's a Vite helper, not ESLint)

import js from '@eslint/js';
import globals from 'globals';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      // Browser + ES2020 globals so window, document, setTimeout, performance etc. are defined.
      // Node globals are added for e2e tests (fs, path) and Vitest test helpers.
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      // TypeScript recommended rules
      ...tsPlugin.configs.recommended.rules,

      // React Hooks rules — Constitution Principle III (no hooks outside components/hooks)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Zero-waste enforcements — Constitution Principle I
      // Allow underscore-prefixed params to signal intentionally unused (e.g. _e, _payload)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Code quality
      'no-console': ['warn', { allow: ['debug', 'error'] }],
    },
  },
  {
    // Ignore generated/config files
    ignores: ['dist/', 'node_modules/', 'eslint.config.js'],
  },
];
