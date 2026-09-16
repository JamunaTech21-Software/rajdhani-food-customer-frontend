import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

import rajdhani from './eslint-rules/no-colour-literals.js'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    plugins: { rajdhani },
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // §6 rule 4 and acceptance §18.2: no component may name a colour, or an
      // admin changing primary_color leaves a patch of the old brand behind.
      'rajdhani/no-colour-literals': 'error',
    },
  },
  {
    // The two files that exist to *interpret* colours. color.js converts
    // between spaces and picks a readable foreground from a fixed light/dark
    // pair; applyTheme.js reads site_profile and writes the properties. A
    // literal in either is a fallback for a malformed value, not a style
    // decision — everywhere else, it is the bug this rule exists to catch.
    files: ['src/shared/theme/color.js', 'src/shared/theme/applyTheme.js'],
    rules: { 'rajdhani/no-colour-literals': 'off' },
  },
  {
    // Build configuration and the rule itself run in Node, and the rule's own
    // source necessarily contains the patterns it matches.
    files: ['vite.config.js', 'eslint.config.js', 'eslint-rules/*.js'],
    languageOptions: { globals: globals.node },
    rules: { 'rajdhani/no-colour-literals': 'off' },
  },
])
