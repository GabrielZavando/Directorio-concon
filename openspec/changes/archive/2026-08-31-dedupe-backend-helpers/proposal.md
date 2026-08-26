## Why

Patterns the SOLID-lint cleanup made visible remain duplicated across modules:
owner-or-admin authorization is re-implemented per module (eventos inlines it
twice, places has its own `assertOwnership`), "not found" throws repeat the same
template 5× (eventos) / 4× (places) / 6× (barrios, with service *and* adapter
checking twice), and the `imagenes.vo` / `valoracion-google.vo` value objects
hold non-trivial validation logic with **zero unit tests**. In addition,
`places.service.ts` (302 lines) sits at the max-lines threshold and will exceed
it on the next feature.

## What Changes

- New shared helpers in `backend/src/common/utils/assertions.ts`:
  `assertFound(resource, label, id)` (unified message
  `"${label} ${id} no encontrado"`) and
  `assertOwnerOrAdmin(actor, ownerId, action)` (owner or `admin` rol, else
  `ForbiddenException("No tienes permiso para ${action}")`).
- `eventos.service.ts` replaces its two inline ownership checks with
  `assertOwnerOrAdmin` and its repeated `NotFoundException` throws with
  `assertFound` (slug-lookup variant keeps its existing message verbatim).
- `places.service.ts` replaces local `assertOwnership` usage with the shared
  helper (places helpers re-export it for compatibility or call sites are
  migrated).
- `barrios.service.ts` + `barrio-firestore.adapter.ts` use `assertFound`.
  **Minor behavior change**: barrios not-found message standardizes from
  `"Barrio no encontrado: <id>"` to `"Barrio <id> no encontrado"`; affected
  specs are updated.
- New unit specs: `imagenes.vo.spec.ts` and `valoracion-google.vo.spec.ts`.
- Split `places.service.ts` into `PlacesQueryService` (search, findForMap,
  findBySlug, findById, abiertoAhora) and `PlacesService` (createPlace, update,
  delete); the controller injects both; module providers and specs updated.

## Capabilities

### New Capabilities
- `backend-shared-assertions`: shared domain-level assertion helpers
  (`assertFound`, `assertOwnerOrAdmin`) used consistently across modules,
  value-object test coverage, and the places service read/write split.

### Modified Capabilities

## Impact

- New: `backend/src/common/utils/assertions.ts` (+ spec),
  `backend/src/modules/places/application/places-query.service.ts` (+ spec),
  VO specs.
- Modified: eventos/places/barrios services, barrios adapter, places module +
  controller + their specs (mock wiring).
- Behavior: only the barrios not-found message text changes (documented above).
- `docs/api-spec.yml` unchanged (HTTP contract and error schema unaltered).
