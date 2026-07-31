# solicitudes Specification (delta — auth-usuarios)

## MODIFIED Requirements

### Requirement: `revisadoPor` resolver — rol `'admin'`
The system SHALL ensure that any `solicitud` mutation that sets `status` to `'aprobado'` or `'rechazado'` is performed by an authenticated `usuarios` document with `rol === 'admin'`, and that the `revisadoPor` field stores that admin's UID.

~~This requirement is **stated in this change** but **enforced by the future `auth + usuarios` change**. The current `SolicitudesService` does not validate `revisadoPor` against the `usuarios` collection, because (a) `auth` is not yet implemented and JWT-provided `rol` claim is not available, and (b) `usuarios` collection is not yet populated. Until the `auth` change ships, the rule is recorded here for spec-honesty; the `auth` change's `RolesGuard` will enforce `rol === 'admin'` on the `PUT /solicitudes/{id}/aprobar` and `PUT /solicitudes/{id}/rechazar` endpoints.~~

The enforcement is now live. This change introduces the `SolicitudesController` (HTTP layer that did not exist before) exposing `POST /api/v1/solicitudes/{id}/approve` and `POST /api/v1/solicitudes/{id}/reject`, both decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`. The `RolesGuard` rejects any caller whose `request.user.rol !== 'admin'` with `403` before the handler executes. The handler sources `revisadoPor` from `@CurrentUser() user.uid` (the verified admin UID) and `revisadoAt` from `now`, then delegates to the existing `SolicitudesService.approve` / `SolicitudesService.reject` for the side-effect propagation (`place.status` flip, `evento.status`/`estado`/`fechaPublicacion` flips, or `proposal` application for `actualizacion-evento`).

The endpoints accept an optional `{ comentarios?: string }` body for the reject case (admin can record a rejection reason); approve ignores `comentarios` if sent. The body is validated with the global `ValidationPipe` (whitelist + forbidNonWhitelisted) so any unexpected field is rejected with `400`.

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
- ~~**NOTE** Until the future `auth + usuarios` change ships, the runtime `RolesGuard` is not present and the `SolicitudesController` does not enforce the role check. The spec records the rule so the `auth` change has a deterministic target.~~

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
