# Design — eventos-conformance-fixes

## Root causes

- **Lifecycle default (`estado`).** The refactor intended "eventos visibles
  públicamente inmediatamente", but `create` defaulted `estado` to `'borrador'`
  and the public list filters `estado: 'programado'`. Fix: create as `'programado'`
  (an evento published to the directory is "programado"/upcoming). The list's
  `programado` default is retained — it is the correct visible set.
- **Date boundary conversion.** DTOs carry ISO strings; Firestore timestamps need
  `Date`. `create` already converts, but `update` spread the DTO raw. Fix:
  `buildEventoPatch` converts `fechaInicio`/`fechaFin` to `Date` so the patch is
  correctly typed before persistence. This keeps the app→infra boundary honest
  (the infra `UpdateEventoDto` stays string-typed; conversion happens in the
  application helper, not the controller).
- **Verification visibility.** `verificar('verificado')` must make the evento
  publicly visible, i.e. `activo: true`, and clear any prior rejection reason.

## Decisions

- `create` → `estado: 'programado'` (not a new publish step).
- `buildEventoPatch` explicitly converts the two date fields; all other fields pass
  through unchanged (the app DTO is `Partial<CreateEventoServiceDto>`).
- `verificar` verified branch: `{ estadoVerificacion, fechaPublicacion, activo: true,
  motivoRechazoVerificacion: undefined, updatedAt }`.
- `computeChanges` normalizes `fechaInicio`/`fechaFin` via `getTime()` before diffing
  so a verified-evento edit that only re-sends the same date does not produce a
  spurious `cambios` entry.

## Testing

- Unit: `eventos.service.spec` (create estado, verificar activo),
  `eventos-service.helpers.spec` (buildEventoPatch date conversion, computeChanges
  date normalization).
- Integration: `eventos.integration.spec` pushes a real `UpdateEventoDto` through
  `EventosService.update` → adapter to lock in the date conversion (no 500).
