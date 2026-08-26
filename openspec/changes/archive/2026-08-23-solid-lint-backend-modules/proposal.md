## Why

After `solid-001-backend-common-cleanup` fixed the TypeScript import resolver in `templates/ci/eslintrc.backend.js`, `make solid-lint` now executes fully across the backend and surfaces **51 pre-existing SOLID-lint errors** outside the `common/` infrastructure scope (in `config/`, `modules/places`, `modules/eventos`, `modules/solicitudes`, `modules/usuarios`, `modules/categorias`). These were always present but were filtered out of the original finding. They must be resolved so the backend SOLID gate is green project-wide, per `docs/backend-standards.md`.

## What Changes

- `src/config/validation.config.ts`: 21 `import/namespace` errors from `import * as Joi` usage. Switch to named `import { object, string, number, boolean } from 'joi'` (or adjust the lint rule) so namespace members resolve.
- `complexity` (6 files) + `sonarjs/cognitive-complexity` (4 files, overlapping): refactor methods exceeding the ≤10 threshold — notably `places.service.update` (18), `imagenes.vo.isValidImagenes` (13), `valoracion-google.vo.isValidValoracionGoogle` (11), `solicitudes.service.aprobarSolicitud` (11), `eventos.service`, `place-approval.handler`, `evento-approval.handler`.
- `sonarjs/no-duplicate-string` (5 files): extract duplicated literals (e.g., repeated `'/api/v1/...'` in `places.controller.ts`, error strings) to named constants.
- `@typescript-eslint/no-unused-vars` (4 files): remove unused imports/vars (`ConflictException` in `places.controller.ts`, `IsUrl` in `imagenes.dto.ts`, `_adminUid` in `place-approval.handler.ts`, duplicate import in `solicitudes.service.ts`).
- `@typescript-eslint/no-explicit-any` (1 file): replace `any` with explicit types in `firebase.service.ts`.
- `max-lines` (1 file): `eventos.service.ts` exceeds 300 lines — split responsibilities.
- `sonarjs/no-identical-functions` (1 file): `usuarios.service.ts` has two identical functions — extract shared logic.
- `sonarjs/prefer-single-boolean-return` / `prefer-immediate-return` (3 files): simplify boolean returns in `imagenes.vo`, `valoracion-google.vo`, `eventos` adapter.

All changes are behavior-preserving; no API contracts change (verify against `docs/api-spec.yml`).

## Capabilities

### New Capabilities
- `backend-modules-solid-cleanup`: Non-functional requirement that every backend module file (outside `common/`) complies with the SOLID thresholds enforced by `make solid-lint` (complexity ≤10, cognitive ≤10, max 300 lines, no `any`, no unused vars, no duplicate strings), so the project-wide SOLID gate passes.

### Modified Capabilities
<!-- None — internal cleanup, no requirement behavior changes. -->

## Impact

- **Code**: `src/config/validation.config.ts`, `src/modules/places/**`, `src/modules/eventos/**`, `src/modules/solicitudes/application/solicitudes.service.ts`, `src/modules/usuarios/application/usuarios.service.ts`, `src/modules/categorias/infrastructure/categoria-firestore.adapter.spec-helpers.ts`, `src/common/services/firebase.service.ts`.
- **CI**: `.github/workflows/ci.yml` runs `make solid-lint`; this change turns it fully green.
- **API**: No breaking changes.
