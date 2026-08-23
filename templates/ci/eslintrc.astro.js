// ESLint config — Astro sites / landing
//
// Mechanical enforcement of the SOLID/POO principle declared in
// docs/frontend-standards.md § "Principios de Diseño — Astro".
//
// Astro has the smallest malicious surface of the three stacks (no run-time
// business logic container as in NestJS/Angular). The main risk is logic
// leaking into the frontmatter. ESLint can only catch *size* signals here;
// checking whether frontmatter holds *business logic* (vs rendering-only
// instructions) is the Lente Architect’s job (Ticket 3 §Fase 8 / Astro).
//
// SOLID coverage in this file:
//   SRP — `max-lines`  (size guard only)
//
// HONEST LIMITATION: Ticket 1 does NOT fix a numeric "max-lines" threshold for
// Astro (it only says: "extraer frontmatter > 60-80 líneas"). We mirror the
// Angular value as a default but mark it `warn` (NOT `error`) until a future
// ticket pins the actual number in docs/frontend-standards.md. This is a
// documented discrepancy reported in the Ticket 4 final report.
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: './tsconfig.json' },
  plugins: ['@typescript-eslint', 'astro', 'sonarjs'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:astro/recommended',
    'plugin:sonarjs/recommended',
  ],
  rules: {
    // SOLID: SRP — astro component size guard. warn (not error) — see HONEST LIMITATION above.
    'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
    'complexity': ['warn', 10],
    'sonarjs/cognitive-complexity': ['warn', 10],
  },
  ignorePatterns: ['dist/', 'node_modules/', '.astro/', '*.spec.ts'],
  overrides: [
    {
      // *.astro files are processed by the astro plugin's parser
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
    },
  ],
};
