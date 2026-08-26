## ADDED Requirements

### Requirement: frontend-firebase-init

The Angular frontend SHALL initialize Firebase using the provided Web SDK configuration for the real project `directorioconcon`, exposing Auth, Firestore, and Storage to the application.

#### Scenario: App initializes Firebase on bootstrap

- **WHEN** the Angular app bootstraps with `initializeApp(environment.firebase)`
- **THEN** Firebase is initialized with `projectId` equal to `directorioconcon` and `storageBucket` equal to `directorioconcon.firebasestorage.app`

#### Scenario: Environment isolates the public Web SDK config

- **WHEN** the environment file is inspected
- **THEN** it contains the full `firebaseConfig` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId) and MUST NOT contain any Admin service-account `private_key`

#### Scenario: Auth, Firestore and Storage providers are available

- **WHEN** `app.config.ts` provides the Firebase providers
- **THEN** `getAuth()`, `getFirestore()`, and `getStorage()` are available to components and services
