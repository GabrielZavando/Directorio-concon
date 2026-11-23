# solicitudes Specification

## Purpose
The `solicitudes` capability manages the admin approval workflow for places. Solicitudes are created manually when owners claim admin-created places (`reclamo-place`). Admins approve or reject solicitudes via `POST /solicitudes/{id}/approve|reject`, which triggers side-effects on the linked place.
## Requirements
### Requirement: Solicitud entity schema
The system SHALL persist a `Solicitud` document in the Firestore collection `solicitudes` with the following fields:

- `id: string` — Firestore document ID (auto-generated)
- `placeId: string` — reference to a `places` document; REQUIRED for all solicitudes (the only reference field; `eventoId` is REMOVED)
- `usuarioId: string` — Firebase Auth UID of the publisher tied to the solicitud (REQUIRED, never null). For `reclamo-place` created via `POST /places/{id}/reclamar` it mirrors `place.usuarioId` at claim time
- `tipo: string` — enum with the single value `'reclamo-place'`
- `status: SolicitudStatus` — enum: `'pendiente' | 'aprobado' | 'rechazado'` (default `'pendiente'` on create)
- `solicitanteUid: string` — Firebase Auth UID of the caller claiming the place; REQUIRED for all solicitudes
- `comentarios?: string` — free text, optional publisher/admin commentary
- `revisadoPor?: string` — Firebase Auth UID of the admin who approved/rejected the solicitud; set when `status` transitions to `'aprobado'` or `'rechazado'`; MUST reference a `usuarios` document with `rol === 'admin'`
- `createdAt: Date` — document creation timestamp
- `revisadoAt?: Date` — timestamp of the `aprobar`/`rechazar` action

The fields `eventoId` and `proposal` are REMOVED from the entity, the persistence contract (`toPersistence`/`toDomain`), and every DTO. The persistence layer MUST NOT write them; documents that still carry them are legacy and are handled by the one-time migration (see "Legacy solicitudes migration").

**Runtime enforcement**: `SolicitudesService` asserts on every create that `placeId` is present and `eventoId` is absent; `solicitanteUid` is required.

#### Scenario: Valid place solicitud passes the constraint
- **WHEN** `SolicitudesService.create` is called with `placeId` set, `eventoId` absent, `solicitanteUid` set, and `tipo === 'reclamo-place'`
- **THEN** the service delegates to the repository and the solicitud is persisted

#### Scenario: Reject solicitud with eventoId set (campo removido)
- **WHEN** `SolicitudesService.create` is called with `eventoId` present in the input
- **THEN** the service throws `400 BadRequestException` with message: `El campo 'eventoId' ha sido removido en CH-05 solicitudes-refactor. Use placeId para solicitudes de tipo 'reclamo-place'.`
- **AND** nothing is persisted

#### Scenario: Reject solicitud with missing placeId
- **WHEN** `SolicitudesService.create` is called without `placeId`
- **THEN** the service throws `400 BadRequestException` with message: `Tipo de solicitud no permitido en esta fase. Solo 'reclamo-place' es válido.`
- **AND** nothing is persisted

#### Scenario: Adapter persistence contract excludes removed fields
- **WHEN** `SolicitudesFirestoreAdapter.create` persists a solicitud
- **THEN** the written document contains exactly `placeId`, `usuarioId`, `tipo`, `status`, `solicitanteUid`, `createdAt` (plus `status`/`revisadoPor`/`revisadoAt`/`comentarios` on update)
- **AND** no `eventoId` or `proposal` key is ever written

#### Scenario: No auto-create solicitud on POST /eventos (regression guard from eventos-refactor)
- **WHEN** a publisher sends `POST /api/v1/eventos` and the evento is persisted with `activo: true` and `estadoVerificacion: 'pendiente'`
- **THEN** NO `solicitud` document is auto-created (the evento is visible immediately without admin approval)

#### Scenario: No staged solicitud on PUT /eventos/{id} when event is verified (regression guard from eventos-refactor)
- **WHEN** a publisher (the event's owner or an admin) sends `PUT /api/v1/eventos/{id}` for an evento with `estadoVerificacion: 'verificado'`
- **THEN** the evento document IS modified in-place (with `estadoVerificacion` reverted to `'pendiente'` and a `cambios[]` entry appended)
- **AND** NO `solicitud` is auto-created (the legacy `actualizacion-evento` flow is removed)

### Requirement: `revisadoPor` resolver — rol `'admin'`
The system SHALL ensure that any `solicitud` mutation that sets `status` to `'aprobado'` or `'rechazado'` is performed by an authenticated `usuarios` document with `rol === 'admin'`, and that the `revisadoPor` field stores that admin's UID.

The enforcement is live (see `auth-usuarios` change): `SolicitudesController` exposes `POST /api/v1/solicitudes/{id}/approve` and `POST /api/v1/solicitudes/{id}/reject`, both `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`; `revisadoPor` is sourced from `@CurrentUser() user.uid`. **No change in this delta** — kept for canonical completeness and to preserve the audit trail across archives.

#### Scenario: Admin approves solicitud — revisadoPor recorded
- **GIVEN** a `solicitud` with `status: 'pendiente'` and an authenticated admin with UID `uid-admin-001` (rol `'admin'` enforced by the `RolesGuard` of the `auth` module)
- **WHEN** the admin calls `POST /api/v1/solicitudes/<id>/approve` with `Authorization: Bearer <idToken>`
- **THEN** the solicitud transitions to `status: 'aprobado'`, `revisadoPor: 'uid-admin-001'`, `revisadoAt: <now>`
- **AND** the linked `places` document receives the corresponding side-effect (`place.usuarioId` updated for `reclamo-place`)

#### Scenario: Admin rejects solicitud with comentarios — recorded
- **GIVEN** a pending `solicitud` and an authenticated admin
- **WHEN** the admin calls `POST /api/v1/solicitudes/<id>/reject` with `{ comentarios: 'Falta documentación' }`
- **THEN** the solicitud transitions to `status: 'rechazado'`, `revisadoPor: <admin uid>`, `revisadoAt: <now>`, `comentarios: 'Falta documentación'`
- **AND** the linked document side-effect is applied (e.g., no place side-effect for `reclamo-place`)

#### Scenario: Non-admin attempts approval — denied at runtime (rule enforced)
- **GIVEN** a `solicitud` with `status: 'pendiente'` and an authenticated user with rol `'owner'`
- **WHEN** the owner attempts to call `POST /api/v1/solicitudes/<id>/approve`
- **THEN** the response is `403` with error: `rol 'owner' is not allowed to perform this operation`
- **AND** nothing is mutated (the `RolesGuard` short-circuits before the handler executes; the `SolicitudesService` is never called)

#### Scenario: Member attempts approval — denied at runtime
- **GIVEN** a `solicitud` with `status: 'pendiente'` and an authenticated user with rol `'member'`
- **WHEN** the member attempts to call `POST /api/v1/solicitudes/<id>/approve`
- **THEN** the response is `403` with error: `rol 'member' is not allowed to perform this operation`

#### Scenario: Anonymous attempt to approve — denies with 401
- **WHEN** a caller with no `Authorization` header (anonymous) attempts `POST /api/v1/solicitudes/<id>/approve`
- **THEN** the response is `401` (the `JwtAuthGuard` rejects before `RolesGuard` runs)

#### Scenario: Approve non-pending solicitud returns 409
- **GIVEN** a `solicitud` with `status: 'aprobado'` already
- **WHEN** an admin calls `POST /api/v1/solicitudes/<id>/approve`
- **THEN** the response is `409` with error: `solicitud is not pendiente` (the existing `SolicitudesService.approve` invariant is unchanged)
- **AND** the solicitud is not re-mutated

#### Scenario: Reject with unexpected body field returns 400
- **WHEN** an admin calls `POST /api/v1/solicitudes/<id>/reject` with `{ comentarios: '...', unexpectedField: true }`
- **THEN** the response is `400` with error: `property unexpectedField should not exist`
- **AND** nothing is mutated (the global `ValidationPipe` with `forbidNonWhitelisted` enforces the contract)

---

### Requirement: Reclamo-place solicitud creation
The system SHALL allow an authenticated `owner` to create a `solicitud` of type `reclamo-place` via `POST /api/v1/places/{id}/reclamar` (`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')`). The endpoint takes NO request body: `placeId` comes from the path param and `solicitanteUid` from the verified JWT (`@CurrentUser().uid`). The created solicitud carries `tipo: 'reclamo-place'`, `status: 'pendiente'`, `placeId`, `solicitanteUid: <caller uid>`, and `usuarioId: <place.usuarioId at claim time>`. Only claimable places are accepted (`place.usuarioId == null` OR `place.gestionadoPorAdmin === true`). Multiple simultaneous claims for the same place are allowed; losing claims are auto-rejected at approval time.

#### Scenario: Reclamo-place solicitud created with correct fields
- **WHEN** an owner calls `POST /api/v1/places/{id}/reclamar` for a claimable place (no request body)
- **THEN** the response is `201` with `{ claimed: true, placeId: <id> }`
- **AND** a `solicitud` is created with `tipo: 'reclamo-place'`, `status: 'pendiente'`, `placeId: <id>`, `solicitanteUid: <caller uid>`, `usuarioId: <place.usuarioId at claim time>`

#### Scenario: Missing solicitanteUid at service level is rejected
- **WHEN** `SolicitudesService.create` is called with `tipo: 'reclamo-place'` and `solicitanteUid` absent
- **THEN** the service throws `400` indicating `solicitanteUid` is required

#### Scenario: Non-owner cannot claim
- **WHEN** an authenticated `admin` or `member` calls `POST /api/v1/places/{id}/reclamar`
- **THEN** the response is `403` (the `RolesGuard` short-circuits) and no solicitud is created

### Requirement: Reclamo-place approval — transactional
The system SHALL approve a `reclamo-place` solicitud atomically: assign `usuarioId = solicitanteUid` to the place AND auto-reject all other pending `reclamo-place` solicitudes for the same place (single Firestore transaction).

#### Scenario: Approve reclamo-place — owner assigned, others rejected
- **WHEN** an admin approves a `solicitud` with `tipo: 'reclamo-place'`, `solicitanteUid: 'uid-owner-001'`, `placeId: 'place-001'`
- **THEN** the place `usuarioId` becomes `'uid-owner-001'`
- **AND** all other pending `solicitudes` with `tipo: 'reclamo-place'` and `placeId: 'place-001'` are transitioned to `status: 'rechazado'`
- **AND** the approved solicitud `status` becomes `'aprobado'`, `revisadoPor: <admin uid>`, `revisadoAt: <now>`

#### Scenario: Reject reclamo-place — no side-effect on place
- **WHEN** an admin rejects a `solicitud` with `tipo: 'reclamo-place'`
- **THEN** the solicitud `status` becomes `'rechazado'`
- **AND** the place `usuarioId` is NOT modified

---

### Requirement: Admin queue listing (GET /solicitudes)
The system SHALL expose an admin-only endpoint `GET /api/v1/solicitudes` (`@Roles('admin')`) that lists only solicitudes with `tipo === 'reclamo-place'`, filtered by `status` (default `'pendiente'`), paginated by `page`/`limit`, returned in the `{ data, meta }` envelope. Backed by `SolicitudesService.listarSolicitudes` → `findPendingQueue` on the repository, which uses the composite index `solicitudes: tipo + status + createdAt`.

#### Scenario: Admin lists pending queue
- **GIVEN** three `reclamo-place` solicitudes (`s1`, `s2` pending, `s3` approved)
- **WHEN** an admin calls `GET /api/v1/solicitudes?status=pendiente&page=1&limit=20`
- **THEN** the response is `200` with `data` containing `s1` and `s2` (excludes `s3`)
- **AND** `meta` contains `page: 1`, `limit: 20`, `total: 2`

#### Scenario: Non-admin cannot list the admin queue
- **WHEN** an authenticated user with rol `'owner'` calls `GET /api/v1/solicitudes`
- **THEN** the response is `403` with error: `rol 'owner' is not allowed to perform this operation`
- **AND** no solicitudes are returned

---

### Requirement: One-time data migration (CH-05)
The system SHALL provide a one-time, idempotent migration script `backend/scripts/migrate-solicitudes.ts` (run via `npm run migrate:solicitudes` in `backend/`) that applies the CH-05 deletions with a **DELETE policy (never convert legacy records to `reclamo-place`)**:

- Deletes every `solicitudes` document whose `tipo` is a deprecated legacy value (`registro`, `actualizacion`, `registro-evento`, `actualizacion-evento`), or that carries the removed `eventoId`/`proposal` field.
- Backfills `solicitanteUid` from the legacy `usuarioId` field for each remaining document where `solicitanteUid` is absent (only applies to surviving `reclamo-place` records).
- Reports (does not silently drop or fail) orphaned documents — e.g., a surviving record whose `placeId` no longer resolves to an existing place — and continues processing the rest. The script is idempotent: re-running it has no additional effect.

#### Scenario: Legacy records deleted, non-legacy backfilled
- **GIVEN** a Firestore `solicitudes` collection with one record `A` (`tipo: 'registro'`, `eventoId` present), one record `B` (`tipo: 'reclamo-place'`, `solicitanteUid` absent, `usuarioId: 'foo'`), and one record `C` (`tipo: 'reclamo-place'`, `solicitanteUid: 'bar'`)
- **WHEN** `npm run migrate:solicitudes` runs
- **THEN** record `A` is deleted (legacy type/field), record `B` survives with `solicitanteUid` backfilled to `'foo'`, and record `C` is unchanged

#### Scenario: Migration is idempotent
- **WHEN** `npm run migrate:solicitudes` is run a second time
- **THEN** no additional documents are modified or deleted and no errors are thrown

### Requirement: Solicitudes admin queue listing
The system SHALL expose `GET /api/v1/solicitudes` for admins (`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`) listing solicitudes with `tipo === 'reclamo-place'` ALWAYS filtered server-side. Query params: `status` (`'pendiente' | 'aprobado' | 'rechazado'`, default `'pendiente'`), `page` (default `1`), `limit` (default `20`). The response uses the standard envelope `{ data: SolicitudDto[], meta: { page, limit, total } }`. The service exposes `listarSolicitudes(query)` delegating to `repo.findPendingQueue(status, page, limit)`.

The repository read used by the queue SHALL keep the ISP budget (≤ 5 methods): `existsByPlaceId` is removed from `SolicitudesRepositoryInterface` (its only runtime consumer is the places module, which binds its own interface) and a paginated pending-queue method is added, keeping the interface at `create`, `findById`, `findPendingReclamosByPlaceId`, `findPendingQueue`, `update`.

The Firestore composite index `tipo ASC + status ASC + createdAt DESC` SHALL back the queue query, and the legacy `eventoId + status` index SHALL be removed from `firestore.indexes.json`.

#### Scenario: Admin lists pending reclamos
- **GIVEN** an authenticated admin and existing solicitudes of type `reclamo-place` with mixed `status`
- **WHEN** the admin calls `GET /api/v1/solicitudes?status=pendiente`
- **THEN** the response is `200` with `data` containing only `reclamo-place` solicitudes with `status: 'pendiente'`, ordered by `createdAt DESC`
- **AND** `meta.total` equals the number of pending reclamos

#### Scenario: Non-admin cannot list solicitudes
- **WHEN** an authenticated `owner` calls `GET /api/v1/solicitudes`
- **THEN** the response is `403` and no data is returned

#### Scenario: Anonymous cannot list solicitudes
- **WHEN** a caller without `Authorization` header calls `GET /api/v1/solicitudes`
- **THEN** the response is `401`

#### Scenario: Empty queue returns empty page
- **GIVEN** no pending `reclamo-place` solicitudes
- **WHEN** an admin calls `GET /api/v1/solicitudes?status=pendiente`
- **THEN** the response is `200` with `data: []` and `meta.total: 0`

### Requirement: Legacy solicitudes migration (one-time)
The system SHALL provide a one-time, idempotent migration script `backend/scripts/migrate-solicitudes.ts` (npm script `migrate:solicitudes`) that enforces the CH-05 model on existing Firestore data:

1. Documents with `tipo != 'reclamo-place'` (i.e., `registro`, `actualizacion`, `registro-evento`, `actualizacion-evento`) are DELETED (confirmed plan decision; backup recommended before running against production).
2. Documents with `tipo === 'reclamo-place'` missing `solicitanteUid` are backfilled from `usuarioId` when present.
3. Documents missing both `solicitanteUid` and `usuarioId` are reported as orphans (logged with doc ID) and left untouched (no destructive action beyond rule 1).
4. A summary report `{ scanned, deleted, backfilled, orphans }` is printed; re-running the script yields no further changes.

#### Scenario: Migration deletes deprecated-tipo documents
- **GIVEN** `solicitudes` documents with `tipo: 'registro'`, `'actualizacion'`, `'registro-evento'`, `'actualizacion-evento'`
- **WHEN** `npm run migrate:solicitudes` runs
- **THEN** those documents are deleted from the collection
- **AND** the report counts them under `deleted`

#### Scenario: Migration backfills missing solicitanteUid
- **GIVEN** a `reclamo-place` document with `solicitanteUid` absent and `usuarioId: 'uid-owner-001'`
- **WHEN** the migration runs
- **THEN** the document gets `solicitanteUid: 'uid-owner-001'`
- **AND** the report counts it under `backfilled`

#### Scenario: Migration is idempotent
- **WHEN** the migration runs a second time after a successful first run
- **THEN** no documents are deleted or modified and the report shows zeroed counters (except `scanned`)

