# places Specification (delta — auth-usuarios)

## MODIFIED Requirements

### Requirement: Solicitud auto-creation on place create
The system SHALL automatically create a `solicitud` document when a place is created. The `POST /api/v1/places` endpoint is decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')` so that only authenticated users with `rol: 'owner'` may create a place; the controller reads the publisher's UID from `@CurrentUser() user: AuthContext` (the verified Firebase Auth UID) rather than hardcoding the literal `"anonymous"` string. The auto-created `solicitud` carries the verified `usuarioId`.

#### Scenario: Solicitud created with correct linkage
- **GIVEN** an authenticated `owner` with UID `uid-owner-001`
- **WHEN** the owner sends `POST /api/v1/places` with `Authorization: Bearer <idToken>` and a valid body
- **THEN** a `Place` document is created with `status: 'pendiente'` and `usuarioId: 'uid-owner-001'` (no longer `"anonymous"`)
- **AND** a `solicitud` document exists in `solicitudes` with:
  - `tipo: 'registro'`
  - `status: 'pendiente'`
  - `placeId` = the new place's `id`
  - `usuarioId` = `'uid-owner-001'` (the verified publisher's UID — the same value as on the place)
  - `createdAt` = same timestamp as the place's `createdAt`

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

### Requirement: CreatePlace DTO — `usuarioId` is not client-supplied
The system SHALL NOT accept a `usuarioId` property in the `CreatePlace` request body. The `usuarioId` of a `Place` is server-derived from the verified Firebase Auth JWT (the authenticated publisher's UID); the global `ValidationPipe` is configured with `forbidNonWhitelisted: true`, so any client that includes `usuarioId` in the body receives `400`.

~~This requirement closes a divergence between `docs/data-model.md` (`usuarioId: "Propietario (Firebase Auth UID)"`) and `docs/api-spec.yml:320-321` (which previously listed `usuarioId` as an accepted `CreatePlace` property — a spec artifact that, if ever wired naively by a future `auth` implementation, would allow a client to spoof the `usuarioId` of someone else's place).~~

~~Until the `auth + usuarios` change ships, the existing stub at `places.controller.ts:44-46` continues to call `placesService.createPlace(dto, 'anonymous')` — the runtime value `"anonymous"` is documented as auth debt in the `usuarios` specification. This change does NOT touch that stub; it only ensures the body does not carry `usuarioId` so the eventual JWT-derived value can replace `"anonymous"` without contract drift.~~

This change **completes** the requirement: the stub is removed. The `PlacesController.create` handler now reads `usuarioId` from `@CurrentUser() user: AuthContext` (the `user.uid` verified by `JwtAuthGuard`), NOT from the body or a hardcoded literal. The body never carried `usuarioId` (the `roles-rename` change already removed it from `CreatePlaceDto` and `docs/api-spec.yml`); this change removes the controller stub and makes the runtime behavior finally match the contract.

The `Place` response schema still exposes `usuarioId` as a read-only field (admins browsing the catalogue need to see the owner); the removal is solely on the input (create) body. `UpdatePlace` does not list `usuarioId` either (it was never there).

#### Scenario: CreatePlace with usuarioId in body — rejected
- **WHEN** a publisher sends `POST /api/v1/places` with body `{ ..., "usuarioId": "uid-spoofed-001" }` and a valid `Authorization: Bearer <idToken>`
- **THEN** the response is `400` with error: `property usuarioId should not exist`
- **AND** nothing is persisted

#### Scenario: CreatePlace without usuarioId — persisted with verified JWT uid
- **GIVEN** an authenticated `owner` with UID `uid-owner-001` (verified by `JwtAuthGuard`)
- **WHEN** the owner sends `POST /api/v1/places` with body `{ ..., "nombre": "...", "categoriaId": "...", "barrioId": "...", "planId": "gratuito" }` (no `usuarioId`) and `Authorization: Bearer <idToken>`
- **THEN** the place is created with `usuarioId: 'uid-owner-001'` (the verified `user.uid` — the documented `"anonymous"` stub is removed by this change)
- **AND** a `solicitud` tipo `'registro'` is auto-created as before
- ~~**WHEN** the `auth + usuarios` change eventually ships~~ (this IS the `auth + usuarios` change — no further contract change is required in `api-spec.yml`)
