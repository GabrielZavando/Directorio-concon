# solicitudes Specification — roles-rename delta

## Purpose
The `solicitudes` capability is the workflow engine that mediates approval of `places` and `eventos` mutations by `admins`. Historically introduced by the `eventos-crud` change (with the `tipo` enum extended to `'registro' | 'actualizacion' | 'registro-evento' | 'actualizacion-evento'` and the `placeId` XOR `eventoId` constraint), this capability never had a canonical `openspec/specs/solicitudes/spec.md` published. This delta publishes the canonical spec and aligns the role references from the legacy `'admin'` (unchanged) to the new enum value of the same name; clarifies that `revisadoPor` MUST resolve to a `usuarios` document with `rol === 'admin'`; and records that the enforcement of that rule is deferred until the future `auth + usuarios` change.

---

## ADDED Requirements

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
- **THEN** the service throws a domain error (the XOR invariant is enforced at the application boundary, before persistence)
- **AND** nothing is persisted

### Requirement: `revisadoPor` resolver — rol `'admin'`
The system SHALL ensure that any `solicitud` mutation that sets `status` to `'aprobado'` or `'rechazado'` is performed by an authenticated `usuarios` document with `rol === 'admin'`, and that the `revisadoPor` field stores that admin's UID.

This requirement is **stated in this change** but **enforced by the future `auth + usuarios` change**. The current `SolicitudesService` does not validate `revisadoPor` against the `usuarios` collection, because (a) `auth` is not yet implemented and JWT-provided `rol` claim is not available, and (b) `usuarios` collection is not yet populated. Until the `auth` change ships, the rule is recorded here for spec-honesty; the `auth` change's `RolesGuard` will enforce `rol === 'admin'` on the `PUT /solicitudes/{id}/aprobar` and `PUT /solicitudes/{id}/rechazar` endpoints.

#### Scenario: Admin approves solicitud — revisadoPor recorded
- **GIVEN** a `solicitud` with `status: 'pendiente'` and an authenticated admin with UID `uid-admin-001` (rol `'admin'` enforced by the future `RolesGuard`)
- **WHEN** the admin calls the approve endpoint
- **THEN** the solicitud transitions to `status: 'aprobado'`, `revisadoPor: 'uid-admin-001'`, `revisadoAt: <now>`
- **AND** the linked `places` or `eventos` document receives the corresponding side-effect (`place.status: 'aprobado'`, or `evento.status: 'aprobado'` + `evento.estado: 'programado'` + `evento.fechaPublicacion: <now>`, or the `proposal` applied for `actualizacion-evento`)

#### Scenario: Non-admin attempts approval — denied (rule stated; enforcement deferred)
- **GIVEN** a `solicitud` with `status: 'pendiente'` and an authenticated user with rol `'owner'`
- **WHEN** the owner attempts to call the approve endpoint
- **THEN** the response is `403` with error: `rol 'owner' is not allowed to approve or reject solicitudes`
- **AND** nothing is mutated
- **NOTE** Until the future `auth + usuarios` change ships, the runtime `RolesGuard` is not present and the `SolicitudesController` does not enforce the role check. The spec records the rule so the `auth` change has a deterministic target.
