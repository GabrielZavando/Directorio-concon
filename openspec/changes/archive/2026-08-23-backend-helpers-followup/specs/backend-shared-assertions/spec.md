## MODIFIED Requirements

### Requirement: Modules use the shared assertions without behavior drift

The `places.service.ts` call sites SHALL call the shared `assertOwnerOrAdmin`
with an object literal `{ uid: actor.uid, rol: actor.rol }` built from the
`AuthContext` parameter, and SHALL no longer import the local
`assertOwnership` helper from `places-service.helpers.ts` (which is no longer
in use). Message and exception type remain identical to the prior behavior.

#### Scenario: Place authorization unchanged after fix
- **WHEN** an owner or admin calls `update`/`delete` on their place
- **THEN** the request proceeds; a non-owner non-admin still receives 403 with
  `"No tienes permiso para <action>"`; no type or lint errors remain in the
  service file

### Requirement: Barrios not-found handling is unified

`barrios.service.ts` and `barrio-firestore.adapter.ts` SHALL throw the unified
message `"Barrio ${id} no encontrado"` via `assertFound`; the adapter-level
check is preserved. The legacy text `"Barrio no encontrado: ${id}"` is
replaced in specs.

#### Scenario: Barrio message standardized
- **WHEN** a missing barrio is updated/activated/deactivated
- **THEN** the response is 404 with `"Barrio <id> no encontrado"` and the
  barrios specs assert the new message

### Requirement: Value objects have characteristic specs (roll-out completion)

`imagenes.vo.spec.ts` and `valoracion-google.vo.spec.ts` SHALL exist under
`src/modules/places/domain/` and pass against the current implementations
without modifying them.

#### Scenario: specs pass against current logic
- **WHEN** the Jest suite runs
- **THEN** the two new specs are discovered and green

## REMOVED Requirements

### Requirement: Places service is split into query and write services

**Reason**: Deferred. `places.service.ts` passes the lint threshold; the split
is revisited when the module grows. Recorded as an explicit product decision.
**Migration**: none — the service stays as is; no new `PlacesQueryService` is
created in this batch.
