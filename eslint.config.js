import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'android', 'ios', 'coverage', 'playwright-report']),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // The codebase already marks deliberate non-use with a leading underscore
      // (`_t`, `_moduleId`, `_imgs`). Honour that convention instead of
      // reporting it: a rename to satisfy the linter would lose the signal that
      // the parameter has to stay for positional reasons.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // Dev-server ergonomics only: it asks that a module export components and
      // nothing else, so Vite can hot-swap it without a full reload. This
      // codebase deliberately co-locates helpers with their component
      // (`buttonVariants` next to `Button`, a context's hook next to its
      // provider) — and for src/components/ui/** that layout comes from
      // shadcn/ui itself, which CLAUDE.md forbids editing. Enforcing the rule
      // would mean restructuring ~29 files against their own convention to buy
      // a slightly faster refresh. Not worth it; those modules simply do a full
      // reload in dev.
      'react-refresh/only-export-components': 'off',

      // Type debt, not defects. Every one of these is a missing annotation on
      // code that runs correctly today, and the honest fix is a real type per
      // site — largely for third-party payloads (Shopify orders, DHL responses)
      // whose shape has to be derived from live data, not guessed. Reported as
      // a warning so the debt stays visible and countable, and capped by
      // --max-warnings in CI so it cannot grow.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  {
    // React Compiler diagnostics: setState inside an effect, refs read during
    // render, impure calls during render. These are real and worth working
    // through, but each fix changes runtime behaviour at a specific call site,
    // so they are not something to sweep through in bulk on a live app.
    // Warnings, capped, to be paid down deliberately.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  {
    // Supabase Edge Functions run on Deno, not in a browser: no `window`, no
    // DOM, but `Deno` and URL-imported modules. Linting them with the browser
    // config reported globals as undefined and missed nothing real.
    files: ['supabase/functions/**/*.ts'],
    languageOptions: {
      globals: { ...globals.deno, ...globals.worker },
    },
    rules: {
      // Deno resolves `https://…` and `npm:` specifiers; the TS resolver here
      // does not, so import diagnostics would all be false positives.
      'no-undef': 'off',
    },
  },

  {
    // Node scripts and the standalone API/server tree.
    files: ['scripts/**/*.{ts,mjs,js}', 'api/**/*.ts', 'server/**/*.ts', 'e2e/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
])
