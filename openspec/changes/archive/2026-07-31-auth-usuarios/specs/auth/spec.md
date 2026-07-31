# auth Specification (delta — auth-usuarios)

## ADDED Requirements

### Requirement: Firebase Auth JWT verification on protected endpoints
The system SHALL verify the Firebase Auth `idToken` carried in the `Authorization: Bearer <idToken>` header on every endpoint decorated with `@UseGuards(JwtAuthGuard)` (or any guard composed with `JwtAuthGuard`). Verification is performed by `FirebaseService.verifyIdToken` (delegating to `admin.auth().verifyIdToken`). On success the guard SHALL attach an `AuthContext` value object to `request.user` containing `{ uid, email, rol, placeId? }`. On any verification failure (invalid signature, expired, revoked, malformed) the guard SHALL short-circuit with `401 Unauthorized` and SHALL NOT proceed to the route handler.

The `rol` resolution order is:
1. Read `decodedIdToken.rol` (Firebase custom claim). If present and a valid `Rol`, use it.
2. Otherwise, look up the `usuarios` document with `id === decodedIdToken.uid` and read `rol`.
3. If neither resolves a valid `Rol`, the guard SHALL respond `403 Forbidden` with error: `user has not been provisioned in the usuarios collection` (this happens when a Firebase Auth user exists but no `usuarios` document has been created yet — the fix is an admin-created `usuarios` record, not an auto-create on first request, to prevent privilege escalation via self-registration).

The Firestore rol lookup (step 2) is cacheable via the global `CacheModule` (Redis with in-memory fallback) keyed by `auth:rol:<uid>` with a short TTL (60s default — configurable). Cache invalidation is implicit on any `PUT /usuarios/:uid/rol` mutation (the admin endpoint writes-through).

#### Scenario: Valid token populates AuthContext on request.user
- **GIVEN** a Firebase Auth user with UID `uid-owner-001` and a custom claim `{ rol: 'owner' }`
- **WHEN** the user sends `POST /api/v1/places` with `Authorization: Bearer <valid idToken>`
- **THEN** the `JwtAuthGuard` verifies the token via `verifyIdToken` and attaches `request.user = { uid: 'uid-owner-001', email: '<email>', rol: 'owner' }`
- **AND** the request proceeds to the `PlacesController.create` handler
- **AND** the place's `usuarioId` is set to `'uid-owner-001'` (no longer the `"anonymous"` stub)

#### Scenario: Token without custom claim falls back to usuarios collection
- **GIVEN** a Firebase Auth user with UID `uid-owner-002` and no custom claim `rol`
- **AND** a `usuarios` document with `id: 'uid-owner-002'`, `rol: 'owner'`
- **WHEN** the user sends `POST /api/v1/places` with `Authorization: Bearer <valid idToken>`
- **THEN** the `JwtAuthGuard` reads no `rol` on the decoded token, looks up `usuarios/uid-owner-002`, reads `rol: 'owner'`, and attaches `request.user.rol = 'owner'`
- **AND** the request proceeds normally

#### Scenario: Token referencing a user with no usuarios document returns 403
- **GIVEN** a Firebase Auth user with UID `uid-orphan-001` and no custom claim `rol`
- **AND** no `usuarios` document with `id: 'uid-orphan-001'`
- **WHEN** the user sends `POST /api/v1/places` with `Authorization: Bearer <valid idToken>`
- **THEN** the response is `403` with error: `user has not been provisioned in the usuarios collection`
- **AND** nothing is persisted (the place is not created)

#### Scenario: Invalid signature token returns 401
- **WHEN** a client sends `Authorization: Bearer <token with invalid signature>`
- **THEN** `verifyIdToken` throws and the guard responds `401 Unauthorized`
- **AND** `request.user` is not attached

#### Scenario: Expired token returns 401
- **WHEN** a client sends `Authorization: Bearer <expired idToken>`
- **THEN** `verifyIdToken` throws and the guard responds `401 Unauthorized`

#### Scenario: Revoked token returns 401
- **GIVEN** a Firebase Auth user whose token has been revoked (e.g., password changed, admin disabled the user)
- **WHEN** the client sends the revoked `idToken` with `Authorization: Bearer ...`
- **THEN** `verifyIdToken` (called with `checkRevoked = true`) throws and the guard responds `401 Unauthorized`

#### Scenario: Missing Authorization header on a protected endpoint returns 401
- **GIVEN** an endpoint decorated with `@UseGuards(JwtAuthGuard)`
- **WHEN** a client sends a request with no `Authorization` header (or with a non-`Bearer` scheme)
- **THEN** the response is `401` with error: `missing or malformed Authorization header`

### Requirement: RolesGuard enforces `@Roles(...)` on endpoints
The system SHALL provide a `RolesGuard` that, when composed with `JwtAuthGuard` on a route, inspects the `@Roles(...)` decorator metadata and rejects requests whose `request.user.rol` is not in the allowed set. The guard SHALL respond `403 Forbidden` with error: `rol '<actual>' is not allowed to <action description>` for any role that does not satisfy the decorator. When `@Roles(...)` is absent, the `RolesGuard` SHALL be a no-op (any authenticated user passes) so that endpoints that only need authentication — but not role-based authorization — still work without a `@Roles` decorator.

The `@Roles(...)` decorator accepts a spread of `Rol` values (`'admin'`, `'owner'`, `'member'`) and is applied at the controller method or controller-class level (method-level wins on conflict). The `@CurrentUser()` parameter decorator resolves `request.user` to an `AuthContext` for handlers that need the authenticated identity (e.g., `eventos.usuarioId = user.uid`).

The `@Public()` decorator SHALL mark an endpoint as exempt from `JwtAuthGuard` when `JwtAuthGuard` is registered as a global guard (the `auth` change does NOT register it globally by default — controllers compose guards explicitly per route — but the `@Public()` decorator is provided for forward-compatibility with a future global-registration change).

#### Scenario: User with allowed role passes the guard
- **GIVEN** a route decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`
- **AND** a request with `request.user.rol = 'admin'`
- **WHEN** the request reaches the `RolesGuard`
- **THEN** the guard passes and the handler executes

#### Scenario: User with disallowed role receives 403
- **GIVEN** a route decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`
- **AND** a request with `request.user.rol = 'owner'`
- **WHEN** the request reaches the `RolesGuard`
- **THEN** the response is `403` with error: `rol 'owner' is not allowed to perform this operation`
- **AND** the handler does not execute

#### Scenario: RolesGuard without @Roles decorator passes any authenticated user
- **GIVEN** a route decorated only with `@UseGuards(JwtAuthGuard, RolesGuard)` (no `@Roles`)
- **AND** a request with `request.user.rol = 'member'`
- **WHEN** the request reaches the `RolesGuard`
- **THEN** the guard passes (the route only requires authentication, not a specific role)

#### Scenario: @CurrentUser() resolves the authenticated user for the handler
- **GIVEN** a handler signature `async create(@Body() dto, @CurrentUser() user: AuthContext)`
- **AND** a request with `request.user = { uid: 'uid-owner-001', rol: 'owner', email: '...', }`
- **WHEN** the handler is invoked
- **THEN** the `user` parameter is bound to the `AuthContext` value object — e.g., `user.uid === 'uid-owner-001'`
- **AND** the handler can persist `evento.usuarioId = user.uid` without further header parsing

### Requirement: AuthContext value object
The system SHALL provide an `AuthContext` value object that represents the authenticated principal travelling on `request.user`. The value object is a readonly TypeScript interface (`{ uid: string; email: string; rol: Rol; placeId?: string }`) defined in `backend/src/modules/auth/domain/auth-context.interface.ts` and contains NO framework imports (pure domain — DIP). The `placeId?` field is REQUIRED to be present when `rol === 'owner'` (the owner's place reference) and MUST be `null`/`undefined` for `'admin'` and `'member'`. The `AuthContext` is constructed by `AuthService.buildContext(decodedToken)` and is NOT constructed directly by guards or handlers (the constructor logic lives in the application layer; the interface lives in the domain).

#### Scenario: AuthContext carries uid, email, rol, and optional placeId
- **GIVEN** a verified `DecodedIdToken` with `uid: 'uid-owner-001'`, `email: 'owner@example.com'`
- **AND** a resolved `rol: 'owner'` and `placeId: 'restaurante-el-marino'`
- **WHEN** `AuthService.buildContext` is invoked
- **THEN** it returns `{ uid: 'uid-owner-001', email: 'owner@example.com', rol: 'owner', placeId: 'restaurante-el-marino' }`

#### Scenario: AuthContext for admin omits placeId
- **GIVEN** a verified `DecodedIdToken` for an admin user
- **WHEN** `AuthService.buildContext` is invoked
- **THEN** the returned `AuthContext` has `rol: 'admin'` and `placeId: undefined`

### Requirement: Auth module wiring and exports
The system SHALL provide an `AuthModule` (`backend/src/modules/auth/auth.module.ts`) that exports the `JwtAuthGuard`, `RolesGuard`, the `@Roles`, `@CurrentUser()`, and `@Public()` decorators, and the `AUTH_CONTEXT_REPOSITORY` token, so that any feature module (`PlacesModule`, `EventosModule`, `SolicitudesModule`, `UsuariosModule`) can compose authentication and authorization on its routes by importing `AuthModule` and applying the decorators.

The `AuthModule` SHALL NOT register `JwtAuthGuard` as a global guard by default — endpoints opt in via explicit `@UseGuards(JwtAuthGuard, RolesGuard)` composition so that the public discovery endpoints (`GET /places`, `GET /eventos`, etc.) remain anonymous-accessible. A `@Public()` decorator is provided for forward-compatibility, but is a no-op in this change (no global registration).

#### Scenario: Feature module imports AuthModule and uses guards
- **GIVEN** the `PlacesModule` imports `AuthModule`
- **WHEN** a developer decorates `PlacesController.create` with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')`
- **THEN** the `POST /places` route enforces JWT verification and `'owner'`-only authorization

#### Scenario: Public discovery routes remain anonymous-accessible
- **GIVEN** the `PlacesController.findAll` (the `GET /places` route) is decorated WITHOUT `@UseGuards(JwtAuthGuard)`
- **WHEN** an anonymous visitor sends `GET /api/v1/places`
- **THEN** the request proceeds without authentication and returns the approved places list
- **AND** no `401` is returned (the discovery flow Flujo 2 in `docs/base-standards.md §8.3` continues to work for anonymous visitors)

### Requirement: Auth module follows Clean Architecture by feature
The `auth` module SHALL be organized following the project's Clean Architecture by feature convention defined in `docs/backend-standards.md`:

- `domain/` contains pure TypeScript interfaces and value objects with zero framework imports: `auth-context.interface.ts` (the `AuthContext` VO), `auth-context-repository.interface.ts` (the role-lookup contract), `auth-context-repository.token.ts` (the DI token).
- `application/` contains the orchestration and NestJS guards/decorators: `auth.service.ts` (orchestrates `verifyIdToken` + role lookup), `jwt-auth.guard.ts`, `roles.guard.ts`, `roles.decorator.ts`, `current-user.decorator.ts`, `public.decorator.ts`. The guards/decorators import only from `domain/` and from `@nestjs/common` (which is framework abstractions, allowed at the application layer).
- `infrastructure/` contains the concrete adapter: `usuarios-rol-lookup.adapter.ts` (implements `AuthContextRepository` using `FirebaseService.getFirestore().collection('usuarios')`).

The `domain/` and `application/` layers SHALL NOT import `firebase-admin`, `FirebaseService`, `class-validator`, or `class-transformer`. All Firebase touchpoints live in `infrastructure/`. This satisfies the DIP rule from `docs/backend-standards.md` ("domain/ and application/ never import infrastructure concrete").

#### Scenario: Auth domain has zero framework imports
- **WHEN** a developer inspects `backend/src/modules/auth/domain/**/*.ts`
- **THEN** no import statement references `@nestjs/*`, `firebase-admin`, `class-validator`, or `class-transformer`
- **AND** every public type is a pure TypeScript interface or type alias

#### Scenario: Auth infrastructure owns the Firebase touchpoint
- **WHEN** a developer inspects `backend/src/modules/auth/infrastructure/usuarios-rol-lookup.adapter.ts`
- **THEN** the file imports `FirebaseService` and `firebase-admin/firestore` types and implements the `AuthContextRepository` interface defined in `domain/`
- **AND** no other file in `auth/` (outside `infrastructure/`) imports `FirebaseService` directly
