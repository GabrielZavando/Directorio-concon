# solicitudes Specification (delta — places-auth-fix)

## MODIFIED Requirements

### Requirement: Solicitud entity schema
The system SHALL persist a `Solicitud` document in the Firestore collection `solicitudes` with the following fields:

- `id: string` — Firestore document ID (auto-generated)
- `placeId?: string` — reference to a `places` document; REQUIRED-but-nullable (XOR with `eventoId`): present when `tipo ∈ {'registro', 'actualizacion'}`, `null` when `tipo` ends in `-evento`
- `eventoId?: string` — reference to an `eventos` document; REQUIRED-but-nullable (XOR with `placeId`): present when `tipo ∈ {'registro-evento', 'actualizacion-evento'}`, `null` otherwise
- `usuarioId: string` — Firebase Auth UID of the publisher who triggered the solicitud (REQUIRED, never null)
- `tipo: SolicitudTipo` — enum: `'registro' | 'actualizacion' | 'registro-evento' | 'actualizacion-evento'`
- `status: SolicitudStatus` — enum: `'pendiente' | 'aprobado' | 'rechazado'` (default `'pendiente'` on create)
- `proposal?: Record<string, unknown>` — JSON object carrying the staged update fields; REQUIRED when `tipo === 'actualizacion-evento'`, `null` for all other `tipo` values
- `comentarios?: string` — free text, optional publisher/admin commentary
- `revisadoPor?: string` — Firebase Auth UID of the admin who approved/rejected the solicitud; set when `status` transitions to `'aprobado'` or `'rechazado'`; MUST reference a `usuarios` document with `rol === 'admin'`
- `createdAt: Date` — document creation timestamp
- `revisadoAt?: Date` — timestamp of the `aprobar`/`rechazar` action

The XOR invariant (`placeId` ⊕ `eventoId`, exactly one is non-null per `tipo`) is enforced by `SolicitudesService`; this requirement repeats it for the canonical record.

**Runtime enforcement**: this change adds the missing application-boundary check. `SolicitudesService` gains a private `assertXorConstraint(input)` invoked by both `create` and `createEventoSolicitud` **before** delegating to the repository. The check validates:

1. Exactly one of `placeId` / `eventoId` is present (never both, never neither).
2. The present reference matches the `tipo`: a `placeId` requires `tipo ∈ {'registro', 'actualizacion'}`; an `eventoId` requires `tipo ∈ {'registro-evento', 'actualizacion-evento'}`.

A violation throws `400 BadRequestException` with a domain message (`Una solicitud debe referenciar exactamente un placeId o eventoId (XOR)`), and **nothing is persisted**. The input types of both service methods widen to the domain shape (`placeId?: string; eventoId?: string`) so the invariant is expressible and testable at the service boundary.

#### Scenario: Auto-create solicitud on POST /places
- **WHEN** a publisher sends `POST /api/v1/places` and the place is persisted with `status: 'pendiente'`
- **THEN** a `solicitud` document is auto-created with `tipo: 'registro'`, `status: 'pendiente'`, `placeId` pointing to the new place, `eventoId: null`, `usuarioId` set to the publisher's UID, `proposal: null`
- **AND** the solicitud `id` is returned to the caller (or surfaced via the admin queue)

#### Scenario: Auto-create solicitud on POST /eventos
- **WHEN** a publisher sends `POST /api/v1/eventos` and the event is persisted with `status: 'pendiente'` and `estado: 'borrador'`
- **THEN** a `solicitud` document is auto-created with `tipo: 'registro-evento'`, `status: 'pendiente'`, `eventoId` pointing to the new event, `placeId: null`, `usuarioId` set to the publisher's UID, `proposal: null`

#### Scenario: Auto-create solicitud on PUT /eventos/{id} when event is approved
- **WHEN** a publisher (the event's owner or an admin) sends `PUT /api/v1/eventos/{id}` for an event with `status: 'aprobado'`
- **THEN** the event document is NOT modified in-place
- **AND** a `solicitud` is auto-created with `tipo: 'actualizacion-evento'`, `status: 'pendiente'`, `eventoId` pointing to the event, `usuarioId` set to the editor's UID, `proposal: { ...updateFields }` (a JSON object carrying the staged change)

#### Scenario: Reject solicitud with both placeId and eventoId set (XOR violation)
- **WHEN** `SolicitudesService.create` is called with both `placeId` and `eventoId` non-null
- **THEN** the service throws `400 BadRequestException` with message: `Una solicitud debe referenciar exactamente un placeId o eventoId (XOR)`
- **AND** nothing is persisted

#### Scenario: Reject solicitud with neither placeId nor eventoId set (XOR violation)
- **WHEN** `SolicitudesService.create` (or `createEventoSolicitud`) is called with both references absent
- **THEN** the service throws `400 BadRequestException` with the same XOR message
- **AND** nothing is persisted

#### Scenario: Reject solicitud with mismatched tipo (placeId + evento tipo)
- **WHEN** `SolicitudesService.create` is called with `placeId` set and `tipo: 'registro-evento'` (or `eventoId` set with `tipo: 'registro'`)
- **THEN** the service throws `400 BadRequestException` with the XOR message
- **AND** nothing is persisted

#### Scenario: Valid place solicitud passes the constraint
- **WHEN** `SolicitudesService.create` is called with `placeId` set, `eventoId` absent, and `tipo: 'registro'`
- **THEN** the service delegates to the repository and the solicitud is persisted

#### Scenario: Valid evento solicitud passes the constraint
- **WHEN** `SolicitudesService.createEventoSolicitud` is called with `eventoId` set, `placeId` absent, and `tipo: 'registro-evento'`
- **THEN** the service delegates to the repository and the solicitud is persisted

### Requirement: `revisadoPor` resolver — rol `'admin'`
The system SHALL ensure that any `solicitud` mutation that sets `status` to `'aprobado'` or `'rechazado'` is performed by an authenticated `usuarios` document with `rol === 'admin'`, and that the `revisadoPor` field stores that admin's UID.

The enforcement is live (see `auth-usuarios` change): `SolicitudesController` exposes `POST /api/v1/solicitudes/{id}/approve` and `POST /api/v1/solicitudes/{id}/reject`, both `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`; `revisadoPor` is sourced from `@CurrentUser() user.uid`. **No change in this delta** — kept for canonical completeness and to preserve the audit trail across archives.

#### Scenario: Admin approves solicitud — revisadoPor recorded
- **GIVEN** a `solicitud` with `status: 'pendiente'` and an authenticated admin with UID `uid-admin-001` (rol `'admin'` enforced by the `RolesGuard` of the `auth` module)
- **WHEN** the admin calls `POST /api/v1/solicitudes/<id>/approve` with `Authorization: Bearer <idToken>`
- **THEN** the solicitud transitions to `status: 'aprobado'`, `revisadoPor: 'uid-admin-001'`, `revisadoAt: <now>`
- **AND** the linked `places` or `eventos` document receives the corresponding side-effect (`place.status: 'aprobado'`, or `evento.status: 'aprobado'` + `evento.estado: 'programado'` + `evento.fechaPublicacion: <now>`, or the `proposal` applied for `actualizacion-evento`)

#### Scenario: Admin rejects solicitud with comentarios — recorded
- **GIVEN** a pending `solicitud` and an authenticated admin
- **WHEN** the admin calls `POST /api/v1/solicitudes/<id>/reject` with `{ comentarios: 'Falta documentación' }`
- **THEN** the solicitud transitions to `status: 'rechazado'`, `revisadoPor: <admin uid>`, `revisadoAt: <now>`, `comentarios: 'Falta documentación'`
- **AND** the linked document side-effect is applied (e.g., `place.status: 'rechazado'`, `evento.status: 'rechazado'` for `registro-evento`; no change for `actualizacion-evento`)

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
