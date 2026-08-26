# places Specification — places-refactor (CH-03)

> This spec **supersedes** the canonical `openspec/specs/places/spec.md` for all requirements that conflict with the new model. Unchanged requirements are carried forward verbatim.

## Purpose

The `places` capability provides the core CRUD, search, verification, claiming, and "open now" derivation for the listing entity of the Directorio de Concón. This change refactors the approval model from `status + verificado` to `activo + estadoVerificacion`, eliminates solicitud auto-creation on place create, and adds owner claiming and admin verification endpoints.

The lifecycle is: an owner creates a place → the place is **visible publicly immediately** with `estadoVerificacion: 'pendiente'` → the admin verifies or rejects → verified places show a "Verificado" badge. Owners can also claim unclaimed places via `POST /places/:id/reclamar`.

---

## MODIFIED Requirements

### Requirement: Place entity schema (REFACTORED)

The system SHALL persist a `Place` document in the Firestore collection `places` with the following fields:

- `id: string` — Firestore document ID (auto-generated)
- `slug: string` — URL-friendly unique identifier, derived from `nombre` on create; MUST be unique across the collection
- `nombre: string` — 2..100 characters, letters/numbers/spaces/`- . &`
- `descripcionCorta: string` — 1..140 characters, for card previews
- `descripcion: string` — 10..2000 characters, for the detail page
- `categoriaId: string` — reference to a `categorias` document (required)
- `subcategoriaId?: string` — optional reference to a slug inside `categorias.subcategorias[].slug` of the selected `categoriaId`
- `barrioId: string` — reference to a `barrios` document (required)
- `direccion: string` — 1..200 characters
- `coordenadas?: { lat: number; lng: number }` — geographic coordinates
- `telefono?: string` — Chilean format, validated by regex
- `whatsapp?: string` — Chilean format, validated by regex
- `email?: string` — valid email format
- `sitioWeb?: string` — valid URI
- `redesSociales?: RedSocial[]` — max 3 items, each `{ plataforma: string, url: string }`
- `imagenes: { logo?: string; portada?: string; galeria: string[] }` — grouped image URLs from Firebase Storage
- `horarios?: HorarioDia[]` — array of 7 day entries
- `horariosEspeciales?: HorarioEspecial[]` — array of special-date overrides
- `abierto24x7: boolean` — if true, the place is always open
- `servicios?: ServicioEnum[]` — controlled enum
- `metodosPago?: MetodoPagoEnum[]` — controlled enum
- `idiomas?: string[]` — post-MVP placeholder
- **`activo: boolean`** — **NEW**: soft-delete flag (default `true` on create); when `false`, hidden from public directory
- **`estadoVerificacion: 'pendiente' | 'verificado' | 'rechazado'`** — **NEW**: default `pendiente` on create; set by admin via `POST /places/{id}/verificar`
- **`motivoRechazoVerificacion?: string`** — **NEW**: REQUIRED when `estadoVerificacion === 'rechazado'`
- **`gestionadoPorAdmin: boolean`** — **NEW**: `true` if created by admin (not via owner self-service); default `false`
- `destacado: boolean` — default `false`; admin-toggled for home carousel
- `planId: 'gratuito' | 'premium'` — required on create
- `vistasTotales: number` — post-MVP placeholder, defaults to `0`
- `valoracionGoogle?: { rating: number; reviewsCount: number; mapsLink: string }` — post-MVP placeholder
- **`usuarioId: string`** — **CHANGED**: now REQUIRED (was optional); Firebase Auth UID of the publisher, set from verified JWT
- **`fechaPublicacion?: Date`** — **RENAMED** from `fechaVerificacion`: timestamp when `estadoVerificacion` transitioned to `'verificado'`
- `createdAt: Date` — document creation timestamp
- `updatedAt: Date` — last modification timestamp

**Eliminated fields:**
- `status: PlaceStatus` — replaced by `activo` + `estadoVerificacion`
- `verificado: boolean` — subsumed in `estadoVerificacion`
- `fechaVerificacion?: Date` — renamed to `fechaPublicacion`

#### Scenario: Create place with all required fields
- **WHEN** a publisher sends `POST /api/v1/places` with valid `nombre`, `descripcion`, `descripcionCorta`, `categoriaId`, `barrioId`, `direccion`, `planId`
- **THEN** the system creates a `Place` document with `activo: true`, `estadoVerificacion: 'pendiente'`, `gestionadoPorAdmin: false`, generated `slug`, `usuarioId` set from verified JWT, `createdAt`/`updatedAt` set, `vistasTotales: 0`, `destacado: false`
- **AND** NO `solicitud` document is auto-created

#### Scenario: Create place rejects duplicate slug
- **WHEN** a place with slug `restaurante-el-marino` already exists
- **AND** a publisher sends `POST /api/v1/places` with `nombre: "Restaurante El Marino"` (which derives the same slug)
- **THEN** the response is `409` with error "Slug duplicado"
- **AND** no `Place` document is created

---

### Requirement: Place search and listing (REFACTORED)

The system SHALL support paginated, cursor-based listing of places with optional filters.

#### Scenario: List places with no filters
- **WHEN** an anonymous visitor sends `GET /api/v1/places?page=1&limit=20`
- **THEN** response is `200` with `{ data: Place[], meta: { total, page, limit } }`
- **AND** only places with `activo: true` are returned (default filter)
- **AND** results are ordered by `destacado DESC, createdAt DESC`

#### Scenario: List places filtered by categoriaId
- **WHEN** request includes `categoriaId=gastronomia`
- **THEN** only active places with that `categoriaId` are returned

#### Scenario: List places filtered by barrioId
- **WHEN** request includes `barrioId=centro`
- **THEN** only active places with that `barrioId` are returned

#### Scenario: List places with text query
- **WHEN** request includes `q=pizza`
- **THEN** active places whose `nombre`, `descripcion`, or `descripcionCorta` contain the query (case-insensitive) are returned

#### Scenario: Pagination uses cursors
- **WHEN** `page=2` is requested
- **THEN** the response uses a Firestore cursor (not offset) for consistent pagination

#### Scenario: Admin can list places by estadoVerificacion
- **WHEN** an authenticated admin sends `GET /api/v1/places?estadoVerificacion=pendiente`
- **THEN** places with `estadoVerificacion: 'pendiente'` are returned (including inactive)

#### Scenario: Admin can list places without owner
- **WHEN** an authenticated admin sends `GET /api/v1/places?sinDueno=true`
- **THEN** active places where `usuarioId == null` OR `gestionadoPorAdmin == true` are returned

---

### Requirement: Delete place (REFACTORED — soft-delete)

The system SHALL allow soft-deletion of a place by its owner or an admin. Soft-delete sets `activo: false` (the document persists). Deletion is blocked if any pending `reclamo-place` solicitud references the place.

#### Scenario: Owner soft-deletes own place with no pending reclamos
- **GIVEN** an authenticated `owner` with UID `uid-owner-001` and a place with `usuarioId: 'uid-owner-001'`
- **WHEN** the owner sends `DELETE /api/v1/places/{id}` and no `solicitud` with `tipo: 'reclamo-place'` and `status: 'pendiente'` references this place
- **THEN** the response is `200` with `{ deleted: true, id, activo: false }`
- **AND** the place document persists with `activo: false`
- **AND** the place disappears from public queries

#### Scenario: Owner deletes another owner's place — denied with 403
- **GIVEN** an authenticated `owner` with UID `uid-owner-001` and a place with `usuarioId: 'uid-owner-002'`
- **WHEN** the owner sends `DELETE /api/v1/places/{id}`
- **THEN** the response is `403` with error: `No tienes permiso para eliminar este lugar`

#### Scenario: Admin can soft-delete any place
- **WHEN** an admin sends `DELETE /api/v1/places/{id}` for a place owned by another user
- **THEN** the response is `200` (subject to the pending-reclamo guard)

#### Scenario: Soft-delete blocked by pending reclamo
- **WHEN** a `solicitud` with `placeId = {id}`, `tipo: 'reclamo-place'`, and `status: 'pendiente'` exists
- **AND** owner or admin sends `DELETE`
- **THEN** the response is `409` with error: `No se puede eliminar: existen reclamos pendientes para este lugar`
- **AND** the place document is NOT modified

---

### Requirement: Map data endpoint (REFACTORED)

The system SHALL provide `GET /api/v1/places/map-data` returning a lightweight array for map markers.

#### Scenario: Map data returns active places with coordinates
- **WHEN** request `GET /api/v1/places/map-data`
- **THEN** response `200` with array of `{ id, slug, nombre, coordenadas: { lat, lng }, categoriaId, barrioId }` for all active places (`activo: true`) that have `coordenadas`

---

## ADDED Requirements

### Requirement: Place verification by admin (NEW)

The system SHALL allow an admin to verify or reject a place via `POST /api/v1/places/{id}/verificar`. Verification sets `estadoVerificacion: 'verificado'` and `fechaPublicacion: now`. Rejection sets `estadoVerificacion: 'rechazado'`, `activo: false`, and `motivoRechazoVerificacion`.

The endpoint is decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`.

#### Scenario: Admin verifies a place
- **GIVEN** a place with `estadoVerificacion: 'pendiente'`
- **WHEN** an admin sends `POST /api/v1/places/{id}/verificar` with `{ resultado: 'verificado' }`
- **THEN** the place `estadoVerificacion` becomes `'verificado'`
- **AND** `fechaPublicacion` is set to now
- **AND** the place shows a "Verificado" badge in public queries

#### Scenario: Admin rejects a place with motivo
- **GIVEN** a place with `estadoVerificacion: 'pendiente'`
- **WHEN** an admin sends `POST /api/v1/places/{id}/verificar` with `{ resultado: 'rechazado', motivo: 'Falta información de contacto' }`
- **THEN** the place `estadoVerificacion` becomes `'rechazado'`
- **AND** `activo` becomes `false`
- **AND** `motivoRechazoVerificacion` is set to the provided motivo
- **AND** the place disappears from public queries

#### Scenario: Reject without motivo — validation error
- **WHEN** an admin sends `POST /api/v1/places/{id}/verificar` with `{ resultado: 'rechazado' }` (no `motivo`)
- **THEN** the response is `422` with validation error: `motivo is required when rejecting`
- **AND** nothing is modified

#### Scenario: Verify already verified place — idempotent
- **GIVEN** a place with `estadoVerificacion: 'verificado'`
- **WHEN** an admin sends `POST /api/v1/places/{id}/verificar` with `{ resultado: 'verificado' }`
- **THEN** the response is `200` (idempotent, no change)

#### Scenario: Owner attempts to verify — denied with 403
- **GIVEN** an authenticated `owner`
- **WHEN** the owner sends `POST /api/v1/places/{id}/verificar`
- **THEN** the response is `403` (RolesGuard blocks non-admin)

---

### Requirement: Place claiming by owner (NEW)

The system SHALL allow an owner to claim an unclaimed place (one where `usuarioId` is null or `gestionadoPorAdmin: true`) via `POST /api/v1/places/:id/reclamar`. This creates a `solicitud` with `tipo: 'reclamo-place'`.

The endpoint is decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')`.

#### Scenario: Owner claims an unclaimed place
- **GIVEN** an active place with `gestionadoPorAdmin: true` and no `usuarioId`
- **WHEN** an owner sends `POST /api/v1/places/{id}/reclamar`
- **THEN** a `solicitud` is created with `tipo: 'reclamo-place'`, `placeId: {id}`, `solicitanteUid: {owner.uid}`, `status: 'pendiente'`
- **AND** the response is `201` with the solicitud data

#### Scenario: Owner claims a place already claimed by another owner
- **GIVEN** an active place with `usuarioId: 'uid-owner-001'`
- **WHEN** owner `uid-owner-002` sends `POST /api/v1/places/{id}/reclamar`
- **THEN** a `solicitud` is created (multiple simultaneous claims are allowed)
- **AND** only one claim will be approved; others are auto-rejected

#### Scenario: Member attempts to claim — denied with 403
- **GIVEN** an authenticated `member`
- **WHEN** the member sends `POST /api/v1/places/{id}/reclamar`
- **THEN** the response is `403` (RolesGuard blocks non-owner)

#### Scenario: Anonymous attempts to claim — denied with 401
- **WHEN** a caller with no `Authorization` header sends `POST /api/v1/places/{id}/reclamar`
- **THEN** the response is `401` (JwtAuthGuard rejects)

---

### Requirement: Place updating does not revert verification (NEW)

The system SHALL NOT revert `estadoVerificacion` when a verified place is updated via `PUT /api/v1/places/{id}`. Updates apply changes in-place without affecting verification state.

#### Scenario: Owner updates verified place — verification preserved
- **GIVEN** a place with `estadoVerificacion: 'verificado'`
- **WHEN** the owner sends `PUT /api/v1/places/{id}` with `{ nombre: "New Name" }`
- **THEN** the place is updated and `estadoVerificacion` remains `'verificado'`

---

## REMOVED Requirements

### Requirement: Solicitud auto-creation on place create — REMOVED

This requirement is **SUPERSEDED** by the new model. Places are no longer created with auto-solicitud. The `POST /api/v1/places` endpoint creates the place directly with `activo: true` and `estadoVerificacion: 'pendiente'`.

### Requirement: Admin approves solicitud for place registration — REMOVED for new places

This requirement is **SUPERSEDED** for new places. New places are visible immediately. The `POST /solicitudes/:id/approve` endpoint still handles legacy `tipo: 'registro'` solicitations (for places created before this change), but new places do not generate solicitations.

### Requirement: Admin rejects solicitud for place registration — REMOVED for new places

This requirement is **SUPERSEDED** for new places. Rejection of new places is handled by `POST /places/:id/verificar`.

---

## UNCHANGED Requirements

### Requirement: Open now derivation (UNCHANGED)

The system SHALL provide `GET /api/v1/places/{id}/abierto-ahora` that returns whether the place is currently open based on its `horarios`, `horariosEspeciales`, and `abierto24x7`, evaluated against the current time in the **America/Santiago** timezone.

*(Scenarios unchanged from previous spec)*

### Requirement: Place image gallery limits (UNCHANGED)

The system SHALL enforce maximum gallery image counts per plan: 3 for gratuito, 10 for premium.

*(Scenarios unchanged from previous spec)*

### Requirement: Servicios and metodosPago enum validation (UNCHANGED)

The system SHALL reject any `servicios` or `metodosPago` value not in the canonical enum.

*(Scenarios unchanged from previous spec)*

### Requirement: RedSocial value object — closed plataforma enum (UNCHANGED)

The system SHALL validate `places.redesSociales[].plataforma` against a closed enum: `'instagram' | 'facebook' | 'x-twitter' | 'linkedin' | 'tiktok' | 'youtube'`.

*(Scenarios unchanged from previous spec)*

### Requirement: Cross-catalog validation in place create and update (UNCHANGED)

The system SHALL validate at create and update time that `categoriaId`, `subcategoriaId` (when present), and `barrioId` referenced by a `Place` document resolve to existing and `activo: true` documents in the `categorias` and `barrios` collections respectively.

*(Scenarios unchanged from previous spec)*

---

## Non-Goals (explicitly out of scope)

- Google Places API synchronization for `valoracionGoogle`
- Real `vistasTotales` increment on page views
- Frontend consumption of `/places` (future `frontend-mvp-v2` change)
- API alias `/empresas` (no backward-compat needed)
- Migration script from `empresas` collection (clean replacement)
- `EmailVerifiedGuard` (Firebase manages email verification)
- Reversión automática de `estadoVerificacion` en PUT (unlike eventos in CH-04)
- Límite de places por owner (decisión de negocio pendiente)
