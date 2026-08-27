# eventos Specification (eventos-conformance-fixes delta)

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
- `cambios?: CambioEvento[]` — audit history; each entry `{ campo: string; valorAnterior: unknown; valorNuevo: unknown; fecha: Date; usuarioId: string }`; populated when an edit reverts a verified evento to `pendiente` (and on any update where a field value actually changes)
- `estado: EventoEstado` — `'borrador' | 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | 'suspendido'`; the event's own lifecycle (set by the publisher/admin). On create the system SHALL set `estado: 'programado'` so the evento is immediately visible in the public list (which defaults to `estado: 'programado'`)
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
- **THEN** the response is `201` and the evento is created with `activo: true`, `estadoVerificacion: 'pendiente'`, `estado: 'programado'`, `categoriaId: 'eventos'`, `slug: 'festival-verano-concon-2025'`, `usuarioId: 'uid-owner-001'`, `destacado: false`, `vistasTotales: 0`
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

### Requirement: Update of evento
The system SHALL expose `PUT /api/v1/eventos/{id}` behind auth (rol `'owner'` or `'admin'`). A publisher with rol `'owner'` MUST be allowed to update only their own eventos (`evento.usuarioId === verified token uid`); any other case MUST return `403`. An admin with rol `'admin'` MUST be allowed to update any evento. The update SHALL apply changes in-place directly (no staged solicitud). If the target evento has `estadoVerificacion === 'verificado'` BEFORE the update, the update MUST additionally set `estadoVerificacion: 'pendiente'` (reversion) in the same write, and MUST append a `CambioEvento` entry to `cambios[]` for each changed field (recording `campo`, `valorAnterior`, `valorNuevo`, `fecha`, `usuarioId`). The `categoriaId` field MUST NOT be modifiable (it is not listed in `UpdateEventoDto`). Updates to a non-existent evento MUST return `404`. The `ubicacion` field MAY be updated as a whole object. Date fields `fechaInicio`/`fechaFin` are supplied as ISO strings in the DTO and MUST be persisted as `Date` timestamps (the system converts them at the update boundary; no server error SHALL occur).

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

#### Scenario: Publisher updates fechaInicio/fechaFin persists without error
- **GIVEN** an evento with `estadoVerificacion: 'pendiente'` and `usuarioId: 'uid-owner-001'`
- **AND** a verified token for `uid-owner-001` (rol `'owner'`)
- **WHEN** the publisher sends `PUT /api/v1/eventos/{id}` with `{ fechaInicio: '2025-03-01T18:00:00Z', fechaFin: '2025-03-01T22:00:00Z' }`
- **THEN** the response is `200` and the persisted `fechaInicio`/`fechaFin` are `Date` timestamps equal to the supplied instants (no `500`)
- **AND** `updatedAt` is refreshed

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

### Requirement: Admin verification of evento
The system SHALL expose `POST /api/v1/eventos/{id}/verificar` behind auth with rol `'admin'`. The request body is `{ resultado: 'verificado' | 'rechazado', motivo?: string }`. When `resultado === 'verificado'`, the evento's `estadoVerificacion` becomes `'verificado'`, `fechaPublicacion` is set to the current time, and `activo` becomes `true` (the evento is made publicly visible; any prior `motivoRechazoVerificacion` is cleared). When `resultado === 'rechazado'`, the `motivo` field is REQUIRED (validation error `400` if absent); the evento's `estadoVerificacion` becomes `'rechazado'`, `activo` becomes `false`, and `motivoRechazoVerificacion` is set to `motivo`. Verification of a non-existent evento MUST return `404`.

#### Scenario: Admin verifies evento
- **GIVEN** an evento with `estadoVerificacion: 'pendiente'` and `activo: true`
- **WHEN** an admin sends `POST /api/v1/eventos/{id}/verificar` with `{ resultado: 'verificado' }`
- **THEN** the response is `200` with `estadoVerificacion: 'verificado'`, `activo: true`, `fechaPublicacion` populated
- **AND** the evento is now publicly visible with the "Verificado" badge

#### Scenario: Admin re-verifies a previously rejected evento (restores visibility)
- **GIVEN** an evento with `estadoVerificacion: 'rechazado'`, `activo: false`, `motivoRechazoVerificacion: 'Falta documentación'`
- **WHEN** an admin sends `POST /api/v1/eventos/{id}/verificar` with `{ resultado: 'verificado' }`
- **THEN** the response is `200` with `estadoVerificacion: 'verificado'`, `activo: true`, `motivoRechazoVerificacion` cleared (null/undefined)
- **AND** the evento is now publicly visible again

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
