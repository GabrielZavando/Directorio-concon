## MODIFIED Requirements

### Requirement: firebase-optional-init
The backend MUST be able to boot and serve `/health` without a configured Firebase project. Firebase initializes lazily/optionally. When a credentials file (`firebase-admin.json`) is resolvable and `FIREBASE_ENABLED` is not `"false"`, Firebase auto-enables. When disabled, endpoints requiring Firestore return `503`. `/health` reflects real status (`services.firebase: "disabled"` | `"connected"`). The `Invalid PEM` error and `process.exit(1)` MUST NOT occur on a clean disabled boot.

#### Scenario: Boot sin Firebase (sin credenciales)
- **WHEN** `FIREBASE_ENABLED` is `false` (or absent) and no credentials file/env creds are present
- **THEN** the server listens on `PORT` and `GET /api/v1/health` returns `200` with `services.firebase: "disabled"`
- **AND** the `Invalid PEM formatted message` error and `process.exit(1)` MUST NOT occur

#### Scenario: Auto-enable con archivo de credenciales presente
- **WHEN** `firebase-admin.json` is present and `FIREBASE_ENABLED` is not `"false"`
- **THEN** `FirebaseService.onModuleInit()` initializes the app (`admin.credential.cert` + `admin.initializeApp`) and `GET /api/v1/health` reports `services.firebase: "connected"`

#### Scenario: Explicit opt-out
- **WHEN** `FIREBASE_ENABLED=false`
- **THEN** Firebase is disabled even if a credentials file is present

#### Scenario: Endpoint que requiere Firestore con Firebase deshabilitado
- **WHEN** an endpoint that uses Firestore (e.g. `GET /api/v1/empresas`) is invoked while disabled
- **THEN** the response MUST be `503` with the message `"Firebase is not enabled. Set FIREBASE_ENABLED=true and provide credentials."`

#### Scenario: Credenciales inválidas con Firebase habilitado
- **WHEN** `FIREBASE_ENABLED=true` but the resolved credential is not a valid PEM/service account
- **THEN** the bootstrap MUST fail with a clear Firebase error (fail-fast, current behavior)

### Requirement: firebase-config-flag
The `FIREBASE_ENABLED` variable MUST exist, boolean typed, documented in `.env.example`. Default behavior: when undefined, Firebase enables automatically if a credentials file is resolvable at the standard path; otherwise disabled. `FIREBASE_ENABLED=false` forces disabled. `FIREBASE_ADMIN_CREDENTIALS_PATH` (optional) overrides the credentials file location.

#### Scenario: Valor por defecto (auto-enable si hay archivo)
- **WHEN** `FIREBASE_ENABLED` is not defined and `firebase-admin.json` is resolvable
- **THEN** Firebase is enabled automatically

#### Scenario: Valor por defecto sin archivo
- **WHEN** `FIREBASE_ENABLED` is not defined and no credentials file/env creds exist
- **THEN** Firebase is disabled (boot without Firebase)

#### Scenario: Opt-out explícito
- **WHEN** `FIREBASE_ENABLED=false`
- **THEN** Firebase is disabled regardless of a present credentials file

### Requirement: firebase-setup-docs
`backend/README.md` MUST document both modes and how to obtain a real service account, plus the new `firebase-admin.json` file-based flow.

#### Scenario: Documentación de modos
- **WHEN** a developer reads the README
- **THEN** they MUST find a "Firebase configuration" section with the disabled mode, the enabled mode, and the `firebase-admin.json` file-based flow (steps to generate the service account in Firebase Console)
