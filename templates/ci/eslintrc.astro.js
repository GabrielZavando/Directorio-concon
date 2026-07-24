// templates/ci/eslintrc.astro.js
//
// ESLint config for Astro (reference only — Astro is NOT used in this project today,
// but the file is kept for Specboot upstream alignment and future Astro scaffolding).
// Invoked via `make solid-lint` when an `astro.config.*` file is detected at the repo root.
//
// Thresholds: warn (not error) — Astro components often have larger frontmatter and templates.

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: 'astro-eslint-parser',
  parserOptions: {
    extraFileExtensions: ['.astro'],
    sourceType: 'module',
  },
  plugins: ['astro', '@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:astro/recommended',
    'prettier',
  ],
  env: {
    browser: true,
    es2022: true,
  },
  rules: {
    // SRP / file size — Astro components tend to be larger; warn at 400 (not error)
    'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
    'astro/no-set-html-directive': 'error',
    'astro/no-unused-css-selector': 'warn',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', '.astro/'],
};
