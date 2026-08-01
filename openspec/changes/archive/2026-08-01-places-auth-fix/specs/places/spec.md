# places Specification (delta — places-auth-fix)

## MODIFIED Requirements

### Requirement: Update place
The system SHALL allow partial updates of a place. If `nombre` changes, the `slug` is regenerated and uniqueness is re-validated. Only the owner (publisher with matching `usuarioId`) or an admin may update.

The endpoint `PUT /api/v1/places/{id}` is decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')`; the controller reads the actor from `@CurrentUser() user: AuthContext` and passes it to `PlacesService.update(id, dto, actor)`. The service enforces ownership at runtime: `if (actor.rol !== 'admin' && existing.usuarioId !== actor.uid)` → `403 Forbidden`. The `"anonymous"` literal stub in `update` is removed.

#### Scenario: Owner updates own place
- **GIVEN** an authenticated `owner` with UID `uid-owner-001` and a place with `usuarioId: 'uid-owner-001'`
- **WHEN** the owner sends `PUT /api/v1/places/{id}` with `Authorization: Bearer <idToken>` and a valid partial body
- **THEN** the response is `200` with the updated place, `updatedAt` refreshed

#### Scenario: Owner updates another owner's place — denied with 403
- **GIVEN** an authenticated `owner` with UID `uid-owner-001` and a place with `usuarioId: 'uid-owner-002'`
- **WHEN** the owner sends `PUT /api/v1/places/{id}` with `Authorization: Bearer <idToken>`
- **THEN** the response is `403` with error: `No tienes permiso para modificar este lugar`
- **AND** no update is applied

#### Scenario: Admin can update any place
- **WHEN** an admin sends `PUT /api/v1/places/{id}` for a place owned by another user
- **THEN** the response is `200` regardless of `usuarioId`

#### Scenario: Member attempts to update — denied with 403
- **GIVEN** an authenticated user with `rol: 'member'`
- **WHEN** the member sends `PUT /api/v1/places/{id}` with `Authorization: Bearer <idToken>`
- **THEN** the response is `403` with error: `rol 'member' is not allowed to perform this operation`
- **AND** the `RolesGuard` short-circuits before the handler

#### Scenario: Anonymous attempt to update — denied with 401
- **WHEN** a caller with no `Authorization` header sends `PUT /api/v1/places/{id}`
- **THEN** the response is `401` (the `JwtAuthGuard` rejects before `RolesGuard` runs)

#### Scenario: Owner changes nombre triggers slug regeneration
- **WHEN** owner sends `PUT` with new `nombre`
- **THEN** slug is regenerated from the new name, uniqueness checked, and updated

#### Scenario: Update rejects duplicate slug after rename
- **WHEN** owner renames to a nombre that derives a slug already taken
- **THEN** response `409` "Slug duplicado", no update applied

### Requirement: Delete place
The system SHALL allow deletion of a place by its owner or an admin. Deletion is blocked if any pending `solicitud` references the place.

The endpoint `DELETE /api/v1/places/{id}` is decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')`; the controller reads the actor from `@CurrentUser() user: AuthContext` and passes it to `PlacesService.delete(id, actor)`. The service enforces ownership at runtime: `if (actor.rol !== 'admin' && existing.usuarioId !== actor.uid)` → `403 Forbidden`.

> **Semantics note (corrected by the real repository)**: with the `StubSolicitudesRepository`, `existsByPlaceId` always returned `false` and deletion was never blocked. The real `SolicitudesFirestoreAdapter.existsByPlaceId` filters `status === 'pendiente'` — the same semantic as `eventos.remove` (`existsPendingByEventoId`). This change aligns the spec with the real-repo semantic: **deletion is blocked only while a pending solicitud exists** (an approved/rejected solicitud does not block deletion). Historical spec text said "any status"; that wording is superseded.

#### Scenario: Owner deletes own place with no pending solicitudes
- **GIVEN** an authenticated `owner` with UID `uid-owner-001` and a place with `usuarioId: 'uid-owner-001'`
- **WHEN** the owner sends `DELETE /api/v1/places/{id}` with `Authorization: Bearer <idToken>` and no `solicitud` has `placeId = {id}` with `status: 'pendiente'`
- **THEN** the response is `200` with `{ deleted: true, id }`, place document removed

#### Scenario: Owner deletes another owner's place — denied with 403
- **GIVEN** an authenticated `owner` with UID `uid-owner-001` and a place with `usuarioId: 'uid-owner-002'`
- **WHEN** the owner sends `DELETE /api/v1/places/{id}` with `Authorization: Bearer <idToken>`
- **THEN** the response is `403` with error: `No tienes permiso para eliminar este lugar`
- **AND** the place document is NOT removed

#### Scenario: Admin can delete any place
- **WHEN** an admin sends `DELETE /api/v1/places/{id}` for a place owned by another user
- **THEN** the response is `200` (subject to the pending-solicitud guard)

#### Scenario: Delete blocked by pending solicitud
- **WHEN** a `solicitud` with `placeId = {id}` and `status: 'pendiente'` exists
- **AND** owner or admin sends `DELETE`
- **THEN** the response is `409` with error: `No se puede eliminar: existen solicitudes asociadas a este lugar`
- **AND** the place document is NOT removed

#### Scenario: Member attempts to delete — denied with 403
- **GIVEN** an authenticated user with `rol: 'member'`
- **WHEN** the member sends `DELETE /api/v1/places/{id}` with `Authorization: Bearer <idToken>`
- **THEN** the response is `403` with error: `rol 'member' is not allowed to perform this operation`
- **AND** the `RolesGuard` short-circuits before the handler

#### Scenario: Anonymous attempt to delete — denied with 401
- **WHEN** a caller with no `Authorization` header sends `DELETE /api/v1/places/{id}`
- **THEN** the response is `401` (the `JwtAuthGuard` rejects before `RolesGuard` runs)

### Requirement: Solicitud auto-creation on place create
The system SHALL automatically create a `solicitud` document when a place is created. The `POST /api/v1/places` endpoint is decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')` so that only authenticated users with `rol: 'owner'` may create a place; the controller reads the publisher's UID from `@CurrentUser() user: AuthContext` (the verified Firebase Auth UID) rather than hardcoding the literal `"anonymous"` string. The auto-created `solicitud` carries the verified `usuarioId`.

**Persistence correction**: this change replaces the `StubSolicitudesRepository` (which returned `{ id: "stub" }` and never persisted) with the real `SolicitudesModule`'s `SOLICITUDES_REPOSITORY` (`SolicitudesFirestoreAdapter`), imported via a **direct module import** (no `forwardRef` — the module graph has no circular dependency). The auto-created `solicitud` is now actually persisted in the `solicitudes` collection and carries a real Firestore document ID.

#### Scenario: Solicitud created with correct linkage
- **GIVEN** an authenticated `owner` with UID `uid-owner-001`
- **WHEN** the owner sends `POST /api/v1/places` with `Authorization: Bearer <idToken>` and a valid body
- **THEN** a `Place` document is created with `status: 'pendiente'` and `usuarioId: 'uid-owner-001'` (no longer `"anonymous"`)
- **AND** a `solicitud` document is persisted in `solicitudes` with:
  - `tipo: 'registro'`
  - `status: 'pendiente'`
  - `placeId` = the new place's `id`
  - `usuarioId` = `'uid-owner-001'` (the verified publisher's UID — the same value as on the place)
  - `createdAt` = same timestamp as the place's `createdAt`
  - a real Firestore document `id` (not the stub literal `"stub"`)

#### Scenario: Member attempts to create a place — denied with 403
- **GIVEN** an authenticated user with `rol: 'member'` and UID `uid-member-001`
- **WHEN** the member sends `POST /api/v1/places` with `Authorization: Bearer <idToken>` and a valid body
- **THEN** the response is `403` with error: `rol 'member' is not allowed to perform this operation`
- **AND** the `RolesGuard` short-circuits before the handler
- **AND** no `Place` document is created and no `solicitud` is auto-created

#### Scenario: Anonymous attempt to create a place — denied with 401
- **WHEN** a caller with no `Authorization` header sends `POST /api/v1/places`
- **THEN** the response is `401` (the `JwtAuthGuard` rejects before `RolesGuard` runs)
- **AND** no document is persisted
