# api-contract Specification

## Purpose
TBD - created by archiving change roles-rename. Update Purpose after archive.
## Requirements
### Requirement: `RedSocial.plataforma` is a closed enum across the API
The system SHALL accept only the following values for `redesSociales[].plataforma` anywhere the field appears in the API contract (`CreatePlace`, `UpdatePlace`, `Place` response):

`'instagram' | 'facebook' | 'x-twitter' | 'linkedin' | 'tiktok' | 'youtube'`

The legacy value `'twitter'` was renamed to `'x-twitter'` (reflecting the 2023 platform rename). Any client sending `'twitter'` receives a `400` `Bad Request` with a validation error listing the six valid values; the client is expected to update to `'x-twitter'`.

This contract is implemented in:

- `docs/api-spec.yml` — `RedSocial.plataforma` declares `enum: [instagram, facebook, x-twitter, linkedin, tiktok, youtube]`.
- `docs/data-model.md` — `RedSocial` value object documents `plataforma: PlataformaSocialEnum`, with the `PlataformaSocialEnum` union enumerated.
- `backend/src/modules/places/domain/plataforma-social.enum.ts` — defines `PlataformaSocialEnum` and `PLATAFORMA_SOCIAL_VALUES`.
- `backend/src/modules/places/domain/red-social.vo.ts` — `isValidRedSocial` rejects `plataforma` values not in the enum.
- `backend/src/modules/places/infrastructure/dto/red-social.dto.ts` — `@IsEnum(PLATAFORMA_SOCIAL_VALUES)` replaces the previous `@IsString()`.

This requirement is **consistent with the existing closed-enum convention** (`ServicioEnum`, `MetodoPagoEnum`, `PublicoObjetivoEnum`, `AccesibilidadEnum`, `NivelRuido`) — `RedSocial.plataforma` was the only catalogue-like field on a `places` value object that was previously free-string.

#### Scenario: OpenAPI generator stubs honour the enum
- **WHEN** a frontend (or third-party client) generates TypeScript types from `docs/api-spec.yml`
- **THEN** the `RedSocial.plataforma` field is typed as `'instagram' | 'facebook' | 'x-twitter' | 'linkedin' | 'tiktok' | 'youtube'` (not `string`), matching the backend domain enum
- **AND** a value like `'whatsapp'` is a compile-time TypeScript error in the generated client

#### Scenario: Backend rejects an unknown plataforma
- **WHEN** a `POST /api/v1/places` arrives with `redesSociales: [{ plataforma: 'threads', url: 'https://threads.net/x' }]`
- **THEN** the response is `400` with message: `plataforma must be one of: instagram, facebook, x-twitter, linkedin, tiktok, youtube`
- **AND** the place is not persisted

#### Scenario: Backend rejects the legacy 'twitter' value
- **WHEN** a `POST /api/v1/places` arrives with `redesSociales: [{ plataforma: 'twitter', url: 'https://twitter.com/x' }]`
- **THEN** the response is `400` with the same enum validation message
- **AND** the error message lists `'x-twitter'` as the valid replacement so the client can self-correct

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

**Runtime completion for `PUT`/`DELETE /places/{id}`**: the `docs/api-spec.yml` declarations for `PUT /places/{id}` and `DELETE /places/{id}` previously carried the caveat "fine-grained `owner`/`admin` guards introduced by a future `places-clean-arch-refactor` change". This change removes that caveat: both mutations are now gated at runtime by `@Roles('owner', 'admin')`, with the ownership rule (owners only their own place, admins any) enforced by `PlacesService`. The `403` response is documented on both operations.

#### Scenario: OpenAPI description lists bearerAuth on protected POST endpoints
- **WHEN** a stakeholder opens `docs/api-spec.yml`
- **THEN** the `POST /api/v1/places`, `POST /api/v1/eventos`, `POST /api/v1/solicitudes/{id}/approve`, `POST /api/v1/usuarios`, etc. declare `security: [{ bearerAuth: [] }]` at the operation level
- **AND** the `GET /api/v1/places`, `GET /api/v1/eventos`, `GET /api/v1/places/map-data`, `GET /api/v1/eventos/map-data`, etc. declare `security: []` at the operation level (anonymous-accessible)

#### Scenario: OpenAPI description lists bearerAuth on PUT and DELETE places
- **WHEN** a stakeholder opens `docs/api-spec.yml`
- **THEN** `PUT /api/v1/places/{id}` and `DELETE /api/v1/places/{id}` declare `security: [{ bearerAuth: [] }]` at the operation level
- **AND** their descriptions document the `owner`/`admin` ownership rule (owner only their own place, admin any) and a `403` response — with NO reference to a deferred `places-clean-arch-refactor` change

#### Scenario: Runtime returns 403 for non-owner on PUT /places/{id}
- **GIVEN** an authenticated `owner` whose UID does not match the place's `usuarioId`
- **WHEN** the owner sends `PUT /api/v1/places/{id}` with `Authorization: Bearer <idToken>`
- **THEN** the response is `403` with error: `No tienes permiso para modificar este lugar`
- **AND** the place document is unchanged

#### Scenario: Runtime returns 403 for member on DELETE /places/{id}
- **GIVEN** an authenticated user with `rol: 'member'`
- **WHEN** the member sends `DELETE /api/v1/places/{id}` with `Authorization: Bearer <idToken>`
- **THEN** the response is `403` with error: `rol 'member' is not allowed to perform this operation`
- **AND** the place document is NOT removed

#### Scenario: Frontend OpenAPI generator emits authenticated client for protected paths
- **WHEN** a frontend generates a TypeScript client from `docs/api-spec.yml`
- **THEN** the generated client's `createPlace`, `createEvento`, `approveSolicitud`, `updatePerfil`, `updatePlace`, `deletePlace`, etc. functions type-require an `Authorization` header (or a configurable token)
- **AND** the generated `listPlaces`, `listEventos`, `getEventoBySlug`, etc. functions do NOT require authentication

### Requirement: Public self-registration endpoint
The API SHALL expose `POST /api/v1/auth/registro` as a public endpoint (`security: []` in `docs/api-spec.yml`), documented with:

- **Request body** `RegisterDto`: `{ email: string (format: email), password: string (minLength: 8), nombre: string (minLength: 2, maxLength: 100), rol: string (enum: [member, owner]) }`.
- **Responses**: `201` → `{ uid, email, rol, nombre }`; `400` → validation error (whitelist + enum violations, incl. `rol: 'admin'`); `409` → email already registered; `500` → internal failure (with server-side compensating rollback of the Auth user).

#### Scenario: Contract documents the public endpoint
- **WHEN** a consumer reads `docs/api-spec.yml`
- **THEN** `POST /auth/registro` is listed with `security: []` (public) and the `RegisterDto` schema with the closed enum `[member, owner]`
- **AND** no field named `placeId` appears in the `Usuario` schema

#### Scenario: Admin provisioning endpoint is retired from the contract
- **WHEN** any client calls `POST /api/v1/usuarios` (even with a valid admin Bearer token)
- **THEN** the response is `404` — the route no longer exists (admin provisioning is replaced by public self-registration via `POST /auth/registro`; the first admin is bootstrapped by the `seed-admin` script directly against Firebase)
- **AND** the `POST /usuarios` path and the `CreateUsuario` schema no longer appear in `docs/api-spec.yml`

### Requirement: Usuarios role-change contract is restricted to admin/member targets
The `PUT /api/v1/usuarios/{uid}/rol` endpoint SHALL remain admin-only (`security: [{ bearerAuth: [] }]`) and its request body schema `UpdateRol` SHALL declare `rol` with `enum: [admin, member]`. The value `owner` SHALL NOT be an accepted target; requests carrying it fail validation with `400`.

#### Scenario: OpenAPI enum matches backend validation
- **WHEN** a client generates types from `docs/api-spec.yml`
- **THEN** `UpdateRol.rol` is typed as `'admin' | 'member'`
- **AND** a runtime request `{ rol: 'owner' }` receives `400` from the backend whitelist validation

