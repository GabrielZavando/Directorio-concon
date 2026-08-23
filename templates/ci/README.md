# CI Templates — SOLID/POO Mechanical Enforcement

> Reference configurations for static-analysis tooling that mechanically enforces
> the SOLID/POO thresholds declared in
> [`docs/backend-standards.md`](../../docs/backend-standards.md) and
> [`docs/frontend-standards.md`](../../docs/frontend-standards.md). These files are
> **not** installed in the Specboot Metadoc repo (which carries no application
> code); they are instantiated into real projects via `bash update.sh`.

## What this folder provides

| File | Stack | Tool | SOLID principle covered |
|---|---|---|---|
| `eslintrc.backend.js` | NestJS / Node | ESLint + `eslint-plugin-sonarjs` | SRP (umbrales), OCP (umbrales), ISP (umbrales) |
| `eslintrc.frontend.js` | Angular | ESLint + `@angular-eslint` | SRP smart/dumb (umbrales) |
| `eslintrc.astro.js` | Astro | ESLint (basic) | SRP frontmatter (umbrales) |
| `.dependency-cruiser.js` | NestJS / Node | `dependency-cruiser` | **DIP** (regla mecánica directa) |
| `.madge.config.json` | Angular | `madge` | Detección de dependencias circulares (aux) |
| `package.ci.json` | — | — | Snapshot de `devDependencies` para instalar |

Static analysis can **only mechanically verify DIP** (via dependency-cruiser) and
**numerical thresholds** (lines, complexity). OCP, LSP, ISP are *not* directly
machine-checkable; the Lente Architect of the adversarial review
([`ai-specs/skills/code-auditing/SKILL.md` §Fase 8](../../ai-specs/skills/code-auditing/SKILL.md))
covers them judgmentally.

## Threshold mapping (Ticket 1 ↔ this folder)

| Threshold | Source in `docs/` | Where enforced |
|---|---|---|
| Backend: `max-lines = 300` per file | `docs/backend-standards.md` §_Umbrales objetivos_ L85 | `eslintrc.backend.js` `max-lines: ["error", 300]` |
| Backend: `complexity ≤ 10` per method | `docs/backend-standards.md` §_Umbrales objetivos_ L86 | `eslintrc.backend.js` `complexity: ["error", 10]` + `sonarjs/cognitive-complexity: ["error", 10]` |
| Backend: DIP — `domain/`/`application/` may not import infrastructure/ORM/HTTP | `docs/backend-standards.md` §_Estructura de carpetas_ L55 | `.dependency-cruiser.js` rule `no-infra-from-domain` |
| Angular: `max-lines = 400` per component | `docs/frontend-standards.md` §_Umbrales_ L61 | `eslintrc.frontend.js` `max-lines: ["error", 400]` |
| Astro: `max-lines = 400` per `.astro` | *(not fixed in Ticket 1)* | `eslintrc.astro.js` `max-lines: ["warn", 400]` → flagged as `warn` until a future ticket pins the threshold in `docs/` |

## How to instantiate in a real project

```bash
# From the root of your Specboot-instantiated project:
cp templates/ci/eslintrc.backend.js     .eslintrc.backend.js
cp templates/ci/eslintrc.frontend.js    .eslintrc.frontend.js
cp templates/ci/eslintrc.astro.js       .eslintrc.astro.js
cp templates/ci/.dependency-cruiser.js  .dependency-cruiser.js
cp templates/ci/.madge.config.json      .madge.config.json

# Merge the devDependencies snapshot into your package.json:
node -e "const p=require('./package.json'); p.devDependencies=require('./templates/ci/package.ci.json'); require('fs').writeFileSync('./package.json', JSON.stringify(p,null,2))"
npm install

# Then wire these into your CI — see docs/ci-standards.md for the exact steps.
```

## Notes on honest limitations

- `complexity` (cyclomatic) and `sonarjs/cognitive-complexity` are *different
  measurements* of related concepts. We enable both because Ticket 1 names
  "complejidad ciclomática 10" precisely while sonarjs's cognitive complexity
  catches functions whose cyclomatic score is low but whose branching is
  confusing to a human reviewer.
- `max-params-per-constructor = 3` (Ticket 1 §_Umbrales objetivos_ L87) is *not*
  enforced here because no stable ESLint rule covers it cleanly. It remains a
  manual pass for the Lente Architect.
