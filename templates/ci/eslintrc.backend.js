// ESLint config — NestJS / Node backend
//
// Mechanical enforcement of the SOLID/POO thresholds declared in
// docs/backend-standards.md § "Principios de Diseño — Backend (NestJS)".
//
// SOLID coverage in this file:
//   SRP — `max-lines`           (<= 300 lines per file: signal of multiple responsibilities)
//   SRP — `complexity`           (cyclomatic <= 10 per method: signal of multiple responsibilities)
//   SRP — `sonarjs/cognitive-complexity` (cognitive <= 10: catches "low cyclomatic but hard to read")
//   OCP — `sonarjs/no-collapsible-if` + thresholds (indirect signal; OCP itself is judgemental, kept for Lente Architect)
//   LSP — NOT enforceable mechanically; Lente Architect review ticket 3 covers it
//   ISP — NOT enforceable mechanically (interface method count); Lente Architect covers it
//   DIP — NOT in this file; enforced by templates/ci/.dependency-cruiser.js rule `no-infra-from-domain`
//
// Honest limitation: only SRP thresholds + DIP (via dependency-cruiser) are
// mechanically verifiable. OCP/LSP/ISP remain judgmental passes.
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: './tsconfig.json' },
  plugins: ['@typescript-eslint', 'sonarjs', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:sonarjs/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    // ---- SRP thresholds (Ticket 1 §Umbrales objetivos) ----
    // SOLID: SRP — a file longer than 300 lines usually carries more than one responsibility.
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],

    // SOLID: SRP — a method with cyclomatic complexity > 10 has too many independent paths.
    'complexity': ['error', 10],

    // SOLID: SRP — max-params: un constructor con más de 5 parámetros indica que
    // la clase probablemente viola SRP y debería dividirse.
    'max-params': ['error', 5],

    // SOLID: SRP — cognitive complexity catches tangled-but-low-cyclomatic methods
    'sonarjs/cognitive-complexity': ['error', 10],

    // SOLID: OCP — collapsible-if is a weak mechanical signal; real OCP violations (growing switch) need judgment.
    'sonarjs/no-collapsible-if': 'warn',

    // ---- Auxiliary import hygiene ----
    // SOLID: DIP — auxiliary check (the authoritative DIP rule lives in .dependency-cruiser.js)
    'import/no-cycle': ['error', { maxDepth: 10 }],
    'import/no-default-export': 'off',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.spec.ts', '*.contract.spec.ts'],
};
