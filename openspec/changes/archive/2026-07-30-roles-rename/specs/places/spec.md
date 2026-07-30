# places Specification — roles-rename delta

## Purpose (unchanged)
Provided in the canonical `openspec/specs/places/spec.md`. This delta only modifies two cross-cutting contracts: the `RedSocial.plataforma` value object gains a closed enum, and the `CreatePlace` DTO no longer accepts a client-supplied `usuarioId`.

---

## ADDED Requirements

### Requirement: RedSocial value object — closed plataforma enum
The system SHALL validate `places.redesSociales[].plataforma` against a closed enum instead of accepting any non-empty string. The closed enum is:

`PlataformaSocialEnum = 'instagram' | 'facebook' | 'x-twitter' | 'linkedin' | 'tiktok' | 'youtube'`

The migration of the legacy value `'twitter'` → `'x-twitter'` reflects the platform's 2023 rename. The enum is defined once in `backend/src/modules/places/domain/plataforma-social.enum.ts` and exported alongside `PLATAFORMA_SOCIAL_VALUES` (a `readonly` tuple) for `class-validator` `@IsEnum` consumption in the DTO and for the `isValidRedSocial` enum membership check in the VO.

The valid counts and shape of `RedSocial` are otherwise unchanged:

- `redesSociales?: RedSocial[]` — max 3 items per place.
- `RedSocial = { plataforma: PlataformaSocialEnum; url: string }` — `url` MUST be a valid URI.

#### Scenario: Valid RedSocial with all enum values
- **WHEN** a publisher sends `POST /api/v1/places` with `redesSociales: [{ plataforma: 'instagram', url: '...' }, { plataforma: 'facebook', url: '...' }, { plataforma: 'x-twitter', url: '...' }]`
- **THEN** the place is created and the three redes are persisted
- **AND** a fourth `redesSociales` entry is rejected with `400` (maxItems: 3 — this rule is unchanged)

#### Scenario: Reject RedSocial with platform outside the enum
- **WHEN** a publisher sends `POST /api/v1/places` with `redesSociales: [{ plataforma: 'whatsapp', url: 'https://wa.me/56912345678' }]`
- **THEN** the response is `400` with a validation error: `plataforma must be one of: instagram, facebook, x-twitter, linkedin, tiktok, youtube`
- **AND** nothing is persisted

#### Scenario: Reject legacy twitter value post-migration
- **WHEN** a publisher sends `POST /api/v1/places` with `redesSociales: [{ plataforma: 'twitter', url: 'https://twitter.com/x' }]`
- **THEN** the response is `400` with the same validation error
- **AND** the error message lists `'x-twitter'` as the valid replacement

#### Scenario: Accept x-twitter as the migrated value
- **WHEN** a publisher sends `POST /api/v1/places` with `redesSociales: [{ plataforma: 'x-twitter', url: 'https://twitter.com/x' }]`
- **THEN** the place is created and the red social is persisted with `plataforma: 'x-twitter'`

### Requirement: CreatePlace DTO — `usuarioId` is not client-supplied
The system SHALL NOT accept a `usuarioId` property in the `CreatePlace` request body. The `usuarioId` of a `Place` is server-derived from the verified Firebase Auth JWT (the authenticated publisher's UID); the global `ValidationPipe` is configured with `forbidNonWhitelisted: true`, so any client that includes `usuarioId` in the body receives `400`.

This requirement closes a divergence between `docs/data-model.md` (`usuarioId: "Propietario (Firebase Auth UID)"`) and `docs/api-spec.yml:320-321` (which previously listed `usuarioId` as an accepted `CreatePlace` property — a spec artifact that, if ever wired naively by a future `auth` implementation, would allow a client to spoof the `usuarioId` of someone else's place).

Until the `auth + usuarios` change ships, the existing stub at `places.controller.ts:44-46` continues to call `placesService.createPlace(dto, 'anonymous')` — the runtime value `"anonymous"` is documented as auth debt in the `usuarios` specification. This change does NOT touch that stub; it only ensures the body does not carry `usuarioId` so the eventual JWT-derived value can replace `"anonymous"` without contract drift.

The `Place` response schema still exposes `usuarioId` as a read-only field (admins browsing the catalogue need to see the owner); the removal is solely on the input (create) body. `UpdatePlace` does not list `usuarioId` either (it was never there).

#### Scenario: CreatePlace with usuarioId in body — rejected
- **WHEN** a publisher sends `POST /api/v1/places` with body `{ ..., "usuarioId": "uid-spoofed-001" }`
- **THEN** the response is `400` with error: `property usuarioId should not exist`
- **AND** nothing is persisted

#### Scenario: CreatePlace without usuarioId — accepted (runtime stub documented)
- **GIVEN** the `auth + usuarios` change has NOT shipped
- **WHEN** a publisher sends `POST /api/v1/places` with body `{ ..., "nombre": "...", "categoriaId": "...", "barrioId": "...", "planId": "gratuito" }` (no `usuarioId`)
- **THEN** the place is created with `usuarioId: 'anonymous'` (the documented runtime stub)
- **AND** a `solicitud` tipo `'registro'` is auto-created as before
- **WHEN** the `auth + usuarios` change eventually ships
- **THEN** the controller starts setting `usuarioId` from `req.user.uid` and the stub disappears (no further contract change required in `api-spec.yml`)
