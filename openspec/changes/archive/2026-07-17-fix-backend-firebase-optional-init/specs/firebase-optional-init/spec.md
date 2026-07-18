## ADDED Requirements

### Requirement: firebase-optional-init
The backend MUST be able to boot and serve `/health` without a configured Firebase
project, controlled by the `FIREBASE_ENABLED` flag (default `false`).

#### Scenario: Boot sin Firebase habilitado
- **WHEN** `FIREBASE_ENABLED` is `false` (or absent) and the server starts
- **THEN** the server listens on `PORT` and `GET /api/v1/health` returns `200` with
  `services.firebase: "disabled"`
- **AND** the `Invalid PEM formatted message` error and `process.exit(1)` MUST NOT occur

#### Scenario: Boot con Firebase habilitado y credenciales válidas
- **WHEN** `FIREBASE_ENABLED=true` and the Firebase variables are valid
- **THEN** `FirebaseService.onModuleInit()` initializes the app (`admin.credential.cert` +
  `admin.initializeApp`) and `GET /api/v1/health` reports `services.firebase: "connected"`

#### Scenario: Endpoint que requiere Firestore con Firebase deshabilitado
- **WHEN** an endpoint that uses Firestore (e.g. `GET /api/v1/empresas`) is invoked while
  `FIREBASE_ENABLED=false`
- **THEN** the response MUST be `503` with the message
  `"Firebase is not enabled. Set FIREBASE_ENABLED=true and provide credentials."`

#### Scenario: Credenciales inválidas con Firebase habilitado
- **WHEN** `FIREBASE_ENABLED=true` but `FIREBASE_PRIVATE_KEY` is not a valid PEM
- **THEN** the bootstrap MUST fail with a clear Firebase error (fail-fast, current behavior)

### Requirement: firebase-config-flag
The `FIREBASE_ENABLED` variable MUST exist, documented in `.env.example`, boolean typed,
with default `false`.

#### Scenario: Valor por defecto
- **WHEN** `FIREBASE_ENABLED` is not defined
- **THEN** it MUST behave as `false` (backend boots without Firebase)

### Requirement: firebase-setup-docs
`backend/README.md` MUST document both modes and how to obtain a real service account.

#### Scenario: Documentación de modos
- **WHEN** a developer reads the README
- **THEN** they MUST find a "Firebase configuration" section with the disabled mode and the
  enabled mode (steps to generate the service account in Firebase Console)
