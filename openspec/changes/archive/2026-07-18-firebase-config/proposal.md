## Why

The Directorio Concón platform needs to connect to the real Firebase project (`directorioconcon`). The credentials provided are a **Firebase Web SDK** configuration (public, browser-facing), which belongs to the frontend. The backend already has a Firebase Admin SDK scaffold but it is disabled (`FIREBASE_ENABLED=false`) and requires a separate service-account JSON that was not provided. There is currently **no `frontend/` directory**, so integrating Firebase into the frontend means scaffolding the Angular app with its Firebase initialization.

## What Changes

- A new Angular frontend scaffold (`frontend/`) is created with Firebase Web SDK initialized using the provided real-project config (Auth, Firestore, Storage).
- The backend `.env` is aligned to the real project identifiers (`FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`) while remaining disabled.

## Capabilities

### New Capabilities

- `frontend-firebase-init`: Bootstrap the Angular app with the Firebase Web SDK (Auth/Firestore/Storage) using the real `directorioconcon` project config provided by the user.
- `backend-env-align`: Align backend `.env` Firebase project identifiers to the real project and keep Firebase disabled (no Admin service-account available).

### Modified Capabilities

- (none — no existing requirement changes)

## Impact

- **New code:** `frontend/` Angular 17+ workspace (standalone components), `@angular/fire` + `firebase` dependencies, environment files, `app.config.ts` Firebase providers.
- **Modified config:** `backend/.env` and `backend/.env.example` (project id + storage bucket only).
- **Unchanged:** `docs/api-spec.yml` and `docs/data-model.md` (no API or data-model changes in this change). Backend Firebase service code is untouched.
