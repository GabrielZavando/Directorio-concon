# auth Specification (delta — auth-usuarios-v2)

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Firebase Auth JWT verification on protected endpoints
The JWT verification, `AuthContext` construction, rol resolution order (custom claim → Firestore fallback), and `401/403` semantics SHALL remain as previously specified; this change adds no new guard.

**Aclaración del change**: the `AuthContext.placeId?` field sourced from `usuarios.placeId` MUST no longer be populated (the field is removed from the entity). Guards and consumers that read `AuthContext` SHALL rely on `uid` + `rol` only; the user→place relation MUST be queried from `places.usuarioId`.

#### Scenario: Owner recién registrado accede a endpoints protegidos
- **GIVEN** a user registered via `POST /auth/registro` with `rol: 'owner'` (no `placeId` anywhere)
- **WHEN** the user calls `POST /api/v1/places` with their Bearer token
- **THEN** the `JwtAuthGuard` resolves `rol: 'owner'` from the `usuarios` document and the request proceeds
- **AND** the created place gets `usuarioId: <uid>` — the relation is established from the place side
