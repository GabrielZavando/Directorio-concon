## Context

Post-archive verification showed three loose ends from
`dedupe-backend-helpers`:
1. `places.service.ts` calls `assertOwnerOrAdmin(existing, ...)` passing a
   `Place` where `{ uid, rol }` is expected (2 type errors), and keeps the
   unused `assertOwnership` import (lint error).
2. The VO specs for `imagenes.vo.ts` / `valoracion-google.vo.ts` were
   announced but the files do not exist on disk.
3. Barrios not-found unification was never applied.

## Design

### D1 — Places fix is a type adaptation, not a logic change
Current broken call: `assertOwnerOrAdmin(existing, existing.usuarioId, action)`.
Fixed call: `assertOwnerOrAdmin({ uid: actor.uid, rol: actor.rol }, existing.usuarioId, action)`.
Message and exception type are byte-identical to the previous places helper,
so no spec changes are needed.

### D2 — VO specs are characterisation-style
Specs encode the current validation outcomes; implementations are not touched.
Covered: non-object inputs, invalid URLs, gallery limits (3 free / 10
premium), rating range [0, 5], negative reviewsCount, empty mapsLink.

### D3 — Barrios unification keeps the adapter-level check
The repository keeps its own existence contract; both layers now emit exactly
`"Barrio ${id} no encontrado"`. Specs asserting the old message are updated.

### D4 — Places split deferral
`places.service.ts` is 302 total lines but passes the 300-line lint threshold
(skipBlankLines + skipComments). The query/command split remains a documented
follow-up for when the module grows; no new service is created now.

## Risks / Trade-offs

- **[Risk]** Consumers depending on the exact old barrios message text.
  Mitigation: internal SPA; URL/status/shape unchanged; user approved.
- **[Trade-off]** Single final commit mixes CI + refactor concerns. Accepted
  per user preference.
