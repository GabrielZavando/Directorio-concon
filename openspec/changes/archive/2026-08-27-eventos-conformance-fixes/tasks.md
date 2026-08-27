# Tasks — eventos-conformance-fixes

## 1. Create default estado 'programado'
- [x] 1.1 Write failing test: `EventosService.create` persists `estado: 'programado'` (and public list returns it)
- [x] 1.2 Change `create` to set `estado: 'programado'`
- [x] 1.3 Update migration script to write `estado: 'programado'` and omit null-island coords

## 2. Update date conversion (no crash)
- [x] 2.1 Write failing test: `buildEventoPatch` converts `fechaInicio`/`fechaFin` strings → `Date`
- [x] 2.2 Implement conversion in `buildEventoPatch`
- [x] 2.3 Write failing integration test: `PUT` with dates through `EventosService.update` → adapter does not throw

## 3. verificar restores visibility
- [x] 3.1 Write failing test: `verificar('verificado')` sets `activo: true` and clears `motivoRechazoVerificacion`
- [x] 3.2 Implement in `verificar`

## 4. cambios normalization
- [x] 4.1 Write failing test: `computeChanges` does not emit spurious entries for equal dates
- [x] 4.2 Normalize date comparison in `computeChanges`

## 5. Specs + verification
- [x] 5.1 Update `eventos` main spec (create `estado`, verificar `activo`, update date scenario) via delta
- [x] 5.2 Run `jest src/modules/eventos`, `eslint`, `nest build`, `openspec validate --strict`
