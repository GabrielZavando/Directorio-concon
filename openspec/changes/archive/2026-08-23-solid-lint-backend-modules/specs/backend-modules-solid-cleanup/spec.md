## ADDED Requirements

### Requirement: Backend modules comply with SOLID lint thresholds
Every backend source file outside `common/` SHALL pass `make solid-lint` with zero errors: cyclomatic complexity ≤10, cognitive complexity ≤10, max 300 lines per file, no `any`, no unused variables, and no duplicated string literals.

#### Scenario: Full backend lint is clean
- **WHEN** `make solid-lint` runs against `backend/src`
- **THEN** ESLint reports zero errors (complexity, cognitive-complexity, max-lines, no-explicit-any, no-unused-vars, no-duplicate-string, import/namespace).

### Requirement: Joi config avoids namespace import
`src/config/validation.config.ts` SHALL NOT use `import * as Joi` (which triggered `import/namespace` errors). It SHALL use a default import `import Joi from "joi"` — named imports (`import { object, string } from "joi"`) were evaluated and rejected because Joi v17's schema builders require the Joi instance as `this` at runtime ("Must be invoked on a Joi instance"). The default import keeps `import/namespace` clean and preserves validation behavior.

#### Scenario: Validation config lints clean
- **WHEN** `make solid-lint` runs against `src/config/validation.config.ts`
- **THEN** no `import/namespace` errors are reported and validation behavior is unchanged (covered by `validation.config.spec.ts`).

### Requirement: Domain value objects stay under complexity
`imagenes.vo.ts` and `valoracion-google.vo.ts` validation functions SHALL have complexity ≤10 with single-boolean returns.

#### Scenario: Value object validation
- **WHEN** the validation functions are refactored
- **THEN** they retain identical truthy/falsy results for the same inputs and `sonarjs/cognitive-complexity`/`complexity`/`prefer-single-boolean-return` report no errors.

### Requirement: Eventos service respects file-size SRP
`eventos.service.ts` SHALL be ≤300 lines; responsibilities split into focused files while keeping the public service API unchanged.

#### Scenario: Eventos service lint
- **WHEN** `make solid-lint` runs against `src/modules/eventos`
- **THEN** no `max-lines` or `complexity` errors are reported.

### Requirement: No duplicated identifiers or logic
Unused imports/vars are removed; identical functions in `usuarios.service.ts` are extracted to a shared helper; `solicitudes.service.ts` duplicate import is collapsed.

#### Scenario: Lint for unused/dupes
- **WHEN** `make solid-lint` runs against the affected files
- **THEN** no `no-unused-vars`, `no-identical-functions`, or `import/no-duplicates` errors remain.

### Requirement: No `any` in backend services
`firebase.service.ts` SHALL replace `any` with explicit or inferred types.

#### Scenario: Firebase service typing
- **WHEN** `make solid-lint` runs against `src/common/services/firebase.service.ts`
- **THEN** no `no-explicit-any` errors are reported and runtime behavior is unchanged.
