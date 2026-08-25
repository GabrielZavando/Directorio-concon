## Why

The archived changes `solid-lint-ci-gate` and `dedupe-backend-helpers` were
archived with some tasks marked complete that were not actually applied.
This change regularizes the real follow-up scope: a broken call site in
`places.service.ts` (type errors + lint errors), missing value-object specs,
and the barrios not-found unification that never landed. The places service
read/write split is explicitly deferred.

## What Changes

- Fix `places.service.ts` ownership calls: pass `{ uid: actor.uid, rol:
  actor.rol }` to `assertOwnerOrAdmin` instead of the `Place` entity; remove
  the now-unused local `assertOwnership` import.
- Add characterisation specs for `imagenes.vo.ts` and
  `valoracion-google.vo.ts`.
- Unify barrios not-found handling: service and adapter use
  `assertFound(existing, "Barrio", id)`; message changes from
  `"Barrio no encontrado: <id>"` to `"Barrio <id> no encontrado"`.
  **Minor behavior change** (message text only), confirmed by the user.
- Defer the places read/write split explicitly (documented decision; the
  service passes the 300-linted-lines threshold today).
- Single commit at the end covering this change plus the already-working
  CI-gate tooling made under `solid-lint-ci-gate`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `backend-shared-assertions`: close out the remaining roll-out (places fix,
  VO specs, barrios unification); record the split deferral.

## Impact

- `backend/src/modules/places/application/places.service.ts` (fix),
  `backend/src/modules/places/domain/*.vo.spec.ts` (new specs),
  `backend/src/modules/barrios/application/barrios.service.ts` +
  `backend/src/modules/barrios/infrastructure/barrio-firestore.adapter.ts`
  (unification) + their specs.
- No HTTP contract or error-shape changes; only the barrios 404 message text.
