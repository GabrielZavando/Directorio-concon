# backend-shared-assertions

Capability spec for the shared backend assertion helpers (`assertFound`,
`assertOwnerOrAdmin`) and their roll-out across modules. This spec is the
canonical, merged state of the `dedupe-backend-helpers` and
`backend-helpers-followup` changes.

## Requirements

### Requirement: Shared assertion helpers exist and are unit tested

`backend/src/common/utils/assertions.ts` SHALL export `assertFound` and
`assertOwnerOrAdmin`, each with dedicated unit specs verifying message text,
exception types, and the happy-path narrowing.

#### Scenario: assertFound returns the resource when present
- **WHEN** `assertFound(entity, "Place", "p1")` is called with a non-null value
- **THEN** it returns the value unchanged

#### Scenario: assertFound throws the unified message
- **WHEN** `assertFound(null, "Evento", "e9")`
- **THEN** a `NotFoundException` is thrown with message `"Evento e9 no encontrado"`

#### Scenario: assertOwnerOrAdmin allows owner and admin
- **WHEN** the actor is the resource owner OR has rol `"admin"`
- **THEN** no exception is thrown

#### Scenario: assertOwnerOrAdmin denies others
- **WHEN** the actor is neither owner nor admin
- **THEN** a `ForbiddenException` is thrown with message
  `"No tienes permiso para <action>"`

### Requirement: Modules use the shared assertions without behavior drift

`eventos.service.ts` SHALL replace its two inline ownership checks and repeated
`NotFoundException` throws with the shared helpers; `places.service.ts` SHALL do
the same for ownership. The `places.service.ts` call sites SHALL call the shared
`assertOwnerOrAdmin` with an object literal `{ uid: actor.uid, rol: actor.rol }`
built from the `AuthContext` parameter, and SHALL no longer import the local
`assertOwnership` helper from `places-service.helpers.ts` (which is no longer in
use). Slug-lookup error messages in eventos remain **verbatim**
(`Evento con slug '<slug>' no encontrado`). Message and exception types remain
identical to the prior behavior.

#### Scenario: Eventos endpoints behave as before
- **WHEN** update/delete are attempted by a non-owner non-admin, or on a missing
  evento
- **THEN** the responses are 403/404 with the same messages the existing specs
  assert

#### Scenario: Places authorization unchanged after fix
- **WHEN** an owner or admin calls `update`/`delete` on their place
- **THEN** the request proceeds; a non-owner non-admin still receives 403 with
  `"No tienes permiso para <action>"`; no type or lint errors remain in the
  service file

### Requirement: Barrios not-found handling is unified

`barrios.service.ts` and `barrio-firestore.adapter.ts` SHALL throw the unified
message `"Barrio ${id} no encontrado"` via `assertFound` in the service; the
adapter keeps its own existence check but with the same unified message. The
legacy text `"Barrio no encontrado: ${id}"` is replaced in specs.

#### Scenario: Barrio message standardized
- **WHEN** a missing barrio is updated/activated/deactivated
- **THEN** the response is 404 with `"Barrio <id> no encontrado"` and the
  barrios specs assert the new message

### Requirement: Value objects have characteristic specs

`imagenes.vo.spec.ts` and `valoracion-google.vo.spec.ts` SHALL exist under
`src/modules/places/domain/` and pass against the current implementations
without modifying them.

#### Scenario: specs pass against current logic
- **WHEN** the Jest suite runs
- **THEN** the two new specs are discovered and green
