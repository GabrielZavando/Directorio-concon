# api-contract Specification (delta — places-auth-fix)

## MODIFIED Requirements

### Requirement: `bearerAuth` security applied to protected paths
The system SHALL declare the `bearerAuth` security scheme (already defined in `docs/api-spec.yml`) as the security requirement on every protected path, and SHALL leave it absent on the anonymous-accessible discovery paths. The OpenAPI contract reflects the runtime enforcement introduced by the `auth` module's `JwtAuthGuard` + `RolesGuard` composition.

Protected paths (require `bearerAuth`):
- `POST /api/v1/places` (rol `'owner'` — enforced by `RolesGuard`)
- `PUT /api/v1/places/{id}` (rol `'owner'` or `'admin'`)
- `DELETE /api/v1/places/{id}` (rol `'owner'` or `'admin'`)
- `POST /api/v1/eventos` (rol `'owner'` or `'admin'`)
- `PUT /api/v1/eventos/{id}` (rol `'owner'` or `'admin'`)
- `DELETE /api/v1/eventos/{id}` (rol `'owner'` or `'admin'`)
- `GET /api/v1/usuarios/me` (any authenticated role: `'admin'`, `'owner'`, `'member'`)
- `PUT /api/v1/usuarios/me` (any authenticated role: `'admin'`, `'owner'`, `'member'`)
- `GET /api/v1/usuarios` (rol `'admin'` — list all users)
- `GET /api/v1/usuarios/{uid}` (rol `'admin'`)
- `POST /api/v1/usuarios` (rol `'admin'`)
- `PUT /api/v1/usuarios/{uid}/rol` (rol `'admin'`)
- `POST /api/v1/solicitudes/{id}/approve` (rol `'admin'`)
- `POST /api/v1/solicitudes/{id}/reject` (rol `'admin'`)

Anonymous-accessible paths (no `bearerAuth`, no role required — public discovery flow Flujo 2):
- `GET /health`
- `GET /api/v1/places`
- `GET /api/v1/places/slug/{slug}`
- `GET /api/v1/places/map-data`
- `GET /api/v1/places/{id}/abierto-ahora`
- `GET /api/v1/places/{id}` (by-id is anonymous for MVP; admins querying `status` would require auth, but that filter surface is out of scope for this change — already-documented in `places` spec)
- `GET /api/v1/eventos`
- `GET /api/v1/eventos/map-data`
- `GET /api/v1/eventos/{id}`
- `GET /api/v1/eventos/slug/{slug}`

**Runtime completion for `PUT`/`DELETE /places/{id}`**: the `docs/api-spec.yml` declarations for `PUT /places/{id}` and `DELETE /places/{id}` previously carried the caveat "fine-grained `owner`/`admin` guards introduced by a future `places-clean-arch-refactor` change". This change removes that caveat: both mutations are now gated at runtime by `@Roles('owner', 'admin')`, with the ownership rule (owners only their own place, admins any) enforced by `PlacesService`. The `403` response is documented on both operations.

#### Scenario: OpenAPI description lists bearerAuth on protected POST endpoints
- **WHEN** a stakeholder opens `docs/api-spec.yml`
- **THEN** the `POST /api/v1/places`, `POST /api/v1/eventos`, `POST /api/v1/solicitudes/{id}/approve`, `POST /api/v1/usuarios`, etc. declare `security: [{ bearerAuth: [] }]` at the operation level
- **AND** the `GET /api/v1/places`, `GET /api/v1/eventos`, `GET /api/v1/places/map-data`, `GET /api/v1/eventos/map-data`, etc. declare `security: []` at the operation level (anonymous-accessible)

#### Scenario: OpenAPI description lists bearerAuth on PUT and DELETE places
- **WHEN** a stakeholder opens `docs/api-spec.yml`
- **THEN** `PUT /api/v1/places/{id}` and `DELETE /api/v1/places/{id}` declare `security: [{ bearerAuth: [] }]` at the operation level
- **AND** their descriptions document the `owner`/`admin` ownership rule (owner only their own place, admin any) and a `403` response — with NO reference to a deferred `places-clean-arch-refactor` change

#### Scenario: Runtime returns 403 for non-owner on PUT /places/{id}
- **GIVEN** an authenticated `owner` whose UID does not match the place's `usuarioId`
- **WHEN** the owner sends `PUT /api/v1/places/{id}` with `Authorization: Bearer <idToken>`
- **THEN** the response is `403` with error: `No tienes permiso para modificar este lugar`
- **AND** the place document is unchanged

#### Scenario: Runtime returns 403 for member on DELETE /places/{id}
- **GIVEN** an authenticated user with `rol: 'member'`
- **WHEN** the member sends `DELETE /api/v1/places/{id}` with `Authorization: Bearer <idToken>`
- **THEN** the response is `403` with error: `rol 'member' is not allowed to perform this operation`
- **AND** the place document is NOT removed

#### Scenario: Frontend OpenAPI generator emits authenticated client for protected paths
- **WHEN** a frontend generates a TypeScript client from `docs/api-spec.yml`
- **THEN** the generated client's `createPlace`, `createEvento`, `approveSolicitud`, `updatePerfil`, `updatePlace`, `deletePlace`, etc. functions type-require an `Authorization` header (or a configurable token)
- **AND** the generated `listPlaces`, `listEventos`, `getEventoBySlug`, etc. functions do NOT require authentication
