# usuarios Specification (delta — auth-usuarios-v2)

## MODIFIED Requirements

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

## ADDED Requirements

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
