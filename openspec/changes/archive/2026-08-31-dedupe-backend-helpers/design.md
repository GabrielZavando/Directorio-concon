## Context

Post SOLID-lint cleanup, three duplication clusters remain (verified by grep):
- Ownership check `rol !== "admin" && existing.usuarioId !== usuarioId` inlined
  twice in `eventos.service.ts` (update + delete); places has its own
  `assertOwnership(place, actor, action)` helper.
- "Not found" throws: 5× `Evento ${id} no encontrado`, 4× `Place ${id} no
  encontrado`, 3× `Barrio no encontrado: ${id}` in the barrios service **and**
  3× more in the barrios Firestore adapter (double check across layers).
- `imagenes.vo.ts` / `valoracion-google.vo.ts` contain governing validation
  rules with no dedicated unit specs.
- `places.service.ts` is at the 300-line threshold; it mixes public reads
  (`search`, `findForMap`, `findBySlug`, `findById`, `abiertoAhora`) with
  writes (`createPlace`, `update`, `delete`).

## Goals / Non-Goals

**Goals:**
- One shared place for cross-aggregate assertions (`common/utils/assertions.ts`).
- Remove duplicated ownership + not-found logic without changing HTTP
  contracts or Nest exception types (`NotFoundException`/`ForbiddenException`).
- Add unit specs for both VOs, locking current validation behavior.
- Bring `places.service.ts` (writes) and the new `places-query.service.ts`
  (reads) well under the 300-line threshold.

**Non-Goals:**
- A full policy/ability framework (CASL-like) — overkill for 2 resource types.
- Refactoring the adapter-level existence check in barrios away *entirely*
  (repository-level contract stays; only its throw expression is unified).
- Frontend or CI changes (covered by `solid-lint-ci-gate`).

## Decisions

### D1 — Assertions module location and API
`backend/src/common/utils/assertions.ts` exporting pure functions:

```ts
export function assertFound<T>(resource: T | null | undefined, label: string, id: string): T;
// throws NotFoundException(`${label} ${id} no encontrado`) and returns resource (narrowed)

export function assertOwnerOrAdmin(actor: { uid: string; rol: string }, ownerId: string, action: string): void;
// rol === "admin" || actor.uid === ownerId, else
// ForbiddenException(`No tienes permiso para ${action}`)
```

**Rationale:** `common/utils` is framework-light, easy to unit test, and both
modules can import it. Message templates are centralized so future wording
changes are single-point. `assertFound` narrows the type so call sites keep a
clean `const doc = assertFound(await repo.findById(id), "Evento", id)`.

### D2 — Eventos slug message preserved
`findBySlugPublic` / `findBySlug` throw `Evento con slug '${slug}' no
encontrado`. Those two single-site messages stay inline (the helper is for the
id-based repetition). No behavior change, no spec churn.

### D3 — Barrios message standardization
Unify to `"Barrio ${id} no encontrado"` in both service and adapter. The barrios
spec assertions expecting the legacy `"Barrio no encontrado"` substring are
updated. **Intentional, documented behavior change** (message text only; HTTP
code/body shape unchanged).

### D4 — places.service read/write split
New `PlacesQueryService` (application layer) with the 5 read methods,
registered in `places.module.ts` and injected into `places.controller.ts`
alongside `PlacesService`. `PlacesService` keeps the 3 write methods and the
solicitudes/catalog interactions. Controller spec gets an additional mock
provider; no routing or DTO changes.

**Why not CQRS event sourcing / command bus:** only object shape + wiring
change; no behavior presumption. It is the minimal split that restores
headroom against the 300-line gate.

### D5 — TDD order within the change
Each helper lands spec-first: write `assertions.spec.ts` (red), then implement
(green), then migrate call sites with existing suite keeping green. VO specs
read current logic and encode it characterisation-style: tests must describe
_current_ accepted/rejected inputs (no “improved” validation semantics).

## Risks / Trade-offs

- **[Risk]** Changing barrios messages breaks any consumer relying on that
  exact Spanish string. → Mitigation: internal SPA only; documented in
  proposal and PR description; specs updated in the same commit.
- **[Risk]** `PlacesQueryService` split may drift mocks and provider wiring.
  → Mitigation: single commit per module migration; full suite verification
  step at the end of group 3 tasks.
- **[Trade-off]** Shared helpers introduce a cross-module import. Accepted:
  helpers depend on `@nestjs/common` exceptions only; no new runtime deps.
