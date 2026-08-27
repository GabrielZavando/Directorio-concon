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
The system SHALL declare the `bearerAuth` security scheme on every protected path, and leave it absent on the anonymous-accessible discovery paths. (Unchanged protected/anonymous lists from prior changes, plus the addition below.)

Protected paths (require `bearerAuth`):
- `POST /api/v1/eventos` (rol `'owner'` or `'admin'`)
- `PUT /api/v1/eventos/{id}` (rol `'owner'` or `'admin'`)
- `DELETE /api/v1/eventos/{id}` (rol `'owner'` or `'admin'`)
- `POST /api/v1/eventos/{id}/verificar` (rol `'admin'`)  ← ADDED by CH-04

Anonymous-accessible paths (no `bearerAuth`):
- `GET /api/v1/eventos`
- `GET /api/v1/eventos/map-data`
- `GET /api/v1/eventos/{id}`
- `GET /api/v1/eventos/slug/{slug}`
- (The admin verification queue `GET /api/v1/eventos?estadoVerificacion=pendiente` reuses the anonymous `GET /eventos` path with a query filter; visibility is governed by `activo: true`, so it remains anonymous — admins use it with the same public endpoint.)

#### Scenario: OpenAPI description lists bearerAuth on protected POST eventos endpoints
- **WHEN** a stakeholder opens `docs/api-spec.yml`
- **THEN** the `POST /api/v1/eventos` and `POST /api/v1/eventos/{id}/verificar` operations declare `security: [{ bearerAuth: [] }]` at the operation level
- **AND** the `GET /api/v1/eventos`, `GET /api/v1/eventos/map-data`, `GET /api/v1/eventos/{id}`, `GET /api/v1/eventos/slug/{slug}` operations declare `security: []` (anonymous-accessible)

#### Scenario: Runtime returns 403 for non-admin on POST /eventos/{id}/verificar
- **GIVEN** an authenticated user with `rol: 'owner'`
- **WHEN** the owner sends `POST /api/v1/eventos/{id}/verificar` with `{ resultado: 'verificado' }`
- **THEN** the response is `403` with error: `rol 'owner' is not allowed to perform this operation`
- **AND** the evento document is unchanged

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

### Requirement: Evento API uses `ubicacion` object and `estadoVerificacion` (not `status`/`placeId`/`verificado`)
The `docs/api-spec.yml` SHALL describe the `Evento` schema (and `CreateEvento`/`UpdateEvento` bodies) using the new model introduced by `eventos-refactor`:

- `activo: boolean` — replaces the legacy `status` field for public visibility.
- `estadoVerificacion: 'pendiente' | 'verificado' | 'rechazado'` — replaces the legacy `verificado: boolean`.
- `ubicacion: { nombreLugar?: string; direccion: string; coordenadas: { lat: number; lng: number } }` — replaces the legacy flat `ubicacionNombre`/`ubicacionDireccion`/`coordenadas` fields AND the `placeId` reference.
- `motivoRechazoVerificacion?: string` and `cambios?: CambioEvento[]` — new fields.

The legacy fields `status`, `verificado`, `placeId`, `ubicacionNombre`, `ubicacionDireccion` (flat) SHALL NOT appear in the `Evento`, `CreateEvento`, or `UpdateEvento` schemas. The `CreateEventoDto` and `UpdateEventoDto` MUST declare `ubicacion` (with nested validation) and MUST NOT declare `placeId`.

#### Scenario: OpenAPI Evento schema has no legacy fields
- **WHEN** a client generates types from `docs/api-spec.yml`
- **THEN** the `Evento`, `CreateEvento`, and `UpdateEvento` schemas do NOT include `status`, `verificado`, or `placeId`
- **AND** they DO include `activo`, `estadoVerificacion`, and `ubicacion` (object with `direccion` + `coordenadas`)

#### Scenario: Client sends placeId on create evento — rejected
- **WHEN** a publisher sends `POST /api/v1/eventos` with `{ ..., "placeId": "place-xyz" }` and a valid `Bearer` token
- **THEN** the response is `400` with error: `property placeId should not exist`
- **AND** nothing is persisted

### Requirement: `POST /api/v1/eventos/{id}/verificar` admin endpoint
The API SHALL expose `POST /api/v1/eventos/{id}/verificar` as an admin-only endpoint (`security: [{ bearerAuth: [] }]`, `@Roles('admin')`). The request body `VerificarEventoDto` SHALL declare `resultado` with `enum: [verificado, rechazado]` and `motivo` as a conditional string (required when `resultado === 'rechazado'`, validated with `400` otherwise). On success the response is `200` with the updated `Evento` (including `estadoVerificacion`, `activo`, `fechaPublicacion`/`motivoRechazoVerificacion` as applicable).

#### Scenario: Contract documents the admin verify endpoint
- **WHEN** a consumer reads `docs/api-spec.yml`
- **THEN** `POST /eventos/{id}/verificar` is listed with `security: [{ bearerAuth: [] }]`, an `operationId` like `verificarEvento`, and the `VerificarEventoDto` schema with `resultado` enum and conditional `motivo`
- **AND** a `400` response is documented for `resultado: 'rechazado'` without `motivo`, and `403`/`401` for non-admin/anonymous

### Requirement: `DELETE /eventos/{id}` returns soft-delete envelope
The `docs/api-spec.yml` SHALL document `DELETE /api/v1/eventos/{id}` as a soft-delete: the operation returns `200` with the response schema `{ deleted: boolean; id: string; activo: boolean }` where `activo` is `false` after the operation (the document is not removed). The `409` response for "pending solicitudes" is REMOVED (eventos no longer create solicitudes).

#### Scenario: Contract documents soft-delete response
- **WHEN** a consumer reads `docs/api-spec.yml`
- **THEN** `DELETE /eventos/{id}` response `200` schema is `{ deleted: true, id: string, activo: false }`
- **AND** no `409` response referencing pending solicitudes is documented for this endpoint

