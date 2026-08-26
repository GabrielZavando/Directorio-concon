# eventos Specification (delta — auth-usuarios)

## MODIFIED Requirements

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
