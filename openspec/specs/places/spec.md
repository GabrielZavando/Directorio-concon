# places Specification

## Purpose
The `places` capability provides the core CRUD, search, and "open now" derivation for the generic listing entity of the Directorio de Concón. It replaces the previous `empresas` entity with a broader schema that accommodates companies, institutions, and public-interest places. The lifecycle is: a publisher creates a place → a `solicitud` of type `registro` is auto-created with status `pendiente` → an admin approves or rejects → approved places become publicly discoverable via search and slug lookup.

---
## Requirements
### Requirement: Place entity schema
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
- `horarios?: HorarioDia[]` — array of 7 day entries; each `HorarioDia = { dia: DiaSemana, abierto: boolean, turnos: Turno[] }`; `Turno = { apertura: 'HH:mm', cierre: 'HH:mm' }` with `apertura < cierre`
- `horariosEspeciales?: HorarioEspecial[]` — array of special-date overrides; each `HorarioEspecial = { fecha: 'YYYY-MM-DD', descripcion: string, turnos: Turno[] }`
- `abierto24x7: boolean` — if true, the place is always open; `horarios` and `horariosEspeciales` are ignored for the open-now check
- `servicios?: ServicioEnum[]` — controlled enum: `wifi | estacionamiento | acceso-discapacidad | apto-mascotas | delivery | take-away | terraza | vista-al-mar | reservas | ninos-bienvenida`
- `metodosPago?: MetodoPagoEnum[]` — controlled enum: `efectivo | debito | credito | transferencia | qr`
- `idiomas?: string[]` — post-MVP placeholder, no validation beyond array-of-strings
- `status: PlaceStatus` — `pendiente | aprobado | rechazado` (default `pendiente` on create)
- `verificado: boolean` — default `false`; set to `true` when an admin approves
- `fechaVerificacion?: Date` — timestamp when `verificado` became true
- `destacado: boolean` — default `false`; admin-toggled for home carousel
- `planId: 'gratuito' | 'premium'` — required on create
- `vistasTotales: number` — post-MVP placeholder, defaults to `0`, no write path implemented in this change
- `valoracionGoogle?: { rating: number; reviewsCount: number; mapsLink: string }` — post-MVP placeholder, optional
- `usuarioId?: string` — Firebase Auth UID of the publisher who owns this place
- `fechaPublicacion?: Date` — timestamp when status transitioned to `aprobado`
- `createdAt: Date` — document creation timestamp
- `updatedAt: Date` — last modification timestamp

#### Scenario: Create place with all required fields
- **WHEN** a publisher sends `POST /api/v1/places` with valid `nombre`, `descripcion`, `descripcionCorta`, `categoriaId`, `barrioId`, `direccion`, `planId`
- **THEN** the system creates a `Place` document with `status: 'pendiente'`, generated `slug`, `createdAt`/`updatedAt` set, `vistasTotales: 0`, `verificado: false`, `destacado: false`
- **AND** a `solicitud` document is auto-created in collection `solicitudes` with `tipo: 'registro'`, `status: 'pendiente'`, `placeId` pointing to the new place, and the publisher's `usuarioId`

#### Scenario: Create place rejects duplicate slug
- **WHEN** a place with slug `restaurante-el-marino` already exists
- **AND** a publisher sends `POST /api/v1/places` with `nombre: "Restaurante El Marino"` (which derives the same slug)
- **THEN** the response is `409` with error "Slug duplicado"
- **AND** no `Place` nor `solicitud` is created

#### Scenario: Create place rejects invalid DTO
- **WHEN** payload lacks `categoriaId` or `barrioId`, or `email` is malformed, or `descripcionCorta` exceeds 140 characters
- **THEN** the response is `422` with validation errors
- **AND** no document is created

#### Scenario: Create place with invalid subcategoriaId
- **WHEN** `categoriaId` is `gastronomia` (which has subcategorias `restaurantes` and `cafeterias`)
- **AND** payload includes `subcategoriaId: 'hoteles'` (not in that category)
- **THEN** the response is `422` with error "Subcategoría no pertenece a la categoría seleccionada"

#### Scenario: Create place accepts valid subcategoriaId
- **WHEN** `categoriaId` is `gastronomia` and `subcategoriaId: 'restaurantes'`
- **THEN** the place is created with `subcategoriaId: 'restaurantes'`

---

### Requirement: Place search and listing
The system SHALL support paginated, cursor-based listing of places with optional filters.

#### Scenario: List places with no filters
- **WHEN** an anonymous visitor sends `GET /api/v1/places?page=1&limit=20`
- **THEN** response is `200` with `{ data: Place[], meta: { total, page, limit } }`
- **AND** only places with `status: 'aprobado'` are returned
- **AND** results are ordered by `destacado DESC, createdAt DESC`

#### Scenario: List places filtered by categoriaId
- **WHEN** request includes `categoriaId=gastronomia`
- **THEN** only approved places with that `categoriaId` are returned

#### Scenario: List places filtered by barrioId
- **WHEN** request includes `barrioId=centro`
- **THEN** only approved places with that `barrioId` are returned

#### Scenario: List places with text query
- **WHEN** request includes `q=pizza`
- **THEN** approved places whose `nombre`, `descripcion`, or `descripcionCorta` contain the query (case-insensitive) are returned
- **AND** the text search is implemented via Firestore array-contains on a `searchTokens` field (generated on write) or via client-side filter for MVP — the exact mechanism is an implementation detail; the contract is that the filter works

#### Scenario: Pagination uses cursors
- **WHEN** `page=2` is requested
- **THEN** the response uses a Firestore cursor (not offset) for consistent pagination

#### Scenario: Admin can list places by status
- **WHEN** an authenticated admin sends `GET /api/v1/places?status=pendiente`
- **THEN** places with `status: 'pendiente'` are returned (including non-approved)

---

### Requirement: Get place by ID
The system SHALL return a single place by its Firestore document ID.

#### Scenario: Get existing place by ID
- **WHEN** request `GET /api/v1/places/{id}` for an existing place
- **THEN** response `200` with the full `Place` object

#### Scenario: Get non-existent place by ID
- **WHEN** request `GET /api/v1/places/{id}` for a non-existent ID
- **THEN** response `404` with error

---

### Requirement: Get place by slug
The system SHALL return a single place by its unique `slug`.

#### Scenario: Get existing place by slug
- **WHEN** request `GET /api/v1/places/slug/{slug}` for an existing slug
- **THEN** response `200` with the full `Place` object

#### Scenario: Get non-existent place by slug
- **WHEN** request `GET /api/v1/places/slug/{slug}` for a non-existent slug
- **THEN** response `404` with error

---

### Requirement: Update place
The system SHALL allow partial updates of a place. If `nombre` changes, the `slug` is regenerated and uniqueness is re-validated. Only the owner (publisher with matching `usuarioId`) or an admin may update.

The endpoint `PUT /api/v1/places/{id}` is decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')`; the controller reads the actor from `@CurrentUser() user: AuthContext` and passes it to `PlacesService.update(id, dto, actor)`. The service enforces ownership at runtime: `if (actor.rol !== 'admin' && existing.usuarioId !== actor.uid)` → `403 Forbidden`. The `"anonymous"` literal stub in `update` is removed.

#### Scenario: Owner updates own place
- **GIVEN** an authenticated `owner` with UID `uid-owner-001` and a place with `usuarioId: 'uid-owner-001'`
- **WHEN** the owner sends `PUT /api/v1/places/{id}` with `Authorization: Bearer <idToken>` and a valid partial body
- **THEN** the response is `200` with the updated place, `updatedAt` refreshed

#### Scenario: Owner updates another owner's place — denied with 403
- **GIVEN** an authenticated `owner` with UID `uid-owner-001` and a place with `usuarioId: 'uid-owner-002'`
- **WHEN** the owner sends `PUT /api/v1/places/{id}` with `Authorization: Bearer <idToken>`
- **THEN** the response is `403` with error: `No tienes permiso para modificar este lugar`
- **AND** no update is applied

#### Scenario: Admin can update any place
- **WHEN** an admin sends `PUT /api/v1/places/{id}` for a place owned by another user
- **THEN** the response is `200` regardless of `usuarioId`

#### Scenario: Member attempts to update — denied with 403
- **GIVEN** an authenticated user with `rol: 'member'`
- **WHEN** the member sends `PUT /api/v1/places/{id}` with `Authorization: Bearer <idToken>`
- **THEN** the response is `403` with error: `rol 'member' is not allowed to perform this operation`
- **AND** the `RolesGuard` short-circuits before the handler

#### Scenario: Anonymous attempt to update — denied with 401
- **WHEN** a caller with no `Authorization` header sends `PUT /api/v1/places/{id}`
- **THEN** the response is `401` (the `JwtAuthGuard` rejects before `RolesGuard` runs)

#### Scenario: Owner changes nombre triggers slug regeneration
- **WHEN** owner sends `PUT` with new `nombre`
- **THEN** slug is regenerated from the new name, uniqueness checked, and updated

#### Scenario: Update rejects duplicate slug after rename
- **WHEN** owner renames to a nombre that derives a slug already taken
- **THEN** response `409` "Slug duplicado", no update applied

### Requirement: Delete place
The system SHALL allow deletion of a place by its owner or an admin. Deletion is blocked if any pending `solicitud` references the place.

The endpoint `DELETE /api/v1/places/{id}` is decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')`; the controller reads the actor from `@CurrentUser() user: AuthContext` and passes it to `PlacesService.delete(id, actor)`. The service enforces ownership at runtime: `if (actor.rol !== 'admin' && existing.usuarioId !== actor.uid)` → `403 Forbidden`.

> **Semantics note (corrected by the real repository)**: with the `StubSolicitudesRepository`, `existsByPlaceId` always returned `false` and deletion was never blocked. The real `SolicitudesFirestoreAdapter.existsByPlaceId` filters `status === 'pendiente'` — the same semantic as `eventos.remove` (`existsPendingByEventoId`). This change aligns the spec with the real-repo semantic: **deletion is blocked only while a pending solicitud exists** (an approved/rejected solicitud does not block deletion). Historical spec text said "any status"; that wording is superseded.

#### Scenario: Owner deletes own place with no pending solicitudes
- **GIVEN** an authenticated `owner` with UID `uid-owner-001` and a place with `usuarioId: 'uid-owner-001'`
- **WHEN** the owner sends `DELETE /api/v1/places/{id}` with `Authorization: Bearer <idToken>` and no `solicitud` has `placeId = {id}` with `status: 'pendiente'`
- **THEN** the response is `200` with `{ deleted: true, id }`, place document removed

#### Scenario: Owner deletes another owner's place — denied with 403
- **GIVEN** an authenticated `owner` with UID `uid-owner-001` and a place with `usuarioId: 'uid-owner-002'`
- **WHEN** the owner sends `DELETE /api/v1/places/{id}` with `Authorization: Bearer <idToken>`
- **THEN** the response is `403` with error: `No tienes permiso para eliminar este lugar`
- **AND** the place document is NOT removed

#### Scenario: Admin can delete any place
- **WHEN** an admin sends `DELETE /api/v1/places/{id}` for a place owned by another user
- **THEN** the response is `200` (subject to the pending-solicitud guard)

#### Scenario: Delete blocked by pending solicitud
- **WHEN** a `solicitud` with `placeId = {id}` and `status: 'pendiente'` exists
- **AND** owner or admin sends `DELETE`
- **THEN** the response is `409` with error: `No se puede eliminar: existen solicitudes asociadas a este lugar`
- **AND** the place document is NOT removed

#### Scenario: Member attempts to delete — denied with 403
- **GIVEN** an authenticated user with `rol: 'member'`
- **WHEN** the member sends `DELETE /api/v1/places/{id}` with `Authorization: Bearer <idToken>`
- **THEN** the response is `403` with error: `rol 'member' is not allowed to perform this operation`
- **AND** the `RolesGuard` short-circuits before the handler

#### Scenario: Anonymous attempt to delete — denied with 401
- **WHEN** a caller with no `Authorization` header sends `DELETE /api/v1/places/{id}`
- **THEN** the response is `401` (the `JwtAuthGuard` rejects before `RolesGuard` runs)

### Requirement: Solicitud auto-creation on place create
The system SHALL automatically create a `solicitud` document when a place is created. The `POST /api/v1/places` endpoint is decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')` so that only authenticated users with `rol: 'owner'` may create a place; the controller reads the publisher's UID from `@CurrentUser() user: AuthContext` (the verified Firebase Auth UID) rather than hardcoding the literal `"anonymous"` string. The auto-created `solicitud` carries the verified `usuarioId`.

**Persistence correction**: this change replaces the `StubSolicitudesRepository` (which returned `{ id: "stub" }` and never persisted) with the real `SolicitudesModule`'s `SOLICITUDES_REPOSITORY` (`SolicitudesFirestoreAdapter`), imported via a **direct module import** (no `forwardRef` — the module graph has no circular dependency). The auto-created `solicitud` is now actually persisted in the `solicitudes` collection and carries a real Firestore document ID.

#### Scenario: Solicitud created with correct linkage
- **GIVEN** an authenticated `owner` with UID `uid-owner-001`
- **WHEN** the owner sends `POST /api/v1/places` with `Authorization: Bearer <idToken>` and a valid body
- **THEN** a `Place` document is created with `status: 'pendiente'` and `usuarioId: 'uid-owner-001'` (no longer `"anonymous"`)
- **AND** a `solicitud` document is persisted in `solicitudes` with:
  - `tipo: 'registro'`
  - `status: 'pendiente'`
  - `placeId` = the new place's `id`
  - `usuarioId` = `'uid-owner-001'` (the verified publisher's UID — the same value as on the place)
  - `createdAt` = same timestamp as the place's `createdAt`
  - a real Firestore document `id` (not the stub literal `"stub"`)

#### Scenario: Member attempts to create a place — denied with 403
- **GIVEN** an authenticated user with `rol: 'member'` and UID `uid-member-001`
- **WHEN** the member sends `POST /api/v1/places` with `Authorization: Bearer <idToken>` and a valid body
- **THEN** the response is `403` with error: `rol 'member' is not allowed to perform this operation`
- **AND** the `RolesGuard` short-circuits before the handler
- **AND** no `Place` document is created and no `solicitud` is auto-created

#### Scenario: Anonymous attempt to create a place — denied with 401
- **WHEN** a caller with no `Authorization` header sends `POST /api/v1/places`
- **THEN** the response is `401` (the `JwtAuthGuard` rejects before `RolesGuard` runs)
- **AND** no document is persisted

### Requirement: Admin approves solicitud
The system SHALL allow an admin to approve a pending solicitud, which transitions the place to `aprobado` and sets verification metadata.

#### Scenario: Admin approves solicitud
- **WHEN** an admin sends `PUT /api/v1/solicitudes/{id}/aprobar` (or equivalent action)
- **THEN** the solicitud `status` becomes `aprobado`, `revisadoPor` = admin UID, `revisadoAt` = now
- **AND** the linked place `status` becomes `aprobado`, `verificado: true`, `fechaVerificacion` = now, `fechaPublicacion` = now

---

### Requirement: Admin rejects solicitud
The system SHALL allow an admin to reject a pending solicitud, which transitions the place to `rechazado`.

#### Scenario: Admin rejects solicitud
- **WHEN** an admin sends `PUT /api/v1/solicitudes/{id}/rechazar` with `comentarios`
- **THEN** the solicitud `status` becomes `rechazado`, `revisadoPor` = admin UID, `revisadoAt` = now, `comentarios` stored
- **AND** the linked place `status` becomes `rechazado` (remains non-public)

---

### Requirement: Open now derivation
The system SHALL provide an endpoint `GET /api/v1/places/{id}/abierto-ahora` that returns whether the place is currently open based on its `horarios`, `horariosEspeciales`, and `abierto24x7`, evaluated against the current time in the **America/Santiago** timezone.

#### Scenario: Place open 24x7 returns always open
- **WHEN** a place has `abierto24x7: true`
- **AND** request `GET /api/v1/places/{id}/abierto-ahora`
- **THEN** response `200` with `{ abierto: true }`

#### Scenario: Place open now via regular horario
- **WHEN** a place has `horarios` with current day `abierto: true` and a `turno` covering the current Santiago time
- **AND** no `horariosEspeciales` for today
- **AND** request `GET /api/v1/places/{id}/abierto-ahora`
- **THEN** response `200` with `{ abierto: true, turno: { apertura, cierre } }` (the matching turno)

#### Scenario: Place closed now via regular horario
- **WHEN** a place has `horarios` for current day but current Santiago time is outside all `turnos`
- **AND** no `horariosEspeciales` for today
- **AND** request `GET /api/v1/places/{id}/abierto-ahora`
- **THEN** response `200` with `{ abierto: false }`

#### Scenario: Horario especial overrides regular horario
- **WHEN** today is `2025-12-31` and a place has `horariosEspeciales` with `fecha: '2025-12-31'` and specific `turnos`
- **AND** request `GET /api/v1/places/{id}/abierto-ahora` (server time in Santiago is 2025-12-31)
- **THEN** the `horariosEspeciales` turnos are used instead of the regular `horarios` for the open check

#### Scenario: Horario especial with empty turnos means closed
- **WHEN** a `horariosEspeciales` entry for today has `turnos: []`
- **AND** request `GET /api/v1/places/{id}/abierto-ahora`
- **THEN** response `200` with `{ abierto: false }` (even if regular horario would be open)

---

### Requirement: Place image gallery limits
The system SHALL enforce maximum gallery image counts per plan.

#### Scenario: Free plan place limited to 3 gallery images
- **WHEN** a place with `planId: 'gratuito'` is created or updated with `imagenes.galeria` containing 4 URLs
- **THEN** response `422` with error "Plan gratuito permite máximo 3 imágenes en galería"

#### Scenario: Premium plan place limited to 10 gallery images
- **WHEN** a place with `planId: 'premium'` is created or updated with `imagenes.galeria` containing 11 URLs
- **THEN** response `422` with error "Plan premium permite máximo 10 imágenes en galería"

---

### Requirement: Servicios and metodosPago enum validation
The system SHALL reject any `servicios` or `metodosPago` value not in the canonical enum.

#### Scenario: Invalid servicio rejected
- **WHEN** create/update payload includes `servicios: ['wifi', 'servicio-inexistente']`
- **THEN** response `422` with error indicating the invalid value

#### Scenario: Invalid metodoPago rejected
- **WHEN** create/update payload includes `metodosPago: ['efectivo', 'bitcoin']`
- **THEN** response `422` with error indicating the invalid value

---

### Requirement: Map data endpoint
The system SHALL provide `GET /api/v1/places/map-data` returning a lightweight array for map markers.

#### Scenario: Map data returns approved places with coordinates
- **WHEN** request `GET /api/v1/places/map-data`
- **THEN** response `200` with array of `{ id, slug, nombre, coordenadas: { lat, lng }, categoriaId, barrioId }` for all approved places that have `coordenadas`

---

### Requirement: Cross-module references renamed
The `solicitudes` and `usuarios` modules SHALL reference `placeId` instead of `empresaId`.

#### Scenario: Solicitud placeId field exists
- **WHEN** a solicitud document is inspected
- **THEN** it has field `placeId` (string) and NO field `empresaId`

#### Scenario: Usuario placeId field exists
- **WHEN** a usuario document with `rol: 'empresa'` is inspected
- **THEN** it has field `placeId` (string) and NO field `empresaId`

---

### Requirement: RedSocial value object — closed plataforma enum
The system SHALL validate `places.redesSociales[].plataforma` against a closed enum instead of accepting any non-empty string. The closed enum is:

`PlataformaSocialEnum = 'instagram' | 'facebook' | 'x-twitter' | 'linkedin' | 'tiktok' | 'youtube'`

The migration of the legacy value `'twitter'` → `'x-twitter'` reflects the platform's 2023 rename. The enum is defined once in `backend/src/modules/places/domain/plataforma-social.enum.ts` and exported alongside `PLATAFORMA_SOCIAL_VALUES` (a `readonly` tuple) for `class-validator` `@IsEnum` consumption in the DTO and for the `isValidRedSocial` enum membership check in the VO.

The valid counts and shape of `RedSocial` are otherwise unchanged:

- `redesSociales?: RedSocial[]` — max 3 items per place.
- `RedSocial = { plataforma: PlataformaSocialEnum; url: string }` — `url` MUST be a valid URI.

#### Scenario: Valid RedSocial with all enum values
- **WHEN** a publisher sends `POST /api/v1/places` with `redesSociales: [{ plataforma: 'instagram', url: '...' }, { plataforma: 'facebook', url: '...' }, { plataforma: 'x-twitter', url: '...' }]`
- **THEN** the place is created and the three redes are persisted
- **AND** a fourth `redesSociales` entry is rejected with `400` (maxItems: 3 — this rule is unchanged)

#### Scenario: Reject RedSocial with platform outside the enum
- **WHEN** a publisher sends `POST /api/v1/places` with `redesSociales: [{ plataforma: 'whatsapp', url: 'https://wa.me/56912345678' }]`
- **THEN** the response is `400` with a validation error: `plataforma must be one of: instagram, facebook, x-twitter, linkedin, tiktok, youtube`
- **AND** nothing is persisted

#### Scenario: Reject legacy twitter value post-migration
- **WHEN** a publisher sends `POST /api/v1/places` with `redesSociales: [{ plataforma: 'twitter', url: 'https://twitter.com/x' }]`
- **THEN** the response is `400` with the same validation error
- **AND** the error message lists `'x-twitter'` as the valid replacement

#### Scenario: Accept x-twitter as the migrated value
- **WHEN** a publisher sends `POST /api/v1/places` with `redesSociales: [{ plataforma: 'x-twitter', url: 'https://twitter.com/x' }]`
- **THEN** the place is created and the red social is persisted with `plataforma: 'x-twitter'`

### Requirement: CreatePlace DTO — `usuarioId` is not client-supplied
The system SHALL NOT accept a `usuarioId` property in the `CreatePlace` request body. The `usuarioId` of a `Place` is server-derived from the verified Firebase Auth JWT (the authenticated publisher's UID); the global `ValidationPipe` is configured with `forbidNonWhitelisted: true`, so any client that includes `usuarioId` in the body receives `400`.

~~This requirement closes a divergence between `docs/data-model.md` (`usuarioId: "Propietario (Firebase Auth UID)"`) and `docs/api-spec.yml:320-321` (which previously listed `usuarioId` as an accepted `CreatePlace` property — a spec artifact that, if ever wired naively by a future `auth` implementation, would allow a client to spoof the `usuarioId` of someone else's place).~~

~~Until the `auth + usuarios` change ships, the existing stub at `places.controller.ts:44-46` continues to call `placesService.createPlace(dto, 'anonymous')` — the runtime value `"anonymous"` is documented as auth debt in the `usuarios` specification. This change does NOT touch that stub; it only ensures the body does not carry `usuarioId` so the eventual JWT-derived value can replace `"anonymous"` without contract drift.~~

This change **completes** the requirement: the stub is removed. The `PlacesController.create` handler now reads `usuarioId` from `@CurrentUser() user: AuthContext` (the `user.uid` verified by `JwtAuthGuard`), NOT from the body or a hardcoded literal. The body never carried `usuarioId` (the `roles-rename` change already removed it from `CreatePlaceDto` and `docs/api-spec.yml`); this change removes the controller stub and makes the runtime behavior finally match the contract.

The `Place` response schema still exposes `usuarioId` as a read-only field (admins browsing the catalogue need to see the owner); the removal is solely on the input (create) body. `UpdatePlace` does not list `usuarioId` either (it was never there).

#### Scenario: CreatePlace with usuarioId in body — rejected
- **WHEN** a publisher sends `POST /api/v1/places` with body `{ ..., "usuarioId": "uid-spoofed-001" }` and a valid `Authorization: Bearer <idToken>`
- **THEN** the response is `400` with error: `property usuarioId should not exist`
- **AND** nothing is persisted

#### Scenario: CreatePlace without usuarioId — persisted with verified JWT uid
- **GIVEN** an authenticated `owner` with UID `uid-owner-001` (verified by `JwtAuthGuard`)
- **WHEN** the owner sends `POST /api/v1/places` with body `{ ..., "nombre": "...", "categoriaId": "...", "barrioId": "...", "planId": "gratuito" }` (no `usuarioId`) and `Authorization: Bearer <idToken>`
- **THEN** the place is created with `usuarioId: 'uid-owner-001'` (the verified `user.uid` — the documented `"anonymous"` stub is removed by this change)
- **AND** a `solicitud` tipo `'registro'` is auto-created as before
- ~~**WHEN** the `auth + usuarios` change eventually ships~~ (this IS the `auth + usuarios` change — no further contract change is required in `api-spec.yml`)

### Requirement: Cross-catalog validation in place create and update

The system SHALL validate at create and update time that `categoriaId`, `subcategoriaId` (when present), and `barrioId` referenced by a `Place` document resolve to existing and `activo: true` documents in the `categorias` and `barrios` collections respectively. Validation MUST only fire when the corresponding field is being set or modified; updates that do not touch these fields MUST NOT re-validate.

#### Scenario: Create place rejects inactive categoria

- **WHEN** the categorias collection contains a categoria with slug `gastronomia` and `activo: false`
- **AND** an admin or owner sends `POST /api/v1/places` with `categoriaId: "gastronomia"`
- **THEN** the response is `400` with error "Categoría inválida o inactiva"
- **AND** no Place document is created

#### Scenario: Create place rejects nonexistent categoria

- **WHEN** the categorias collection does not contain a categoria with id `inexistente`
- **AND** an admin or owner sends `POST /api/v1/places` with `categoriaId: "inexistente"`
- **THEN** the response is `400` with error "Categoría inválida o inactiva"

#### Scenario: Create place rejects inactive subcategoria

- **WHEN** the categoria `gastronomia` has a subcategoria `restaurantes` with `activo: false`
- **AND** an admin or owner sends `POST /api/v1/places` with `categoriaId: "gastronomia"` and `subcategoriaId: "restaurantes"`
- **THEN** the response is `400` with error "Subcategoría inválida o inactiva"

#### Scenario: Create place rejects inactive barrio

- **WHEN** the barrios collection contains a barrio with slug `higuerillas` and `activo: false`
- **AND** an admin or owner sends `POST /api/v1/places` with `barrioId: "higuerillas"`
- **THEN** the response is `400` with error "Barrio inválido o inactivo"

#### Scenario: Update place touching nombre does not re-validate catalog references

- **WHEN** a place exists with `categoriaId: "gastronomia"` (currently `activo: false`)
- **AND** an admin or owner sends `PUT /api/v1/places/{id}` with only `{ nombre: "Nuevo Nombre" }`
- **THEN** the place is updated successfully
- **AND** no validation against the categorias collection is performed (the field was not changed)

#### Scenario: Update place changing categoriaId to inactive rejects

- **WHEN** a place exists with `categoriaId: "gastronomia"` (activo)
- **AND** an admin or owner sends `PUT /api/v1/places/{id}` with `{ categoriaId: "comercio" }`
- **AND** categoria `comercio` has `activo: false`
- **THEN** the response is `400` with error "Categoría inválida o inactiva"

#### Scenario: Update place keeping same categoriaId does not re-validate

- **WHEN** a place exists with `categoriaId: "gastronomia"` (currently `activo: false`)
- **AND** an admin sends `PUT /api/v1/places/{id}` with `{ categoriaId: "gastronomia" }` (same value, explicit)
- **THEN** the place is updated successfully
- **AND** no validation against the categorias collection is performed (the value did not change)

## Non-Goals (explicitly out of scope)

- Google Places API synchronization for `valoracionGoogle` (the field is persisted as nullable placeholder)
- Real `vistasTotales` increment on page views (the field defaults to `0`, no write path)
- Frontend consumption of `/places` (future `frontend-directorio` change)
- API alias `/empresas` (no backward-compat needed)
- Migration script from `empresas` collection (clean replacement)
- Renaming the auth role `empresa` (stays `'empresa'` in `usuarios.rol`)