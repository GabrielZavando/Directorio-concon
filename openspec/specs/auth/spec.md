# auth Specification

## Purpose
TBD - created by archiving change auth-usuarios. Update Purpose after archive.
## Requirements
### Requirement: Firebase Auth JWT verification on protected endpoints
The JWT verification, `AuthContext` construction, rol resolution order (custom claim → Firestore fallback), and `401/403` semantics SHALL remain as previously specified; this change adds no new guard.

**Aclaración del change**: the `AuthContext.placeId?` field sourced from `usuarios.placeId` MUST no longer be populated (the field is removed from the entity). Guards and consumers that read `AuthContext` SHALL rely on `uid` + `rol` only; the user→place relation MUST be queried from `places.usuarioId`.

#### Scenario: Owner recién registrado accede a endpoints protegidos
- **GIVEN** a user registered via `POST /auth/registro` with `rol: 'owner'` (no `placeId` anywhere)
- **WHEN** the user calls `POST /api/v1/places` with their Bearer token
- **THEN** the `JwtAuthGuard` resolves `rol: 'owner'` from the `usuarios` document and the request proceeds
- **AND** the created place gets `usuarioId: <uid>` — the relation is established from the place side

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

### Requirement: Self-registration público con selección de rol
The system SHALL expose a public endpoint `POST /api/v1/auth/registro` (decorated `@Public()`) that creates a Firebase Auth user and its corresponding `usuarios/{uid}` Firestore document atomically from the caller's perspective. The request body SHALL be `RegisterDto`:

- `email: string` — valid email format
- `password: string` — minimum 8 characters
- `nombre: string` — 2..100 characters
- `rol: 'member' | 'owner'` — the ONLY values accepted; `'admin'` MUST be rejected with `400 Bad Request`

On success the endpoint SHALL respond `201` with `{ uid, email, rol, nombre }`. If the email already exists in Firebase Auth, the endpoint SHALL respond `409 Conflict`.

If the Firestore write fails after the Firebase Auth user was created, the system SHALL delete the orphaned Auth user (compensating rollback) and SHALL respond `500` with a logged error containing the `uid` for manual audit.

The field `usuarios.placeId` SHALL NOT be created for any rol — the caller supplies no place reference, and the entity no longer carries the field (see `usuarios` delta).

#### Scenario: Registro exitoso como member
- **GIVEN** no Firebase Auth user exists with email `maria@example.com`
- **WHEN** a client sends `POST /api/v1/auth/registro` with `{ email: 'maria@example.com', password: 'secreta123', nombre: 'María Pérez', rol: 'member' }`
- **THEN** the response is `201` with `{ uid, email: 'maria@example.com', rol: 'member', nombre: 'María Pérez' }`
- **AND** a Firebase Auth user exists with that email and `displayName: 'María Pérez'`
- **AND** a Firestore document `usuarios/{uid}` exists with `{ email, nombre, rol: 'member' }` and NO field `placeId`

#### Scenario: Registro exitoso como owner (sin place asociado)
- **GIVEN** no Firebase Auth user exists with email `dueño@example.com`
- **WHEN** a client sends `POST /api/v1/auth/registro` with `{ email: 'dueño@example.com', password: 'secreta123', nombre: 'Dueño Local', rol: 'owner' }`
- **THEN** the response is `201` with `rol: 'owner'`
- **AND** the `usuarios` document is created WITHOUT `placeId` (an owner exists before owning any place; the relation is resolved later via `places.usuarioId`)

#### Scenario: Registrar rol admin es rechazado
- **WHEN** a client sends `POST /api/v1/auth/registro` with `{ email: 'x@example.com', password: 'secreta123', nombre: 'X', rol: 'admin' }`
- **THEN** the response is `400 Bad Request` (whitelist validation rejects the enum value)
- **AND** no Firebase Auth user nor `usuarios` document is created

#### Scenario: Email duplicado retorna 409
- **GIVEN** a Firebase Auth user already exists with email `maria@example.com`
- **WHEN** a client sends `POST /api/v1/auth/registro` with that email and any valid payload
- **THEN** the response is `409 Conflict`
- **AND** no second `usuarios` document is created

#### Scenario: Fallo de Firestore dispara rollback de Auth
- **GIVEN** the Firebase Auth `createUser` succeeds for `pedro@example.com` returning `uid-123`
- **AND** the `usuarios` repository write fails (e.g., Firestore unavailable)
- **WHEN** `registerWithRole` processes the request
- **THEN** the system calls `admin.auth().deleteUser('uid-123')`
- **AND** the response is `500` and the error log includes `uid-123`

#### Scenario: Password corto es rechazado
- **WHEN** a client sends `POST /api/v1/auth/registro` with `password: 'short'`
- **THEN** the response is `400 Bad Request`
- **AND** the error message references the minimum length of 8

