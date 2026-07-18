## 1. Frontend Scaffold

- [x] 1.1 Create Angular 17+ workspace (`frontend/`) with standalone bootstrap (`main.ts`, `app.component.ts`, `app.config.ts`)
- [x] 1.2 Add dependencies `@angular/fire` and `firebase` to `frontend/package.json`

## 2. Frontend Firebase Config

- [x] 2.1 Create `environment.ts` and `environment.development.ts` with the provided `firebaseConfig` (real project values)
- [x] 2.2 Configure `fileReplacements` for environments in `angular.json`
- [x] 2.3 Initialize Firebase in `app.config.ts` via `provideFirebaseApp` / `provideAuth` / `provideFirestore` / `provideStorage`

## 3. Frontend Smoke Test (TDD)

- [x] 3.1 Write a unit test asserting `environment.firebase.projectId === 'directorioconcon'` and that `initializeApp(config)` does not throw with the config object
- [x] 3.2 Run the frontend tests and confirm they pass

## 4. Backend Env Alignment

- [x] 4.1 Update `backend/.env`: `FIREBASE_PROJECT_ID=directorioconcon`, `FIREBASE_STORAGE_BUCKET=directorioconcon.firebasestorage.app`, `FIREBASE_ENABLED=false`
- [x] 4.2 Update `backend/.env.example` with the same real project identifiers (kept disabled)
- [x] 4.3 Confirm the backend builds and starts in disabled mode

## 5. Verification & Docs

- [x] 5.1 Validate the OpenSpec change (`openspec validate firebase-config`)
- [x] 5.2 Confirm no Admin secrets in the frontend and no Web SDK `apiKey` in the backend
