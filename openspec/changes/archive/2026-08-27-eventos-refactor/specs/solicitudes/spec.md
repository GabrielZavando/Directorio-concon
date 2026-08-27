# solicitudes Specification (CH-04 delta)

## MODIFIED Requirements

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
