# eventos Specification — roles-rename delta

## Purpose (unchanged)
Provided in the canonical `openspec/specs/eventos/spec.md` (created when `eventos-crud` was archived). This delta clarifies two authoring-time semantics and aligns the role references from the legacy `'empresa'` name to the new `'owner'` name introduced by this change. No `eventos` code change is required by this change; the deltas here are spec-only and become the canonical spec when re-archived after `roles-rename`.

---

## ADDED Requirements

### Requirement: Event creator is the responsable (rol `owner` or `admin`)
The system SHALL treat `eventos.usuarioId` as the event's **responsable** — the authenticated publisher who created the event. The `usuarioId` is set from the verified Firebase Auth JWT and is REQUIRED on every `Evento` document.

A user with rol `'owner'` is permitted to `POST /api/v1/eventos` (creating an event with `usuarioId === token.uid`). A user with rol `'admin'` is likewise permitted. A user with rol `'member'` is **denied** with `403`. Until the `auth + usuarios` change ships, the existing provisional authentication (header `x-usuario-id`) continues to function; the runtime enforcement of the `member`-denial lives in the future `RolesGuard` introduced by `auth`.

This requirement updates the legacy terminology `'empresa'` (used in the original `eventos-crud` spec) to the new enum value `'owner'`. Functionally identical — `'empresa'` was the old name for the same role.

#### Scenario: Owner creates event — allowed
- **GIVEN** an authenticated user with rol `'owner'` and UID `uid-owner-001`
- **WHEN** the user sends `POST /api/v1/eventos` with valid fields
- **THEN** the event is created with `usuarioId: 'uid-owner-001'`, `status: 'pendiente'`, `estado: 'borrador'`
- **AND** a `solicitud` tipo `'registro-evento'` is auto-created

#### Scenario: Member creates event — denied (rule stated; enforcement deferred to auth)
- **GIVEN** an authenticated user with rol `'member'` and UID `uid-member-001`
- **WHEN** the user sends `POST /api/v1/eventos` with valid fields
- **THEN** the response is `403` with error: `rol 'member' is not allowed to create events`
- **AND** nothing is persisted
- **NOTE** Until the future `auth + usuarios` change ships, the runtime Guard is not present; the provisional `x-usuario-id` header at `eventos.controller.ts` does not enforce the role check. The spec records the rule so the enforcement is unambiguous when `auth` lands.

#### Scenario: Admin creates event — allowed
- **GIVEN** an authenticated user with rol `'admin'`
- **WHEN** the user sends `POST /api/v1/eventos` with valid fields
- **THEN** the event is created with `usuarioId === admin.uid`, `status: 'pendiente'`, `estado: 'borrador'`, `verificado: false`
- **AND** a `solicitud` tipo `'registro-evento'` is auto-created (the admin does not bypass the approval queue by creating — they bypass it by approving their own solicitud)

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
