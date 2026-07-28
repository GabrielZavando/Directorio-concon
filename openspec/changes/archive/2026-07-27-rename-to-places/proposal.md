## Why

The current domain models listings under the entity `empresas` (collection `empresas`, module `backend/src/modules/empresas/`). That name is too narrow: the directory of Concón must also list **institutions** (municipalidad, juntas de vecinos, centros culturales) and **places** of public interest, not just commercial companies. The existing `Empresa` schema is also too thin for the MVP card/detail UX: it bundles a single `descripcion` (no short/long split), a free-text `horarios` string (no "open now" logic), scattered image fields (`logoUrl` + `galeria` at top level), uncontrolled `servicios: string[]` (no enum), no payment-method catalog, and no slots for future Google Place ratings or view analytics. Renewing the canonical entity and its schema now — before the directory fills with data and the frontend feature pages consume it — keeps the data model, the API contract, and the frontend all aligned without migration debt.

## What Changes

- **BREAKING**: Replace the Firestore collection `empresas` and backend module `modules/empresas/` with a new generic entity `places` (collection `places`, module `backend/src/modules/places/`). The previous module is **deleted** in a clean replacement — there is no production data to migrate.
- **BREAKING**: Rename the cross-references `solicitudes.empresaId` → `solicitudes.placeId` and `usuarios.empresaId` → `usuarios.placeId`. The `solicitudes` workflow (auto-create on place creation, admin approve/reject) is preserved.
- Extend the entity schema with the approved fields:
  - `descripcionCorta` (≤140 chars, for cards) + `descripcion` (10..2000 chars, for the detail page) — replaces the single `descripcion`.
  - `horarios` as a **typed object** (`HorarioDia[]` with multiple `turnos` per day), plus `horariosEspeciales[]` for holidays, plus `abierto24x7: boolean`. Replaces the free-text `horarios: string?`.
  - `servicios: ServicioEnum[]` and `metodosPago: MetodoPagoEnum[]` — controlled enums (no free text), validated by `class-validator`.
  - `imagenes: { logo?, portada?, galeria: string[] }` — grouped object replacing the flat `logoUrl` + `galeria` fields.
  - `subcategoriaId?: string` — reference into existing `categorias.subcategorias[].slug` (no string duplication, no new collection).
  - `whatsapp?: string` — added to the contact block.
  - `fechaVerificacion?: Date` — companion to `verificado: boolean`.
  - `fechaPublicacion?: Date` and the post-MVP optional fields `vistasTotales: number` (defaults to 0), `valoracionGoogle?: { rating, reviewsCount, mapsLink }`, and `idiomas?: string[]`. These are persisted as **placeholders** — no Google Places sync and no real analytics computation are implemented in this change (declared as Non-Goals).
- Add a new endpoint `GET /api/v1/places/{id}/abierto-ahora` that returns `{ abierto: boolean, turno?: { apertura, cierre } }` derived from `horarios` + `horariosEspeciales` + the current server time, honoring `abierto24x7`.
- Preserve the canonical `slug` (UNIQUE) and the `status: pendiente|aprobado|rechazado` enum (Flujo 1 unchanged except for the `empresa`→`place` rename). Drop the API alias `/empresas` — only `/api/v1/places` exists.
- Update the canonical docs **before any code**: `docs/data-model.md` (entity renamed + new fields + new indices), `docs/api-spec.yml` (paths and schemas `Place`/`CreatePlace`/`UpdatePlace`), `docs/base-standards.md` §8.2-8.4 (Flujo 1 wording), `docs/backend-standards.md` (module conventions example), and the auxiliary `.github/instructions/{backend,database,frontend,ai}-instructions.md`.

## Capabilities

### New Capabilities
- `places`: Core CRUD + search + `abierto-ahora` endpoint for the `places` Firestore entity (companies, institutions, public-interest places of Concón). Defines the entity schema, the validation contract (DTOs), the lifecycle (creation → pending `solicitud` → admin approve/reject), and the "open now" derivation rules. Becomes `openspec/specs/places/spec.md` after archive.

### Modified Capabilities
- (none at spec-level) — The existing frontend capabilities (`frontend-home-hero`, `frontend-spa-navigation`, `frontend-reusable-search-component`, `frontend-layout-base`) reference the backend `GET /empresas` call only at the implementation level (dummy data in `HomePageComponent`, placeholder `/directorio`). Their published requirements do not change as part of this change; any future binding to `/places` is a separate change.

## Impact

- **Backend code**:
  - **Deleted**: `backend/src/modules/empresas/` (entity, repository interface, contract spec, status enum, service + spec, Firestore adapter + spec, controller + spec, all DTOs, module, `empresas.service.spec.ts`). Cleaner than a `.deprecated` rename since there is no production data to keep available.
  - **New**: `backend/src/modules/places/` with Clean Architecture layers:
    - `domain/` — `place.entity.ts`, `place-status.ts`, `place-repository.interface.ts`, `place-repository.contract.spec.ts`, value objects (`coordenadas.vo.ts`, `horario-dia.vo.ts`, `horario-especial.vo.ts`, `red-social.vo.ts`, `imagenes.vo.ts`), enums (`servicio.enum.ts`, `metodo-pago.enum.ts`). No framework imports.
    - `application/` — `places.service.ts`, `places.service.spec.ts`. Use cases: `createPlace` (auto-creates `solicitud`), `findBySlug`, `search`, `findOne`, `update`, `delete`, `abiertoAhora(id, now=new Date())`.
    - `infrastructure/` — DTOs (`create-place.dto`, `update-place.dto`, `coordenadas.dto`, `horario-dia.dto`, `horario-especial.dto`, `imagenes.dto`, `red-social.dto`, `query-place.dto`), `place-firestore.adapter.ts`, `place-firestore.adapter.spec.ts`, `places.controller.ts`, `places.controller.spec.ts`, `places.module.ts`.
  - **Modified**: `backend/src/app.module.ts` (`EmpresasModule` → `PlacesModule`), `backend/src/app.controller.ts`/`app.service.ts` if they reference `empresas`.
  - **Cross-module**: `backend/src/modules/solicitudes/` — `solicitudes.empresaId` → `solicitudes.placeId` in entity, DTOs, service, adapter, controller, specs. `backend/src/modules/usuarios/` — same rename of `usuarios.empresaId`.
- **Database (Firestore)**:
  - Collection `empresas` is replaced by `places`. New indices: `places(categoriaId ASC)`, `places(barrioId ASC)`, `places(status ASC, destacado DESC, createdAt DESC)`, `places(slug ASC — unique)`. Existing `solicitudes` and `usuarios` indices unchanged in shape but referencing `placeId` instead of `empresaId`.
  - No migration script — clean replacement.
- **Frontend**:
  - `frontend/src/app/shared/data-access/local/data/categorias.json` references are reviewed (no breakage expected — categories entity itself is unchanged).
  - No frontend work in this change; the future `frontend-directorio` page that consumes `/places` is a separate change (Non-Goal).
- **Documentation**:
  - `docs/data-model.md` — rename `empresas` section to `places`, document all new fields, mark post-MVP placeholders, update indices and business rules.
  - `docs/api-spec.yml` — replace `/empresas` paths with `/places`, replace `Empresa`/`CreateEmpresa`/`UpdateEmpresa` schemas with `Place`/`CreatePlace`/`UpdatePlace`, add `GET /places/{id}/abierto-ahora`.
  - `docs/base-standards.md` §8.2-8.4 — Tesla wording from "empresario registra empresa" to "publisher registers place"; keep `rol: 'empresa'` (the auth role name stays `'empresa'` — the rename is only for the listing entity, not the user role -- NOTA: this is a design decision to confirm in `design.md`).
  - `docs/backend-standards.md` — update the module-conventions example from `empresas` to `places`.
  - `.github/instructions/{backend,database,frontend,ai}-instructions.md` — terminology refresh.
- **Dependencies**: none added. No new npm packages — `class-validator`, `class-transformer`, `firebase-admin`, `@nestjs/*` already present.
- **Public API contract**: paths change from `/api/v1/empresas` to `/api/v1/places`. Schemas change shape. No backward-compat alias is kept (Non-Goal: production data does not exist yet).
- **Risk**: Cross-module rename touches 3 modules (`places`, `solicitudes`, `usuarios`) and `app.module`. `make solid-lint` + `bash check-refs.sh` must report zero dangling `empresas` references before archive. Type strictness and SOLID thresholds (300 lines/file, complexity ≤ 10, max-params ≤ 3) must remain green for the new `places` module.
