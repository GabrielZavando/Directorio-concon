# eventos Specification (CH-04 delta)

## MODIFIED Requirements

### Requirement: Evento entity schema
The system SHALL persist an `Evento` document in the Firestore collection `eventos` with the following fields:

- `id: string` — Firestore document ID (auto-generated)
- `slug: string` — URL-friendly unique identifier, derived from `nombre` on create; MUST be unique across the collection
- `nombre: string` — 2..120 characters
- `descripcionCorta: string` — 1..140 characters, for card previews
- `descripcion: string` — 10..2000 characters, for the detail page
- `categoriaId: string` — constant `'eventos'` (the event always belongs to the `Eventos` parent category); not accepted in create/update DTO — set by the system
- `subcategoriaId: string` — MUST reference a slug in `categorias.subcategorias[].slug` for the document `categorias` where `id === 'eventos'` (one of the 10 seeded slugs)
- `barrioId: string` — reference to an existing `barrios` document (required)
- `organizador: string` — 1..200 characters
- `organizadorContacto?: string` — phone or email (free string)
- `organizadorWeb?: string` — valid URI
- `ubicacion: Ubicacion` — object `{ nombreLugar?: string; direccion: string; coordenadas: { lat: number; lng: number } }` describing the event venue (replaces the legacy flat `ubicacionNombre`/`ubicacionDireccion`/`coordenadas` fields and the `placeId` reference)
- `fechaInicio: Date` — ISO 8601 timestamp
- `fechaFin: Date` — ISO 8601 timestamp; MUST be strictly greater than `fechaInicio`
- `precioTipo: PrecioTipo` — controlled enum: `'gratis' | 'pago' | 'donacion' | 'invitacion'`
- `precioValor: number` — MUST be `0` when `precioTipo === 'gratis'`; MUST be `> 0` otherwise
- `precioMoneda: PrecioMoneda` — controlled enum: `'CLP' | 'USD'`; default `'CLP'`
- `capacidadMaxima?: number` — integer `> 0`
- `publicoObjetivo: PublicoObjetivoEnum[]` — controlled enum (≥ 1 element)
- `nivelRuido: NivelRuido` — controlled enum: `'bajo' | 'medio' | 'alto'`
- `portada?: string` — URL of the cover image (16:9 recommended)
- `accesibilidad?: AccesibilidadEnum[]` — controlled enum
- `activo: boolean` — default `true`; drives public visibility (replaces legacy `status`). A public visitor only sees eventos with `activo: true`
- `estadoVerificacion: EstadoVerificacion` — `'pendiente' | 'verificado' | 'rechazado'` (default `'pendiente'` on create); drives the "Verificado" badge
- `motivoRechazoVerificacion?: string` — required when `estadoVerificacion === 'rechazado'`; reason recorded by admin
- `cambios?: CambioEvento[]` — audit history; each entry `{ campo: string; valorAnterior: unknown; valorNuevo: unknown; fecha: Date; usuarioId: string }`; populated on every update (and explicitly when an edit reverts a verified evento to `pendiente`)
- `estado: EventoEstado` — `'borrador' | 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | 'suspendido'`; the event's own lifecycle (set by the publisher/admin)
- `destacado: boolean` — default `false`; admin-toggled for home/list highlighting
- `usuarioId: string` — Firebase Auth UID of the creator; REQUIRED, set from the verified token (never accepted in the body)
- `vistasTotales: number` — defaults to `0`
- `createdAt: Date` — document creation timestamp
- `updatedAt: Date` — last modification timestamp
- `fechaPublicacion?: Date` — set when `estadoVerificacion` transitions to `'verificado'`

The legacy fields `status`, `verificado`, `placeId`, `ubicacionNombre`, `ubicacionDireccion` (flat) are REMOVED (see REMOVED Requirements). An evento is visible to the public when `activo: true`, regardless of `estadoVerificacion`.

#### Scenario: Create evento as publisher with all required fields
- **GIVEN** no evento with slug `festival-verano-concon-2025` exists
- **AND** an authenticated user with rol `'owner'` and UID `uid-owner-001`
- **WHEN** the user sends `POST /api/v1/eventos` with valid `nombre`, `descripcionCorta`, `descripcion`, `subcategoriaId: 'festivales-culturales'`, `barrioId`, `organizador`, `ubicacion: { direccion: 'Av. Marina 123', coordenadas: { lat: -32.91, lng: -71.54 } }`, `fechaInicio`, `fechaFin`, `precioTipo: 'gratis'`, `precioValor: 0`, `publicoObjetivo: ['todos','familia']`, `nivelRuido: 'medio'`
- **THEN** the response is `201` and the evento is created with `activo: true`, `estadoVerificacion: 'pendiente'`, `estado: 'borrador'`, `categoriaId: 'eventos'`, `slug: 'festival-verano-concon-2025'`, `usuarioId: 'uid-owner-001'`, `destacado: false`, `vistasTotales: 0`
- **AND** NO `solicitud` is auto-created (the evento is publicly visible immediately)

#### Scenario: Create evento as admin does not auto-verify
- **GIVEN** an authenticated user with rol `'admin'`
- **WHEN** sends `POST /api/v1/eventos` with valid data
- **THEN** the response is `201` with the evento created
- **AND** `estadoVerificacion: 'pendiente'` (the admin verifies later via `POST /api/v1/eventos/:id/verificar`)

#### Scenario: Create evento rejects duplicate slug
- **WHEN** an evento with slug `festival-verano-concon-2025` already exists
- **AND** a user sends `POST /api/v1/eventos` with `nombre: "Festival de Verano Concón 2025"` (which derives the same slug)
- **THEN** the response is `409` with error "Slug duplicado"
- **AND** no `Evento` is created

#### Scenario: Create evento rejects subcategoriaId not in seeded eventos categorias
- **WHEN** a user sends `POST /api/v1/eventos` with `subcategoriaId: 'subcategoria-inventada'`
- **THEN** the response is `400` with validation error
- **AND** nothing is persisted

#### Scenario: Create evento rejects fechaFin not strictly after fechaInicio
- **WHEN** a user sends `POST /api/v1/eventos` with `fechaInicio: '2025-02-14T18:00:00Z'` and `fechaFin: '2025-02-14T12:00:00Z'`
- **THEN** the response is `400` with error "fechaFin debe ser mayor que fechaInicio"

#### Scenario: Create evento rejects gratis with non-zero precioValor
- **WHEN** a user sends `POST /api/v1/eventos` with `precioTipo: 'gratis'` and `precioValor: 5000`
- **THEN** the response is `400` with error "precioValor debe ser 0 cuando precioTipo es 'gratis'"

#### Scenario: Create evento rejects pago with precioValor <= 0
- **WHEN** a user sends `POST /api/v1/eventos` with `precioTipo: 'pago'` and `precioValor: 0`
- **THEN** the response is `400` with validation error

#### Scenario: Create evento rejects empty publicoObjetivo
- **WHEN** a user sends `POST /api/v1/eventos` with `publicoObjetivo: []`
- **THEN** the response is `400` with error "publicoObjetivo debe contener al menos un elemento"

#### Scenario: Create evento rejects anonymous user
- **GIVEN** an anonymous visitor (no Firebase Auth token)
- **WHEN** sends `POST /api/v1/eventos`
- **THEN** the response is `401`

#### Scenario: categoriaId sent in body is ignored — system sets constant 'eventos'
- **WHEN** a user sends `POST /api/v1/eventos` with `categoriaId: 'gastronomia'` in the body
- **THEN** the ValidationPipe (forbidNonWhitelisted) rejects with `400` — `categoriaId` is NOT listed in `CreateEventoDto`
- **AND** the system always sets `categoriaId: 'eventos'` internally on valid creates

#### Scenario: Create evento rejects placeId in body (field removed)
- **WHEN** a user sends `POST /api/v1/eventos` with `placeId: 'place-xyz'`
- **THEN** the ValidationPipe (forbidNonWhitelisted) rejects with `400` — `placeId` is no longer a valid field on `CreateEventoDto`

#### Scenario: Create evento with ubicacion object persisted
- **WHEN** a user sends `POST /api/v1/eventos` with `ubicacion: { nombreLugar: 'Playa Amarilla', direccion: 'Av. Costanera 10', coordenadas: { lat: -32.9, lng: -71.5 } }`
- **THEN** the response is `201` and the persisted evento has `ubicacion.nombreLugar === 'Playa Amarilla'`, `ubicacion.direccion === 'Av. Costanera 10'`, `ubicacion.coordenadas.lat === -32.9`

### Requirement: Public listing and visibility
The system SHALL expose `GET /api/v1/eventos`, `GET /api/v1/eventos/map-data`, `GET /api/v1/eventos/{id}`, and `GET /api/v1/eventos/slug/{slug}` as anonymous-accessible (no auth) endpoints. The list and map-data endpoints MUST return only eventos with `activo: true`. The by-id and by-slug endpoints MUST return `404` for eventos whose `activo` is `false` (any `estadoVerificacion` — pending, verified, or rejected eventos are invisible if inactive). The list endpoint MUST support filters by `subcategoriaId`, `barrioId`, `fechaDesde`, `fechaHasta`, `precioTipo`, `estado`, `destacado`, `estadoVerificacion`, free-text `q`, and cursor pagination (`page`, `limit`), returning `{ data, meta }` consistent with `places`. The `estado` filter MUST default to `'programado'` when omitted. The map-data endpoint MUST return only lightweight fields (`id, slug, nombre, coordenadas, subcategoriaId, barrioId, fechaInicio`). The `estadoVerificacion` field MUST be included in every evento response (list, by-id, by-slug, map-data).

#### Scenario: Public list returns only active eventos
- **GIVEN** eventos in three states: `evento-A` with `activo: true`, `evento-B` with `activo: false` (estadoVerificacion `pendiente`), `evento-C` with `activo: false` (estadoVerificacion `verificado`)
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos`
- **THEN** the response is `200` with `{ data: [evento-A], meta: {...} }`
- **AND** `evento-B` and `evento-C` are not included (both inactive)

#### Scenario: Public list supports filters
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos?subcategoriaId=festivales-culturales&barrioId=higuerillas&fechaDesde=2025-02-01&fechaHasta=2025-02-28&precioTipo=gratis&estado=programado`
- **THEN** the response is `200` with only active eventos matching all of: `subcategoriaId`, `barrioId`, `fechaInicio` within `[fechaDesde, fechaHasta]`, `precioTipo`, and `estado`

#### Scenario: Public list defaults estado to 'programado'
- **GIVEN** active eventos with various `estado` values (`programado`, `en_curso`, `finalizado`)
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos` without `estado` query
- **THEN** the response includes only eventos with `estado: 'programado'` (the default)
- **AND** `finalizado` and `en_curso` eventos are not included unless explicitly queried

#### Scenario: Public list filter estadoVerificacion=pendiente (admin queue)
- **WHEN** an admin (or anonymous in this scenario's filter semantics) sends `GET /api/v1/eventos?estadoVerificacion=pendiente`
- **THEN** the response is `200` with only active eventos whose `estadoVerificacion === 'pendiente'`

#### Scenario: Anonymous GET by id rejects inactive evento
- **GIVEN** an evento with `activo: false` and id `evt-123`
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos/evt-123`
- **THEN** the response is `404`

#### Scenario: Anonymous GET by slug rejects inactive evento
- **GIVEN** an evento with `activo: false` and slug `festival-inactivo`
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos/slug/festival-inactivo`
- **THEN** the response is `404`

#### Scenario: Anonymous GET by id returns active evento (any estadoVerificacion)
- **GIVEN** an evento with `activo: true` and id `evt-456`
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos/evt-456`
- **THEN** the response is `200` with the full evento document (including `estadoVerificacion` and `ubicacion`)

#### Scenario: Map data returns only lightweight fields of active eventos
- **GIVEN** active eventos with various `barrioId` and `subcategoriaId`
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos/map-data`
- **THEN** the response is `200` with an array where each item has exactly `{ id, slug, nombre, coordenadas, subcategoriaId, barrioId, fechaInicio }`
- **AND** no item includes `descripcion`, `organizador`, `precioValor`, etc.
- **AND** only eventos with `activo: true` are included

### Requirement: Update of evento
The system SHALL expose `PUT /api/v1/eventos/{id}` behind auth (rol `'owner'` or `'admin'`). A publisher with rol `'owner'` MUST be allowed to update only their own eventos (`evento.usuarioId === verified token uid`); any other case MUST return `403`. An admin with rol `'admin'` MUST be allowed to update any evento. The update SHALL apply changes in-place directly (no staged solicitud). If the target evento has `estadoVerificacion === 'verificado'` BEFORE the update, the update MUST additionally set `estadoVerificacion: 'pendiente'` (reversion) in the same write, and MUST append a `CambioEvento` entry to `cambios[]` for each changed field (recording `campo`, `valorAnterior`, `valorNuevo`, `fecha`, `usuarioId`). The `categoriaId` field MUST NOT be modifiable (it is not listed in `UpdateEventoDto`). Updates to a non-existent evento MUST return `404`. The `ubicacion` field MAY be updated as a whole object.

#### Scenario: Publisher edits own evento applies in-place
- **GIVEN** an evento with `estadoVerificacion: 'pendiente'` and `usuarioId: 'uid-owner-001'`
- **AND** a verified token for `uid-owner-001` (rol `'owner'`)
- **WHEN** the publisher sends `PUT /api/v1/eventos/{id}` with `{ descripcion: 'Nueva descripción...' }`
- **THEN** the response is `200` with the evento updated (new `descripcion`, refreshed `updatedAt`, `estadoVerificacion` unchanged as `'pendiente'`)
- **AND** no `solicitud` is created

#### Scenario: Publisher edits own verified evento reverts to pendiente + records cambios
- **GIVEN** an evento with `estadoVerificacion: 'verificado'` and `usuarioId: 'uid-owner-001'`
- **WHEN** the publisher sends `PUT /api/v1/eventos/{id}` with `{ ubicacion: { direccion: 'Nueva dirección 999', coordenadas: { lat: -32.9, lng: -71.5 } } }`
- **THEN** the response is `200` with the evento showing the new `ubicacion.direccion` AND `estadoVerificacion: 'pendiente'`
- **AND** `cambios[]` has a new entry for `ubicacion.direccion` (or `ubicacion`) with `valorAnterior`, `valorNuevo`, `usuarioId: 'uid-owner-001'`
- **AND** no `solicitud` is created

#### Scenario: Publisher cannot edit another publisher's evento
- **GIVEN** an evento with `usuarioId: 'uid-owner-001'`
- **AND** a verified token for `uid-owner-002` (rol `'owner'`)
- **WHEN** `uid-owner-002` sends `PUT /api/v1/eventos/{id}` with any fields
- **THEN** the response is `403`

#### Scenario: Admin edits any evento
- **GIVEN** an evento with `usuarioId: 'uid-owner-001'` and `estadoVerificacion: 'pendiente'`
- **AND** a verified token for `uid-admin-001` (rol `'admin'`)
- **WHEN** `uid-admin-001` sends `PUT /api/v1/eventos/{id}` with `{ descripcion: 'edición admin' }`
- **THEN** the response is `200` with the evento updated in-place

#### Scenario: categoriaId cannot be modified in an update
- **GIVEN** an existing evento and the evento owner is authenticated
- **WHEN** sends `PUT /api/v1/eventos/{id}` with `{ categoriaId: 'gastronomia' }`
- **THEN** the response is `400` (forbidNonWhitelisted — `categoriaId` is not in `UpdateEventoDto`)

#### Scenario: Update of non-existent evento returns 404
- **WHEN** sends `PUT /api/v1/eventos/evt-inexistente` with any body
- **THEN** the response is `404`

### Requirement: Deletion of evento
The system SHALL expose `DELETE /api/v1/eventos/{id}` behind auth (rol `'owner'` or `'admin'`). A publisher with rol `'owner'` MUST be allowed to delete only their own eventos; any other case MUST return `403`. An admin with rol `'admin'` MUST be allowed to delete any evento. The delete SHALL be a soft-delete: the evento document remains but its `activo` field is set to `false` (so it disappears from the public directory while remaining for audit). The response SHALL be `200` with `{ deleted: true, id, activo: false }`. A successful soft-delete MUST cause subsequent public `GET` (by-id, by-slug, list, map-data) to return `404`/`omit` the evento.

#### Scenario: Publisher soft-deletes own evento
- **GIVEN** an evento with `usuarioId: 'uid-owner-001'` and `activo: true`
- **WHEN** `uid-owner-001` sends `DELETE /api/v1/eventos/{id}`
- **THEN** the response is `200` with `{ deleted: true, id, activo: false }`
- **AND** a subsequent `GET /api/v1/eventos/{id}` returns `404` (because `activo: false`)

#### Scenario: Publisher cannot delete another publisher's evento
- **GIVEN** an evento with `usuarioId: 'uid-owner-001'`
- **AND** a verified token for `uid-owner-002` (rol `'owner'`)
- **WHEN** `uid-owner-002` sends `DELETE /api/v1/eventos/{id}`
- **THEN** the response is `403`

#### Scenario: Admin soft-deletes any evento
- **GIVEN** an evento with `usuarioId: 'uid-owner-001'` and `activo: true`
- **AND** a verified token for `uid-admin-001` (rol `'admin'`)
- **WHEN** `uid-admin-001` sends `DELETE /api/v1/eventos/{id}`
- **THEN** the response is `200` with `{ deleted: true, id, activo: false }`

### Requirement: Cross-catalog validation in evento create and update
The system SHALL validate at create and update time that `subcategoriaId` (required) and `barrioId` referenced by an `Evento` document resolve to existing and `activo: true` documents in the `categorias` and `barrios` collections respectively. `subcategoriaId` MUST be one of the slugs present in the `eventos` categoria's `subcategorias` array with `activo: true`. Validation MUST only fire when the corresponding field is being set or modified.

#### Scenario: Create evento rejects nonexistent subcategoria
- **WHEN** the categoria `eventos` does not have a subcategoria with slug `inexistente`
- **AND** an admin or owner sends `POST /api/v1/eventos` with `subcategoriaId: "inexistente"`
- **THEN** the response is `400` with error "Subcategoría inválida o inactiva"

#### Scenario: Create evento rejects inactive subcategoria
- **WHEN** the categoria `eventos` contains a subcategoria `festivales-culturales` with `activo: false`
- **AND** an admin or owner sends `POST /api/v1/eventos` with `subcategoriaId: "festivales-culturales"`
- **THEN** the response is `400` with error "Subcategoría inválida o inactiva"

#### Scenario: Create evento rejects inactive barrio
- **WHEN** the barrios collection contains a barrio with slug `montemar` and `activo: false`
- **AND** an admin or owner sends `POST /api/v1/eventos` with `barrioId: "montemar"`
- **THEN** the response is `400` with error "Barrio inválido o inactivo"

#### Scenario: Update evento changing subcategoriaId to inactive rejects
- **WHEN** an evento exists with `subcategoriaId: "festivales-culturales"` (currently `activo: true`)
- **AND** an admin or owner sends `PUT /api/v1/eventos/{id}` with `{ subcategoriaId: "ferias-gastronomicas" }`
- **AND** subcategoria `ferias-gastronomicas` has `activo: false`
- **THEN** the response is `400` with error "Subcategoría inválida o inactiva"

#### Scenario: Update evento touching organizador only does not re-validate catalog
- **WHEN** an evento exists with `subcategoriaId: "festivales-culturales"` (currently `activo: false`)
- **AND** an admin or owner sends `PUT /api/v1/eventos/{id}` with only `{ organizador: "Nuevo Org" }`
- **THEN** the evento is updated successfully
- **AND** no validation against the categorias collection is performed

## REMOVED Requirements

### Requirement: `eventos.placeId` is an optional reference with no ownership invariant
**Reason**: The `placeId` field coupled an evento to a `places` document and required validation that the referenced place had `status: 'aprobado'`. This added an unnecessary invariant and an extra dependency between two aggregates. The business flow (decision #4) does not require an evento to be linked to a place; the evento declares its own venue via the `ubicacion` object. The field is fully replaced by `ubicacion`.
**Migration**: Eventos that previously referenced a `placeId` must migrate to carrying their venue directly in `ubicacion` (the migration script `migrate-eventos-verificacion.ts` drops `placeId` and reconstructs `ubicacion` from the legacy flat `ubicacionNombre`/`ubicacionDireccion`/`coordenadas` fields). Clients MUST stop sending `placeId` on `CreateEventoDto`/`UpdateEventoDto` (the `ValidationPipe` with `forbidNonWhitelisted` rejects it with `400`).

## ADDED Requirements

### Requirement: Admin verification of evento
The system SHALL expose `POST /api/v1/eventos/{id}/verificar` behind auth with rol `'admin'`. The request body is `{ resultado: 'verificado' | 'rechazado', motivo?: string }`. When `resultado === 'verificado'`, the evento's `estadoVerificacion` becomes `'verificado'` and `fechaPublicacion` is set to the current time (no change to `activo`). When `resultado === 'rechazado'`, the `motivo` field is REQUIRED (validation error `400` if absent); the evento's `estadoVerificacion` becomes `'rechazado'`, `activo` becomes `false`, and `motivoRechazoVerificacion` is set to `motivo`. Verification of a non-existent evento MUST return `404`.

#### Scenario: Admin verifies evento
- **GIVEN** an evento with `estadoVerificacion: 'pendiente'` and `activo: true`
- **WHEN** an admin sends `POST /api/v1/eventos/{id}/verificar` with `{ resultado: 'verificado' }`
- **THEN** the response is `200` with `estadoVerificacion: 'verificado'`, `activo: true`, `fechaPublicacion` populated
- **AND** the evento is now publicly visible with the "Verificado" badge

#### Scenario: Admin rejects evento without motivo returns 400
- **WHEN** an admin sends `POST /api/v1/eventos/{id}/verificar` with `{ resultado: 'rechazado' }` (no `motivo`)
- **THEN** the response is `400` with validation error "motivo is required when resultado is 'rechazado'"

#### Scenario: Admin rejects evento with motivo
- **GIVEN** an evento with `activo: true` and `estadoVerificacion: 'pendiente'`
- **WHEN** an admin sends `POST /api/v1/eventos/{id}/verificar` with `{ resultado: 'rechazado', motivo: 'Falta documentación' }`
- **THEN** the response is `200` with `estadoVerificacion: 'rechazado'`, `activo: false`, `motivoRechazoVerificacion: 'Falta documentación'`
- **AND** the evento is now invisible to the public (soft-hidden)

#### Scenario: Non-admin cannot verify evento
- **GIVEN** an authenticated user with rol `'owner'`
- **WHEN** the owner sends `POST /api/v1/eventos/{id}/verificar` with `{ resultado: 'verificado' }`
- **THEN** the response is `403` with error: `rol 'owner' is not allowed to perform this operation`

#### Scenario: Anonymous cannot verify evento
- **WHEN** a caller with no `Authorization` header sends `POST /api/v1/eventos/{id}/verificar`
- **THEN** the response is `401`
