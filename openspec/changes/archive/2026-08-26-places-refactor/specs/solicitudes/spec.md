# solicitudes Specification — places-refactor (CH-03)

> This spec **supersedes** the canonical `openspec/specs/solicitudes/spec.md` for all requirements that conflict with the new model. Unchanged requirements are carried forward verbatim.

## Purpose

The `solicitudes` capability manages the approval lifecycle for places and eventos. This change adds a new solicitud type `reclamo-place` for the owner claiming flow, and updates the entity schema with `solicitanteUid`.

---

## MODIFIED Requirements

### Requirement: Solicitud entity schema (UPDATED)

The system SHALL persist a `Solicitud` document in the Firestore collection `solicitudes` with the following fields:

- `id: string` — Firestore document ID (auto-generated)
- `placeId?: string` — reference to a `places` document; REQUIRED-but-nullable (XOR with `eventoId`): present when `tipo ∈ {'registro', 'actualizacion', 'reclamo-place'}`, `null` when `tipo` ends in `-evento`
- `eventoId?: string` — reference to an `eventos` document; REQUIRED-but-nullable (XOR with `placeId`): present when `tipo ∈ {'registro-evento', 'actualizacion-evento'}`, `null` otherwise
- `usuarioId: string` — Firebase Auth UID of the publisher who triggered the solicitud (REQUIRED, never null)
- **`solicitanteUid?: string`** — **NEW**: Firebase Auth UID of the owner claiming the place. REQUIRED when `tipo === 'reclamo-place'`, `null` for all other `tipo` values.
- `tipo: SolicitudTipo` — enum: `'registro' | 'actualizacion' | 'registro-evento' | 'actualizacion-evento' | 'reclamo-place'` **(NEW: `'reclamo-place'`)**
- `status: SolicitudStatus` — enum: `'pendiente' | 'aprobado' | 'rechazado'` (default `'pendiente'` on create)
- `proposal?: Record<string, unknown>` — JSON object carrying the staged update fields; REQUIRED when `tipo === 'actualizacion-evento'`, `null` for all other `tipo` values
- `comentarios?: string` — free text, optional publisher/admin commentary
- `revisadoPor?: string` — Firebase Auth UID of the admin who approved/rejected the solicitud
- `createdAt: Date` — document creation timestamp
- `revisadoAt?: Date` — timestamp of the `aprobar`/`rechazar` action

The XOR invariant (`placeId` ⊕ `eventoId`, exactly one is non-null per `tipo`) is enforced by `SolicitudesService`.

**NEW: `reclamo-place` invariant**: when `tipo === 'reclamo-place'`, `placeId` MUST be present, `eventoId` MUST be null, and `solicitanteUid` MUST be present.

#### Scenario: Create solicitud with tipo reclamo-place
- **WHEN** `SolicitudesService.create` is called with `tipo: 'reclamo-place'`, `placeId` set, `eventoId` absent, `solicitanteUid` set
- **THEN** the solicitud is persisted with all fields

#### Scenario: Reject reclamo-place without solicitanteUid
- **WHEN** `SolicitudesService.create` is called with `tipo: 'reclamo-place'` and `solicitanteUid` absent
- **THEN** the service throws `400 BadRequestException` with message: `solicitanteUid is required for reclamo-place`
- **AND** nothing is persisted

#### Scenario: Reject solicitud with both placeId and eventoId set (XOR violation)
- **WHEN** `SolicitudesService.create` is called with both `placeId` and `eventoId` non-null
- **THEN** the service throws `400 BadRequestException` with message: `Una solicitud debe referenciar exactamente un placeId o eventoId (XOR)`
- **AND** nothing is persisted

#### Scenario: Reject solicitud with neither placeId nor eventoId set (XOR violation)
- **WHEN** `SolicitudesService.create` (or `createEventoSolicitud`) is called with both references absent
- **THEN** the service throws `400 BadRequestException` with the same XOR message
- **AND** nothing is persisted

#### Scenario: Valid place solicitud passes the constraint
- **WHEN** `SolicitudesService.create` is called with `placeId` set, `eventoId` absent, and `tipo: 'registro'`
- **THEN** the service delegates to the repository and the solicitud is persisted

#### Scenario: Valid evento solicitud passes the constraint
- **WHEN** `SolicitudesService.createEventoSolicitud` is called with `eventoId` set, `placeId` absent, and `tipo: 'registro-evento'`
- **THEN** the service delegates to the repository and the solicitud is persisted

---

## ADDED Requirements

### Requirement: Approve reclamo-place — transactional with auto-rejection (NEW)

The system SHALL approve a `reclamo-place` solicitud via a Firestore transaction that:

1. Updates `place.usuarioId = solicitud.solicitanteUid` and `place.gestionadoPorAdmin = false`.
2. Auto-rejects all OTHER pending `reclamo-place` solicitations for the same `placeId`.
3. Updates the approved solicitud `status: 'aprobado'`, `revisadoPor: adminUid`, `revisadoAt: now`.

This is dispatched by `SolicitudesService.aprobarSolicitud()` → `dispatchApproval()` → `PlaceApprovalHandler.approveReclamo()`.

#### Scenario: Admin approves reclamo — place ownership transferred
- **GIVEN** a `solicitud` with `tipo: 'reclamo-place'`, `placeId: 'place-001'`, `solicitanteUid: 'uid-owner-002'`, `status: 'pendiente'`
- **AND** a place with `id: 'place-001'` and `usuarioId: 'uid-admin-001'` (admin-created)
- **WHEN** an admin calls `POST /api/v1/solicitudes/{id}/approve`
- **THEN** the place `usuarioId` becomes `'uid-owner-002'`
- **AND** the place `gestionadoPorAdmin` becomes `false`
- **AND** the solicitud `status` becomes `'aprobado'`, `revisadoPor: {admin.uid}`, `revisadoAt: now`
- **AND** any OTHER pending `reclamo-place` solicitations for `placeId: 'place-001'` are auto-rejected (status: 'rechazado', revisadoPor: 'system', revisadoAt: now)

#### Scenario: Approve reclamo when no other pending reclamos exist
- **GIVEN** a `solicitud` with `tipo: 'reclamo-place'` and no other pending reclamos for the same `placeId`
- **WHEN** an admin calls `POST /api/v1/solicitudes/{id}/approve`
- **THEN** the place ownership is transferred and the solicitud is approved
- **AND** no other solicitations are modified (no-op for the auto-rejection step)

#### Scenario: Approve non-pending solicitud returns 409
- **GIVEN** a `solicitud` with `status: 'aprobado'` already
- **WHEN** an admin calls `POST /api/v1/solicitudes/{id}/approve`
- **THEN** the response is `409` with error: `Solicitud {id} ya fue aprobado`

---

### Requirement: Reject reclamo-place — no place side-effect (NEW)

The system SHALL reject a `reclamo-place` solicitud by updating its status. Unlike approval, rejection does NOT modify the place document.

#### Scenario: Admin rejects reclamo
- **GIVEN** a `solicitud` with `tipo: 'reclamo-place'`, `placeId: 'place-001'`, `status: 'pendiente'`
- **WHEN** an admin calls `POST /api/v1/solicitudes/{id}/reject` with `{ comentarios: 'Place ya tiene owner activo' }`
- **THEN** the solicitud `status` becomes `'rechazado'`, `revisadoPor: {admin.uid}`, `revisadoAt: now`, `comentarios: 'Place ya tiene owner activo'`
- **AND** the place document is NOT modified

#### Scenario: Reject non-pending solicitud returns 409
- **GIVEN** a `solicitud` with `status: 'rechazado'` already
- **WHEN** an admin calls `POST /api/v1/solicitudes/{id}/reject`
- **THEN** the response is `409` with error: `Solicitud {id} ya fue rechazado`

---

## REMOVED Requirements

### Requirement: Auto-create solicitud on POST /places — REMOVED

This requirement is **SUPERSEDED** by the new model. Places are no longer created with auto-solicitud. The `POST /api/v1/places` endpoint creates the place directly with `activo: true` and `estadoVerificacion: 'pendiente'`.

---

## UNCHANGED Requirements

### Requirement: `revisadoPor` resolver — rol `'admin'` (UNCHANGED)

The system SHALL ensure that any `solicitud` mutation that sets `status` to `'aprobado'` or `'rechazado'` is performed by an authenticated `usuarios` document with `rol === 'admin'`, and that the `revisadoPor` field stores that admin's UID.

*(Scenarios unchanged from previous spec)*

### Requirement: Auto-create solicitud on POST /eventos — UNCHANGED

*(This requirement is not affected by CH-03; eventos still auto-create solicitudes.)*

### Requirement: Auto-create solicitud on PUT /eventos when approved — UNCHANGED

*(This requirement is not affected by CH-03; eventos still use proposal-based approval.)*

---

## Non-Goals (explicitly out of scope)

- Eliminar tipos legacy (`registro`, `actualizacion`) — se mantiene para places existentes pre-migración
- Notificaciones (CH-06)
- Listado/filtrado de solicitudes por admin (endpoint GET) — fuera de scope de CH-03
