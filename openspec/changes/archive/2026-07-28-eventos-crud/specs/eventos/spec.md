# eventos Specification

## Purpose
The `eventos` capability provides time-bound activity listings for the Directorio de Concón — festivals, ferias, conciertos, carreras, talleres, ferias patrias, etc. — alongside the existing `places` entity. Publishers (rol `'empresa'`) and admins record an event once with category (reusing the existing `eventos` category + its 10 seeded subcategories), barrio (reusing the existing `barrios` collection), exact GPS coordinates, date/time range, pricing, accessibility, target audience and noise level. An admin approves the event through the standard `solicitudes` workflow (extended with the `tipo` values `'registro-evento'` and `'actualizacion-evento'`, plus an optional `eventoId` reference). Approved events become publicly discoverable via search, slug lookup, and a lightweight `/map-data` endpoint for an interactive map. The frontend delivers a creation/edit form (publisher and admin), public list, ficha with map, and "My Events"/admin panels — all reusing the existing SPA shell, reusable search component, layout base, and `@angular/google-maps`.

---

## ADDED Requirements

### Requirement: Evento entity schema
The system SHALL persist an `Evento` document in the Firestore collection `eventos` with the following fields:

- `id: string` — Firestore document ID (auto-generated)
- `slug: string` — URL-friendly unique identifier, derived from `nombre` on create; MUST be unique across the collection
- `nombre: string` — 2..120 characters
- `descripcionCorta: string` — 1..140 characters, for card previews
- `descripcion: string` — 10..2000 characters, for the detail page
- `categoriaId: string` — constant `'eventos'` (the event always belongs to the `Eventos` parent category); not accepted in create/update DTO — set by the system
- `subcategoriaId: string` — MUST reference a slug in `categorias.subcategorias[].slug` for the document `categorias` where `id === 'eventos'` (one of the 10 seeded slugs: `festivales-culturales`, `ferias-gastronomicas`, `ferias-libres`, `deportes-y-competencias`, `conciertos-y-shows`, `talleres-y-clases-abiertas`, `eventos-familiares`, `temporada-de-verano`, `fiestas-patrias`, `mercados-sustentables`)
- `barrioId: string` — reference to an existing `barrios` document (required)
- `organizador: string` — 1..200 characters
- `organizadorContacto?: string` — phone or email (free string)
- `organizadorWeb?: string` — valid URI
- `ubicacionNombre?: string` — 1..200 characters (e.g., "Playa Amarilla", "Plaza de Armas")
- `ubicacionDireccion: string` — 1..200 characters
- `coordenadas: { lat: number; lng: number }` — geographic coordinates (reuses the `Coordenadas` value object from `places`)
- `fechaInicio: Date` — ISO 8601 timestamp
- `fechaFin: Date` — ISO 8601 timestamp; MUST be strictly greater than `fechaInicio`
- `precioTipo: PrecioTipo` — controlled enum: `'gratis' | 'pago' | 'donacion' | 'invitacion'`
- `precioValor: number` — MUST be `0` when `precioTipo === 'gratis'`; MUST be `> 0` otherwise
- `precioMoneda: PrecioMoneda` — controlled enum: `'CLP' | 'USD'`; default `'CLP'`
- `capacidadMaxima?: number` — integer `> 0`
- `publicoObjetivo: PublicoObjetivoEnum[]` — controlled enum (≥ 1 element): `'familia' | 'adultos' | 'tercera_edad' | 'mascotas' | 'todos' | 'ninos' | 'adolescentes'`
- `nivelRuido: NivelRuido` — controlled enum: `'bajo' | 'medio' | 'alto'`
- `portada?: string` — URL of the cover image (16:9 recommended)
- `accesibilidad?: AccesibilidadEnum[]` — controlled enum: `'acceso-silla-ruedas' | 'banos-accesibles' | 'estacionamiento-reservado' | 'interprete-señas' | 'material-braille' | 'rampa-acceso'`
- `status: EventoStatus` — `'pendiente' | 'aprobado' | 'rechazado'` (default `'pendiente'` on create); drives the `solicitudes` approval workflow
- `estado: EventoEstado` — `'borrador' | 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | 'suspendido'`; the event's own lifecycle (set by the publisher/admin; automatic transitions based on `fechaInicio`/`fechaFin` are out of scope in this change)
- `destacado: boolean` — default `false`; admin-toggled for home/list highlighting
- `verificado: boolean` — default `false`; admin-toggled for verified badge
- `placeId?: string` — optional reference to a `places` document; set when the event is organised by a place in the directory (must reference a `places` doc with `status === 'aprobado'`); omitted for external organisers (e.g., municipality)
- `usuarioId: string` — Firebase Auth UID of the creator; REQUIRED, set from the verified token (never accepted in the body)
- `vistasTotales: number` — post-MVP placeholder, defaults to `0`, no write/increment path implemented in this change (mirrors `places`)
- `createdAt: Date` — document creation timestamp
- `updatedAt: Date` — last modification timestamp
- `fechaPublicacion?: Date` — set when `status` transitions to `'aprobado'` (mirrors `places.fechaPublicacion`)

#### Scenario: Create evento as publisher with all required fields
- **GIVEN** no evento with slug `festival-verano-concon-2025` exists
- **AND** an authenticated user with rol `'empresa'` and UID `uid-empresa-001`
- **WHEN** the user sends `POST /api/v1/eventos` with valid `nombre`, `descripcionCorta`, `descripcion`, `subcategoriaId: 'festivales-culturales'`, `barrioId`, `organizador`, `ubicacionDireccion`, `coordenadas`, `fechaInicio`, `fechaFin`, `precioTipo: 'gratis'`, `precioValor: 0`, `publicoObjetivo: ['todos','familia']`, `nivelRuido: 'medio'`
- **THEN** the response is `201` and the evento is created with `status: 'pendiente'`, `estado: 'borrador'`, `categoriaId: 'eventos'`, `slug: 'festival-verano-concon-2025'`, `usuarioId: 'uid-empresa-001'`, `destacado: false`, `verificado: false`, `vistasTotales: 0`
- **AND** a `solicitud` document is auto-created in collection `solicitudes` with `tipo: 'registro-evento'`, `status: 'pendiente'`, `eventoId` pointing to the new evento, `usuarioId: 'uid-empresa-001'`

#### Scenario: Create evento as admin does not auto-verify
- **GIVEN** an authenticated user with rol `'admin'`
- **WHEN** sends `POST /api/v1/eventos` with valid data
- **THEN** the response is `201` with the evento created
- **AND** `verificado: false` (the admin may toggle this later — the create endpoint never sets `verificado: true`)

#### Scenario: Create evento rejects duplicate slug
- **WHEN** an evento with slug `festival-verano-concon-2025` already exists
- **AND** a user sends `POST /api/v1/eventos` with `nombre: "Festival de Verano Concón 2025"` (which derives the same slug)
- **THEN** the response is `409` with error "Slug duplicado"
- **AND** no `Evento` nor `solicitud` is created

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

#### Scenario: Create evento rejects placeId referencing a non-approved place
- **GIVEN** a `places` document with `status: 'pendiente'`
- **WHEN** a user sends `POST /api/v1/eventos` with `placeId` pointing to that place
- **THEN** the response is `400` with error "placeId debe referenciar un place aprobado"

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

---

### Requirement: Public listing and visibility
The system SHALL expose `GET /api/v1/eventos`, `GET /api/v1/eventos/map-data`, `GET /api/v1/eventos/{id}`, and `GET /api/v1/eventos/slug/{slug}` as anonymous-accessible (no auth) endpoints. The list and map-data endpoints MUST return only eventos with `status: 'aprobado'`. The by-id and by-slug endpoints MUST return `404` for eventos whose `status` is not `'aprobado'` (pending and rejected eventos are invisible to anonymous visitors). The list endpoint MUST support filters by `subcategoriaId`, `barrioId`, `fechaDesde`, `fechaHasta`, `precioTipo`, `estado`, `destacado`, free-text `q`, and cursor pagination (`page`, `limit`), returning `{ data, meta }` consistent with `places`. The `estado` filter MUST default to `'programado'` when omitted. The map-data endpoint MUST return only lightweight fields (`id, slug, nombre, coordenadas, subcategoriaId, barrioId, fechaInicio`).

#### Scenario: Public list returns only approved eventos
- **GIVEN** eventos in three states: `evento-A` with `status: 'aprobado'`, `evento-B` with `status: 'pendiente'`, `evento-C` with `status: 'rechazado'`
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos`
- **THEN** the response is `200` with `{ data: [evento-A], meta: {...} }`
- **AND** `evento-B` and `evento-C` are not included

#### Scenario: Public list supports filters
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos?subcategoriaId=festivales-culturales&barrioId=higuerillas&fechaDesde=2025-02-01&fechaHasta=2025-02-28&precioTipo=gratis&estado=programado`
- **THEN** the response is `200` with only approved eventos matching all of: `subcategoriaId`, `barrioId`, `fechaInicio` within `[fechaDesde, fechaHasta]`, `precioTipo`, and `estado`

#### Scenario: Public list defaults estado to 'programado'
- **GIVEN** approved eventos with various `estado` values (`programado`, `en_curso`, `finalizado`)
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos` without `estado` query
- **THEN** the response includes only eventos with `estado: 'programado'` (the default)
- **AND** `finalizado` and `en_curso` eventos are not included unless explicitly queried

#### Scenario: Anonymous GET by id rejects pending evento
- **GIVEN** an evento with `status: 'pendiente'` and id `evt-123`
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos/evt-123`
- **THEN** the response is `404`

#### Scenario: Anonymous GET by slug rejects pending evento
- **GIVEN** an evento with `status: 'pendiente'` and slug `festival-pendiente`
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos/slug/festival-pendiente`
- **THEN** the response is `404`

#### Scenario: Anonymous GET by id returns approved evento
- **GIVEN** an evento with `status: 'aprobado'` and id `evt-456`
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos/evt-456`
- **THEN** the response is `200` with the full evento document

#### Scenario: Map data returns only lightweight fields of approved eventos
- **GIVEN** approved eventos with various `barrioId` and `subcategoriaId`
- **WHEN** an anonymous visitor sends `GET /api/v1/eventos/map-data`
- **THEN** the response is `200` with an array where each item has exactly `{ id, slug, nombre, coordenadas, subcategoriaId, barrioId, fechaInicio }`
- **AND** no item includes `descripcion`, `organizador`, `precioValor`, etc.
- **AND** only eventos with `status: 'aprobado'` are included

---

### Requirement: Update of evento
The system SHALL expose `PUT /api/v1/eventos/{id}` behind auth (rol `'empresa'` or `'admin'`). A publisher with rol `'empresa'` MUST be allowed to update only their own eventos (`evento.usuarioId === verified token uid`); any other case MUST return `403`. An admin with rol `'admin'` MUST be allowed to update any evento. When the target evento has `status === 'aprobado'`, the update MUST NOT apply changes in-place: instead, a `solicitud` with `tipo: 'actualizacion-evento'`, `status: 'pendiente'`, `eventoId`, `usuarioId`, and `proposal: { ...update fields }` MUST be created (staged update — the publicly visible evento data remains unchanged until the admin approves the solicitud). When the target evento has `status !== 'aprobado'` (`'pendiente'` or `'rechazado'`), the update MUST be applied in-place without creating a new `solicitud`. The `categoriaId` field MUST NOT be modifiable (it is not listed in `UpdateEventoDto`). Updates to a non-existent evento MUST return `404`.

#### Scenario: Publisher edits own pending evento applies in-place
- **GIVEN** an evento with `status: 'pendiente'` and `usuarioId: 'uid-empresa-001'`
- **AND** a verified token for `uid-empresa-001` (rol `'empresa'`)
- **WHEN** the publisher sends `PUT /api/v1/eventos/{id}` with `{ descripcion: 'Nueva descripción...' }`
- **THEN** the response is `200` with the evento updated (new `descripcion`, refreshed `updatedAt`)
- **AND** no `solicitud` is created (edits to a pending evento are direct)

#### Scenario: Publisher edits own approved evento produces a staged update
- **GIVEN** an evento with `status: 'aprobado'` and `usuarioId: 'uid-empresa-001'`
- **WHEN** the publisher sends `PUT /api/v1/eventos/{id}` with `{ ubicacionDireccion: 'Nueva dirección 999' }`
- **THEN** the response is `200` with the evento still showing the previous `ubicacionDireccion` (no in-place change)
- **AND** a `solicitud` is created with `tipo: 'actualizacion-evento'`, `status: 'pendiente'`, `eventoId`, `usuarioId: 'uid-empresa-001'`, and `proposal: { ubicacionDireccion: 'Nueva dirección 999' }`

#### Scenario: Publisher cannot edit another publisher's evento
- **GIVEN** an evento with `usuarioId: 'uid-empresa-001'`
- **AND** a verified token for `uid-empresa-002` (rol `'empresa'`)
- **WHEN** `uid-empresa-002` sends `PUT /api/v1/eventos/{id}` with any fields
- **THEN** the response is `403`

#### Scenario: Admin edits any evento
- **GIVEN** an evento with `usuarioId: 'uid-empresa-001'` and `status: 'pendiente'`
- **AND** a verified token for `uid-admin-001` (rol `'admin'`)
- **WHEN** `uid-admin-001` sends `PUT /api/v1/eventos/{id}` with `{ descripcion: 'edición admin' }`
- **THEN** the response is `200` with the evento updated in-place (because `status === 'pendiente'`)

#### Scenario: categoriaId cannot be modified in an update
- **GIVEN** an existing evento and the evento owner is authenticated
- **WHEN** sends `PUT /api/v1/eventos/{id}` with `{ categoriaId: 'gastronomia' }`
- **THEN** the response is `400` (forbidNonWhitelisted — `categoriaId` is not in `UpdateEventoDto`)

#### Scenario: Update of non-existent evento returns 404
- **WHEN** sends `PUT /api/v1/eventos/evt-inexistente` with any body
- **THEN** the response is `404`

---

### Requirement: Deletion of evento
The system SHALL expose `DELETE /api/v1/eventos/{id}` behind auth (rol `'empresa'` or `'admin'`). A publisher with rol `'empresa'` MUST be allowed to delete only their own eventos; any other case MUST return `403`. An admin with rol `'admin'` MUST be allowed to delete any evento. The delete MUST return `409` if there exists any `solicitud` with the same `eventoId` and `status: 'pendiente'` (cannot delete an evento pending approval). A successful delete MUST return `{ deleted: true, id }` and the evento document MUST be removed from Firestore so that subsequent `GET` return `404`.

#### Scenario: Publisher deletes own evento without pending solicitudes
- **GIVEN** an evento with `usuarioId: 'uid-empresa-001'` and no `solicitudes` with `eventoId` and `status: 'pendiente'`
- **WHEN** `uid-empresa-001` sends `DELETE /api/v1/eventos/{id}`
- **THEN** the response is `200` with `{ deleted: true, id }`
- **AND** a subsequent `GET /api/v1/eventos/{id}` returns `404`

#### Scenario: Delete evento with pending solicitud returns 409
- **GIVEN** an evento with a `solicitud` associated whose `status: 'pendiente'`
- **WHEN** the owner sends `DELETE /api/v1/eventos/{id}`
- **THEN** the response is `409` with error "No se puede eliminar: existen solicitudes pendientes asociadas"

#### Scenario: Publisher cannot delete another publisher's evento
- **GIVEN** an evento with `usuarioId: 'uid-empresa-001'`
- **AND** a verified token for `uid-empresa-002` (rol `'empresa'`)
- **WHEN** `uid-empresa-002` sends `DELETE /api/v1/eventos/{id}`
- **THEN** the response is `403`

#### Scenario: Admin deletes any evento
- **GIVEN** an evento with `usuarioId: 'uid-empresa-001'` and no pending `solicitudes`
- **AND** a verified token for `uid-admin-001` (rol `'admin'`)
- **WHEN** `uid-admin-001` sends `DELETE /api/v1/eventos/{id}`
- **THEN** the response is `200` with `{ deleted: true, id }`

---

## MODIFIED Requirements

### Requirement: Solicitud type and event reference
The `solicitudes` collection (existing) MUST be extended to support the eventos approval flow. The `tipo` enum MUST be extended (additive, non-breaking) to `'registro' | 'actualizacion' | 'registro-evento' | 'actualizacion-evento'`. A new optional field `eventoId?: string` MUST be added to reference an `eventos` document (alongside the existing `placeId?` field, which MUST become nullable so event-only approvals are valid). A new optional field `proposal?: object` MUST be added to store the staged update payload for `tipo: 'actualizacion-evento'` (the fields the publisher wants to apply; consumed by the admin approval action). A `solicitud` MUST reference either a `placeId` OR an `eventoId`, never both (XOR, validated by `SolicitudesService`). Approving a `registro-evento` solicitud MUST set the evento's `status: 'aprobado'`, `estado: 'programado'`, and `fechaPublicacion`. Rejecting it MUST set `status: 'rechazado'`. Approving an `actualizacion-evento` solicitud MUST apply the `proposal` payload to the evento in-place. Rejecting it MUST leave the evento unchanged. The existing approval flow for `places` (`tipo: 'registro'` and `'actualizacion'`, `placeId` required) MUST remain unchanged (regression coverage enforced).

#### Scenario: Approve solicitud registro-evento promotes evento to aprobado and programado
- **GIVEN** a `solicitud` with `tipo: 'registro-evento'`, `status: 'pendiente'`, `eventoId: 'evt-001'`
- **AND** the evento `evt-001` has `status: 'pendiente'`, `estado: 'borrador'`
- **WHEN** an admin approves the solicitud
- **THEN** the solicitud updates to `status: 'aprobado'`
- **AND** the evento `evt-001` updates to `status: 'aprobado'`, `estado: 'programado'`, and `fechaPublicacion` is set to the approval timestamp
- **AND** the evento becomes visible to the public (`GET /api/v1/eventos/evt-001` returns `200`)

#### Scenario: Reject solicitud registro-evento moves evento to rechazado and stays hidden
- **GIVEN** a `solicitud` with `tipo: 'registro-evento'`, `status: 'pendiente'`, `eventoId: 'evt-001'`
- **WHEN** an admin rejects the solicitud
- **THEN** the solicitud updates to `status: 'rechazado'`
- **AND** the evento `evt-001` updates to `status: 'rechazado'`
- **AND** the evento remains hidden to the public (`GET /api/v1/eventos/evt-001` still returns `404`)

#### Scenario: Approve solicitud actualizacion-evento applies the staged proposal in-place
- **GIVEN** a `solicitud` with `tipo: 'actualizacion-evento'`, `status: 'pendiente'`, `eventoId: 'evt-002'`, `proposal: { ubicacionDireccion: 'Nueva 999' }`
- **AND** the evento `evt-002` has `ubicacionDireccion: 'Vieja 123'`
- **WHEN** an admin approves the solicitud
- **THEN** the solicitud updates to `status: 'aprobado'`
- **AND** the evento `evt-002` has `ubicacionDireccion: 'Nueva 999'` (in-place update from `proposal`)
- **AND** the evento's `updatedAt` is refreshed

#### Scenario: Reject solicitud actualizacion-evento leaves the evento unchanged
- **GIVEN** a `solicitud` with `tipo: 'actualizacion-evento'`, `status: 'pendiente'`, `eventoId: 'evt-002'`, `proposal: { ubicacionDireccion: 'Nueva 999' }`
- **AND** the evento `evt-002` has `ubicacionDireccion: 'Vieja 123'`
- **WHEN** an admin rejects the solicitud
- **THEN** the solicitud updates to `status: 'rechazado'`
- **AND** the evento `evt-002` remains with `ubicacionDireccion: 'Vieja 123'` (no modification)

#### Scenario: Existing places solicitud flow regression
- **GIVEN** the `tipo` enum extension and the new `eventoId?` and `proposal?` fields of `solicitudes`
- **WHEN** the existing `places` and `solicitudes` tests run
- **THEN** all places flow tests remain green (Flow 1 unchanged)
- **AND** a `solicitud` with `tipo: 'registro'` (places) requires `placeId` and ignores `eventoId`/`proposal`

---

### Requirement: Frontend eventos surface
The frontend (Angular 20 standalone, TailwindCSS, design system "Dunas y Océano") MUST deliver the eventos user-facing surface alongside the existing `places` UI. It SHALL reuse the SPA navigation shell, layout base, reusable search component, `@angular/google-maps`, `ngx-skeleton-loader`, and `lucide-angular` (consistent with the `categorias.icono='party-popper'` of the `eventos` category). No new design tokens MUST be introduced — all colors, typography, radii, shadows, and spacing SHALL come from `docs/DESIGN.md` via `tailwind.config.js`. All components MUST follow the smart/dumb convention (dumb components MUST never inject data services). The frontend MUST provide: (a) a creation/edit form for publishers and admins with client-side validation synchronised with the backend DTO, (b) a public list at `/eventos` with filters and skeleton loading states, (c) a detail page at `/eventos/:slug` with an interactive map, (d) a "My Events" panel at `/mis-eventos` showing only the user's own eventos in all statuses, and (e) accessibility AAA contrast on labels for outdoor coastal sunlight readability.

#### Scenario: Form creation validates client-side synchronised with backend DTO
- **GIVEN** an authenticated user with rol `'empresa'` opens `/eventos/nuevo`
- **WHEN** the user attempts to submit the form without `nombre` or with `descripcionCorta` exceeding 140 characters
- **THEN** the submit button is disabled and invalid fields show accessible error messages (ARIA)

#### Scenario: Form subcategoria selector shows the 10 seeded slugs
- **GIVEN** the frontend fetches the `eventos` category (via `CategoriasService` or the local seed)
- **WHEN** the form renders the `subcategoriaId` selector
- **THEN** exactly the 10 seeded subcategorias of the `eventos` category appear

#### Scenario: Public list shows skeleton while loading
- **GIVEN** an anonymous visitor opens `/eventos`
- **WHEN** the `EventosService.list()` call is in progress
- **THEN** `ngx-skeleton-loader` placeholders are shown with `borderRadius` and color from `docs/DESIGN.md` token `surface-container-low`

#### Scenario: Public list empty state renders informative message
- **GIVEN** no approved eventos match the current filters
- **WHEN** the `EventosService.list()` returns `{ data: [], meta: {...} }`
- **THEN** an empty-state component with explanatory text renders (no partial data shown)

#### Scenario: Detail page renders ficha and interactive map
- **GIVEN** an approved evento with valid `coordenadas`
- **WHEN** a visitor opens `/eventos/festival-verano-concon-2025`
- **THEN** the full ficha renders with all details
- **AND** a `@angular/google-maps` map displays a marker at the evento's `coordenadas` (zoom level 14, info window with `nombre` and `fechaInicio`)

#### Scenario: Detail page of pending evento shows 404
- **GIVEN** an evento with `status: 'pendiente'` and slug `evt-pendiente`
- **WHEN** a visitor opens `/eventos/evt-pendiente`
- **THEN** a 404 page renders — no partial data of the evento is shown to the public

#### Scenario: My Events panel shows only the user's own eventos with all statuses
- **GIVEN** an authenticated user with rol `'empresa'` and UID `uid-empresa-001`
- **AND** this user owns eventos in three states (pendiente, aprobado, rechazado)
- **WHEN** the user opens `/mis-eventos`
- **THEN** all three of the user's eventos are displayed (regardless of status)
- **AND** eventos owned by other users are NOT shown

#### Scenario: Design tokens only — no hex literals in Angular components
- **GIVEN** any eventos UI screen
- **WHEN** the rendered HTML/CSS is inspected
- **THEN** no hex color values are hard-coded in Angular component files
- **AND** all colors, spacing, radii and shadows come from `docs/DESIGN.md` via `tailwind.config.js`
