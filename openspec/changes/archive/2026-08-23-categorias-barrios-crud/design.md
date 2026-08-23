## Context

The Directorio de Concón currently treats `categorias` and `barrios` as static catalog data fetched from local JSON files on the frontend (`frontend/src/app/shared/data-access/local/data/categorias.json`, `barrios.json`). There is no Firestore persistence, no admin API, no backend validation of references, and the documented `npm run seed` script (AGENTS.md §8.3) is broken — `backend/package.json` declares `seed` and `migrate` pointing to `backend/scripts/seed.ts` and `scripts/migrate.ts` that do not exist (folder `backend/scripts/` is absent).

Existing modules `places`, `eventos`, `usuarios`, `auth`, `solicitudes` already follow Clean Architecture (`domain/` + `application/` + `infrastructure/`), use `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles` decorators, global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`, and class-validator DTOs. Sampled canonical files: `backend/src/modules/auth/application/auth.service.ts` (DIP debt importing `firebase-admin/auth` — out of scope here), `backend/src/modules/places/application/places.service.ts` (358 lines — out of scope for refactor here), `backend/src/common/services/firebase.service.ts` (324 lines).

Existing catalog-related artifacts (frontend): `categorias.json` has 10 categorias (9 + `eventos`), `eventos` categoria has 10 subcategorias slugs (`festivales-culturales`, `ferias-gastronomicas`, `ferias-libres`, `deportes-y-competencias`, `conciertos-y-shows`, `talleres-y-clases-abiertas`, `eventos-familiares`, `temporada-de-verano`, `fiestas-patrias`, `mercados-sustentables`) — matching data-model.md exactly. `barrios.json` has 13 barrios (12 urbanos + 1 rural `zona-rural`) with `territorio` field, slugs matching data-model.md.

Constraints:
- Backend standards (CI hard limits): max 300 lines/file, cyclomatic complexity ≤10, max-params ≤3, ISP repository interfaces ≤5 methods, DIP strict (domain/application MUST NOT import firebase-admin, class-validator, or class-transformer).
- DIP violation already documented in audit (`auth.service.ts:34`) — not in scope for this change.
- `emailVerified` enforcement and self-registration covered by CH-02 — out of scope here. This change assumes current `JwtAuthGuard`/`RolesGuard` stack stays as-is.
- No frontend changes in this change (frontend keeps consuming JSON for selects — migrating to `GET /categorias` `/barrios` is in CH-08). Only backend infrastructure + scripts.

Stakeholders: admin users (manage catalog), backend devs (validation wiring), frontend devs (CH-08 will consume new endpoints), operators (running `npm run seed`).

## Goals / Non-Goals

**Goals:**
- Two new backend modules `categorias` and `barrios` following existing Clean Architecture conventions and DIP rules.
- Admin CRUD endpoints + public read endpoints, all behind existing auth guards.
- Cross-catalog validation in `PlacesService` and `EventosService` (only when catalog fields are being set/changed, not on unrelated updates).
- Working `npm run seed` that populates categorias/barrios idempotently from the canonical JSON files.
- Working `npm run audit-refs` to find orphaned references before turning on strict validation.
- Tests: unit (services, validators), integration (adapters against Firestore emulator), LSP contract tests, E2E (controllers via Supertest for happy paths + 400/403/404/409).

**Non-Goals:**
- NO frontend changes (CH-08 will switch the frontend to consume the new public endpoints; for now the local JSONs remain the source of truth for `LocalDirectorioOpcionesService`).
- NO migration of existing place/evento data — this change ships the audit script but does NOT auto-fix orphans.
- NO removal of `distinción` between the `eventos` categoria's special subcategorias and any other categoria's subcategorias — both follow the same generic `subcategorias` array model.
- NO endpoint to count "places/eventos using this categoria/barrio" (proposed in PLAN_IMPLEMENTACION.md — deferred to a future admin-insights change).
- NO ordering of subcategorias (`orden` field) — currently the Categoria entity has a single `orden: number` at the categoria level; the PLAN's proposal to add per-subcategoria ordering is deferred until proven necessary.
- NO caching layer (Redis/memory) on the two public GET endpoints — deferred until measured load justifies it.
- NO DIP refactor of `AuthService` (separate change).

## Decisions

### Decision 1: Two independent Firestore collections, no shared `catalogos` collection

**Choice:** `categorias` and `barrios` are separate collections with their own schemas.

**Rationale:** The two entities have non-overlapping shapes (categoria has `icono` and a `subcategorias` array; barrio has `tipo`, `territorio`, `coordenadas`). Forcing them into a single `catalogos` collection with a `tipo` discriminator would create sparse fields and conditional validation, harming readability and type safety. The proposal explicitly asked for two collections.

**Alternatives considered:**
- Single `catalogos` collection with `tipo` discriminator — rejected for shape mismatch.
- Subcollections under a `categorias/{categoriaId}/barrios/{barrioId}` — rejected because barrios are orthogonal to categorias (a barrio is not owned by a categoria).

### Decision 2: Subcategorias embedded as array inside categoria document, not as separate collection

**Choice:** `subcategorias: Subcategoria[]` lives inside the `categorias/{id}` document.

**Rationale:** A subcategoria has no meaning outside its parent. They are few (typically ≤10). Embedding them avoids an extra Firestore read when a public client wants to populate selects. The Plan's "Order of Subcategorias" proposal to add `orden` per subcategoria is deferred (alphabetical ordering is sufficient for MVP).

**Tradeoff:** The subcategoria mutating operations use Firestore transactions, since two concurrent admin edits on the same categoria document would otherwise conflict. Accepted.

**Alternatives considered:**
- `subcategorias` as a separate collection with parent reference — rejected because adds a read per categoria on the public GET, hurts public UX latency.
- `subcategorias` as map instead of array — rejected because arrays are simpler to scan in client code and to filter on `activo` for the public response.

### Decision 3: New module-private `CatalogValidator` shared service, no shared package

**Choice:** Introduce `backend/src/modules/categorias/application/catalog-validator.service.ts` (under `categorias`) that `PlacesService` and `EventosService` inject via Nest DI to perform cross-catalog validation. `BarriosService` provides the barrio side. Both validators expose a thin API: `assertCategoriaActiva(id)`, `assertSubcategoriaActiva(categoriaId, subId)`, `assertBarrioActivo(id)`.

**Rationale:** The validation is business logic that belongs in `application/`; sharing a service keeps the logic in one place. Avoid duplicating checks inside `PlacesService` and `EventosService`.

**Alternatives considered:**
- Pipe or guard-based validation — rejected because cross-collection references need async DB reads, which DTOs/sync guards cannot do cleanly.
- Inline the check in each service — rejected because it would duplicate logic and be hard to unit-test in isolation.

### Decision 4: Public GET endpoints filter in adapter, not via DTO transform

**Choice:** The `GET /categorias?activa=true` endpoint exposes a `query.activeorquestra` filter that gets translated into Firestore `where('activo', '==', true)` inside `CategoriaFirestoreAdapter.list()`. The `subcategorias` array filtering for public responses happens in the application service (in-memory map) before returning the DTO.

**Rationale:** Firestore supports `where` for top-level boolean fields, and that's the filter that limits the query cost. Per-element array filtering does not translate to a Firestore index query, so it's done in memory. Since the `subcategorias` array per categoria is bounded (≤ ~20 elements), in-memory filtering is fine.

**Alternatives considered:**
- Filtering both at the adapter level — not possible for array elements.
- Returning everything and filtering in the controller — pushes business logic out of `application/`, violates SRP.

### Decision 5: Conditional validation in places/eventos — only when the field is being set or modified

**Choice:** Validation MUST NOT fire on `PUT /places/{id}` or `PUT /eventos/{id}` unless the corresponding field (`categoriaId`, `subcategoriaId`, `barrioId`) appears in the update payload with a value different from the existing document's value. Sending the same value as the existing one does NOT trigger validation.

**Rationale:** Without this rule, an admin could not fix a typo in the description of a place whose categoria was later deactivated — the edit would fail even though no catalog change is attempted. Explicitly aligns with the spec scenarios (`Update place keeping same categoriaId does not re-validate`).

**Implementation:** The service does a diff against the existing document for those three catalog fields and only calls `CatalogValidator` when there is an actual change (or on create where there's no prior doc).

**Alternatives considered:**
- Always re-validate (strict) — rejected because it traps existing places when admin later toggles a categoria inactive.
- Always re-validate but only warn — rejected because warnings from a backend service are hard to surface.

### Decision 6: Seed script lives in `backend/scripts/`, uses repository adapters (not raw admin SDK)

**Choice:** `backend/scripts/seed.ts` imports `CategoriaFirestoreAdapter` and `BarrioFirestoreAdapter` directly (not through Nest DI). The adapters take a `FirebaseService` constructed via the existing `FirebaseModule` initializer.

**Rationale:** Stays consistent with DIP — the seed script uses the same abstractions the rest of the backend uses. The script's idempotency is achieved via `set(merge: true)` keyed by slug document ID.

**Alternatives considered:**
- Use raw `admin.firestore()` in the script — rejected because it bypasses the repository's slug generation and validation rules, risking bad seeds.
- Run the seed through the HTTP API — rejected because it would require admin auth tokens at seed-time and counts against throttlers.

### Decision 7: Mock places/eventos in `seed-places.ts`

**Choice:** `backend/scripts/seed-places.ts` (separate from `seed.ts`) writes 20-30 places and 10-15 eventos with realistic but fake Concón data. Both scripts are invoked together via `npm run seed` (calls `seed.ts` then `seed-places.ts`).

**Rationale:** Keeps the catalog seed fast and idempotent for operators who already have catalog data and only want mock places. The user explicitly authorized mock data for the development stage (Google Places API integration is post-MVP).

### Decision 8: Audit script reports only, does not auto-fix

**Choice:** `backend/scripts/audit-refs.ts` scans `places` and `eventos` collections and prints a JSON report of orphaned references. It does NOT modify any document.

**Rationale:** Auto-fixing would require guessing intent (which categoria/barrio was meant?), which is error-prone. Operators must manually correct orphans before enabling strict validation in deployment. The script's exit code reflects whether orphans were found, so it can be wired into CI as a staging gating check.

## Risks / Trade-offs

- **[Risk: Subcategoria array race conditions]** Two admins editing the same categoria simultaneously could lose updates. → **Mitigation:** Use Firestore transactions for all subcategoria mutations (`add`, `deactivate`). The `CategoriaFirestoreAdapter.findByIdAndUpdateSubcategoria` method encapsulates the transaction.
- **[Risk: Breaking existing places/eventos when admin deactivates a categoria]** Once validation is enabled, an existing place pointing at a deactivated categoria cannot be re-assigned via PUT without changing `categoriaId` (which would then fail). → **Mitigation:** Conditional validation (Decision 5) means the existing document's description edits work; only new assignments to the inactive categoria are blocked. The audit script surfaces this state proactively.
- **[Risk: Seed script overwrites manually-added admin categorias]** Idempotent merge can overwrite user changes. → **Mitigation:** The seed only writes from the canonical JSON; manual admin additions post-seed are preserved because the canonical JSON does not include them. Document this in `scripts/README.md`.
- **[Risk: Public GET `/categorias` performance]** If the catalog grows large (50+ categorias), single-call fetch is still small and fast. → **Mitigation:** No pagination needed now; if it ever is, the endpoint already accepts `?activa=true` to narrow scope.
- **[Trade-off: No per-subcategoria `orden` field]** Alphabetical ordering of subcategorias in selects may not match client's UX wish. → **Mitigation:** Frontend can sort manually; per-subcategoria `orden` is a post-MVP follow-up if needed.

## Migration Plan

1. **Pre-deploy (operator):** Run `npm run audit-refs` against the staging Firestore. Review the JSON report and manually correct any orphan `categoriaId`/`subcategoriaId`/`barrioId` references in `places` and `eventos`.
2. **Deploy backend:** New modules `categorias` and `barrios` are registered in `app.module.ts`. Public and admin endpoints become available. Validation in `PlacesService`/`EventosService` lands in the same deploy — controlled by a feature flag `CATALOG_VALIDATION_ENABLED=true` (env var, default `false` in dev, `true` in prod after audit).
3. **Seed (operator):** Run `npm run seed` to populate `categorias` and `barrios` from JSONs with `activo: true`. Run `npm run seed-places` for mock places/eventos (only on dev/staging).
4. **Enable validation (operator):** Set `CATALOG_VALIDATION_ENABLED=true` and redeploy. From this point, attempts to assign inactive/nonexistent catalog references are rejected with `400`.
5. **Rollback:** Disable the feature flag (env var back to `false`). The new endpoints stay harmless — they're additive. The cross-catalog validation becomes inert without the flag.

## Open Questions

- None that block implementation. (The per-subcategoria `orden` field and the `/categorias/{id}/uso` count endpoint are deferred to follow-up changes per PLAN_IMPLEMENTACION.md proposals.)
