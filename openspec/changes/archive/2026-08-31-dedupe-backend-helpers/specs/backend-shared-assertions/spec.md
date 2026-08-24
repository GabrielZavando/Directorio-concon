## ADDED Requirements

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
the same for ownership; slug-lookup error messages in eventos remain
**verbatim** (`Evento con slug '<slug>' no encontrado`).

#### Scenario: Eventos endpoints behave as before
- **WHEN** update/delete are attempted by a non-owner non-admin, or on a missing
  evento
- **THEN** the responses are 403/404 with the same messages the existing specs
  assert

#### Scenario: Places ownership unchanged
- **WHEN** a non-owner non-admin calls `update` or `delete` on a place
- **THEN** the response remains 403 with `"No tienes permiso para <action>"`

### Requirement: Barrios not-found handling is unified

`barrios.service.ts` and `barrio-firestore.adapter.ts` SHALL throw the same
standard text `"Barrio ${id} no encontrado"` via `assertFound` in service; the
adapter keeps its own existence check but with the unified message.

#### Scenario: Barrio message standardized
- **WHEN** a missing barrio is updated/activated/deactivated via the service
- **THEN** the response is 404 with `"Barrio <id> no encontrado"` and the
  affected barrios specs assert the new message

### Requirement: Value objects have characteristic specs

`imagenes.vo.ts` and `valoracion-google.vo.ts` SHALL each have a spec that
encodes the current validation behavior for representative accepted and
rejected inputs (no semantics change).

#### Scenario: specs pass against current logic
- **WHEN** the new VO specs run
- **THEN** they pass without modifying the VO implementations

### Requirement: Places service is split into query and write services

`PlacesQueryService` SHALL own read operations (`search`, `findForMap`,
`findBySlug`, `findById`, `abiertoAhora`); `PlacesService` SHALL own writes
(`createPlace`, `update`, `delete`). Both SHALL be < 300 linted lines and the
controller SHALL inject both while keeping its public API surface unchanged.

#### Scenario: Controller behavior preserved
- **WHEN** the places integration/controller specs run against the split
- **THEN** all previously-green cases remain green

#### Scenario: Lint clean post-split
- **WHEN** `make solid-lint-backend` runs after the split
- **THEN** no max-lines, no-unused-vars, or import-related errors are reported
