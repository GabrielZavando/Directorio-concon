## 1. Config (Joi namespace)

- [x] 1.1 In `src/config/validation.config.ts`, replace `import * as Joi` with named imports and update all `Joi.*` usages
- [x] 1.2 Run `make solid-lint` scoped to `src/config/validation.config.ts` — 0 `import/namespace` errors

## 2. Unused vars / duplicate imports

- [x] 2.1 Remove unused `ConflictException` in `src/modules/places/infrastructure/places.controller.ts`
- [x] 2.2 Remove unused `IsUrl` in `src/modules/places/infrastructure/dto/imagenes.dto.ts`
- [x] 2.3 Remove unused `_adminUid` in `src/modules/places/application/place-approval.handler.ts`
- [x] 2.4 Collapse duplicate import in `src/modules/solicitudes/application/solicitudes.service.ts`
- [x] 2.5 Run `make solid-lint` scoped to those files — 0 `no-unused-vars`/`import/no-duplicates` errors

## 3. Domain value objects (complexity + boolean returns)

- [x] 3.1 Refactor `src/modules/places/domain/imagenes.vo.ts` (`isValidImagenes`) to ≤10 complexity and single boolean returns; add/keep spec
- [x] 3.2 Refactor `src/modules/places/domain/valoracion-google.vo.ts` (`isValidValoracionGoogle`) likewise; add/keep spec
- [x] 3.3 Run `make solid-lint` scoped to `src/modules/places/domain` — 0 complexity/cognitive/prefer-single-boolean-return errors

## 4. Application services (complexity + duplicate strings)

- [x] 4.1 Refactor `src/modules/places/application/places.service.ts` `update()` (complexity 18) into helpers; add/extend spec
- [x] 4.2 Refactor `src/modules/solicitudes/application/solicitudes.service.ts` `aprobarSolicitud()` (complexity 11) and extract duplicated literals
- [x] 4.3 Refactor `src/modules/eventos/application/eventos.service.ts` and `evento-approval.handler.ts` complexity
- [x] 4.4 Extract duplicated route/error string literals in `places.controller.ts`, `eventos.controller.ts`, `categoria-firestore.adapter.spec-helpers.ts`, `solicitudes.service.ts`, `eventos.service.ts` into named constants

## 5. Service file size + duplicated logic + any

- [x] 5.1 Split `src/modules/eventos/infrastructure/evento-firestore.adapter.ts` (>300 lines) into focused files keeping public API unchanged
- [x] 5.2 Extract identical functions in `src/modules/usuarios/application/usuarios.service.ts` into a shared helper
- [x] 5.3 Replace `any` in `src/common/services/firebase.service.ts` with explicit types
- [x] 5.4 Fix `max-lines` in `src/modules/eventos/infrastructure/evento-firestore.adapter.ts` (split into `evento.mapper.ts`)

## 6. Verification

- [x] 6.1 Run `make solid-lint` (backend) — zero errors (ESLint + dependency-cruiser). NOTE: the `frontend` stage of `make solid-lint` fails independently because the frontend workspace is not yet configured in this environment — tracked separately, out of scope for this backend change.
- [x] 6.2 Run `npm --prefix backend test` — all green (693/693)
- [x] 6.3 Confirm `docs/api-spec.yml` contracts unchanged
