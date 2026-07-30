## Why

The Directorio de Concón models three user roles (`'admin' | 'empresa' | 'usuario'`) across `docs/data-model.md §usuarios`, `backend/src/modules/places`, `backend/src/modules/eventos`, `backend/src/modules/solicitudes`, and `docs/base-standards.md §8.2`. The naming is inconsistent with the project's actual semantics and with the codebase's English-only convention (`base-standards.md §2`):

- `'empresa'` is coupled to the entity name (`places`); the role describes a **function** (publishes content in the directory), not an entity. If the directory ever adds another publishable entity besides `places` and `eventos`, the name `empresa` becomes misleading.
- `'usuario'` is generic to the point of being ambiguous — every authenticated subject is a "usuario". The role actually represents a **registered member** of the directory (with a basic profile and the future ability to save favourite places), distinct from an anonymous visitor who browses without login.
- The current Spanish enum values (`empresa`, `usuario`) violate `base-standards.md §2` — "Todo en inglés: variables, Funktionen, clases, comentarios, mensajes de error, logs" — when used as a TypeScript `rol` field, a JWT claim, log attributes, and `@Roles(...)` decorator args.

In parallel, the project carries two undocumented authentication debts that emerged during the `eventos-crud` change (`openspec/changes/archive/2026-07-28-eventos-crud`) and were never surfaced in the canonical model:

- `places.controller.ts:44-46` persists `usuarioId: "anonymous"` (a hardcoded TODO stub) because the `auth` module is not yet implemented.
- `eventos.controller.ts` authenticates via the provisional header `x-usuario-id` instead of a verified Firebase Auth JWT.

These debts are invisible in `docs/data-model.md`, so a stakeholder reading the spec would assume `places.usuarioId` and `eventos.usuarioId` are properly bound to the publisher's Firebase Auth UID at runtime. They are not — yet.

A third, unrelated consistency gap was detected during the same review: the `RedSocial.plataforma` field is declared as an **enum of 6 values** in `docs/api-spec.yml:105` but as a **free `string`** in `docs/data-model.md §places` (and the backend DTO/VO only validate `string` non-empty). The OpenAPI contract lies to the client: it promises enum-level rejection that the backend does not enforce. As a side-effect, the enum already tracks a stale platform name (`twitter`, renamed to `X` in 2023).

This change consolidates these four concerns (role rename + auth debt documentation + `CreatePlace.usuarioId` security fix + `RedSocial.plataforma` enum closure) into a single, documentation-first, schema-level update. It is a prerequisite for the future MVP modules `auth` and `usuarios` (per `base-standards.md §8.4` roadmap): unless the role enum is renamed before those modules are implemented, every Guard, JWT claim, log line, and DB migration would lock in the names `empresa`/`usuario` and force a more expensive rename later.

## What Changes

- **RENAME** the `rol` enum in `docs/data-model.md §usuarios` from `'admin' | 'empresa' | 'usuario'` to `'admin' | 'owner' | 'member'` (kebab-style, English-only, function-based naming — "Family B" per the planning review).
  - `admin` — unchanged; system administrator (approves/rejects `solicitudes`, manages `categorias`/`barrios`, toggles `destacado`/`verificado`).
  - `empresa` → **`owner`** — owns one `places` document (linked via `usuarios.placeId`) and can publish places and events.
  - `usuario` → **`member`** — registered directory member with a basic profile and (future, deferred) favourite-places capability; cannot publish places or events.
- **CONFIRM** the rule that an `owner` creating an event is the event's **responsable** (`eventos.usuarioId`), independent of `eventos.placeId`. `placeId` remains an optional reference to any approved `places` document; there is **no** invariant tying `eventos.placeId` to the creator's own place. This was ambiguous in the existing specs and is now made explicit.
- **DOCUMENT** the auth debt in `docs/data-model.md` (new "Authentication debt" note block) so it is visible to anyone reading the canonical model:
  - `places.usuarioId` currently persists as the literal string `"anonymous"` (stub in `places.controller.ts:44-46`) until the `auth` module lands.
  - `eventos.usuarioId` is currently sourced from the provisional header `x-usuario-id` (not a verified Firebase JWT) until the `auth` module lands.
  - Both debts close when the future MVP `auth` + `usuarios` modules ship.
- **REMOVE** the `usuarioId` field from the `CreatePlace` schema in `docs/api-spec.yml` (lines 320-321). The canonical model already says `usuarioId?` is "Propietario (Firebase Auth UID)" — i.e. server-derived from the token, not client-supplied. Today the spec contradicts the model: it lets the client send a `usuarioId` in the body, which the backend then ignores (overwriting with `"anonymous"`). When `auth` lands and the controller starts trusting the body field instead of the token, this becomes a privilege-escalation vector. Closing it now (spec + DTO) is a defense-in-depth fix.
- **CLOSE** the `RedSocial.plataforma` enum in `docs/api-spec.yml`, `docs/data-model.md`, the backend DTO (`red-social.dto.ts`), and the backend domain VO (`red-social.vo.ts`):
  - Final enum values: `[instagram, facebook, x-twitter, linkedin, tiktok, youtube]` (migrates `twitter` → `x-twitter` to reflect the 2023 platform rename).
  - DTO decorator changes from `@IsString()` to `@IsEnum(PLATAFORMA_SOCIAL_VALUES)`.
  - VO `isValidRedSocial` adds an enum membership check on top of the existing non-empty-string check.
  - The seed data (`frontend/src/app/shared/data-access/local/data/places.json`) is reviewed and any `plataforma: "twitter"` entry is migrated to `"x-twitter"` (likely none, but verified).
- **DEFER** the modelling of `usuarios.favoritos` (the favourite-places feature for `member` role) to the future `auth + usuarios` change. This change only records the deferral as a note in `docs/data-model.md §usuarios` — it does not add a `favoritos` field to the schema yet. Reason: the cardenality/storage shape (array on the user doc vs. subcollection vs. top-level collection) should be decided together with the auth/usuarios implementation, not in isolation.

## Capabilities

### New Capabilities
- `usuarios` — introduced via this change as a fresh spec delta. The `usuarios` collection was already documented in `docs/data-model.md` but never had a canonical `openspec/specs/usuarios/spec.md`. This change publishes the spec delta (with the renamed `rol` enum) so that, when archived, the canonical spec exists for the future `auth + usuarios` implementation change to build on.

### Modified Capabilities
- `places` — spec delta marks two changes: (a) the `usuarioId` field is server-derived from the JWT, not client-supplied (the `CreatePlace` DTO no longer accepts it); (b) the `RedSocial.plataforma` field is now a closed enum (`x-twitter` migration included). The existing `openspec/specs/places/spec.md` is updated with `MODIFIED Requirements`.
- `eventos` — spec delta clarifies that `eventos.usuarioId` is the event's **responsable** (publisher) and that `eventos.placeId` is an **optional reference with no ownership invariant** to the creator's place. No code change in `eventos` is required by this change; the role-rename applies downstream via the future `auth` Guards.
- `solicitudes` — spec delta records that `revisadoPor` MUST resolve to a user with rol `'admin'` (currently not enforced because `auth` is not implemented).
- `api-contract` (new capability) — introduces the cross-cutting API contract concerns that span multiple entities: the `RedSocial.plataforma` enum closure and the `usuarioId` removal from `CreatePlace`. Treated as a capability so that future contract-level changes have a home.

## Impact

- **Backend code**:
  - **Modified**: `backend/src/modules/places/infrastructure/dto/red-social.dto.ts` — `@IsString()` → `@IsEnum(PLATAFORMA_SOCIAL_VALUES)`.
  - **Modified**: `backend/src/modules/places/domain/red-social.vo.ts` — `isValidRedSocial` adds enum membership check; new exported `PLATAFORMA_SOCIAL_VALUES` const + `PlataformaSocialEnum` type.
  - **Modified**: `backend/src/modules/places/infrastructure/dto/create-place.dto.ts` — `usuarioId` property removed (DTO no longer accepts the field).
  - **Modified**: spec/test files where relevant (`red-social.vo.spec.ts`, `create-place.dto.spec.ts`) — assertions updated for enum behavior + removed `usuarioId` from create-place test bodies.
  - **No change yet**: `eventos.controller.ts`, `places.controller.ts`, `solicitudes` service. Their `usuarioId`/rol enforcement waits for the future `auth` module (debt documented in the spec, not actioned here). The `x-usuario-id` header stays as-is until `auth` lands.
- **Database (Firestore)**:
  - No collection-level migration: the `usuarios` collection is not yet populated (the module is not implemented). The `rol` enum rename is therefore a doc/schema change with **zero data migration**. When the future `auth + usuarios` change ships, registrations start with the new enum values directly.
  - The `redesSociales.plataforma` values in any existing `places` documents (test/seed Firestore projects) that use `"twitter"` would need a one-time migration to `"x-twitter"`. This is documented as a deployment note. The seed JSON in the frontend is reviewed for `"twitter"` occurrences (likely none, given the seed was authored after 2023).
  - No new composite indices; no index changes.
- **Frontend**:
  - No UI changes in this change. The `roles-rename` is a model/spec/DTO/VO change.
  - Type updates: `frontend/.../usuario.types.ts` (if it exists) or the eventual `auth` types will adopt `'admin' | 'owner' | 'member'` and the closed `PlataformaSocialEnum`. These are introduced when the `auth + usuarios` change ships; this change only updates the contract.
  - The `RedSocial` types in the frontend's `places` types mirror the new enum.
- **Documentation**:
  - `docs/data-model.md` — `usuarios.rol` enum renamed; `RedSocial` value object gains `PlataformaSocialEnum`; new "Authentication debt" note block under `usuarios`; `usuarios.favoritos` deferral note added.
  - `docs/api-spec.yml` — `CreatePlace.usuarioId` removed; `RedSocial.plataforma` enum closed (`twitter` → `x-twitter`).
  - New `openspec/specs/usuarios/spec.md` (created when archived).
  - New `openspec/specs/api-contract/spec.md` (created when archived).
  - MODIFIED deltas on `openspec/specs/places/spec.md`, plus delta specs for `eventos` and `solicitudes` (which get their canonical specs created when archived, since they do not exist in `openspec/specs/` yet).
- **Dependencies**: none added, none removed. `class-validator` `@IsEnum` is already a project dependency.
- **Public API contract**:
  - **Breaking** (in the strict OpenAPI sense): `CreatePlace` no longer accepts `usuarioId` — clients sending it will receive a `400` (because the global `ValidationPipe` is configured with `forbidNonWhitelisted: true`). No frontend currently sends `usuarioId` on create (verified by reading the Angular `PlacesService`); the field was a spec artifact.
  - **Breaking**: `RedSocial.plataforma` now rejects values outside the enum (clients sending `"whatsapp"`, `"telegram"`, `"twitter"` get a `400`). Mitigation:Affected client payloads are reviewed before deploy; any `"twitter"` data is migrated to `"x-twitter"`.
  - **Additive**: the `usuarios.rol` enum rename is not visible to the public API until `auth` lands.
- **Risk**:
  - Any `places` document in Firestore (test/staging) with `redesSociales[].plataforma === "twitter"` becomes invalid under the new enum. Mitigation: a documented data review + migration note in the change tasks; affected doc count is expected to be zero in staging (no place seed uses `"twitter"`).
  - Closing `RedSocial.plataforma` could lock out a platform the stakeholders want to support (e.g., `whatsapp`, `threads`, `telegram`). Mitigation: the enum can be extended in a future change; this change errs on the side of consistency with the existing closed enums (`ServicioEnum`, `MetodoPagoEnum`, etc.) and with `frontend-standards.md` §1 (iconography must be predictable for `lucide-angular`).
  - The auth debt is **documented but not closed** here; the `places.controller.ts:44-46` stub remains. Stakeholders must understand that this change does NOT make `places.usuarioId` real — it only makes the spec honest about the current state and preps the contract for when `auth` lands. Mitigation: the "Authentication debt" note block in `data-model.md` is explicit and points to the `auth + usuarios` future change as the closure.
  - SOLID thresholds (`max-lines` 300 backend, complexity ≤ 10, max-params ≤ 3, DIP 0 violations) must remain green after the DTO/VO modifications. `make solid-lint` and `bash check-refs.sh` must report zero violations before `/archive`.
