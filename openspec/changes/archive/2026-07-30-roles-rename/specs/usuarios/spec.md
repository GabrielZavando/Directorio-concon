# usuarios Specification

## Purpose
The `usuarios` capability binds a Firebase Auth UID to a role (`'admin' | 'owner' | 'member'`) and, for `owner`, to the `places` document they own (via `usuarios.placeId`). The collection is the瘦 authoritative source of role assignments consumed by the future `auth` module's Guards (`RolesGuard`, `JwtAuthGuard`). The `'member'` role represents an authenticated directory member with a basic profile and a deferred (post-`auth + usuarios`) capability of saving favourite `places`.

---

## ADDED Requirements

### Requirement: Usuario entity schema
The system SHALL persist a `Usuario` document in the Firestore collection `usuarios` with the following fields:

- `id: string` — Firebase Auth UID (PK); same value as `firebase.auth().currentUser.uid`
- `email: string` — UNIQUE, validated as email format on create
- `nombre: string` — display name (2..100 characters)
- `rol: Rol` — controlled enum: `'admin' | 'owner' | 'member'` (default `'member'` on registration via the future `auth + usuarios` change)
- `placeId?: string` — reference to the `places` document the user owns; set when and only when `rol === 'owner'`; MUST be `null`/omitted for `'admin'` and `'member'`
- `telefono?: string` — Chilean-format phone (free string)
- `createdAt: Date` — document creation timestamp
- `updatedAt: Date` — last modification timestamp

The controlled type `Rol = 'admin' | 'owner' | 'member'` is defined as a reusable domain enum at `backend/src/modules/usuarios/domain/rol.enum.ts` (introduced by this change; the domain folder lives standalone until the `auth + usuarios` change assembles the NestJS module wiring). The `ROL_VALUES` const exported alongside is the closed array used by `class-validator` `@IsEnum` in the future `usuarios` DTO and by the future `RolesGuard`.

#### Scenario: Owner registers with a place
- **GIVEN** an authenticated Firebase user with UID `uid-owner-001` and email `owner@example.com`
- **WHEN** the future `auth + usuarios` create flow runs with `rol: 'owner'` and a valid `placeId: 'restaurante-el-marino'`
- **THEN** a `usuarios` document is created with `id: 'uid-owner-001'`, `rol: 'owner'`, `placeId: 'restaurante-el-marino'`
- **AND** no duplicate `usuarios` document with the same `email` exists (UNIQUE constraint on `email`)

#### Scenario: Member registers with default rol
- **GIVEN** an authenticated Firebase user with no `places` ownership intent
- **WHEN** the future `auth + usuarios` create flow runs with no explicit `rol`
- **THEN** the document is created with `rol: 'member'` and `placeId: null`

#### Scenario: Admin rol is set only by another admin
- **GIVEN** a `usuarios` document with `rol: 'member'`
- **WHEN** a non-admin attempts to mutate `rol` to `'admin'`
- **THEN** the operation is rejected with `403` (this enforcement lives in the future `auth + usuarios` change; the spec captures the rule now)

### Requirement: Authentication debt (documented, not yet enforced)
The canonical model `docs/data-model.md` SHALL carry an explicit "Authentication debt" note block to inform consumers that, until the future MVP `auth + usuarios` change ships, the runtime behaviour of `usuarioId` fields across the existing modules diverges from the model's stated intent:

- `places.usuarioId` currently persists as the literal string `"anonymous"` (stub at `places.controller.ts:44-46`), regardless of who calls `POST /places`. The model documents this field as "the place owner's Firebase Auth UID"; the runtime reaches parity when the `auth` module is implemented.
- `eventos.usuarioId` is currently sourced from the provisional HTTP header `x-usuario-id` (visible at `eventos.controller.ts:50,132,156`), not from a verified Firebase Auth JWT. The header accepts arbitrary strings and is not a security boundary; the runtime reaches parity when the `auth` module is implemented.
- `solicitudes.revisadoPor` is written by callers without runtime rol validation (no `auth` Guards exist yet); the model asserts this field MUST resolve to a `usuarios` with `rol === 'admin'`, but the enforcement is deferred to the future `auth + usuarios` change.

This requirement is a documentation-only requirement; no code path enforces it in this change. The note block SHALL reference the future `auth + usuarios` change as the closure.

#### Scenario: Spec reader is informed of the auth debt
- **WHEN** a stakeholder opens `docs/data-model.md`
- **THEN** the "Authentication debt" note block appears in the `usuarios` entity section and enumerates the three runtime divergences (`places.usuarioId` stub, `eventos` `x-usuario-id` header, `solicitudes.revisadoPor` unguarded)
- **AND** each bullet points to the future `auth + usuarios` change as the closure

### Requirement: Favouritos (deferred)
The `usuarios` entity SHALL NOT include a `favoritos` field in this change. The modelling of the favourite-places capability for the `member` role (the user can save `places` references and list them on their profile) is **deferred** to the future `auth + usuarios` change, where the storage shape (array on the `usuarios` document vs. subcollection `usuarios/{uid}/favoritos/{placeId}` vs. top-level collection `favoritos`) will be decided against actual access patterns.

This change only records the deferral as a `docs/data-model.md` note; no schema entry, no DTO field, no migration.

#### Scenario: Spec reader is informed of the deferral
- **WHEN** a stakeholder opens `docs/data-model.md §usuarios`
- **THEN** a "Favoritos (deferred)" note appears, declaring the field's omission is intentional and scoped to the future `auth + usuarios` change
- **AND** the note enumerates the three storage shapes under consideration so the decision can be picked up without rediscovery
