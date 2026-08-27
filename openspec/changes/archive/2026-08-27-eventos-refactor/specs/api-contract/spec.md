# api-contract Specification (CH-04 delta)

## ADDED Requirements

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

## MODIFIED Requirements

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
