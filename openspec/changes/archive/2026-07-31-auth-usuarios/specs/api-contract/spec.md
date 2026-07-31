# api-contract Specification (delta — auth-usuarios)

## MODIFIED Requirements

### Requirement: `CreatePlace` does not accept `usuarioId` from the client
The system SHALL NOT accept a `usuarioId` property in the `CreatePlace` request body. The `usuarioId` of a `Place` is server-derived from the verified Firebase Auth JWT (the authenticated publisher's UID).

~~Until the future `auth + usuarios` change ships, the runtime stub at `places.controller.ts:44-46` continues to populate `usuarioId` with the literal string `'anonymous'` — this is documented as auth debt in the `usuarios` specification. The contract-level rule (this requirement) ensures that, when `auth` lands and the controller starts using `req.user.uid`, the body never carried a client-supplied `usuarioId` to begin with, eliminating a spoofing vector that a naive `auth` implementation could otherwise introduce.~~

This change closes the loop: the runtime stub is removed. The same contract-level guarantee now extends to `CreateEvento` and the new `usuarios`/`solicitudes` endpoints — no `usuarioId` is ever accepted as input on create flows; it is always server-derived from the verified JWT.

This requirement is implemented in:

- `docs/api-spec.yml`:
  - `CreatePlace` schema does not list `usuarioId` (enforced since `roles-rename`; this change re-confirms).
  - `CreateEvento` schema does not list `usuarioId` (already true since `eventos-crud`; this change re-confirms and documents the runtime sourcing from the JWT in the `security` block on the `POST /eventos` path).
  - The new `UpdatePerfil` (for `PUT /usuarios/me`) schema lists only `{ nombre?, telefono? }` — no `rol`, no `placeId`.
  - The new `UpdateRol` (for `PUT /usuarios/:uid/rol`) schema lists only `{ rol }` (admin-only).
  - The new approve/reject request bodies `{ comentarios?: string }` do not carry `revisadoPor` or `usuarioId`.
- `backend/src/modules/places/infrastructure/dto/create-place.dto.ts` — `usuarioId` property removed (already done by `roles-rename`).
- `backend/src/modules/eventos/infrastructure/dto/create-evento.dto.ts` — `usuarioId` property was never present (always server-set).
- The global `ValidationPipe` (configured with `whitelist: true, forbidNonWhitelisted: true`) enforces the rule at the controller boundary: any client sending `usuarioId` (or any of the other server-only fields) in the body receives `400`.

The `Place` and `Evento` response schemas still expose `usuarioId` as a read-only field (admins browsing the catalogue see the owner). The removal is solely on the input (create/update) bodies.

#### Scenario: Client sends usuarioId on create place — rejected
- **WHEN** a publisher sends `POST /api/v1/places` with body `{ ..., "usuarioId": "uid-spoofed-001" }` and a valid `Authorization: Bearer <idToken>`
- **THEN** the response is `400` with error: `property usuarioId should not exist`
- **AND** nothing is persisted
- **AND** the publisher's actual `usuarioId` (the JWT `uid`, e.g. `'uid-owner-001'`) is what gets persisted on the `Place`

#### Scenario: Client sends usuarioId on create evento — rejected
- **WHEN** a publisher sends `POST /api/v1/eventos` with body `{ ..., "usuarioId": "uid-spoofed-002" }` and a valid `Bearer` token
- **THEN** the response is `400` with error: `property usuarioId should not exist`
- **AND** nothing is persisted
- **AND** the publisher's actual `usuarioId` (the JWT `uid`) is what gets persisted on the `Evento` (runtime value sourced from `@CurrentUser()` introduced by this change)

#### Scenario: Client sends revisadoPor on approve solicitud — rejected
- **WHEN** an admin sends `POST /api/v1/solicitudes/<id>/approve` with body `{ revisadoPor: 'uid-spoofed-003' }` and a valid `Bearer` token
- **THEN** the response is `400` with error: `property revisadoPor should not exist`
- **AND** nothing is persisted
- **AND** the admin's actual `uid` (the JWT `uid`) is what gets persisted on `solicitud.revisadoPor` (server-derived via `@CurrentUser()`)

#### Scenario: Frontend OpenAPI generator stops emitting usuarioId on create forms
- **WHEN** a frontend generates a `CreatePlace` or `CreateEvento` model from `docs/api-spec.yml`
- **THEN** the generated model does not include a `usuarioId` field
- **AND** any form bound to this model does not display a `usuarioId` input — the field is a render artifact of the previous spec

## ADDED Requirements

### Requirement: `bearerAuth` security applied to protected paths
The system SHALL declare the `bearerAuth` security scheme (already defined in `docs/api-spec.yml`) as the security requirement on every protected path, and SHALL leave it absent on the anonymous-accessible discovery paths. The OpenAPI contract reflects the runtime enforcement introduced by the `auth` module's `JwtAuthGuard` + `RolesGuard` composition.

Protected paths (require `bearerAuth`):
- `POST /api/v1/places` (rol `'owner'` — enforced by `RolesGuard`)
- `PUT /api/v1/places/{id}` (rol `'owner'` or `'admin'`)
- `DELETE /api/v1/places/{id}` (rol `'owner'` or `'admin'`)
- `POST /api/v1/eventos` (rol `'owner'` or `'admin'`)
- `PUT /api/v1/eventos/{id}` (rol `'owner'` or `'admin'`)
- `DELETE /api/v1/eventos/{id}` (rol `'owner'` or `'admin'`)
- `GET /api/v1/usuarios/me` (any authenticated role: `'admin'`, `'owner'`, `'member'`)
- `PUT /api/v1/usuarios/me` (any authenticated role: `'admin'`, `'owner'`, `'member'`)
- `GET /api/v1/usuarios` (rol `'admin'` — list all users)
- `GET /api/v1/usuarios/{uid}` (rol `'admin'`)
- `POST /api/v1/usuarios` (rol `'admin'`)
- `PUT /api/v1/usuarios/{uid}/rol` (rol `'admin'`)
- `POST /api/v1/solicitudes/{id}/approve` (rol `'admin'`)
- `POST /api/v1/solicitudes/{id}/reject` (rol `'admin'`)

Anonymous-accessible paths (no `bearerAuth`, no role required — public discovery flow Flujo 2):
- `GET /health`
- `GET /api/v1/places`
- `GET /api/v1/places/slug/{slug}`
- `GET /api/v1/places/map-data`
- `GET /api/v1/places/{id}/abierto-ahora`
- `GET /api/v1/places/{id}` (by-id is anonymous for MVP; admins querying `status` would require auth, but that filter surface is out of scope for this change — already-documented in `places` spec)
- `GET /api/v1/eventos`
- `GET /api/v1/eventos/map-data`
- `GET /api/v1/eventos/{id}`
- `GET /api/v1/eventos/slug/{slug}`

#### Scenario: OpenAPI description lists bearerAuth on protected POST endpoints
- **WHEN** a stakeholder opens `docs/api-spec.yml`
- **THEN** the `POST /api/v1/places`, `POST /api/v1/eventos`, `POST /api/v1/solicitudes/{id}/approve`, `POST /api/v1/usuarios`, etc. declare `security: [{ bearerAuth: [] }]` at the operation level
- **AND** the `GET /api/v1/places`, `GET /api/v1/eventos`, `GET /api/v1/places/map-data`, `GET /api/v1/eventos/map-data`, etc. declare `security: []` at the operation level (anonymous-accessible)

#### Scenario: Frontend OpenAPI generator emits authenticated client for protected paths
- **WHEN** a frontend generates a TypeScript client from `docs/api-spec.yml`
- **THEN** the generated client's `createPlace`, `createEvento`, `approveSolicitud`, `updatePerfil`, etc. functions type-require an `Authorization` header (or a configurable token)
- **AND** the generated `listPlaces`, `listEventos`, `getEventoBySlug`, etc. functions do NOT require authentication
