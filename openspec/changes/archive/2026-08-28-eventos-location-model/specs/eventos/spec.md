# eventos Specification (CH-04c delta)

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
- `modalidad: Modalidad` — `'presencial' | 'online' | 'hibrido'`; REQUIRED on create (no system default). Declares how the evento is realized: `presencial`/`hibrido` carry a physical venue via `ubicacion`; `online` has no physical venue.
- `ubicacion?: Ubicacion` — object describing the event venue. REQUIRED when `modalidad !== 'online'`; FORBIDDEN when `modalidad === 'online'`. Shape: `{ nombreLugar?: string; direccion?: string; coordenadas: { lat: number; lng: number } }`. ONLY `coordenadas` is mandatory inside `ubicacion`; `direccion` and `nombreLugar` are optional. The evento is the owner of its `ubicacion` (no FK to `places`; a link to a `place` is resolved by coordinate/address coincidence, never by `placeId`).
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
- `estado: EventoEstado` — `'borrador' | 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | 'suspendido'`; the event's own lifecycle
- `destacado: boolean` — default `false`; admin-toggled for home/list highlighting
- `usuarioId: string` — Firebase Auth UID of the creator; REQUIRED, set from the verified token (never accepted in the body)
- `vistasTotales: number` — defaults to `0`
- `createdAt: Date` — document creation timestamp
- `updatedAt: Date` — last modification timestamp
- `fechaPublicacion?: Date` — set when `estadoVerificacion` transitions to `'verificado'`

The legacy fields `status`, `verificado`, `placeId`, `ubicacionNombre`, `ubicacionDireccion` (flat) are REMOVED. An evento is visible to the public when `activo: true`, regardless of `estadoVerificacion`. Legacy Firestore documents that predate `modalidad` SHALL be hydrated by the adapter as `modalidad: 'presencial'` (backward compatibility for dev/mock data).

#### Scenario: Create evento requires modalidad
- **GIVEN** an authenticated user with rol `'owner'`
- **WHEN** the user sends `POST /api/v1/eventos` with all other valid fields but **no** `modalidad`
- **THEN** the response is `400` with a validation error indicating `modalidad` is required
- **AND** no `Evento` is created

#### Scenario: Create evento rejects invalid modalidad
- **WHEN** a user sends `POST /api/v1/eventos` with `modalidad: 'telepresencial'`
- **THEN** the response is `400` with validation error "modalidad must be one of: presencial, online, hibrido"

#### Scenario: Create online evento without ubicacion succeeds
- **GIVEN** an authenticated user with rol `'owner'`
- **WHEN** the user sends `POST /api/v1/eventos` with `modalidad: 'online'` and **no** `ubicacion`
- **THEN** the response is `201` with the evento created with `modalidad: 'online'` and `ubicacion` undefined/null
- **AND** `estado: 'programado'`, `activo: true`, `estadoVerificacion: 'pendiente'`

#### Scenario: Create online evento with ubicacion is rejected
- **WHEN** a user sends `POST /api/v1/eventos` with `modalidad: 'online'` and `ubicacion: { coordenadas: { lat: -32.91, lng: -71.54 } }`
- **THEN** the response is `400` with error "online events must not include ubicacion"
- **AND** nothing is persisted

#### Scenario: Create presencial evento without ubicacion is rejected
- **WHEN** a user sends `POST /api/v1/eventos` with `modalidad: 'presencial'` and no `ubicacion`
- **THEN** the response is `400` with error "ubicacion is required when modalidad is not 'online'"

#### Scenario: Create presencial evento with coordenadas but no direccion succeeds
- **GIVEN** an authenticated user with rol `'owner'`
- **WHEN** the user sends `POST /api/v1/eventos` with `modalidad: 'presencial'` and `ubicacion: { coordenadas: { lat: -32.91, lng: -71.54 } }` (no `direccion`)
- **THEN** the response is `201` with the evento created with `ubicacion.coordenadas` populated and `ubicacion.direccion` empty/undefined
- **AND** the evento is georeferenced for the map

#### Scenario: Create híbrido evento with own coordenadas succeeds
- **WHEN** a user sends `POST /api/v1/eventos` with `modalidad: 'hibrido'` and `ubicacion: { nombreLugar: 'Plaza de Armas', coordenadas: { lat: -32.92, lng: -71.53 } }`
- **THEN** the response is `201` with `modalidad: 'hibrido'` and `ubicacion` populated
- **AND** the evento appears in `/api/v1/eventos/map-data` (has coordenadas)

#### Scenario: Create presencial evento with ubicacion missing coordenadas is rejected
- **WHEN** a user sends `POST /api/v1/eventos` with `modalidad: 'presencial'` and `ubicacion: { direccion: 'Av. Marina 123' }` (no `coordenadas`)
- **THEN** the response is `400` with validation error "coordenadas is required"

#### Scenario: Evento document without modalidad is read as presencial
- **GIVEN** a Firestore `eventos` document that has no `modalidad` field but has a valid `ubicacion`
- **WHEN** the adapter reads the document
- **THEN** the hydrated `Evento` has `modalidad: 'presencial'`
- **AND** the evento is treated as georeferenced (appears in map-data if it has coordenadas)

### Requirement: Update of evento
The system SHALL expose `PUT /api/v1/eventos/{id}` behind auth (rol `'owner'` or `'admin'`). A publisher with rol `'owner'` MUST be allowed to update only their own eventos (`evento.usuarioId === verified token uid`); any other case MUST return `403`. An admin with rol `'admin'` MUST be allowed to update any evento. The update SHALL apply changes in-place directly (no staged solicitud). If the target evento has `estadoVerificacion === 'verificado'` BEFORE the update, the update MUST additionally set `estadoVerificacion: 'pendiente'` (reversion) in the same write, and MUST append a `CambioEvento` entry to `cambios[]` for each changed field. The `categoriaId` field MUST NOT be modifiable. Updates to a non-existent evento MUST return `404`. The `ubicacion` field MAY be updated as a whole object. **When `modalidad` transitions to `'online'` on update, the service MUST clear `ubicacion` in the same write** (and still apply the verified→pendiente reversion + `cambios[]` if applicable). When `modalidad` transitions to `'presencial'`/`'hibrido'` on update, `ubicacion` with valid `coordenadas` MUST be supplied.

#### Scenario: Publisher edits own evento applies in-place
- **GIVEN** an evento with `estadoVerificacion: 'pendiente'` and `usuarioId: 'uid-owner-001'`
- **AND** a verified token for `uid-owner-001` (rol `'owner'`)
- **WHEN** the publisher sends `PUT /api/v1/eventos/{id}` with `{ descripcion: 'Nueva descripción...' }`
- **THEN** the response is `200` with the evento updated (new `descripcion`, refreshed `updatedAt`, `estadoVerificacion` unchanged as `'pendiente'`)
- **AND** no `solicitud` is created

#### Scenario: Publisher edits own verified evento reverts to pendiente + records cambios
- **GIVEN** an evento with `estadoVerificacion: 'verificado'` and `usuarioId: 'uid-owner-001'`
- **WHEN** the publisher sends `PUT /api/v1/eventos/{id}` with `{ ubicacion: { coordenadas: { lat: -32.9, lng: -71.5 } } }`
- **THEN** the response is `200` with the evento showing the new `ubicacion.coordenadas` AND `estadoVerificacion: 'pendiente'`
- **AND** `cambios[]` has a new entry for `ubicacion` with `valorAnterior`, `valorNuevo`, `usuarioId: 'uid-owner-001'`
- **AND** no `solicitud` is created

#### Scenario: Update evento to online drops ubicacion
- **GIVEN** an evento with `modalidad: 'presencial'`, `ubicacion` populated, and `usuarioId: 'uid-owner-001'`
- **AND** a verified token for `'uid-owner-001'` (rol `'owner'`)
- **WHEN** the owner sends `PUT /api/v1/eventos/{id}` with `{ modalidad: 'online' }`
- **THEN** the response is `200` with `modalidad: 'online'` and `ubicacion` cleared (undefined/null)
- **AND** no `solicitud` is created; if previously `verificado`, reverts to `pendiente` + records `cambios[]`

#### Scenario: Update evento to presencial without ubicacion is rejected
- **GIVEN** an evento with `modalidad: 'online'` and no `ubicacion`
- **WHEN** an owner sends `PUT /api/v1/eventos/{id}` with `{ modalidad: 'presencial' }` (still no `ubicacion`)
- **THEN** the response is `400` with error "ubicacion is required when modalidad is not 'online'"

#### Scenario: Update presencial evento keeps coordenadas, drops direccion
- **GIVEN** an evento with `modalidad: 'presencial'`, `ubicacion: { direccion: 'Vieja 1', coordenadas: { lat: -32.9, lng: -71.5 } }`
- **WHEN** the owner sends `PUT /api/v1/eventos/{id}` with `{ ubicacion: { coordenadas: { lat: -32.9, lng: -71.5 } } }`
- **THEN** the response is `200` with `ubicacion.direccion` cleared and `coordenadas` retained

#### Scenario: Publisher cannot edit another publisher's evento
- **GIVEN** an evento with `usuarioId: 'uid-owner-001'`
- **AND** a verified token for `uid-owner-002` (rol `'owner'`)
- **WHEN** `uid-owner-002` sends `PUT /api/v1/eventos/{id}` with any fields
- **THEN** the response is `403`

#### Scenario: Update of non-existent evento returns 404
- **WHEN** sends `PUT /api/v1/eventos/evt-inexistente` with any body
- **THEN** the response is `404`

### Requirement: Public listing and visibility
The system SHALL expose `GET /api/v1/eventos`, `GET /api/v1/eventos/map-data`, `GET /api/v1/eventos/{id}`, and `GET /api/v1/eventos/slug/{slug}` as anonymous-accessible (no auth) endpoints. The list and map-data endpoints MUST return only eventos with `activo: true`. The map-data endpoint MUST return only eventos that have `coordenadas` populated (online eventos, which carry no `ubicacion`, are therefore excluded). The by-id and by-slug endpoints MUST return `404` for eventos whose `activo` is `false`. The list endpoint MUST support filters by `subcategoriaId`, `barrioId`, `fechaDesde`, `fechaHasta`, `precioTipo`, `estado`, `destacado`, `estadoVerificacion`, free-text `q`, and cursor pagination (`page`, `limit`), returning `{ data, meta }`. The `estado` filter MUST default to `'programado'` when omitted. The map-data endpoint MUST return only lightweight fields (`id, slug, nombre, coordenadas, subcategoriaId, barrioId, fechaInicio`). The `estadoVerificacion` field MUST be included in every evento response.

#### Scenario: Online evento is excluded from map-data
- **GIVEN** an active evento with `modalidad: 'online'` and no `coordenadas`
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos/map-data`
- **THEN** the response is `200` and the online evento is NOT in the array (no coordenadas)

#### Scenario: Presencial evento appears in map-data
- **GIVEN** an active evento with `modalidad: 'presencial'` and `coordenadas` populated
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos/map-data`
- **THEN** the response is `200` and the evento is included with its `coordenadas`

#### Scenario: Map data returns only lightweight fields of active eventos
- **GIVEN** active eventos with various `barrioId` and `subcategoriaId`
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos/map-data`
- **THEN** the response is `200` with an array where each item has exactly `{ id, slug, nombre, coordenadas, subcategoriaId, barrioId, fechaInicio }`
- **AND** only eventos with `activo: true` AND `coordenadas` populated are included
