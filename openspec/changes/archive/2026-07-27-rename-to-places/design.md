## Context

The Directorio de Concón backend currently models its core listing entity as `empresas` (Firestore collection `empresas`, NestJS module `backend/src/modules/empresas/`). The entity was built by the archived change `2026-07-17-empresas-crud` with a thin schema: a single `descripcion` field (max 1000), free-text `horarios: string?`, scattered image fields (`logoUrl`, `galeria`), and uncontrolled `servicios: string[]`. The `solicitudes` workflow couples to `empresas` via `solicitudes.empresaId`, the `usuarios` entity references `usuarios.empresaId`, and `app.module.ts` imports `EmpresasModule`.

The canonical docs (`docs/data-model.md`, `docs/api-spec.yml`, `docs/base-standards.md` §8.2-8.4, `docs/backend-standards.md`, `.github/instructions/*`) all use `empresas` as the canonical name. There is **no production data** (the project is mid-MVP) — which permits a clean replacement rather than a migration.

Stakeholders: visitante anónimo (Flujo 2), publishers (empresarios / representantes de instituciones y lugares), admin del directorio (Flujo 3). The directory must list not only commercial companies but also institutions (municipalidad, juntas de vecinos, centros culturales) and public-interest places, hence the rename to a generic `places` entity.

The frontend home hero (`frontend-home-hero` capability, archived 2026-07-25) currently navigates to `/directorio` with query params and the placeholder component was implemented. The future `frontend-directorio` page is the consumer of `/places` and is **explicitly a Non-Goal** of this change.

## Goals / Non-Goals

**Goals:**
- Replace the `empresas` entity with a generic `places` entity across backend, docs, and cross-module references, without retaining a parallel `empresas` collection.
- Extend the schema with the fields approved during change planning: `descripcionCorta` + `descripcion` split, typed `horarios` object with multiple `turnos` per day + `horariosEspeciales[]` + `abierto24x7`, controlled enums `servicios` and `metodosPago`, grouped `imagenes` object, optional `whatsapp`, `subcategoriaId` ref into `categorias.subcategorias[].slug`, `fechaVerificacion`, and the post-MVP placeholder fields `vistasTotales`, `valoracionGoogle`, `idiomas`.
- Add `GET /api/v1/places/{id}/abierto-ahora` that derives open status from `horarios` / `horariosEspeciales` / `abierto24x7` against the current server time.
- Preserve Flujo 1 unchanged except for the rename: creating a place auto-creates a `solicitud` (`tipo: 'registro'`, `status: 'pendiente'`) and the place stays `pendiente` until an admin approves.
- Update the canonical docs **before any code** (SDD non-negotiable rule #4).
- Keep SOLID metrics green for the new module: file ≤300 lines, cyclomatic complexity ≤10, cognitive complexity ≤10, max-params ≤3, max-depth ≤4, inheritance depth ≤2, no infra imports in `domain/` or `application/`.

**Non-Goals:**
- Google Places API integration for `valoracionGoogle` (the field is persisted as nullable placeholder until a future change).
- Real `vistasTotales` increment (analytics) — the field defaults to `0` and no write path is implemented here.
- Frontend work consuming `/places` (the `frontend-directorio` feature page is a separate future change).
- Backward-compatibility API alias `/empresas` (no production client to break — Non-Goal).
- Migration script from `empresas` docs to `places` docs (clean replacement — Non-Goal).
- Refactoring `places` to full Clean Architecture layers in a separate later change — this change already implements the layer split (`domain/`, `application/`, `infrastructure/`). Any later refinement (e.g. `places-clean-arch-refactor`) is a separate change.
- Renaming the **auth role** `empresa` (the rol-enum value in `usuarios.rol` remains `'empresa'`). Only the listing entity is renamed.

## Decisions

### D1. Single ticket covers rename + extension (vs split into two)
- **Chosen**: One OpenSpec change (`rename-to-places`) covers both the rename `empresas`→`places` and the schema extension.
- **Rationale**: The schema extension touches every DTO, every entity field, and every Firestore adapter write/read of the entity. Doing it in two passes (rename first, then extend) would force each DTO/entity to be touched twice — double churn, double review, and an awkward intermediate state where `places` has the old thin schema. A single atomic change is cheaper and cleaner because there is no production data preserving the old shape.
- **Alternatives considered**: (a) `rename-only` + `extend-places-schema` as two sequential changes — rejected for the reasons above. (b) A "compat shim" migration module — rejected, no prod data.

### D2. Name `places` (vs `listings`, `listados`, `lugares`)
- **Chosen**: `places` — singular, generic, English (matches the camelCase convention and the existing `categorias`/`barrios` English nouns).
- **Rationale**: The user chose `places` over `listings` explicitly during planning. It conveys "a place in Concón you can find" without confining to companies. The Spanish plural `lugares` was rejected to honor the English-noun convention already used for `categorias`/`barrios`/`solicitudes`/`usuarios`. The CLI said during dry-run in /tmp that the schema field name `listado_schema` from the user's original proposal would clash with the camelCase convention.
- **Alternatives considered**: `listings` (too e-commerce), `listados` (Spanish noun, breaks convention), `lugares` (accepted by the user as concept, but breaks the English-noun convention), `entries` (too abstract).

### D3. Clean replacement, no migration script
- **Chosen**: Delete `backend/src/modules/empresas/` physically; create `backend/src/modules/places/` from scratch with the new schema.
- **Rationale**: The Firestore project has no production data (verified via `openspec/changes/archive/` history — the Firebase config was only recently wired). A migration script would be overengineering and would require Firestore document-by-document writes with no source to consume.
- **Alternatives considered**: (a) Rename folder in-place (`mv empresas places`) and patch entity — rejected because too much drift between DTOs and entity would need an interstitial reconciliation anyway; cleaner to author fresh. (b) Keep `empresas/` as `.deprecated` — rejected by the user explicitly as it leaves trash in the repo.

### D4. Auth role name kept as `'empresa'`
- **Chosen**: The Firestore enum value for `usuarios.rol` (and the JWT claim) stays `'empresa'`. Only the listing entity is renamed.
- **Rationale**: Renaming an auth role requires revoking existing tokens, seeding new role names, and updating guards. The "publisher" role in the directory is functionally well-described by `'empresa'` (it means "the operator that publishes a place") and is not user-facing copy. Keeping the enum value removes scope. The listing entity is what is generic; the role that publishes it can stay specific.
- **Alternatives considered**: Rename role to `'publisher'` or `'operador'` — would require a separate auth-touching change. Non-Goal of this change.
- **Open question** (carried to `## Open Questions`): Whether to expose a friendlier display label "Publicador" in admin UI later is a frontend-only concern.

### D5. Subcategoria as `subcategoriaId?` reference, no new collection
- **Chosen**: `subcategoriaId?: string` references a slug inside `categorias.subcategorias[].slug` (subcategorias are embedded; seed is in `frontend/src/app/shared/data-access/local/data/categorias.json`).
- **Rationale**: The user explicitly chose this over (a) a free string `subcategoria`. It avoids duplicating the subcategoria name on every place and keeps the source of truth in `categorias`. No Firestore index is needed on the field (it's only used for display filtering, not range queries).
- **Alternatives considered**: (a) `subcategoria: string` free text — rejected by user. (b) A new `subcategorias` top-level collection — rejected as out of scope and unnecessary (the seed is stable).
- **Validation rule**: `class-validator` uses a custom `@IsValidSubcategoria(categoriaId)` validator that checks `subcategoriaId` belongs to the `categoriaId`'s subcategorias list. Implemented via the `application/` layer calling `categoriasRepository` — not in the DTO (keeps DTO framework-pure, DIP).

### D6. Horarios typed object (vs string, vs hybrid)
- **Chosen**: `horarios: HorarioDia[]` where each `HorarioDia = { dia: DiaSemana, turnos: Turno[] }` with `Turno = { apertura: 'HH:mm', cierre: 'HH:mm' }` (24h string per ISO 8601). Plus `horariosEspeciales: HorarioEspecial[]` where `HorarioEspecial = { fecha: 'YYYY-MM-DD', descripcion: string, turnos: Turno[] }`. Plus `abierto24x7: boolean`.
- **Rationale**: Enables the `abierto-ahora` endpoint and the "abierto/cerrado" UI chip. Free-text cannot.
- **Validation rules**: Each `Turno.apertura < Turno.cierre` (24h string compare). `turnos` may be empty iff `abierto: false` (i.e. closed that day). At most 3 turnos per day (reasonable business case in Concón).
- **`abierto-ahora` algorithm** (in `application/places.service.ts`):
  1. If `abierto24x7 === true` → `{ abierto: true }`.
  2. Look at `horariosEspeciales` for `today` (server `new Date()`); if found, use its `turnos` for the open check.
  3. Otherwise look at `horarios[diaActual]` and verify current HH:mm is inside any `turno`.
  4. Empty turnos list OR not-found day → `{ abierto: false }`.
- **Server-time decision**: Use `new Date()` at request time. Keep the place's timezone as America/Santiago implicitly (Chile is single-timezone; no `tz` field in MVP).
- **Alternatives considered**: (a) String `horarios: string?` — rejected by user. (b) Hybrid `abierto24x7` flag + string — rejected, doesn't enable "abierto ahora".

### D7. Servicios and metodosPago as enums
- **Chosen**: `servicios?: ServicioEnum[]` and `metodosPago?: MetodoPagoEnum[]` — TS `const enum`s in `domain/`, validated by `@IsEnum(ServicioEnum, { each: true })` in the DTO.
- **Rationale**: Prevents the dirty-data risk of free-text services ("WiFi", "Wi-Fi", "wifi gratuito" all meaning the same). Enum is also OTF-friendly (frontend can `*ngFor` over the enum values for filters).
- **Canonical enum values** (recorded in `docs/data-model.md`):
  - `ServicioEnum = 'wifi' | 'estacionamiento' | 'acceso-discapacidad' | 'apto-mascotas' | 'delivery' | 'take-away' | 'terraza' | 'vista-al-mar' | 'reservas' | 'ninos-bienvenida'`
  - `MetodoPagoEnum = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'qr'`
- **Open question** (§Open Questions): The full enum is closed (no extensibility) for MVP. Extension points are a future change to `data-model.md`.

### D8. Imagenes as nested object
- **Chosen**: `imagenes: { logo?: string; portada?: string; galeria: string[] }` — replacing `logoUrl` + `galeria` (top-level).
- **Rationale**: Cohesion — every image-related URL lives in one place. Future field additions (e.g. `video`, `cover`) extend the object without bloating the entity top level.
- **`galeria` premium gating**: The previous `empresas` schema gated `galeria` behind `planId === 'premium'`. Decision for `places`: `galeria` is **available in both plans** (free plan limits to max 3 images, premium max 10). This is documented as a Soft Constraint in `spec.md`. The exact thresholds (3 free / 10 premium) are recorded in `spec.md` Requirement "Place image gallery limits".
- **Alternatives considered**: Keep flat (`logoUrl`, `portadaUrl`, `galeria`) — rejected by the user in planning.

### D9. Post-MVP placeholders persisted as nullable
- **Chosen**: `vistasTotales` defaults to `0` (number), `valoracionGoogle?` is fully optional `{ rating, reviewsCount, mapsLink }`, `idiomas?: string[]`. All three are persisted as null/empty by default. The `create` endpoint accepts them as no-op (silently coerces to defaults if the client tries to set `vistasTotales`).
- **Rationale**: Including them in the schema means the future sync change is data-compatible, no schema migration. Excluding them now would force a future schema change.
- **Non-goal reaffirmed**: No write path for `vistasTotales`, no Google Places sync for `valoracionGoogle`. The `application/places.service.ts` does not compute or increment them.

### D10. solictudes and usuarios cross-module rename
- **Chosen**: `solicitudes.empresaId` → `solicitudes.placeId`; `usuarios.empresaId` → `usuarios.placeId`. All in one task (Task 4) with the matching spec assignment and contract specs updated.
- **Rationale**: A dangling `placeId` foreign-key-style ref pointing back to `places` keeps the model normalized. Not doing the rename would force every read of `solicitud.empresaId` to mean "the place" — confusing.
- **Open question**: Cascade behavior when a place is deleted — should `solicitudes` referencing it be cascade-deleted, blocked, or orphaned? **Decision: block deletion** if any `solicitud` references the place (the admin must resolve the solicitud first). Recorded as a Requirement in `spec.md` ("Place deletion blocked by pending solicitudes").

### D11. No `/empresas` API alias
- **Chosen**: The OpenAPI doc lists only `/api/v1/places`. No alias.
- **Rationale**: No production client depends on `/empresas`. The frontend home hero only navigates to `/directorio?q=` (frontend route, not API). Keeping an alias would double the spec surface for no benefit.

### D12. Endpoint `GET /places/{id}/abierto-ahora`
- **Chosen**: Added in this change with the algorithm in D6.
- **Rationale**: The user explicitly opted in. It enables the frontend "Abierto ahora" chip on cards and on the detail page without duplicating the time logic in TS.

### D13. `abrirSlug` vs `findSlug` naming
- **Chosen**: Repository interface exposes `findBySlug(slug): Promise<Place | null>` (consistent with the existing `empresas` repo interface). Controller endpoint is `GET /places/slug/:slug`.

## Risks / Trade-offs

- **[Risk] Cross-module rename touches 3 NestJS modules + app.module + 2 auxiliary docs + 5 GitHub instructions** → `make solid-lint` and `bash check-refs.sh` are mandatory gates before archive; no `empresas` reference (case-insensitive) may remain outside `openspec/changes/archive/` (historical) and this `design.md`.
  - **Mitigation**: A grep drift is captured in Task 6.1 of the tasks.md as a hard verification gate.
- **[Risk] Custom validator `@IsValidSubcategoria` requires a cross-module call from the DTO to `categoriasRepository`** → would violate DIP if the DTO directly imports the categorias adapter.
  - **Mitigation**: Validate `subcategoriaId` in `application/places.service.ts` (after the DTO has passed class-validator's structural checks), not in the DTO. The DTO only checks the structural shape (string, optional). This keeps DTO framework-pure and the application layer orchestrates cross-module consistency.
- **[Risk] Solo-Santiago timezone assumption for `abierto-ahora`** → if a Chilean summer-time DST change drops, server local time might drift an hour.
  - **Mitigation**: Use `Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago' })` to compute the current Santiago time, not `new Date().getHours()`. Documented in `spec.md` (Requirement "open-now uses Santiago time").
- **[Risk] Enum `ServicioEnum` is closed; a place offering a service outside the enum cannot be persisted** → cataloging friction.
  - **Mitigation**: An extension change to `data-model.md` (future) that adds enum values is cheap. For MVP the closed enum prevents dirty data. Open Question carried.
- **[Risk] Closed `empresas` module deletion could be re-discovered by a stale git branch** → review conflict.
  - **Mitigation**: The `/commit` step explicitly notes the deletion in the conventional commit body; the PR description lists every removed file.
- **[Trade-off] `subcategoriaId` is not indexed in Firestore** → cannot query places by subcategoria efficiently.
  - **Trade-off accepted**: The MVP filters only on `categoriaId` (card-based browsing). Subcategoria filters are a future UX decision; if needed, an index is added in a new change.
- **[Trade-off] Two cross-references (`solicitudes.placeId` and `usuarios.placeId`) are stored as plain strings, not Firestore references** → no cascade integrity automatic.
  - **Trade-off accepted**: The existing `empresas` code already used plain strings for `empresaId`. Keeping strings avoids a Firestore Reference serialization diversión.

## Migration Plan

- **No migration script** — clean replacement. Deployment steps:
  1. Deploy backend with the new `places` module. The Firebase project has no `places` collection; it is created lazily on first `POST /places` write.
  2. The previous `empresas` collection (test artifacts only) is orphaned in the Firebase project but not consumed. A post-deploy manual `firebase firestore:delete --collection-id empresas --all-documents` is recommended for hygiene; not required for functional correctness.
- **Rollback strategy**: revert the git commit (or the deploy tag). Since no Frontend depends on the new `/places` endpoint yet (the home hero uses dummy data), a rollback to `/empresas` does not break any client. If a partial deploy leaves backend with `/places` and frontend with `/empresas` (cannot happen in this MVP state), the `/health` probe still returns 200.
- **Doc-update ordering**: `docs/data-model.md` and `docs/api-spec.yml` are updated in the same commit as the code (Task 1 of Phase 0) — the SDD non-negotiable rule #4 mandates docs-before-code in the working tree, even if they ship in the same commit.

## Open Questions

1. **Display label for the auth role `empresa` in admin UI**: Should the admin-facing UI call it "Publicador" or "Empresa"? — Out of scope for this change (frontend-admin is post-MVP). Parked.
2. **`ServicioEnum` extension path**: When a new service needs to be added (e.g. `'ecenizacion-co2'`), is it a `data-model.md` change + a redeploy, or do we move to a Firestore `servicios-catalog` collection? — Parked. For MVP, a `data-model.md` edit is fine.
3. **`galeria` per-plan limits (3 free / 10 premium)**: Confirm the numbers in `docs/data-model.md` and the `ImagenGaleriaDto` validator's `@ArrayMaxSize(10)`. Numbers cited in this design (3/10) originated from the previous `empresas` DTO (which used `ArrayMaxSize(3)` in some contexts without a plan check). **Action**: The spec declares an `ArrayMaxSize(10)` cap; the per-plan enforcement (3 vs 10) is implemented in `application/places.service.ts::create` based on `planId`.
4. **`vistasTotales` write path**: Whether to increment on every `GET /places/:id` fetch or only on a dedicated event endpoint — decided in the future analytics change.
5. **`valoracionGoogle` sync triggers**: manual pull by admin vs scheduled job — future change.
6. **Slugs for institutions/places with non-Latin characters** (e.g. "Municipalidad de Concón", "Plaza de Armas"): the existing `slugify` util handles Spanish diacritics (`ñ` → `n`, accents stripped). No special handling needed for this change; verification in tasks.md (a test case with a `ñ` name).
7. **`subcategoriaId` subcategoria-orphan cleanup**: If `categorias.subcategorias[]` removes a slug that is referenced by some `place.subcategoriaId` — current decision: do not cascade, the place keeps a dangling subcategoria reference. Documented as a Soft Constraint in spec.md.
