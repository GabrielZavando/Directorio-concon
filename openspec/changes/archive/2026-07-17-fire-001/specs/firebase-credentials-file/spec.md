## ADDED Requirements

### Requirement: firebase-credentials-file
The backend MUST load the Firebase Admin SDK service-account credential from `firebase-admin.json` at the repository root (or `FIREBASE_ADMIN_CREDENTIALS_PATH`) when present, and auto-enable Firebase when `FIREBASE_ENABLED` is not `"false"`. `FIREBASE_*` env vars become optional (fallback for Docker/CI without the file). The credentials file MUST be excluded from version control.

#### Scenario: Auto-enable when credentials file is present
- **WHEN** `firebase-admin.json` exists at the resolved path and `FIREBASE_ENABLED` is not `"false"`
- **THEN** Firebase initializes via `cert(<file contents>)` and `FirebaseService.isEnabled()` returns `true`

#### Scenario: File precedence over env vars
- **WHEN** `firebase-admin.json` exists and `FIREBASE_*` env vars are also set
- **THEN** the credential object is built from the file; env vars are ignored for the credential

#### Scenario: No credentials → graceful disabled
- **WHEN** no `firebase-admin.json` and no `FIREBASE_*` env creds and `FIREBASE_ENABLED` is not `"true"`
- **THEN** Firebase is disabled, `/health` returns `200` with `services.firebase: "disabled"`, and Firestore endpoints return `503`

#### Scenario: Explicit opt-out
- **WHEN** `FIREBASE_ENABLED=false` (file present or not)
- **THEN** Firebase is disabled

#### Scenario: Enabled but no resolvable credential
- **WHEN** `FIREBASE_ENABLED=true` and neither file nor env creds resolve
- **THEN** a warning is logged and Firebase stays disabled (resilient boot, no crash)

#### Scenario: Secret excluded from git
- **WHEN** the change is applied
- **THEN** `firebase-admin.json` is ignored by git (not staged/committed)
