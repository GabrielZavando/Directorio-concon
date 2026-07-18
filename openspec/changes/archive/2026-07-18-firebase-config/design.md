## Context

The project is split into a backend (NestJS + Firebase Admin SDK, already scaffolded in `FirebaseService`/`firebase.config.ts`, currently disabled) and a future frontend (Angular, not yet created). The user supplied a `firebaseConfig` object that is the **Firebase Web SDK** configuration — public, client-side values (`apiKey`, `authDomain`, `measurementId`, `appId`). These cannot authenticate the Admin SDK; the backend still needs a service-account JSON (`private_key`, `client_email`) to be enabled.

Current state:
- Backend: `FIREBASE_ENABLED=false`, env uses demo values (`directorioconcon-demo`, `*.appspot.com`).
- Frontend: does not exist.

## Goals / Non-Goals

**Goals:**
- Scaffold a minimal Angular 17+ app that initializes Firebase with the provided real-project Web SDK config.
- Align the backend `.env` to the real project identifiers for consistency.

**Non-Goals:**
- Enabling the backend Firebase Admin SDK (no service-account key available).
- Building product features (auth UI, directory CRUD, maps, reviews).
- Authoring/writing Firestore or Storage security rules (they already exist in `database-instructions.md`).
- Network/integration tests that call the real Firebase project (no credentials for CI).

## Decisions

- **Use `@angular/fire` (AngularFire) providers** (`provideFirebaseApp`, `provideAuth`, `provideFirestore`, `provideStorage`). Rationale: the official, RxJS-native integration for Angular 17+ standalone apps; cleaner than the raw `firebase` SDK. Alternative considered: raw `firebase` SDK imports — rejected as more boilerplate and less idiomatic.
- **Environment files** `environment.ts` (prod) + `environment.development.ts` (dev) with `fileReplacements` in `angular.json`. The provided config lives in these files; `apiKey` is public and safe to bundle.
- **No Admin secret in the frontend.** The Web SDK config is public by design; Firebase security is enforced by Firestore/Storage rules, not by secret hiding.
- **Backend `.env` only gets `projectId` + `storageBucket` updated**; `FIREBASE_ENABLED` stays `false`. No code change in the backend.

## Risks / Trade-offs

- **[Frontend does not exist]** → We create a minimal Angular scaffold. Full app features are out of scope and come later. Mitigation: keep scaffold minimal and focused on Firebase config.
- **[Bucket naming: `firebasestorage.app` vs `appspot.com`]** → The provided config uses the newer `directorioconcon.firebasestorage.app`. Google aliases both, but we set the explicit real value to avoid ambiguity.
- **[No real network test in CI]** → Smoke test asserts the config shape and that `initializeApp(config)` does not throw with the config object (no live project call).

## Migration Plan

- None required (new scaffold + env edit). Rollback: `git revert` / delete `frontend/` and revert `.env`.

## Open Questions

- None blocking. `@angular/fire` chosen as the integration library; minimal scaffold chosen over full `ng new` app.
