# backend-env-align Specification

## Purpose
TBD - created by archiving change firebase-config. Update Purpose after archive.
## Requirements
### Requirement: backend-env-align

The backend `.env` SHALL reflect the real Firebase project identifiers while keeping Firebase disabled, so the configuration stays consistent with the real project without enabling the Admin SDK.

#### Scenario: Real project identifiers are set

- **WHEN** the backend `.env` is loaded
- **THEN** `FIREBASE_PROJECT_ID` equals `directorioconcon` and `FIREBASE_STORAGE_BUCKET` equals `directorioconcon.firebasestorage.app`

#### Scenario: Firebase remains disabled without a service account

- **WHEN** the backend starts without an Admin service-account key
- **THEN** `FIREBASE_ENABLED` equals `false` and the backend starts without initializing the Firebase Admin SDK

### Requirement: Functional seed and migrate scripts in backend

The backend `package.json` SHALL declare working `seed` and `migrate` npm scripts backed by real TypeScript files in `backend/scripts/`, replacing the broken references (`ts-node scripts/seed.ts` and `ts-node scripts/migrate.ts` that currently point to non-existent files).

#### Scenario: npm run seed populates categorias and barrios

- **WHEN** the operator runs `npm run seed` in the `backend/` directory with valid Firestore credentials
- **THEN** the script reads the canonical JSON files under `frontend/src/app/shared/data-access/local/data/categorias.json` and `barrios.json`
- **AND** for each entry it writes (via `set(merge:true)` keyed by slug) a document in the `categorias` or `barrios` Firestore collection with `activo: true`
- **AND** the script is idempotent — re-running does not duplicate or error on existing documents
- **AND** subcategorias inside each categoria are written with `activo: true`

#### Scenario: npm run seed creates mock places and eventos

- **WHEN** the operator runs `npm run seed` and the `places` and `eventos` collections are empty
- **THEN** the script writes a set of 20-30 mock `Place` documents and 10-15 mock `Evento` documents with realistic Concón-themed data (mock-generated but valid against all schema rules)
- **AND** each mock place/evento references a valid `categoriaId` and `barrioId` from the seeded catalog
- **AND** the operation writes are idempotent

#### Scenario: npm run audit-refs reports orphan catalog references

- **WHEN** the operator runs `npm run audit-refs` against a populated Firestore
- **THEN** the script scans all `places` and `eventos` documents
- **AND** for each document it verifies that `categoriaId`/`subcategoriaId`/`barrioId` resolve to existing seeded catalog entries
- **AND** it prints a JSON report `{ validos: number, huerfanos: [{ coleccion, docId, campo, valor }] }`
- **AND** exit code is `0` when there are no orphans, `1` when orphans are found

