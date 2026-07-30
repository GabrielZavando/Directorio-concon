# api-contract Specification

## Purpose
The `api-contract` capability captures cross-cutting API contract concerns that span multiple entities (`places`, `eventos`, `solicitudes`) and would otherwise have no natural home in a single-entity spec. It is introduced by this change to host two such concerns: the `RedSocial.plataforma` enum closure (visible in `places` and honoured wherever `redesSociales` appears) and the removal of `usuarioId` from the `CreatePlace` body (a defence-in-depth rule ahead of the `auth + usuarios` change). Future contract-level changes (e.g., paginated envelope shape normalisation, error code taxonomy) may extend this capability.

---

## ADDED Requirements

### Requirement: `RedSocial.plataforma` is a closed enum across the API
The system SHALL accept only the following values for `redesSociales[].plataforma` anywhere the field appears in the API contract (`CreatePlace`, `UpdatePlace`, `Place` response):

`'instagram' | 'facebook' | 'x-twitter' | 'linkedin' | 'tiktok' | 'youtube'`

The legacy value `'twitter'` was renamed to `'x-twitter'` (reflecting the 2023 platform rename). Any client sending `'twitter'` receives a `400` `Bad Request` with a validation error listing the six valid values; the client is expected to update to `'x-twitter'`.

This contract is implemented in:

- `docs/api-spec.yml` — `RedSocial.plataforma` declares `enum: [instagram, facebook, x-twitter, linkedin, tiktok, youtube]`.
- `docs/data-model.md` — `RedSocial` value object documents `plataforma: PlataformaSocialEnum`, with the `PlataformaSocialEnum` union enumerated.
- `backend/src/modules/places/domain/plataforma-social.enum.ts` — defines `PlataformaSocialEnum` and `PLATAFORMA_SOCIAL_VALUES`.
- `backend/src/modules/places/domain/red-social.vo.ts` — `isValidRedSocial` rejects `plataforma` values not in the enum.
- `backend/src/modules/places/infrastructure/dto/red-social.dto.ts` — `@IsEnum(PLATAFORMA_SOCIAL_VALUES)` replaces the previous `@IsString()`.

This requirement is **consistent with the existing closed-enum convention** (`ServicioEnum`, `MetodoPagoEnum`, `PublicoObjetivoEnum`, `AccesibilidadEnum`, `NivelRuido`) — `RedSocial.plataforma` was the only catalogue-like field on a `places` value object that was previously free-string.

#### Scenario: OpenAPI generator stubs honour the enum
- **WHEN** a frontend (or third-party client) generates TypeScript types from `docs/api-spec.yml`
- **THEN** the `RedSocial.plataforma` field is typed as `'instagram' | 'facebook' | 'x-twitter' | 'linkedin' | 'tiktok' | 'youtube'` (not `string`), matching the backend domain enum
- **AND** a value like `'whatsapp'` is a compile-time TypeScript error in the generated client

#### Scenario: Backend rejects an unknown plataforma
- **WHEN** a `POST /api/v1/places` arrives with `redesSociales: [{ plataforma: 'threads', url: 'https://threads.net/x' }]`
- **THEN** the response is `400` with message: `plataforma must be one of: instagram, facebook, x-twitter, linkedin, tiktok, youtube`
- **AND** the place is not persisted

#### Scenario: Backend rejects the legacy 'twitter' value
- **WHEN** a `POST /api/v1/places` arrives with `redesSociales: [{ plataforma: 'twitter', url: 'https://twitter.com/x' }]`
- **THEN** the response is `400` with the same enum validation message
- **AND** the error message lists `'x-twitter'` as the valid replacement so the client can self-correct

### Requirement: `CreatePlace` does not accept `usuarioId` from the client
The system SHALL NOT accept a `usuarioId` property in the `CreatePlace` request body. The `usuarioId` of a `Place` is server-derived from the verified Firebase Auth JWT (the authenticated publisher's UID).

Until the future `auth + usuarios` change ships, the runtime stub at `places.controller.ts:44-46` continues to populate `usuarioId` with the literal string `'anonymous'` — this is documented as auth debt in the `usuarios` specification. The contract-level rule (this requirement) ensures that, when `auth` lands and the controller starts using `req.user.uid`, the body never carried a client-supplied `usuarioId` to begin with, eliminating a spoofing vector that a naive `auth` implementation could otherwise introduce.

This requirement is implemented in:

- `docs/api-spec.yml` — `CreatePlace` schema no longer lists `usuarioId` as a property (the previous listing at `api-spec.yml:320-321` is removed by Task 1 of this change's `tasks.md`).
- `backend/src/modules/places/infrastructure/dto/create-place.dto.ts` — the `usuarioId` property and its decorator are removed (Task 4 of `tasks.md`).
- The global `ValidationPipe` (configured with `whitelist: true, forbidNonWhitelisted: true`) enforces the rule at the controller boundary: any client sending `usuarioId` in the body receives `400`.

The `Place` response schema still exposes `usuarioId` as a read-only field (admins browsing the catalogue see the owner). The removal is solely on the input (create) body. `UpdatePlace` does not list `usuarioId` (never has).

#### Scenario: Client sends usuarioId on create — rejected
- **WHEN** a publisher sends `POST /api/v1/places` with body `{ ..., "usuarioId": "uid-spoofed-001" }`
- **THEN** the response is `400` with error: `property usuarioId should not exist`
- **AND** nothing is persisted
- **AND** the publisher's actual `usuarioId` (currently the runtime stub `'anonymous'`, later the JWT `uid`) is what gets persisted on the `Place`, regardless of body

#### Scenario: Frontend OpenAPI generator stops emitting usuarioId on create forms
- **WHEN** a frontend generates a `CreatePlace` model from `docs/api-spec.yml`
- **THEN** the generated model does not include a `usuarioId` field
- **AND** any form bound to this model does not display a `usuarioId` input — the field is a render artifact of the previous spec
