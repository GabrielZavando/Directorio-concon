## Context

`make solid-lint` (ESLint thresholds + dependency-cruiser + madge per `templates/ci/eslintrc.backend.js`) now runs cleanly against aliases after `solid-001-backend-common-cleanup`. A full backend scan reports 51 errors (0 warnings-blockers) across modules that were never refactored to the SOLID standard. Breakdown by rule:

- `import/namespace`: 21 — all in `config/validation.config.ts` (Joi namespace usage).
- `complexity`: 6 files; `sonarjs/cognitive-complexity`: 4 files (overlapping).
- `sonarjs/no-duplicate-string`: 5 files.
- `@typescript-eslint/no-unused-vars`: 4 files.
- `@typescript-eslint/no-explicit-any`: 1 file (`firebase.service.ts`).
- `max-lines`: 1 file (`eventos.service.ts`, >300 lines).
- `sonarjs/no-identical-functions`: 1 file (`usuarios.service.ts`).
- `sonarjs/prefer-single-boolean-return` / `prefer-immediate-return`: 3 files (`imagenes.vo`, `valoracion-google.vo`, `evento-firestore.adapter`).

All modules follow Clean Architecture (`domain/application/infrastructure`); violations are concentrated in `application` services, domain value objects, controllers, and config. None alter the documented API contract (`docs/api-spec.yml`).

## Goals / Non-Goals

**Goals:**
- Reach `make solid-lint` backend = 0 errors across all modules.
- Preserve runtime behavior and API contracts.
- Add/extend unit tests only where a refactor could change behavior (value objects, services).

**Non-Goals:**
- No new features, no API signature changes.
- No frontend changes (separate follow-up).
- No dependency-cruiser/madge violations are expected (only ESLint thresholds are in scope here).

## Decisions

### D1 — Joi import style
**Decision:** In `validation.config.ts`, replace `import * as Joi from 'joi'` with a default import (`import Joi from 'joi'`) and keep `Joi.x` references. Named imports were attempted first (`import { object, string, number, boolean } from 'joi'`) but rejected: Joi v17's schema builders call `this` internally, so named imports throw "Must be invoked on a Joi instance" at runtime. The default import is not a namespace import, so `import/namespace` no longer flags it, and runtime validation behavior is unchanged.
**Rationale:** `import/namespace` flagged members not statically found in the CJS namespace; the default import avoids the namespace form entirely while keeping behavior identical (verified by `validation.config.spec.ts`).
**Alternatives considered:** Disable `import/namespace` for config files — rejected (loss of guard). Named imports — rejected (runtime breakage in Joi v17).

### D2 — Complexity reduction via extraction (SRP)
**Decision:** For each method over the threshold, extract cohesive helpers (e.g., `places.service.update` → `applyPlaceUpdate()` / `validatePlaceUpdate()`; domain VOs → early-return guards / lookup maps).
**Rationale:** Keeps each method ≤10 complexity, improves readability; OCP-friendly.

### D3 — Duplicate strings as named constants
**Decision:** Extract repeated literals (route prefixes, error messages) into `const`/`readonly` module constants or shared `constants.ts`.
**Rationale:** Removes `no-duplicate-string` and centralizes magic values (aligns with SRP/clean code).

### D4 — Service file splitting (max-lines)
**Decision:** Split `eventos.service.ts` (>300 lines) into focused services or move pure helpers to `application/` sub-files (e.g., `evento-query.builder.ts`).
**Rationale:** Enforces the 300-line SRP threshold from `docs/backend-standards.md`.

### D5 — Identical functions extraction
**Decision:** In `usuarios.service.ts`, extract the duplicated logic into a single private helper invoked by both call sites.
**Rationale:** Removes `no-identical-functions`, DRY.

### D6 — Test-first on behavior-bearing refactors
**Decision:** Add/extend specs for `imagenes.vo`, `valoracion-google.vo`, `places.service`, `solicitudes.service` before editing; keep existing specs green.
**Rationale:** TDD protects domain logic during extraction.

## Risks / Trade-offs

- **[Risk]** Splitting `eventos.service.ts` could change DI surface. → Mitigation: keep the public class API identical; only internal file reorganization.
- **[Risk]** Joi default import could be flagged by `import/default` if Joi lacked a default export — mitigated: Joi v17 provides a default export (verified by lint passing).
- **[Trade-off]** More small files; acceptable per Clean Architecture.

## Migration Plan

- No deploy step; build/lint-time only.
- Rollback: revert commit; `make solid-lint` returns to prior (red) state.
- CI: `.github/workflows/ci.yml` already invokes `make solid-lint`.

## Open Questions

- None blocking.
