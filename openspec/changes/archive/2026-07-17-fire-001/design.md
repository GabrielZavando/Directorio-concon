# Design — fire-001: Integrate backend with Firebase via firebase-admin.json

## Goal

Load Firebase Admin SDK credentials from `firebase-admin.json` (repository root) and
auto-enable Firebase so `EmpresasService` (already coded against
`FirebaseService.getFirestore()`) persists to the **real** Firestore project
`directorioconcon`. Pure wiring — no new API endpoints; `docs/api-spec.yml` and
`docs/data-model.md` are unchanged.

## Current state (baseline)

- `FirebaseService` (`src/common/services/firebase.service.ts`) is fully implemented
  (Firestore/Auth/Storage) with an `enabled` flag and graceful `503` when disabled.
  It is registered in `EmpresasModule` and injected by `EmpresasService`.
- `FirebaseConfig` (`src/config/firebase.config.ts`) builds the service-account
  credential from `FIREBASE_*` env vars and only sets
  `enabled = process.env.FIREBASE_ENABLED === "true"`. It does **not** read the JSON file.
- `EmpresasService` already performs all CRUD against Firestore; it works as soon as
  Firebase is enabled with valid credentials.
- `.env` has `FIREBASE_ENABLED=false` and demo creds. `firebase-admin.json` (real key)
  is at the repo root but is **NOT** gitignored.

## Approach

### 1. Credential resolution (`FirebaseConfig`)

Add a helper `resolveServiceAccount()` that:

1. If `FIREBASE_ADMIN_CREDENTIALS_PATH` is set → resolve (absolute or cwd-relative) and read it.
2. Else probe candidate paths in order:
   - `path.resolve(process.cwd(), 'firebase-admin.json')`
   - `path.resolve(process.cwd(), '..', 'firebase-admin.json')`
   - `path.resolve(__dirname, '..', '..', '..', 'firebase-admin.json')`
     (config dir → repo root; works for both `src/config` and `dist/config`)
3. If a file is found and valid JSON → use it as `serviceAccountKey` (it already matches
   the `service_account` shape expected by `cert()`). Derive
   `storageBucket = <project_id>.firebasestorage.app` (override via `FIREBASE_STORAGE_BUCKET`)
   and optional `databaseURL` (override via `FIREBASE_DATABASE_URL`).
4. If no file → fall back to the existing env-var-constructed object (Docker/CI without the file).
5. Return `{ serviceAccountKey, resolved: boolean }`.

### 2. Enable logic

```ts
const explicit = process.env.FIREBASE_ENABLED;            // 'true' | 'false' | undefined
const credentialsResolved = !!resolved.serviceAccountKey;
const enabled = explicit !== 'false' && credentialsResolved;
```

- `FIREBASE_ENABLED=false` → always disabled (explicit opt-out).
- `FIREBASE_ENABLED` undefined + file present → enabled (auto-enable, per user decision).
- `FIREBASE_ENABLED=true` but no creds → disabled + warn log (resilient boot; no crash).
- No creds + undefined → disabled (preserves current optional-init behavior; `/health` works, `503` on Firestore).

This refines the existing `firebase-optional-init` spec's "default false" wording
(see `specs/firebase-optional-init`).

### 3. Validation (`validation.config.ts`)

Make `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`,
`FIREBASE_STORAGE_BUCKET` optional (remove the `.when('FIREBASE_ENABLED', is:true → required)`).
Add optional `FIREBASE_ADMIN_CREDENTIALS_PATH` (string). Keep
`FIREBASE_ENABLED: Joi.boolean().default(false)`.

### 4. Local env (`.env` / `.env.example`)

- `.env` (gitignored): set `FIREBASE_ENABLED=true`; remove the misleading `demo` Firebase
  creds (the file is the source). Keep `FIREBASE_STORAGE_BUCKET=directorioconcon.firebasestorage.app`
  as an optional override.
- `.env.example`: document `FIREBASE_ADMIN_CREDENTIALS_PATH` and note that
  `firebase-admin.json` at the repo root is the default credential source; `FIREBASE_ENABLED`
  may be omitted (auto-enable).

### 5. Security (`.gitignore`)

Add `firebase-admin.json` and `firebase-*.json` to the root `.gitignore`. Verify with
`git status` that it is no longer listed as untracked. (The key also MUST be rotated in GCP
— manual step, see tasks §9.)

### 6. Tests (TDD)

New `src/config/firebase.config.spec.ts` using a mocked `fs` (or a temp fixture) to assert:

- file present + `FIREBASE_ENABLED` unset → `enabled:true` and `serviceAccountKey` equals file contents.
- file absent + no env creds → `enabled:false`.
- `FIREBASE_ENABLED=false` → `enabled:false` regardless of file.
- file present + env vars present → file wins (env ignored for the credential object).

Existing `firebase.service.spec.ts` is unaffected (it injects a config object). Keep the
`EmpresasService` spec mocking `FirebaseService`.

### 7. Manual validation (Firestore)

Boot with real creds; `POST /api/v1/empresas` → 201; confirm doc in `directorioconcon`
Firestore; `GET` returns it; `solicitudes` doc created. Cannot run in CI without
creds/network → documented as a manual step (tasks §6).

## Out of scope

- Auth module / JWT guard (separate change).
- Storage module beyond what `FirebaseService` already offers.
- Docker secret wiring (deploy change) — only the `FIREBASE_ADMIN_CREDENTIALS_PATH` hook is added.
