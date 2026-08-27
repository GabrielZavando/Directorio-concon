# solicitudes Specification

## Purpose
The `solicitudes` capability manages the admin approval workflow for places and events. Solicitudes are created automatically when events are created/updated, and manually when owners claim admin-created places (`reclamo-place`). Admins approve or reject solicitudes via `POST /solicitudes/{id}/approve|reject`, which triggers side-effects on the linked place or event. The XOR invariant ensures each solicitud references exactly one place OR one event.
## Requirements
### Requirement: Solicitud entity schema
The system SHALL persist a `Solicitud` document in the Firestore collection `solicitudes` with the following fields:

- `id: string` — Firestore document ID (auto-generated)
- `placeId?: string` — reference to a `places` document; REQUIRED-but-nullable (XOR with `eventoId`): present when `tipo ∈ {'registro', 'actualizacion'}`, `null` when `tipo` ends in `-evento` (DEPRECATED — see migration note)
- `eventoId?: string` — reference to an `eventos` document; REQUIRED-but-nullable (XOR with `placeId`): DECPRECATED — present when `tipo ∈ {'registro-evento', 'actualizacion-evento'}` (these two tipos are deprecated as of CH-04 `eventos-refactor` and will be removed in CH-05 `solicitudes-refactor`; the `eventos` module no longer creates them)
- `usuarioId: string` — Firebase Auth UID of the publisher who triggered the solicitud (REQUIRED, never null)
- `tipo: SolicitudTipo` — enum: `'registro' | 'actualizacion' | 'registro-evento' (DEPRECATED) | 'actualizacion-evento' (DEPRECATED) | 'reclamo-place'`
- `status: SolicitudStatus` — enum: `'pendiente' | 'aprobado' | 'rechazado'` (default `'pendiente'` on create)
- `proposal?: Record<string, unknown>` — JSON object carrying the staged update fields; REQUIRED when `tipo === 'actualizacion-evento'` (DEPRECATED), `null` for all other `tipo` values
- `solicitanteUid?: string` — Firebase Auth UID of the caller claiming the place; REQUIRED when `tipo === 'reclamo-place'`, `null` otherwise
- `comentarios?: string` — free text, optional publisher/admin commentary
- `revisadoPor?: string` — Firebase Auth UID of the admin who approved/rejected the solicitud; set when `status` transitions to `'aprobado'` or `'rechazado'`; MUST reference a `usuarios` document with `rol === 'admin'`
- `createdAt: Date` — document creation timestamp
- `revisadoAt?: Date` — timestamp of the `aprobar`/`rechazar` action

The XOR invariant (`placeId` ⊕ `eventoId`, exactly one is non-null per `tipo`) is enforced by `SolicitudesService`; the `registro-evento`/`actualizacion-evento` tipos are retained in the enum ONLY for backward-reading of legacy documents until CH-05 removes them physically.

**Runtime enforcement** (unchanged from prior changes): `SolicitudesService` gains a private `assertXorConstraint(input)` invoked by both `create` and `createEventoSolicitud` before delegating to the repository.

**DEPRECATION NOTE (CH-04)**: As of the `eventos-refactor` change, the `eventos` module no longer calls `solicitudService.createEventoSolicitud` and no longer injects `SOLICITUDES_SERVICE`. Therefore the two scenarios below that previously asserted auto-creation of `registro-evento`/`actualizacion-evento` are now obsolete for the `eventos` flow. The physical removal of the enum values and fields is tracked in CH-05.

#### Scenario: No auto-create solicitud on POST /eventos (changed by eventos-refactor)
- **WHEN** a publisher sends `POST /api/v1/eventos` and the evento is persisted with `activo: true` and `estadoVerificacion: 'pendiente'`
- **THEN** NO `solicitud` document is auto-created (the evento is visible immediately without admin approval)
- **AND** the owner can still have their evento verified later via `POST /api/v1/eventos/{id}/verificar` (admin action), which does not create a `solicitud`

#### Scenario: No staged solicitud on PUT /eventos/{id} when event is verified (changed by eventos-refactor)
- **WHEN** a publisher (the event's owner or an admin) sends `PUT /api/v1/eventos/{id}` for an evento with `estadoVerificacion: 'verificado'`
- **THEN** the evento document IS modified in-place (with `estadoVerificacion` reverted to `'pendiente'` and a `cambios[]` entry appended)
- **AND** NO `solicitud` is auto-created (the legacy `actualizacion-evento` flow is removed)

#### Scenario: Reject solicitud with both placeId and eventoId set (XOR violation)
- **WHEN** `SolicitudesService.create` is called with both `placeId` and `eventoId` non-null
- **THEN** the service throws `400 BadRequestException` with message: `Una solicitud debe referenciar exactamente un placeId o eventoId (XOR)`
- **AND** nothing is persisted

#### Scenario: Reject solicitud with neither placeId nor eventoId set (XOR violation)
- **WHEN** `SolicitudesService.create` (or `createEventoSolicitud`) is called with both references absent
- **THEN** the service throws `400 BadRequestException` with the same XOR message
- **AND** nothing is persisted

#### Scenario: Reject solicitud with mismatched tipo (placeId + evento tipo)
- **WHEN** `SolicitudesService.create` is called with `placeId` set and `tipo: 'registro-evento'` (or `eventoId` set with `tipo: 'registro'` or `tipo: 'reclamo-place'`)
- **THEN** the service throws `400 BadRequestException` with the XOR message
- **AND** nothing is persisted

#### Scenario: Valid place solicitud passes the constraint
- **WHEN** `SolicitudesService.create` is called with `placeId` set, `eventoId` absent, and `tipo ∈ {'registro', 'actualizacion', 'reclamo-place'}`
- **THEN** the service delegates to the repository and the solicitud is persisted

### Requirement: `revisadoPor` resolver — rol `'admin'`
The system SHALL ensure that any `solicitud` mutation that sets `status` to `'aprobado'` or `'rechazado'` is performed by an authenticated `usuarios` document with `rol === 'admin'`, and that the `revisadoPor` field stores that admin's UID.

The enforcement is live (see `auth-usuarios` change): `SolicitudesController` exposes `POST /api/v1/solicitudes/{id}/approve` and `POST /api/v1/solicitudes/{id}/reject`, both `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`; `revisadoPor` is sourced from `@CurrentUser() user.uid`. **No change in this delta** — kept for canonical completeness and to preserve the audit trail across archives.

#### Scenario: Admin approves solicitud — revisadoPor recorded
- **GIVEN** a `solicitud` with `status: 'pendiente'` and an authenticated admin with UID `uid-admin-001` (rol `'admin'` enforced by the `RolesGuard` of the `auth` module)
- **WHEN** the admin calls `POST /api/v1/solicitudes/<id>/approve` with `Authorization: Bearer <idToken>`
- **THEN** the solicitud transitions to `status: 'aprobado'`, `revisadoPor: 'uid-admin-001'`, `revisadoAt: <now>`
- **AND** the linked `places` or `eventos` document receives the corresponding side-effect (`place.usuarioId` updated for `reclamo-place`, or `evento.status: 'aprobado'` + `evento.estado: 'programado'` + `evento.fechaPublicacion: <now>`, or the `proposal` applied for `actualizacion-evento`)

#### Scenario: Admin rejects solicitud with comentarios — recorded
- **GIVEN** a pending `solicitud` and an authenticated admin
- **WHEN** the admin calls `POST /api/v1/solicitudes/<id>/reject` with `{ comentarios: 'Falta documentación' }`
- **THEN** the solicitud transitions to `status: 'rechazado'`, `revisadoPor: <admin uid>`, `revisadoAt: <now>`, `comentarios: 'Falta documentación'`
- **AND** the linked document side-effect is applied (e.g., `evento.status: 'rechazado'` for `registro-evento`; no change for `actualizacion-evento`; no place side-effect for `reclamo-place`)

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
The system SHALL allow an authenticated `owner` to create a `solicitud` of type `reclamo-place` via `POST /api/v1/places/{id}/reclamar`. The solicitud carries `placeId`, `solicitanteUid` (the caller's UID), and `usuarioId` (also the caller's UID). The place must not have an active owner.

#### Scenario: Reclamo-place solicitud created with correct fields
- **WHEN** an owner calls `POST /api/v1/places/{id}/reclamar` for a place without an active owner
- **THEN** a `solicitud` is created with `tipo: 'reclamo-place'`, `status: 'pendiente'`, `placeId`, `solicitanteUid: <caller uid>`, `usuarioId: <caller uid>`

#### Scenario: Reject reclamo-place with missing solicitanteUid
- **WHEN** `SolicitudesService.create` is called with `tipo: 'reclamo-place'` and `solicitanteUid` absent
- **THEN** the service throws `400` with error indicating `solicitanteUid` is required for `reclamo-place`

---

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

