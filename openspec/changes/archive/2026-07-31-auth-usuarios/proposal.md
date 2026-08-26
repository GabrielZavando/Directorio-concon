## Why

Three runtime divergences from the canonical data model persist as documented
"authentication debt" since the `roles-rename` change (see `openspec/specs/usuarios/spec.md §Authentication debt` and `docs/data-model.md §usuarios`):

1. `places.usuarioId` is hardcoded to the literal `"anonymous"` (`places.controller.ts:44`), regardless of who calls `POST /places`. The model asserts this field is the place owner's Firebase Auth UID.
2. `eventos.usuarioId` is sourced from the provisional `x-usuario-id` HTTP header (`eventos.controller.ts:50,132,156`), not from a verified Firebase Auth JWT. The header accepts arbitrary strings and is not a security boundary.
3. `solicitudes.revisadoPor` is written by callers without runtime `rol === 'admin'` validation (no `auth` Guards exist; `SolicitudesModule` exposes no HTTP controller). The model asserts this field MUST resolve to a `usuarios` with `rol === 'admin'`.

This change closes all three debts by implementing the Firebase Auth integration and the `usuarios` module end-to-end. It is the prerequisite for every other MVP module where authenticated authorship or admin-only moderation is required. Deferring further blocks the secure shipment of `eventos`, `places`, and any future admin panel.

## What Changes

- **New `auth` module** (NestJS, Clean Architecture by feature): `JwtAuthGuard` (verifies Firebase `idToken` via `FirebaseService.verifyIdToken`), `RolesGuard` + `@Roles(...)` decorator + `@CurrentUser()` decorator + `@Public()` decorator, `AuthContext` value object (`{ uid, email, rol, placeId? }`), `AuthContextRepository` interface with a Firestore-backed adapter (custom claim `rol` on the decoded token with fallback to a `usuarios/{uid}` Firestore lookup, cacheable via Redis).
- **Completions to the `usuarios` module** (only `domain/rol.enum.ts` exists today): `Usuario` entity, `UsuariosRepository` interface + Firestore adapter, `UsuariosService` (CRUD self + admin), `UsuariosController` (`GET /usuarios/me`, `PUT /usuarios/me`, `GET /usuarios/:uid` admin-only, `PUT /usuarios/:uid/rol` admin-only via `@IsEnum(ROL_VALUES)`). Default `rol` on registration is `'member'`.
- **New `SolicitudesController`** (HTTP layer does not exist today): `POST /solicitudes/:id/approve` and `/reject`, both `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`. Set `revisadoPor = request.user.uid` and `revisadoAt = now` before delegating to the existing `SolicitudesService`.
- **`PlacesController.create`** — replace `usuarioId = "anonymous"` with `@CurrentUser() user: AuthContext` and read `user.uid`. Add `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')` on `POST /places`. Read endpoints (`GET /places`, `GET /places/:id`, `GET /places/slug/:slug`, `GET /places/map-data`, `GET /places/:id/abierto-ahora`) remain unauthenticated for anonymous discovery.
- **`EventosController`** — replace `@Headers("x-usuario-id")` and `@Headers("x-rol")` with `@CurrentUser() user`. Add `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')` on `POST /eventos`, `PUT /eventos/:id`, `DELETE /eventos/:id`. Read endpoints (`GET /eventos`, `GET /eventos/:id`, `GET /eventos/slug/:slug`, `GET /eventos/map-data`) remain unauthenticated.
- **BREAKING**: the `x-usuario-id` and `x-rol` request headers are removed from `eventos` routes. Clients must send `Authorization: Bearer <idToken>`. The frontend is not yet implemented (`frontend/` directory does not exist), so no live consumers break.
- **`docs/api-spec.yml`** updated: `bearerAuth` security applied to protected paths; new schemas `Usuarios`, `UpdatePerfil`, `UpdateRol`, `AuthContext`; new paths `/usuarios/me`, `/usuarios/:uid`, `/usuarios/:uid/rol`, `/solicitudes/:id/approve`, `/solicitudes/:id/reject`; documented that `places.usuarioId` / `eventos.usuarioId` are server-set.
- **No data migration**: the `usuarios` Firestore collection is empty today (the `UsuariosModule` was not implemented). New registrations start post-`auth + usuarios` directly with the `'admin' | 'owner' | 'member'` enum introduced by `roles-rename`.
- **Out of scope (deferred)**: `usuarios.favoritos` storage shape (deferred to a future `favoritos-crud` change); Angular Material admin panel UI (deferred per `docs/base-standards.md §8.4`); Firebase Auth custom-claim backfill script (deferred — the Firestore fallback covers existing users until a future `usuarios-backfill-claims` change); Firebase Auth emulator setup for E2E (deferred to a future `test-infra` change — unit tests use mocked `verifyIdToken`).

## Capabilities

### New Capabilities
- `auth`: Firebase Auth JWT verification, role-based authorization guards/decorators (`JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser`, `@Public`), and the `AuthContext` value object that travels on `request.user`. The single feature that closes the three authentication debts across `places`, `eventos`, and `solicitudes`.

### Modified Capabilities
- `usuarios`: the "Authentication debt" requirement transitions from "documented, not enforced" to "closed — enforced at runtime via `JwtAuthGuard` + `RolesGuard`". The "Usuario entity schema" requirement gains the runtime `usuarios` module that creates/reads/updates `Usuario` documents (previously the collection was model-only). The "Admin rol is set only by another admin" scenario moves from spec text to enforced `@Roles('admin')` on `PUT /usuarios/:uid/rol`. The "Favouritos (deferred)" requirement remains unchanged (still deferred).
- `solicitudes`: the "`revisadoPor` resolver — rol `'admin'`" requirement transitions from "documented, not enforced" to "enforced via `@Roles('admin')` on the new `POST /solicitudes/:id/approve|reject` endpoints". `revisadoPor` is now set from `request.user.uid` and validated against `rol === 'admin'` at the guard layer.
- `places`: the "Solicitud auto-creation on place create" and "CreatePlace DTO — `usuarioId` is not client-supplied" requirements gain runtime enforcement: `POST /places` is now `owner`-only (`@Roles('owner')`) and `usuarioId` is sourced from the verified JWT instead of hardcoded to `"anonymous"`.
- `eventos`: the "Event creator is the responsable (rol `owner` or `admin`)" requirement gains runtime enforcement via `@Roles('owner', 'admin')` + `@CurrentUser`; the `x-usuario-id`/`x-rol` header flow is removed.
- `api-contract`: the contract now formally specifies `bearerAuth` (Firebase JWT) as the security scheme on protected paths, adds the `usuarios` and `solicitudes` approve/reject endpoints to the contract, and clarifies that `places.usuarioId` / `eventos.usuarioId` are server-set (not accepted in request DTOs).

## Impact

- **Code**:
  - Backend `backend/src/modules/`: new `auth/` module (domain + application + infrastructure); `usuarios/` completed (domain + application + infrastructure + controller); `solicitudes/` gains a `SolicitudesController`; `places/` and `eventos/` controllers refactored to use guards/decorators.
  - Backend `app.module.ts`: imports `AuthModule` and `UsuariosModule` (currently commented out).
- **APIs**: new endpoints `GET/PUT /usuarios/me`, `GET /usuarios/:uid`, `PUT /usuarios/:uid/rol`, `POST /solicitudes/:id/approve`, `POST /solicitudes/:id/reject`; protected paths now require `Authorization: Bearer <idToken>`. The `x-usuario-id`/`x-rol` headers are removed from `eventos`.
- **Documentation**: `docs/api-spec.yml` updated (new schemas + paths + security); `docs/data-model.md` "Authentication debt" block updated to mark the three debts as closed; `docs/base-standards.md §8.4` roadmap updated (`auth` and `usuarios` move out of "next to implement" into "implemented MVP").
- **Specs**: `openspec/specs/{auth,usuarios,solicitudes,places,eventos,api-contract}/spec.md` updated via this change's archive; new `auth` spec created.
- **Dependencies**: no new runtime npm dependency — `firebase-admin` (already in `backend/package.json`) provides `verifyIdToken`. No new dev dependency for unit tests (Jest already configured); `verifyIdToken` is mocked in `auth.service.spec.ts` and the controller specs.
- **Tests**: new unit tests for `auth.service`, `jwt-auth.guard`, `roles.guard`, `usuarios.service`, `usuarios-firestore.adapter`, `usuarios.controller`, `solicitudes.controller`; amended unit tests for `places.controller` (the `member → 403` scenario) and `eventos.controller` (the `owner → token.uid` scenario); three canonical scenarios from the ticket become the regression set. Coverage target ≥ 90% on touched modules.
- **Risk**: there are no live frontend consumers (frontend not implemented), so the `x-usuario-id` removal is breaking-by-contract only. The Redis-backed cache for the Firestore rol lookup is optional (already wired globally via `CacheModule`); tests run without Redis via in-memory fallback.
