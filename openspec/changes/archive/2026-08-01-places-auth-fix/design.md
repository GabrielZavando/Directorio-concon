# Design — places-auth-fix

## Context

The `auth-usuarios` change (archived 2026-07-31) shipped the `auth` module (JWT guard, roles guard, decorators, `AuthContext`) and closed the create-flow debts (`POST /places` → `@Roles('owner')`, `POST /eventos` → `@Roles('owner','admin')`, `solicitudes` approve/reject → `@Roles('admin')`). A follow-up audit of the `places` + `solicitudes` wiring surfaced three runtime blockers:

1. **`PUT /places/:id` + `DELETE /places/:id` are unauthenticated.** `places.controller.ts:129-152`:
   - `update` — no `@UseGuards`, writes `usuarioId = "anonymous"` (line 136, leftover stub from the `roles-rename` debt).
   - `remove` — no `@UseGuards`, no actor parameter at all.
   - `places.service.ts` — `update(id, dto, usuarioId)` receives a `usuarioId` but **never validates ownership**; `delete(id)` receives no actor. The canonical `places` spec ("only the owner or an admin may update", owner-or-admin for delete) is contract-only.

2. **`StubSolicitudesRepository` in `PlacesModule`** (`places.module.ts:27-37`):
   - `create` returns `{ id: "stub", ...input }` — nothing is persisted.
   - `existsByPlaceId` returns `false` always — the delete guard (`places.service.ts:252`) can never trigger.
   - The real `SolicitudesModule` exists, exports `SOLICITUDES_REPOSITORY` + `SolicitudesService`, and is already consumed by `EventosModule`. The stub shadows the real token within `PlacesModule`.

3. **XOR invariant (`placeId` ⊕ `eventoId`) documented but not enforced.** `solicitud.entity.ts:5` + the `solicitudes` spec declare the rule; `SolicitudesService.create`/`createEventoSolicitud` persist whatever they receive.

Plus a staging gap: `firestore.indexes.json` is missing composite indexes that the adapters actually query (see T5 analysis below).

Standards in force: `docs/backend-standards.md` (Clean Architecture per feature, DIP — domain/application never import infra; SOLID thresholds file ≤ 300 lines, complexity ≤ 10, max-params ≤ 3), `docs/base-standards.md §8` (stack + personas + RBAC rules).

## Goals / Non-Goals

**Goals:**
- Make `PUT /places/:id` and `DELETE /places/:id` owner-or-admin-only, with the ownership rule enforced in the service layer (owners only their own place, admins any) — closing the `"anonymous"` stub and the no-auth mutation hole.
- Replace the `StubSolicitudesRepository` with the real `SolicitudesModule` wiring (direct import, no `forwardRef`) so place solicitudes persist and delete-blocking reads real state.
- Enforce the XOR invariant at the `SolicitudesService` boundary before persistence.
- Align `firestore.indexes.json` + `docs/data-model.md §Índices` with the queries actually executed.
- Maintain ≥ 90% test coverage on touched modules (Jest unit tests with mocked `FirebaseService`).

**Non-Goals:**
- Refactor `places` module to full Clean Architecture (`places-clean-arch-refactor` remains a separate future change per `docs/base-standards.md §8.4`).
- Add a `GET /solicitudes` admin listing endpoint (deferred to the future panel admin change; the `status + createdAt` index is added now as forward-looking, but no endpoint ships here).
- Fix the pre-existing `PlaceApprovalHandler` gap: rejecting a `registro` solicitud does not flip `place.status → rechazado` (documented in `docs/base-standards.md §8.3` Flujo 1; the `rejectRegistro` handler is out of scope).
- Change `solicitudes` "any status" delete-block semantics beyond the correction documented below (pending-only aligns with `eventos.remove`).
- Touch `GET /places` discovery endpoints (remain anonymous per Flujo 2).
- Migrate or backfill existing data.

## Decisions

### Decision 1: Ownership rule lives in the service (`PlacesService.update`/`delete`), not the controller
**Choice**: `PlacesController.update`/`remove` are thin: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')` + `@CurrentUser() user: AuthContext`, then delegate. The authorization decision (`actor.rol !== 'admin' && existing.usuarioId !== actor.uid → ForbiddenException`) lives in `PlacesService.update(id, dto, actor)` and `PlacesService.delete(id, actor)`.

**Rationale**: mirrors the `eventos` precedent (`eventos.service.ts:235` — "Authorization: empresa owner or admin" inside the service), keeps the controller declarative, and makes the rule unit-testable without HTTP scaffolding. The service already loads the existing place (`findById`), so the ownership check is a pure in-memory comparison after the existence check.

**Alternative considered (rejected)**: doing the ownership check in the controller before calling the service. Rejected because it splits the authorization rule across layers and duplicates the existence load; the service is the natural chokepoint for both `update` and `delete`.

### Decision 2: Pass `AuthContext` (not separate `usuarioId` + `rol` params) to the service
**Choice**: the service signatures become `update(id: string, dto: UpdatePlaceDto, actor: AuthContext)` and `delete(id: string, actor: AuthContext)`. `AuthContext` is the canonical `{ uid, email, rol, placeId? }` type from `auth/domain` (already the `request.user` shape used by `@CurrentUser()`).

**Rationale**: keeps `max-params ≤ 3` (the `eventos.service` 4-param `update(id, dto, usuarioId, rol)` is documented pre-existing debt in `tasks.md` 14.3 of `auth-usuarios` — this change does NOT replicate it). It also keeps the `rol` type safe (`Rol` from `auth/domain/rol.enum.ts`) instead of a loose `string`.

**Alternative considered (rejected)**: `update(id, dto, usuarioId: string, rol: string)` mirroring `eventos.service` — rejected because it violates `max-params ≤ 3` and loses the `Rol` type.

### Decision 3: Replace the stub with the real `SolicitudesModule` (direct import, no `forwardRef`)
**Choice**: remove `StubSolicitudesRepository` (`places.module.ts:27-37`) and the `SOLICITUDES_REPOSITORY: { useClass: StubSolicitudesRepository }` provider; add `SolicitudesModule` to `PlacesModule` imports via a **direct import** (`imports: [AuthModule, SolicitudesModule]`). `PlacesService`'s `@Inject(SOLICITUDES_REPOSITORY)` then resolves to the real `SolicitudesFirestoreAdapter` exported by `SolicitudesModule`.

**Rationale**: `SolicitudesModule` is a dependency of `PlacesModule` (repository). `forwardRef` is NOT needed because the module graph has no circular dependency: `SolicitudesModule` imports only `[AuthModule]` and never imports `PlacesModule` (the `PLACE_APPROVAL_HANDLER` reference is a provider token consumed via `@Optional()`, not a module import). Direct import is simpler and was verified at implementation time by `places.module.spec.ts` (DI resolves `SOLICITUDES_REPOSITORY` to `SolicitudesFirestoreAdapter`), `npm --prefix backend run build`, and the full test suite. The real repo gives: persisted solicitudes on place create, and a delete guard backed by real `status === 'pendiente'` reads.

**Semantics correction surfaced**: with the stub, `existsByPlaceId` always returned `false`; the real adapter returns `true` only when a `status: 'pendiente'` solicitud exists. The previous spec text ("any status") described behavior that was never implemented. This change aligns the spec to the real-repo semantic (pending-only), consistent with `eventos.remove` → `existsPendingByEventoId`. Approved/rejected solicitudes no longer block deletion — the audit trail is preserved in the solicitud document itself.

### Decision 4: XOR invariant enforced in `SolicitudesService` via a private `assertXorConstraint`
**Choice**: add a private `assertXorConstraint(input: { placeId?: string; eventoId?: string; tipo: Solicitud['tipo'] }): void` to `SolicitudesService`, invoked at the top of both `create` and `createEventoSolicitud`. Throws `400 BadRequestException('Una solicitud debe referenciar exactamente un placeId o eventoId (XOR)')` when:
- both references present, or
- neither reference present, or
- the present reference does not match the `tipo` (placeId with an `-evento` tipo, or eventoId with a non-`-evento` tipo).

Input types of both methods widen to `{ placeId?: string; eventoId?: string; ... }` so the invariant is expressible/testable at the boundary.

**Rationale**: the invariant is a domain rule documented in `solicitud.entity.ts:5` and the spec; the application layer is the correct enforcement point (before repo persistence), keeping the adapter a dumb persistence port. `BadRequestException` (400) matches the "invalid request shape" semantics (vs `ConflictException` 409 for lifecycle conflicts).

**Alternative considered (rejected)**: enforcing in the Firestore adapter. Rejected — the adapter is an infrastructure port; enforcing domain invariants there violates DIP (the adapter would need `@nestjs/common` exceptions and domain knowledge). Also rejected: a DTO-level validator — the service is called cross-module by `places.service`/`eventos.service`, not only via HTTP DTOs.

### Decision 5: Composite indexes staged in the same change
**Choice**: add to `firestore.indexes.json` (and align `docs/data-model.md §Índices`):

| Collection | Index | Query backing it |
|---|---|---|
| `solicitudes` | `placeId ASC` + `status ASC` | `existsByPlaceId` (`solicitudes-firestore.adapter.ts:73-74`) |
| `solicitudes` | `status ASC` + `createdAt DESC` | forward-looking admin queue (no endpoint yet) |
| `eventos` | `status ASC` + `estado ASC` + `fechaInicio ASC` | `findAllPublic` base (`evento-firestore.adapter.ts:117-134`) |
| `eventos` | `status ASC` + `estado ASC` + `subcategoriaId ASC` + `fechaInicio ASC` | `findAllPublic` + subcategoriaId |
| `eventos` | `status ASC` + `estado ASC` + `barrioId ASC` + `fechaInicio ASC` | `findAllPublic` + barrioId |
| `eventos` | `status ASC` + `estado ASC` + `precioTipo ASC` + `fechaInicio ASC` | `findAllPublic` + precioTipo |
| `eventos` | `categoriaId ASC` + `createdAt DESC` | `findAllAdmin` (`:194-208`) |
| `eventos` | `subcategoriaId ASC` + `createdAt DESC` | `findAllAdmin` + subcategoriaId |
| `eventos` | `barrioId ASC` + `createdAt DESC` | `findAllAdmin` + barrioId |
| `eventos` | `estado ASC` + `createdAt DESC` | `findAllAdmin` + estado |
| `categorias` | `activa ASC` + `orden ASC` | forward-declared from `docs/data-model.md` (module future) |
| `barrios` | `tipo ASC` | forward-declared from `docs/data-model.md` (module future) |

**Rationale**: the adapter queries were verified against `firestore.indexes.json` and the docs list. The `solicitudes: placeId + status` index is the critical one — without it, `PlacesService.delete`'s guard query fails in production. The `eventos` public base index is the second critical one — every public list query filters `status` + `estado` and orders by `fechaInicio`. Admin-list indexes cover `findAllAdmin`'s filter combos. `categorias`/`barrios` indexes are staged now (they're already canonical in the docs) so the future modules don't silently break.

**Not staged (documented debt)**: multi-filter combos on `findAllPublic` (e.g., `subcategoriaId` + `barrioId` simultaneously) would require additional cross-product indexes (4 optional filters → 2^n combinations). For MVP the single-filter cases cover the discovery UI; combos are deferred until the frontend actually queries them (YAGNI — Firestore index management is cheap to extend but each index has cost).

## Risks / Trade-offs

- **[Module wiring (`SolicitudesModule` direct import)]** → No circular dependency exists (`SolicitudesModule` imports only `AuthModule`; `PlacesModule` imports `AuthModule` + `SolicitudesModule`). Verified during implementation by `places.module.spec.ts`, `npm --prefix backend run build`, and the full test suite. The `PLACE_APPROVAL_HANDLER` token stays consumed via `@Optional()` (latent approve-place gap documented as F-03 debt, out of scope).
- **[Semantics correction: delete-blocked = pending-only]** → Behavior change vs the never-implemented "any status" spec text. Low risk: there are no live consumers; the audit trail lives in the solicitud document. Documented in `places` spec delta + this design so reviewers can object before merge.
- **[`solicitudes: status + createdAt DESC` index added without an endpoint]** → Forward-looking staging; Firestore indexes are declarative (no runtime cost until queried). Acceptable — it avoids a second deploy when the admin queue ships.
- **[Multi-filter `findAllPublic` combos not staged]** → Documented debt; single-filter cases cover the MVP discovery UI. A future frontend that filters by both `barrioId` and `subcategoriaId` will need a new index (flagged in Open Questions).
- **[`eventos` admin-list `categoriaId` index when `categoriaId` is always `'eventos'`]** → The field is always `'eventos'` today (per entity), so the `categoriaId + createdAt DESC` index is near-dead weight. Kept for contract completeness with `findAllAdmin`'s filter surface; not a correctness risk.

## Migration Plan

This change is an additive backend ship — no destructive migration steps.

1. **Order of ship** (matches `tasks.md`):
   - T1: docs + OpenSpec specs (SDD pre-code).
   - T2: `PlacesController.update`/`remove` guards + `PlacesService` ownership checks (TDD red → green).
   - T3: `PlacesModule` stub removal + `SolicitudesModule` direct import wiring (TDD red → green: `SOLICITUDES_REPOSITORY` resolves to `SolicitudesFirestoreAdapter`, persisted solicitud id ≠ `"stub"`, delete guard reads real repo).
   - T4: `SolicitudesService.assertXorConstraint` (TDD red → green).
   - T5: `firestore.indexes.json` + `docs/data-model.md` index alignment.
   - T6: verify + coverage + lint + e2e canonical scenarios.
2. **Rollback strategy**: each step is reverse-exact — re-add the stub provider + revert controller/service guards restores prior behavior. Because there are no live frontend consumers, a rollback at any step is silent.
3. **Verification gates**: `npm --prefix backend test` (coverage ≥ 90% on touched modules) + `npm --prefix backend run lint` (SOLID thresholds) + `npm --prefix backend run build` + `openspec validate places-auth-fix` + `/verify places-auth-fix` before `/archive`.
4. **Post-ship**: no seed impact (`npm run seed` populates `categorias` + `barrios` only). No env/config changes.

## Open Questions

- **Q1**: Should the future admin queue list `solicitudes` by `status` + `createdAt DESC` (index staged now) or by `revisadoAt`? Deferred to the panel-admin change; the staged index supports the common "pending queue" query.
- **Q2**: When the frontend discovery UI ships, does it filter `eventos` by multiple optional filters simultaneously (`barrioId` + `subcategoriaId` + `precioTipo`)? If yes, cross-product indexes are required before that query ships (flagged in Risk).
- **Q3**: Should `categorias: activa + orden` and `barrios: tipo` indexes stay in `firestore.indexes.json` while the modules are commented out in `app.module.ts`? Current answer: yes — they are canonical in `docs/data-model.md` and staging them avoids a future deploy. Re-confirm when `categorias`/`barrios` modules ship.
- **Q4**: The `categoriaId` on `eventos` is always `'eventos'` (entity comment). Should the admin-list filter surface drop `categoriaId` entirely, or keep it for future multi-category event taxonomies? Deferred — kept for contract completeness.
