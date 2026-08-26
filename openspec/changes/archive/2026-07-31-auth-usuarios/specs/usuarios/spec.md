# usuarios Specification (delta — auth-usuarios)

## RENAMED Requirements

FROM: ### Requirement: Authentication debt (documented, not yet enforced)
TO: ### Requirement: Authentication debt (closed — enforced at runtime)

## MODIFIED Requirements

### Requirement: Usuario entity schema
The system SHALL persist a `Usuario` document in the Firestore collection `usuarios` with the following fields:

- `id: string` — Firebase Auth UID (PK); same value as `firebase.auth().currentUser.uid`
- `email: string` — UNIQUE, validated as email format on create
- `nombre: string` — display name (2..100 characters)
- `rol: Rol` — controlled enum: `'admin' | 'owner' | 'member'` (default `'member'` on registration via the `usuarios` create flow introduced by this change)
- `placeId?: string` — reference to the `places` document the user owns; set when and only when `rol === 'owner'`; MUST be `null`/omitted for `'admin'` and `'member'`
- `telefono?: string` — Chilean-format phone (free string)
- `createdAt: Date` — document creation timestamp
- `updatedAt: Date` — last modification timestamp

The controlled type `Rol = 'admin' | 'owner' | 'member'` is defined as a reusable domain enum at `backend/src/modules/auth/domain/rol.enum.ts` (introduced by the `roles-rename` change; **moved** from `usuarios/domain/` to `auth/domain/` by this change — Task 4.1, Option A: `auth` owns its own domain so `auth → usuarios` has zero imports, closing a DIP cross-module violation). The `ROL_VALUES` const is the closed array used by `class-validator` `@IsEnum` validation on the `PUT /usuarios/:uid/rol` body, and by `AuthService.buildContext` to validate the Firebase custom claim.

The usuarios module (`backend/src/modules/usuarios/`) is fully assembled by this change with domain (`Usuario` entity + `UsuariosRepository` interface + DI token), application (`UsuariosService` + interface), and infrastructure (`UsuariosFirestoreAdapter` + `UsuariosController` + DTOs). The `UsuariosService` implements: `findById`, `findByEmail`, `create` (admin-only), `updatePerfil` (self service), `updateRol` (admin-only), `linkPlaceId`. The controller exposes `GET /usuarios/me` (self), `PUT /usuarios/me` (self), `GET /usuarios/:uid` (admin-only), `PUT /usuarios/:uid/rol` (admin-only).

#### Scenario: Owner registers with a place
- **GIVEN** an authenticated Firebase user with UID `uid-owner-001` and email `owner@example.com`
- **AND** an admin with `rol: 'admin'` (the `usuarios` create flow is admin-only in this change — self-registration via a public signup endpoint is deferred; the frontend Firebase Auth signup creates the Firebase Auth user, and an admin provisions the `usuarios` document with the appropriate `rol`)
- **WHEN** the admin calls `POST /api/v1/usuarios` (admin-only `{ uid, email, nombre, rol: 'owner', placeId: 'restaurante-el-marino' }`) OR `PUT /api/v1/usuarios/:uid/rol` to upgrade an existing `member` to `owner`
- **THEN** a `usuarios` document is created/upserted with `id: 'uid-owner-001'`, `rol: 'owner'`, `placeId: 'restaurante-el-marino'`
- **AND** no duplicate `usuarios` document with the same `email` exists (UNIQUE constraint on `email` enforced by `UsuariosService.create` checking `findByEmail` before persisting)

#### Scenario: Member registers with default rol
- **GIVEN** an authenticated Firebase user with no `places` ownership intent
- **WHEN** an admin provisions the user via `POST /api/v1/usuarios` with `{ uid, email, nombre }` (no explicit `rol`)
- **THEN** the document is created with `rol: 'member'` and `placeId: null`

#### Scenario: Self profile retrieval and update
- **GIVEN** an authenticated user with UID `uid-owner-001`
- **WHEN** the user calls `GET /api/v1/usuarios/me` with their `Bearer` token
- **THEN** the response is `200` with their `usuarios` document (`{ id, email, nombre, rol, placeId, telefono, createdAt, updatedAt }`)
- **AND** when the user calls `PUT /api/v1/usuarios/me` with `{ nombre: 'Nuevo Nombre', telefono: '+569...' }`, the response is `200` with the updated document
- **AND** the `rol` and `placeId` fields are NOT accepted in the `UpdatePerfil` body (forbidNonWhitelisted) — only `nombre` and `telefono` are mutable by the user on their own profile

#### Scenario: Admin rol is set only by another admin
- **GIVEN** a `usuarios` document with `rol: 'member'`
- **WHEN** a non-admin (rol `'owner'` or `'member'`) attempts `PUT /api/v1/usuarios/:uid/rol` with `{ rol: 'admin' }`
- **THEN** the operation is rejected with `403` (the `RolesGuard` with `@Roles('admin')` on the controller method enforces this — no spec-honesty caveat remains)
- **AND** when an admin calls the same endpoint, the response is `200` with the updated `rol`

#### Scenario: UpdateRol validates against the closed Rol enum
- **WHEN** an admin sends `PUT /api/v1/usuarios/:uid/rol` with `{ rol: 'superuser' }` (not in `ROL_VALUES`)
- **THEN** the response is `400` with error: `rol must be one of: admin, owner, member`
- **AND** the `usuarios` document is not mutated

### Requirement: Authentication debt (closed — enforced at runtime)
~~The canonical model `docs/data-model.md` SHALL carry an explicit "Authentication debt" note block to inform consumers that, until the future MVP `auth + usuarios` change ships, the runtime behaviour of `usuarioId` fields across the existing modules diverges from the model's stated intent.~~

This change **closes** the authentication debt. The three runtime divergences documented in the `roles-rename` change are now enforced at runtime:

- `places.usuarioId` is no longer the literal string `"anonymous"`. `POST /api/v1/places` is decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')` and the controller reads `usuarioId` from `@CurrentUser() user: AuthContext`. The persisted `usuarioId` is the verified publisher's UID.
- `eventos.usuarioId` is no longer sourced from the `x-usuario-id` HTTP header. `POST/PUT/DELETE /api/v1/eventos` are decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')` and the controller reads `usuarioId` from `@CurrentUser()`. The `x-usuario-id` and `x-rol` headers are removed.
- `solicitudes.revisadoPor` is now set by the new `SolicitudesController` approve/reject endpoints, both decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`. The `revisadoPor` field is sourced from `@CurrentUser() user.uid` and the `RolesGuard` guarantees `rol === 'admin'`.

The `docs/data-model.md` "Authentication debt" note block is updated by this change to mark the three debts as **closed** with a reference to the `auth-usuarios` change as the closure (no longer "future"). The `usuarios` spec's prior "this requirement is a documentation-only requirement; no code path enforces it in this change" caveat is **removed** — runtime enforcement now exists.

#### Scenario: places.usuarioId is sourced from the verified JWT
- **GIVEN** an authenticated `owner` with UID `uid-owner-001`
- **WHEN** the owner sends `POST /api/v1/places` with a valid body and `Authorization: Bearer <idToken>`
- **THEN** the persisted `Place` document has `usuarioId: 'uid-owner-001'` (NOT the literal `"anonymous"`)
- **AND** a solicitud is auto-created with `usuarioId: 'uid-owner-001'`

#### Scenario: eventos.usuarioId is sourced from the verified JWT (x-usuario-id removed)
- **GIVEN** an authenticated `owner` with UID `uid-owner-001`
- **WHEN** the owner sends `POST /api/v1/eventos` with `Authorization: Bearer <idToken>` and NO `x-usuario-id` header
- **THEN** the persisted `Evento` document has `usuarioId: 'uid-owner-001'`
- **AND** if the client sends an `x-usuario-id` header, it is silently ignored (the controller no longer reads it)
- **AND** a solicitud is auto-created with `usuarioId: 'uid-owner-001'`

#### Scenario: solicitudes.revisadoPor is sourced from the verified admin JWT
- **GIVEN** a pending `solicitud` and an authenticated `admin` with UID `uid-admin-001`
- **WHEN** the admin sends `POST /api/v1/solicitudes/<id>/approve` with `Authorization: Bearer <idToken>`
- **THEN** the solicitud transitions to `status: 'aprobado'`, `revisadoPor: 'uid-admin-001'`, `revisadoAt: <now>`
- **AND** the `revisadoPor` is the verified `admin` UID — the `RolesGuard` guaranteed `rol === 'admin'` before the handler executed

#### Scenario: Non-admin cannot approve a solicitud (runtime enforced)
- **GIVEN** a pending `solicitud` and an authenticated `owner` (rol `'owner'`)
- **WHEN** the owner sends `POST /api/v1/solicitudes/<id>/approve`
- **THEN** the response is `403` with error: `rol 'owner' is not allowed to perform this operation`
- **AND** the solicitud is NOT mutated (the `RolesGuard` short-circuits before the handler)

#### Scenario: docs/data-model.md no longer describes the debt as pending
- **WHEN** a stakeholder opens `docs/data-model.md §usuarios`
- **THEN** the "Authentication debt" note block (updated by this change) marks each of the three bullets as **closed** with a reference to the `auth-usuarios` change
- **AND** the note no longer reads as a future `auth + usuarios` change obligation
