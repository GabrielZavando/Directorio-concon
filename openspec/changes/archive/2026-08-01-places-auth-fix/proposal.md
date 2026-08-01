## Why

The `auth-usuarios` change (archived 2026-07-31) closed the three documented authentication debts on the **create** flows (`POST /places`, `POST /eventos`, `solicitudes` approve/reject). A follow-up audit of the runtime wiring found three remaining blockers that keep the `places` + `solicitudes` domain divergent from its canonical model:

1. **`PUT /places/:id` and `DELETE /places/:id` have no auth guards.** `places.controller.ts:129-152` exposes both mutations unauthenticated; `update` still writes `usuarioId = "anonymous"` (line 136, a leftover stub from the `roles-rename` debt) and `remove` accepts no actor at all. The canonical `places` spec requires "only the owner (publisher with matching `usuarioId`) or an admin may update" and owner-or-admin for delete — but there is no runtime check: any anonymous caller can mutate or delete any place.
2. **`PlacesModule` wires a `StubSolicitudesRepository`** (`places.module.ts:27-37`) that returns `{ id: "stub" }` on create and `existsByPlaceId → false` always. Real solicitudes are never persisted for places, and the delete guard can never trigger. The real `SolicitudesModule` already exists and exports `SOLICITUDES_REPOSITORY` + `SolicitudesService`; the stub shadows it.
3. **The XOR invariant (`placeId` ⊕ `eventoId`) is documented but not enforced.** `solicitud.entity.ts:5` declares the rule and the `solicitudes` spec contains a "Reject solicitud with both placeId and eventoId set" scenario, but `SolicitudesService.create` / `createEventoSolicitud` persist whatever they receive without validating that exactly one reference is present.

Additionally, the Firestore index staging file (`firestore.indexes.json`) diverges from both the queries executed by the adapters and the canonical list in `docs/data-model.md §Índices Firestore requeridos`: `solicitudes: placeId + status` (queried by `existsByPlaceId`), the public `eventos` composite indexes (`status + estado + fechaInicio` + optional filters), the admin `eventos` indexes (`categoriaId/subcategoriaId/barrioId/estado + createdAt DESC`), and the forward-declared `categorias`/`barrios` indexes are missing. Without these composite indexes, Firestore rejects the queries at runtime.

Deferring any of these keeps `places` and `solicitudes` in a known-broken state: unauthenticated mutation, non-persistent solicitudes, and query failures in production.

## What Changes

- **`PlacesController.update` + `remove`** — add `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')`, read the actor from `@CurrentUser() user: AuthContext`, and pass it to the service. Remove the `usuarioId = "anonymous"` stub in `update` (line 136).
- **`PlacesService.update` / `delete`** — enforce ownership: `if (actor.rol !== 'admin' && existing.usuarioId !== actor.uid)` → `403 Forbidden`. Signature becomes `update(id, dto, actor: AuthContext)` and `delete(id, actor: AuthContext)` (respects `max-params ≤ 3`, avoiding the `eventos.service` 4-param debt pattern). Owners only modify their own place; admins can modify any.
- **`PlacesModule`** — remove `StubSolicitudesRepository` (lines 27-37) and its `SOLICITUDES_REPOSITORY` provider override; import the real `SolicitudesModule` via a **direct import** (no `forwardRef` — the module graph has no circular dependency). The real `SOLICITUDES_REPOSITORY` (exported by `SolicitudesModule`) now serves `PlacesService`, so place solicitudes persist and the delete guard reads real state.
- **`SolicitudesService.create` / `createEventoSolicitud`** — enforce the XOR invariant before persistence via a private `assertXorConstraint`: exactly one of `placeId`/`eventoId` must be present, and it must match the `tipo`. Violations → `400 BadRequestException` with a domain message. Input types widen to the domain shape (`placeId?: string; eventoId?: string`) so the invariant is expressible and testable at the service boundary.
- **`firestore.indexes.json` + `docs/data-model.md §Índices`** — add the composite indexes actually required by the adapters and the canonical model: `solicitudes: placeId + status`, `solicitudes: status + createdAt DESC` (forward-looking admin queue), `eventos: status + estado + fechaInicio` (+ `subcategoriaId`/`barrioId`/`precioTipo` variants), `eventos: categoriaId/subcategoriaId/barrioId/estado + createdAt DESC` (admin list), `categorias: activa + orden`, `barrios: tipo`. Update the docs index list to match.
- **`docs/api-spec.yml`** — `PUT /places/{id}` and `DELETE /places/{id}`: remove the "fine-grained guards deferred to a future `places-clean-arch-refactor`" caveat; document the now-live `owner`/`admin` ownership rule and the `403` response.
- **No data migration**: the `solicitudes` collection already exists; places created after this change persist real solicitudes. Existing places created during the stub era have no solicitudes — their delete path is unblocked, which is consistent with the real-repo semantic (delete blocked only while a pending solicitud exists).

## Capabilities

### Modified Capabilities
- `places`: "Update place" and "Delete place" requirements transition from "documented ownership rule, no runtime enforcement" to "enforced at runtime" — `@Roles('owner', 'admin')` on both mutations, `403` for non-owner/non-admin, and the `"anonymous"` stub removed from `update`. "Solicitud auto-creation on place create" gains real persistence (the stub is replaced by the real `SOLICITUDES_REPOSITORY`).
- `solicitudes`: the "Solicitud entity schema" XOR invariant transitions from "documented in a comment + a spec scenario" to "enforced by `SolicitudesService.assertXorConstraint` before persistence" — both `create` and `createEventoSolicitud` reject invalid references with `400`.
- `api-contract`: `PUT /places/{id}` / `DELETE /places/{id}` are now declared as `owner`/`admin`-gated in the runtime contract (the `docs/api-spec.yml` "deferred to `places-clean-arch-refactor`" caveat is removed).

## Impact

- **Code**:
  - `backend/src/modules/places/infrastructure/places.controller.ts` — guards + `@CurrentUser()` on `update`/`remove`, `"anonymous"` stub removed.
  - `backend/src/modules/places/application/places.service.ts` — ownership checks in `update`/`delete`, actor signature.
  - `backend/src/modules/places/places.module.ts` — stub removed, `SolicitudesModule` imported (direct import).
  - `backend/src/modules/solicitudes/application/solicitudes.service.ts` (+ interface) — `assertXorConstraint`, widened input types.
  - `firestore.indexes.json` — 9+ composite indexes added.
- **APIs**: `PUT /places/{id}` and `DELETE /places/{id}` now return `401` (no token), `403` (non-owner/non-admin), `404` (not found), `409` (delete with pending solicitud / slug duplicate on rename). No path or payload shape changes — the break is purely the new auth requirement, and there are no live frontend consumers.
- **Documentation**: `docs/api-spec.yml` (PUT/DELETE places security + ownership semantics), `docs/data-model.md` (index list alignment).
- **Specs**: `openspec/specs/{places,solicitudes,api-contract}/spec.md` updated via this change's archive.
- **Dependencies**: no new runtime or dev dependency — `AuthModule` (guards) and `SolicitudesModule` already exist in the monorepo.
- **Tests**: amended unit tests for `places.controller` (owner/admin/member/anonymous on PUT/DELETE), `places.service` (ownership 403s), `solicitudes.service` (XOR rejections), plus new DI-graph coverage for the real solicitudes repo. Coverage target ≥ 90% on touched modules.
- **Risk**: low — no live frontend consumers; the `SolicitudesModule` wiring is a plain one-directional module import (verified no circular dependency at implementation time). The one semantic correction surfaced by the real repo is documented in `design.md` (delete-blocked semantics: pending-only, consistent with `eventos.remove`).
