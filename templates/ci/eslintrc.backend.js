// templates/ci/eslintrc.backend.js
//
// ESLint config for the NestJS backend enforcing SRP thresholds.
// Reference: docs/ci-standards.md (Umbrales objetivos ↔ ESLint rules).
//
// This config is meant to be invoked via `make solid-lint` from the repo root:
//   cd backend && NODE_PATH=$(pwd)/node_modules npx eslint -c ../templates/ci/eslintrc.backend.js --resolve-plugins-relative-to . 'src/**/*.ts'
//
// Instantiation into the project's own .eslintrc.js:
//   cp templates/ci/eslintrc.backend.js backend/.eslintrc.js   (then merge with existing config if any).
//
// Adapted for the monorepo layout: parserOptions.project points at backend/tsconfig.json
// so type-aware rules (import/no-cycle, sonarjs/cognitive-complexity) type-check the backend.

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import', 'sonarjs'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  rules: {
    // SRP / file size — Ticket 4 thresholds
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-depth': ['error', 4],
    'max-nested-callbacks': ['error', 5],
    'max-params': ['error', 3],
    // SRP / complexity
    complexity: ['error', 10],
    'sonarjs/cognitive-complexity': ['error', 10],
    // OCP — avoid growing switch/if-else ladders
    'sonarjs/no-collapsible-if': 'warn',
    'sonarjs/no-small-switch': 'off',
    // Imports
    'import/no-cycle': ['error', { maxDepth: 10 }],
    'import/no-unused-modules': 'warn',
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // Disable base rules that conflict with @typescript-eslint
    'no-unused-vars': 'off',
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/'],
};
