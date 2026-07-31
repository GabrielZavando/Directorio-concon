## Context

The `roles-rename` change (archived 2026-07-30) introduced the closed `Rol = 'admin' | 'owner' | 'member'` enum and three reusable domain artefacts (`rol.enum.ts`, `ROL_VALUES`, `data-model.md` "Authentication debt" note) but explicitly deferred the runtime enforcement: `places.usuarioId` stayed `"anonymous"`, `eventos.usuarioId` stayed behind the `x-usuario-id` header, and `solicitudes.revisadoPor` had no HTTP controller nor role guard.

Today (`backend/` exploration):
- `FirebaseService.verifyIdToken()` / `getUserByUid()` / `getUserByEmail()` exist (`backend/src/common/services/firebase.service.ts`) — the Auth Admin SDK plumbing is ready.
- `backend/src/modules/usuarios/` exists but only `domain/rol.enum.ts` + its spec — no service, no controller, no repository.
- `backend/src/modules/auth/` does not exist (commented out in `app.module.ts`).
- `backend/src/modules/solicitudes/` has the service and approval-handler DI in place but NO controller — the HTTP layer to approve/reject is missing.
- `places.controller.ts:44` and `eventos.controller.ts:50,132,156` carry the stubs documented as auth debt.
- `frontend/` does not exist yet — there are no live consumers of the `x-usuario-id` header to break.
- The `usuarios` Firestore collection is empty — no data migration is needed; new registrations start directly with the new enum.

Standards in force: `docs/backend-standards.md` (Clean Architecture por feature, DIP — domain + application never import `firebase-admin`/`class-validator`), `docs/base-standards.md §8` (stack + personas + RBAC rules). SOLID thresholds (file ≤ 300 lines, complexity ≤ 10, max-params ≤ 3) enforced by CI linters.

## Goals / Non-Goals

**Goals:**
- Close the three runtime divergences (`places.usuarioId`, `eventos.usuarioId`, `solicitudes.revisadoPor`) by implementing the `auth` module and completing the `usuarios` module.
- Provide reusable, framework-agnostic guards/decorators (`JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser()`, `@Public()`) so that future feature modules (post-MVP: `planes`, `reviews`, `analytics`) compose authentication and authorization uniformly.
- Keep the anonymous discovery flow (`GET /places`, `GET /eventos`, etc.) working with zero auth — Flujo 2 in `docs/base-standards.md §8.3`.
- Update `docs/api-spec.yml`, `docs/data-model.md`, and the OpenSpec canonical specs (`usuarios`, `solicitudes`, `places`, `eventos`, `api-contract`) to mark the debts as closed.
- Maintain ≥ 90% test coverage on touched modules (Jest unit tests with mocked `verifyIdToken`).

**Non-Goals:**
- Self-registration public endpoint (`POST /auth/signup` unauthenticated) — Firebase Auth handles signup client-side; `usuarios` provisioning is admin-only in this change. A future `usuarios-self-signup` change may relax this once `member`-default is considered safe.
- Firebase Auth emulator setup for E2E tests — deferred to a future `test-infra` change. Unit tests mock `verifyIdToken`; integration tests rely on the live admin SDK with a test project (out of scope here).
- Custom-claim backfill script for existing Firebase Auth users — the Firestore fallback covers the gap; a future `usuarios-backfill-claims` change will backfill `rol` claims if performance requires it.
- `usuarios.favoritos` storage shape — deferred to a future `favoritos-crud` change (decision confirmed with stakeholder).
- Panel admin UI (Angular Material) — deferred per `docs/base-standards.md §8.4`.
- Global registration of `JwtAuthGuard` — the `@Public()` decorator is provided for forward-compatibility but guards are composed per route in this change. A future `auth-guard-global` change may register globally.
- Token-refresh / cookie-based sessions — out of scope; the client sends a fresh Firebase `idToken` per request (standard Firebase pattern for SSR/CSR backends in MVP).

## Decisions

### Decision 1: Guards live inside the `auth` module (`auth/application/`), not in `common/guards/`
**Choice**: `JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser()`, `@Public()` live in `backend/src/modules/auth/application/`. `AuthModule` exports them.

**Rationale (vs `common/guards/`)**: Guards are not cross-cutting infrastructure like `LoggingInterceptor` — they encode a domain responsibility (authentication + authorization of `usuarios`). Treating them as a feature module keeps Clean Architecture feature-first; other modules opt in via `AuthModule` imports + decorator composition (OCP-friendly). The "common" alternative would widen the surface of `backend/src/common/` into an unbounded grab-bag, weakening SRP.

**Alternative considered (rejected)**: Putting them in `common/guards/` for NestJS idiom-sync — rejected because the framework idiom conflicts with the project's explicit Clean Architecture rule (`docs/backend-standards.md`) stating modules own their domain logic.

### Decision 2: Rol resolution = Firebase custom claim + Firestore fallback (cacheable)
**Choice**: `AuthService.buildContext(decodedToken)` resolves `rol` in this order:
1. `decodedToken.rol` (custom claim set via `admin.auth().setCustomUserClaims(uid, { rol })`) — if present and valid `Rol`, use it. Zero Firestore round-trip.
2. Otherwise: `authContextRepository.getRolByUid(decodedToken.uid)` — a single Firestore read of `usuarios/{uid}`. Cacheable via the global `CacheModule` (Redis + in-memory fallback) keyed `auth:rol:<uid>` TTL 60s.
3. If neither resolves a valid `rol`: respond `403` with error `user has not been provisioned in the usuarios collection`.

**Rationale (vs always-Firestore-lookup)**: Custom claims are Firebase's recommended pattern for role-based access — they live in the decoded JWT and avoid per-request Firestore reads. The fallback handles users provisioned in Firebase Auth but not yet in `usuarios` (e.g., a freshly signed-up user awaiting admin provisioning). Caching the fallback preserves performance when claims are absent (rare case post-backfill).

**Rationale (vs custom claim only, no fallback)**: A "claim-only" choice would require a backfill script as a hard prerequisite, slowing MVP ship. The fallback buys time. A future `usuarios-backfill-claims` change can harden the contract once `usuarios` is well-populated.

**Alternative considered (rejected)**: Storing `rol` purely on the JWT custom claim (no Firestore lookup, no `usuarios.rol` source). Rejected because Firestore remains the canonical store (UNIQUE on email, audit trail, admin's `PUT /usuarios/:uid/rol` must write a durable record).

### Decision 3: `AuthContext` value object — readonly pure domain interface
**Choice**: `AuthContext = { uid: string; email: string; rol: Rol; placeId?: string }` defined as a pure TypeScript interface in `backend/src/modules/auth/domain/auth-context.interface.ts`. No class, no behaviour — the type that travels on `request.user`. Constructors live in `AuthService.buildContext` (application layer); handlers consume the readonly interface.

**Rationale**: Matches the existing project pattern (`places` uses interfaces like `Coordenadas`, `RedSocial` defined inline in the domain). Keeps DIP — handlers depend on the abstract `AuthContext`, not on `DecodedIdToken` (which is a Firebase type). The `@CurrentUser()` decorator casts `request.user` to `AuthContext` so handler code reads `user.uid` / `user.rol` without leaking Firebase types.

### Decision 4: `SolicitudesController` is new in this change (approve/reject only)
**Choice**: Build `backend/src/modules/solicitudes/infrastructure/solicitudes.controller.ts` exposing `POST /solicitudes/{id}/approve` and `/reject` (both `@Roles('admin')`). No `GET /solicitudes` list endpoint in this change (admin queue UI is deferred — the frontend panel admin is out of MVP).

**Rationale**: The `SolicitudesService` and approval-handlers DI are in place — only the HTTP binding is missing. Approve/reject are the two operations that close the `revisadoPor` debt; the listing endpoint can wait for the panel admin change. Keeps the change focused.

**Alternative considered (rejected)**: Adding a full `GET /solicitudes` listing endpoint with filters. Rejected because there's no consumer yet (frontend panel admin is out of MVP scope, see `docs/base-standards.md §8.4`) — adding unused surface violates YAGNI and would require extra tests/contract work.

### Decision 5: Breaking change — remove `x-usuario-id` and `x-rol` headers from `eventos`
**Choice**: The `EventosController` removes `@Headers("x-usuario-id")` and `@Headers("x-rol")` parameters entirely; `usuarioId` is read from `@CurrentUser() user.uid`. The `RolesGuard` reads `rol` from `request.user.rol` (custom claim / Firestore fallback). The headers are silently ignored if a client still sends them (NestJS won't bind them since the parameters are removed from the handler signature).

**Rationale**: The headers were always documented as provisional (`docs/data-model.md §usuarios` "Authentication debt"). The frontend does not exist, so no live traffic breaks. Continuing to use the headers would perpetuate the spoofing vector. This is a clean break.

**Migration note**: documented in the proposal's "What Changes" as **BREAKING** — no client action required since there are no live clients.

### Decision 6: Self-registration deferred — `usuarios` provisioning is admin-only
**Choice**: There is no `POST /auth/signup` public endpoint in this change. The `POST /api/v1/usuarios` endpoint is `@Roles('admin')` only. The expected flow: a Firebase Auth signup happens client-side (the future frontend uses the Firebase Web SDK), creating the `Auth` user; then an admin provisions the matching `usuarios` document via `POST /api/v1/usuarios` (with default `rol: 'member'`).

**Rationale**: Self-registration opens a privilege-escalation vector if not carefully designed (a self-registered user could set their own `rol: 'admin'`). Admin-provisioned `usuarios` is the safe MVP baseline; a future `usuarios-self-signup` change can introduce public signup with a hardened `rol: 'member'` default once the boundary is well-tested. This aligns with `data-model.md §usuarios` "default `'member'` on registration".

**Alternative considered (rejected)**: Public `POST /auth/signup` that always sets `rol: 'member'`. Rejected for MVP because (a) it conflates the Firebase Auth UID creation (client-side) with the `usuarios` document creation (server-side) and is easily mis-built, and (b) the admin-provisioned flow is a stricter security baseline that survives even if signup auth is misconfigured.

### Decision 7: No data migration scripts — `usuarios` collection starts empty
**Choice**: No `backend/scripts/migrate-usuarios.ts` is added. The `usuarios` collection has zero documents at start; new documents are created via the admin-provisioned flow. The `data-model.md` "Authentication debt" note is updated to mark the debts as closed by this change.

**Rationale**: `roles-rename` already documented that the rename is schema-only (no data to migrate). The Firestore fallback (Decision 2) means even users without `usuarios` documents get a deterministic `403` (not a crash) — operational safety is preserved.

## Risks / Trade-offs

- **[Per-request Firestore read in the fallback path]** → Mitigated by Redis cache (60s TTL) keyed by `auth:rol:<uid>`. Cache invalidation is implicit on `PUT /usuarios/:uid/rol` (the admin endpoint writes-through). P95 impact is minimal because the Firebase custom claim path (step 1) dominates after backfill.
- **[`AuthContext` staleness if `rol` changes between JWT issuance and request]** → The Firebase custom claim is setserver-side via `admin.auth().setCustomUserClaims`, which is reflected the NEXT time the client refreshes their `idToken` — there's a window where the cached `rol` on the JWT diverges from a just-changed `usuarios.rol`. Mitigation: the Firestore fallback catches the truth; the cache TTL is short (60s). Documented as a known transient — the admin UI for `usuarios` is out of MVP, so rol changes are rare. **NOT** a security hole: a downgrade (admin → member) is the strict case; during the transient, the user keeps the higher privilege only for ≤ 60s + the JWT lifetime, which is acceptable for MVP.
- **[Breaking header removal (`x-usuario-id`)]** → No live consumers (frontend does not exist). Documented as a breaking-change in `proposal.md` and `api-spec.yml`.
- **[Tests run without a live Firebase Auth project]** → `verifyIdToken` is mocked in `auth.service.spec.ts`, controller specs, and integration tests. A future `test-infra` change adds Firebase Auth emulator coverage for true E2E.
- **[403 catch-22 for orphan Firebase Auth users]** → A freshly signed-up Firebase user without a `usuarios` document gets `403` from any protected endpoint until an admin provisions them. Mitigated by documentation: the `403` error message names the cause (`user has not been provisioned in the usuarios collection`), and the admin panel (deferred) will surface the queue. Acceptable for MVP because there's no live frontend traffic.
- **[`@Roles` decorator conflicting on controller + method]** → Method-level wins; documented in the spec. No runtime risk — NestJS `Reflector`'s `override` semantics handle this consistently with the project's existing patterns.

## Migration Plan

This change is an additive backend ship — no destructive migration steps.

1. **Order of ship** (matches `tasks.md`):
   - Tasks 1–2: docs canónicas (`api-spec.yml`, `data-model.md`) y OpenSpec specs — no runtime impact.
   - Tasks 3–5: `usuarios` module (domain → application → infrastructure) with all tests green — module registers but no routes are wired yet.
   - Tasks 6–8: `auth` module (domain → application → guards/decorators → infrastructure adapter) with all tests green — module is built but no route uses it yet (opt-in by composition).
   - Tasks 9: `app.module.ts` imports `AuthModule` + `UsuariosModule`. No effect yet because no controller uses the guards.
   - Task 10: `SolicitudesController` wired with guards — new endpoints light up (admin-only).
   - Task 11: `PlacesController.create` refactored — `POST /places` becomes `@Roles('owner')`-gated and `usuarioId` is JWT-sourced.
   - Task 12: `EventosController` refactored — `x-usuario-id` headers removed, guards composed, `usuarioId` from `@CurrentUser()`.
   - Task 13: `docs/data-model.md` "Authentication debt" note updated to mark the three bullets as closed.
   - Task 14: `docs/base-standards.md §8.4` roadmap labels `auth` + `usuarios` as implemented MVP.
2. **Rollback strategy**: every step is reverse-exact (the gated endpoints revert to stub; the stubs at lines `places.controller.ts:44` and `eventos.controller.ts:50/132/156` are restored from git). Because there's no live frontend traffic, a rollback at any step is silent.
3. **Verification gates**: `npm --prefix backend test` (覆盖率 ≥ 90% en módulos tocados) + `npm --prefix backend run lint` (SOLID thresholds verdes) + `openspec validate auth-usuarios`. `/verify` custom command antes de `/archive`.
4. **Post-ship**: `npm run seed` (existing seed script) is NOT touched (the seed only populates `categorias` + `barrios`; no `usuarios` records are needed for the auth module to operate — admin users are provisioned manually).

## Open Questions

- **Q1**: Should `GET /places/{id}` become admin-only when the caller wants to see a `pendiente` place? The current spec is ambiguous — `places` spec says anonymous can `GET /places/{id}` but the admin-only `status` filter is on `GET /places` (list). For MVP we leave `GET /places/{id}` anonymous (it only returns approved places by default; a `pendiente` place returns `404` to anonymous). This change does NOT alter this behaviour — flagged for a future change if the panel admin needs it.
- **Q2**: Custom-claim backfill for ORPHANS — when `usuarios-backfill-claims` ships, should it also CREATE `usuarios` documents for Firebase Auth UIDs without one, or only set claims for users with existing `usuarios` docs? Default proposal: only set claims for existing `usuarios` docs (orphans stay 403 until admin provisions). Reconfirmed in a future change.
- **Q3**: Redis cache key versioning — if the `AuthContext` shape changes (e.g., adds `tenantId`), the cache key `auth:rol:<uid>` may serve stale rol values. Suggested: prefix with schema version `auth:v1:rol:<uid>`. Out of scope for MVP; cache is best-effort (60s TTL bounds staleness).
