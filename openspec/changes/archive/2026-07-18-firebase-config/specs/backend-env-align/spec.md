## ADDED Requirements

### Requirement: backend-env-align

The backend `.env` SHALL reflect the real Firebase project identifiers while keeping Firebase disabled, so the configuration stays consistent with the real project without enabling the Admin SDK.

#### Scenario: Real project identifiers are set

- **WHEN** the backend `.env` is loaded
- **THEN** `FIREBASE_PROJECT_ID` equals `directorioconcon` and `FIREBASE_STORAGE_BUCKET` equals `directorioconcon.firebasestorage.app`

#### Scenario: Firebase remains disabled without a service account

- **WHEN** the backend starts without an Admin service-account key
- **THEN** `FIREBASE_ENABLED` equals `false` and the backend starts without initializing the Firebase Admin SDK
