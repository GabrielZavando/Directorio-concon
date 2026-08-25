# usuarios Specification

## Purpose
TBD - created by archiving change roles-rename. Update Purpose after archive.
## Requirements
### Requirement: Usuario entity schema
The system SHALL persist a `Usuario` document in the Firestore collection `usuarios` with the following fields:

- `id: string` — Firebase Auth UID (PK); same value as `firebase.auth().currentUser.uid`
- `email: string` — UNIQUE, validated as email format on create
- `nombre: string` — display name (2..100 characters)
- `rol: Rol` — controlled enum: `'admin' | 'owner' | 'member'`; set at creation via self-registration (`POST /auth/registro` with `'member' | 'owner'`) or via the `seed-admin` script (first `'admin'`)
- `telefono?: string` — Chilean-format phone (free string)
- `createdAt: Date` — document creation timestamp
- `updatedAt: Date` — last modification timestamp

**The `placeId` field is REMOVED from the entity.** The user→place relation has a single source of truth: `places.usuarioId`. Resolving "which places does this user own" SHALL be done via a query on the `places` collection (`WHERE usuarioId == uid`). The repository method `linkPlaceId(uid, placeId)` and the service-level invariant `assertRolPlaceIdInvariant` (with its owner→non-owner cascade) are REMOVED.

**Historical note (for audit):** the field `usuarios.placeId` existed between the changes `auth-usuarios` and `auth-usuarios-v2`, along with the invariant "`placeId` REQUIRED when `rol === 'owner'`, forbidden otherwise". It was removed because (a) it duplicated the relation already stored in `places.usuarioId`, creating drift risk, and (b) it was incompatible with self-registration, where an owner exists before owning any place.

The controller exposes: `GET /usuarios/me` (self), `PUT /usuarios/me` (self), `GET /usuarios` (admin), `GET /usuarios/:uid` (admin), `PUT /usuarios/:uid/rol` (admin). **`POST /usuarios` (admin provisioning) is REMOVED** — users arrive via self-registration or the `seed-admin` script.

#### Scenario: Self-registration creates document without placeId
- **GIVEN** a visitor calls `POST /api/v1/auth/registro` with `rol: 'owner'`
- **THEN** the created `usuarios` document contains NO `placeId` field
- **AND** resolving "the place of this owner" is a `places` query by `usuarioId`, returning zero results until the owner creates a place

#### Scenario: Self profile retrieval and update
- **GIVEN** an authenticated user with UID `uid-001`
- **WHEN** the user calls `GET /api/v1/usuarios/me` with their `Bearer` token
- **THEN** the response is `200` with their `usuarios` document (`{ id, email, nombre, rol, telefono?, createdAt, updatedAt }` — sin `placeId`)
- **AND** when calling `PUT /api/v1/usuarios/me` with `{ nombre, telefono }`, the response is `200` with the updated document
- **AND** `rol` is NOT accepted in the `UpdatePerfil` body (forbidNonWhitelisted)

#### Scenario: Provisioning admin endpoint no longer exists
- **GIVEN** an authenticated admin with a valid Bearer token
- **WHEN** the admin calls `POST /api/v1/usuarios` with any payload
- **THEN** the response is `404` (route removed)

### Requirement: Favouritos (deferred)
The `usuarios` entity SHALL NOT include a `favoritos` field in this change. The modelling of the favourite-places capability for the `member` role (the user can save `places` references and list them on their profile) is **deferred** to the future `auth + usuarios` change, where the storage shape (array on the `usuarios` document vs. subcollection `usuarios/{uid}/favoritos/{placeId}` vs. top-level collection `favoritos`) will be decided against actual access patterns.

This change only records the deferral as a `docs/data-model.md` note; no schema entry, no DTO field, no migration.

#### Scenario: Spec reader is informed of the deferral
- **WHEN** a stakeholder opens `docs/data-model.md §usuarios`
- **THEN** a "Favoritos (deferred)" note appears, declaring the field's omission is intentional and scoped to the future `auth + usuarios` change
- **AND** the note enumerates the three storage shapes under consideration so the decision can be picked up without rediscovery

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

### Requirement: Rol transitions are restricted to admin/member targets
The endpoint `PUT /api/v1/usuarios/:uid/rol` (`@Roles('admin')`) SHALL accept a body `{ rol }` enumerated to `['admin', 'member']` ONLY. A request with `rol: 'owner'` SHALL be rejected with `400 Bad Request` and an explicit message (the `owner` rol is acquired exclusively via self-registration). Transitions between `admin` and `member` are permitted. Transitions out of `owner` (demoting an owner) are deferred to the `places-refactor` change (CH-03), which decides what happens to the owner's places; until then such transitions SHALL NOT be performed via this endpoint's accepted set.

#### Scenario: Admin assigns member rol to an admin (or vice versa)
- **GIVEN** a `usuarios` document `uid-1` with `rol: 'member'`
- **WHEN** an admin calls `PUT /api/v1/usuarios/uid-1/rol` with `{ rol: 'admin' }`
- **THEN** the response is `200` with `rol: 'admin'`

#### Scenario: Assigning owner rol via admin endpoint is rejected
- **GIVEN** a `usuarios` document `uid-2` with `rol: 'member'`
- **WHEN** an admin calls `PUT /api/v1/usuarios/uid-2/rol` with `{ rol: 'owner' }`
- **THEN** the response is `400 Bad Request`
- **AND** the document remains unchanged

#### Scenario: Non-admin cannot change roles
- **GIVEN** an authenticated user with `rol: 'owner'` or `'member'`
- **WHEN** they call `PUT /api/v1/usuarios/:uid/rol` with any body
- **THEN** the response is `403 Forbidden` (`RolesGuard` + `@Roles('admin')`)

