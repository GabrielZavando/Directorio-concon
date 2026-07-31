# eventos Specification

## Purpose
The `eventos` capability provides time-bound activity listings for the Directorio de Concón — festivals, ferias, conciertos, carreras, talleres, ferias patrias, etc. — alongside the existing `places` entity. Publishers (rol `'owner'`) and admins record an event once with category (reusing the existing `eventos` category + its 10 seeded subcategories), barrio (reusing the existing `barrios` collection), exact GPS coordinates, date/time range, pricing, accessibility, target audience and noise level. An admin approves the event through the standard `solicitudes` workflow (extended with the `tipo` values `'registro-evento'` and `'actualizacion-evento'`, plus an optional `eventoId` reference). Approved events become publicly discoverable via search, slug lookup, and a lightweight `/map-data` endpoint for an interactive map. The frontend delivers a creation/edit form (publisher and admin), public list, ficha with map, and "My Events"/admin panels — all reusing the existing SPA shell, reusable search component, layout base, and `@angular/google-maps`.

---
## Requirements
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
- **AND** an authenticated user with rol `'owner'` and UID `uid-owner-001`
- **WHEN** the user sends `POST /api/v1/eventos` with valid `nombre`, `descripcionCorta`, `descripcion`, `subcategoriaId: 'festivales-culturales'`, `barrioId`, `organizador`, `ubicacionDireccion`, `coordenadas`, `fechaInicio`, `fechaFin`, `precioTipo: 'gratis'`, `precioValor: 0`, `publicoObjetivo: ['todos','familia']`, `nivelRuido: 'medio'`
- **THEN** the response is `201` and the evento is created with `status: 'pendiente'`, `estado: 'borrador'`, `categoriaId: 'eventos'`, `slug: 'festival-verano-concon-2025'`, `usuarioId: 'uid-owner-001'`, `destacado: false`, `verificado: false`, `vistasTotales: 0`
- **AND** a `solicitud` document is auto-created in collection `solicitudes` with `tipo: 'registro-evento'`, `status: 'pendiente'`, `eventoId` pointing to the new evento, `usuarioId: 'uid-owner-001'`

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
The system SHALL expose `PUT /api/v1/eventos/{id}` behind auth (rol `'owner'` or `'admin'`). A publisher with rol `'owner'` MUST be allowed to update only their own eventos (`evento.usuarioId === verified token uid`); any other case MUST return `403`. An admin with rol `'admin'` MUST be allowed to update any evento. When the target evento has `status === 'aprobado'`, the update MUST NOT apply changes in-place: instead, a `solicitud` with `tipo: 'actualizacion-evento'`, `status: 'pendiente'`, `eventoId`, `usuarioId`, and `proposal: { ...update fields }` MUST be created (staged update — the publicly visible evento data remains unchanged until the admin approves the solicitud). When the target evento has `status !== 'aprobado'` (`'pendiente'` or `'rechazado'`), the update MUST be applied in-place without creating a new `solicitud`. The `categoriaId` field MUST NOT be modifiable (it is not listed in `UpdateEventoDto`). Updates to a non-existent evento MUST return `404`.

#### Scenario: Publisher edits own pending evento applies in-place
- **GIVEN** an evento with `status: 'pendiente'` and `usuarioId: 'uid-owner-001'`
- **AND** a verified token for `uid-owner-001` (rol `'owner'`)
- **WHEN** the publisher sends `PUT /api/v1/eventos/{id}` with `{ descripcion: 'Nueva descripción...' }`
- **THEN** the response is `200` with the evento updated (new `descripcion`, refreshed `updatedAt`)
- **AND** no `solicitud` is created (edits to a pending evento are direct)

#### Scenario: Publisher edits own approved evento produces a staged update
- **GIVEN** an evento with `status: 'aprobado'` and `usuarioId: 'uid-owner-001'`
- **WHEN** the publisher sends `PUT /api/v1/eventos/{id}` with `{ ubicacionDireccion: 'Nueva dirección 999' }`
- **THEN** the response is `200` with the evento still showing the previous `ubicacionDireccion` (no in-place change)
- **AND** a `solicitud` is created with `tipo: 'actualizacion-evento'`, `status: 'pendiente'`, `eventoId`, `usuarioId: 'uid-owner-001'`, and `proposal: { ubicacionDireccion: 'Nueva dirección 999' }`

#### Scenario: Publisher cannot edit another publisher's evento
- **GIVEN** an evento with `usuarioId: 'uid-owner-001'`
- **AND** a verified token for `uid-owner-002` (rol `'owner'`)
- **WHEN** `uid-owner-002` sends `PUT /api/v1/eventos/{id}` with any fields
- **THEN** the response is `403`

#### Scenario: Admin edits any evento
- **GIVEN** an evento with `usuarioId: 'uid-owner-001'` and `status: 'pendiente'`
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
The system SHALL expose `DELETE /api/v1/eventos/{id}` behind auth (rol `'owner'` or `'admin'`). A publisher with rol `'owner'` MUST be allowed to delete only their own eventos; any other case MUST return `403`. An admin with rol `'admin'` MUST be allowed to delete any evento. The delete MUST return `409` if there exists any `solicitud` with the same `eventoId` and `status: 'pendiente'` (cannot delete an evento pending approval). A successful delete MUST return `{ deleted: true, id }` and the evento document MUST be removed from Firestore so that subsequent `GET` return `404`.

#### Scenario: Publisher deletes own evento without pending solicitudes
- **GIVEN** an evento with `usuarioId: 'uid-owner-001'` and no `solicitudes` with `eventoId` and `status: 'pendiente'`
- **WHEN** `uid-owner-001` sends `DELETE /api/v1/eventos/{id}`
- **THEN** the response is `200` with `{ deleted: true, id }`
- **AND** a subsequent `GET /api/v1/eventos/{id}` returns `404`

#### Scenario: Delete evento with pending solicitud returns 409
- **GIVEN** an evento with a `solicitud` associated whose `status: 'pendiente'`
- **WHEN** the owner sends `DELETE /api/v1/eventos/{id}`
- **THEN** the response is `409` with error "No se puede eliminar: existen solicitudes pendientes asociadas"

#### Scenario: Publisher cannot delete another publisher's evento
- **GIVEN** an evento with `usuarioId: 'uid-owner-001'`
- **AND** a verified token for `uid-owner-002` (rol `'owner'`)
- **WHEN** `uid-owner-002` sends `DELETE /api/v1/eventos/{id}`
- **THEN** the response is `403`

#### Scenario: Admin deletes any evento
- **GIVEN** an evento with `usuarioId: 'uid-owner-001'` and no pending `solicitudes`
- **AND** a verified token for `uid-admin-001` (rol `'admin'`)
- **WHEN** `uid-admin-001` sends `DELETE /api/v1/eventos/{id}`
- **THEN** the response is `200` with `{ deleted: true, id }`

### Requirement: Event creator is the responsable (rol `owner` or `admin`)
The system SHALL treat `eventos.usuarioId` as the event's **responsable** — the authenticated publisher who created the event. The `usuarioId` is set from the verified Firebase Auth JWT and is REQUIRED on every `Evento` document.

A user with rol `'owner'` is permitted to `POST /api/v1/eventos` (creating an event with `usuarioId === token.uid`). A user with rol `'admin'` is likewise permitted. A user with rol `'member'` is **denied** with `403`. ~~Until the `auth + usuarios` change ships, the existing provisional authentication (header `x-usuario-id`) continues to function; the runtime enforcement of the `member`-denial lives in the future `RolesGuard` introduced by `auth`.~~

This change **removes the provisional `x-usuario-id` header** and replaces it with the verified JWT. The `POST /eventos`, `PUT /eventos/{id}`, and `DELETE /eventos/{id}` endpoints are decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')`. The controller reads `usuarioId` from `@CurrentUser() user: AuthContext` (`user.uid`) instead of `@Headers("x-usuario-id")`. The `x-usuario-id` and `x-rol` headers are removed from the controller. The read endpoints (`GET /eventos`, `GET /eventos/map-data`, `GET /eventos/{id}`, `GET /eventos/slug/{slug}`) remain anonymous-accessible (no guards) — they continue returning only `status: 'aprobado'` events to anonymous visitors as before.

This requirement updates the legacy terminology `'empresa'` (used in the original `eventos-crud` spec) to the new enum value `'owner'`. Functionally identical — `'empresa'` was the old name for the same role.

#### Scenario: Owner creates event — allowed
- **GIVEN** an authenticated user with rol `'owner'` and UID `uid-owner-001` (verified by `JwtAuthGuard`)
- **WHEN** the user sends `POST /api/v1/eventos` with `Authorization: Bearer <idToken>` and valid fields (NO `x-usuario-id` header)
- **THEN** the event is created with `usuarioId: 'uid-owner-001'`, `status: 'pendiente'`, `estado: 'borrador'`
- **AND** a `solicitud` tipo `'registro-evento'` is auto-created with `usuarioId: 'uid-owner-001'`

#### Scenario: Member creates event — denied at runtime (rule enforced)
- **GIVEN** an authenticated user with rol `'member'` and UID `uid-member-001` (verified by `JwtAuthGuard`)
- **WHEN** the user sends `POST /api/v1/eventos` with `Authorization: Bearer <idToken>` and valid fields
- **THEN** the response is `403` with error: `rol 'member' is not allowed to perform this operation`
- **AND** nothing is persisted
- ~~**NOTE** Until the future `auth + usuarios` change ships, the runtime Guard is not present; the provisional `x-usuario-id` header at `eventos.controller.ts` does not enforce the role check. The spec records the rule so the enforcement is unambiguous when `auth` lands.~~ (the runtime `RolesGuard` now enforces this — the note is removed)

#### Scenario: Admin creates event — allowed
- **GIVEN** an authenticated user with rol `'admin'` (verified by `JwtAuthGuard`)
- **WHEN** the user sends `POST /api/v1/eventos` with `Authorization: Bearer <idToken>` and valid fields
- **THEN** the event is created with `usuarioId === admin.uid`, `status: 'pendiente'`, `estado: 'borrador'`, `verificado: false`
- **AND** a `solicitud` tipo `'registro-evento'` is auto-created (the admin does not bypass the approval queue by creating — they bypass it by approving their own solicitud)

#### Scenario: Anonymous attempt to create an event — denied with 401
- **WHEN** a caller with no `Authorization` header sends `POST /api/v1/eventos`
- **THEN** the response is `401` (the `JwtAuthGuard` rejects before `RolesGuard` runs)
- **AND** no document is persisted

#### Scenario: x-usuario-id header is silently ignored
- **GIVEN** an authenticated `owner` with UID `uid-owner-001`
- **WHEN** the owner sends `POST /api/v1/eventos` with `Authorization: Bearer <idToken>` AND `x-usuario-id: uid-spoofed-999`
- **THEN** the controller reads `usuarioId` from the verified `user.uid` (`'uid-owner-001'`) — the `x-usuario-id` header is not bound and is silently ignored
- **AND** the persisted `evento.usuarioId` is `'uid-owner-001'` (the spoofed header value is NOT used)

### Requirement: `eventos.placeId` is an optional reference with no ownership invariant
The system SHALL persist `eventos.placeId` as an optional reference to a `places` document with `status: 'aprobado'`. The referenced `places` document is **not** required to belong to the event creator (`eventos.usuarioId`). The event's responsable and the place's owner MAY be the same user, or different users, or the event MAY have no `placeId` at all.

This requirement makes explicit a behaviour that was implicit in `eventos-crud`: an `owner` is free to publish an event for any approved place in the directory (e.g., a community festival happening at a well-known restaurant, organised by someone else), and equally free to publish an event with no `placeId` (e.g., a beach festival with no directory-listed venue). Neither the `eventos` service nor the controller enforce a `evento.placeId ∈ {owned places of evento.usuarioId}` invariant.

Rationale: the event's "responsibility" lives in `eventos.usuarioId` (the publisher who answers for the event in the approval queue); `placeId` is a *venue* reference, not an authorship claim.

#### Scenario: Owner creates event linked to someone else's approved place
- **GIVEN** an authenticated `owner` with UID `uid-owner-A` and no place ownership of `place-id-X`
- **AND** a `places` document `place-id-X` with `status: 'aprobado'` owned by a different `owner` (`uid-owner-B`)
- **WHEN** `uid-owner-A` sends `POST /api/v1/eventos` with `placeId: 'place-id-X'`
- **THEN** the event is created with `usuarioId: 'uid-owner-A'`, `placeId: 'place-id-X'`
- **AND** the response is `201` (the absence of an ownership invariant is by design)

#### Scenario: Owner creates event without placeId
- **GIVEN** an authenticated `owner` with UID `uid-owner-A`
- **WHEN** `uid-owner-A` sends `POST /api/v1/eventos` with no `placeId`
- **THEN** the event is created with `usuarioId: 'uid-owner-A'`, `placeId: null`
- **AND** the response is `201`

#### Scenario: Owner creates event linked to a non-approved place
- **GIVEN** a `places` document `place-id-Y` with `status: 'pendiente'`
- **WHEN** a publisher sends `POST /api/v1/eventos` with `placeId: 'place-id-Y'`
- **THEN** the response is `400` with error indicating that `placeId` must reference an approved place
- **AND** nothing is persisted (this validation already exists in `eventos-crud`; this requirement re-states it for completeness)

