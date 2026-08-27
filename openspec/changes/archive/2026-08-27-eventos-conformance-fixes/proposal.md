---
name: eventos-conformance-fixes
date: 2026-08-27
---

## Why

The `eventos-refactor` change (CH-04) was adversarial-reviewed after archive and
returned **NO-SHIP**. Two critical bugs and a verification gap make the module
non-functional in production:

1. **Invisible new eventos (critical).** `EventosService.create` persists
   `estado: 'borrador'`, but `findAllPublic` forces `estado: 'programado'` (the
   default list filter). The published spec also states create → `borrador` while
   the list scenario requires `programado` — a self-contradiction. Net effect:
   every freshly created evento is hidden from the public directory.
2. **Crash on update with dates (critical).** `buildEventoPatch` spreads the raw
   `UpdateEventoDto` (`fechaInicio`/`fechaFin` are ISO **strings**). The adapter's
   `toEventoPersistence` calls `dateToTimestamp(date: Date)` →
   `Timestamp.fromDate(string)` throws. Any `PUT /eventos/:id` carrying dates 500s.
3. **Re-verify does not restore visibility (warning → blocker).** `verificar('verificado')`
   does not set `activo: true`; re-verifying a previously rejected (hidden) evento
   leaves it invisible, contradicting its own "now publicly visible" scenario.

## What Changes

- `create` sets `estado: 'programado'` (visible immediately in the default list).
- Migration script writes `estado: 'programado'` and omits null-island coordinates.
- `buildEventoPatch` converts `fechaInicio`/`fechaFin` strings → `Date` at the boundary.
- `verificar('verificado')` sets `activo: true` and clears `motivoRechazoVerificacion`.
- `computeChanges` compares dates by value (avoids spurious `cambios` entries).

## Impact

Backend `eventos` module only. No API field/shape changes. Main spec `eventos`
updated to remove the `borrador`/visible contradiction and the `verificar` activo
contradiction. `docs/api-spec.yml` / `docs/data-model.md` already align with the
corrected behavior.
