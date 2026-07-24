// templates/ci/eslintrc.frontend.js
//
// ESLint config for the Angular frontend enforcing SRP thresholds.
// Reference: docs/ci-standards.md (Umbrales objetivos ↔ ESLint rules).
//
// Invoked via `make solid-lint` from the repo root:
//   npx eslint -c templates/ci/eslintrc.frontend.js frontend/src/**/*.ts
//
// Adapted for the monorepo layout: parserOptions.project points at frontend/tsconfig.app.json.

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './frontend/tsconfig.app.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', '@angular-eslint', 'import', 'sonarjs'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@angular-eslint/recommended',
    'plugin:sonarjs/recommended',
    'prettier',
  ],
  env: {
    browser: true,
    es2022: true,
    jasmine: true,
  },
  rules: {
    // SRP / file size — Angular threshold (looser than backend because templates + styles often push file size)
    'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
    'max-params': ['error', 4],
    // SRP / complexity
    complexity: ['error', 10],
    'sonarjs/cognitive-complexity': ['error', 10],
    // Smart vs dumb components — dumb components may NOT inject HTTP/data services
    '@angular-eslint/no-input-rename': 'off',
    '@angular-eslint/use-component-selector': 'error',
    '@angular-eslint/component-class-suffix': 'error',
    '@angular-eslint/directive-class-suffix': 'error',
    // Imports / cycles
    'import/no-cycle': ['error', { maxDepth: 10 }],
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-unused-vars': 'off',
  },
  ignorePatterns: ['dist/', 'node_modules/', '.angular/', 'coverage/'],
};
