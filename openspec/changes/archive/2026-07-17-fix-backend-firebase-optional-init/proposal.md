## Why

El backend no arranca en entornos donde no hay un service account JSON real de Firebase
(con `FIREBASE_PRIVATE_KEY` de relleno/demo en `.env`). Firebase Admin se inicializa de
forma **eager y obligatoria** en dos puntos (`firebase.config.ts` y `firebase.service.ts`),
por lo que `admin.credential.cert()` lanza `Invalid PEM formatted message` y el proceso
ejecuta `process.exit(1)` antes de servir cualquier endpoint (ni siquiera `/health`).

Esto bloquea el desarrollo local y cualquier arranque sin un proyecto Firebase configurado.

## What Changes

- Se introduce el flag `FIREBASE_ENABLED` (boolean, default `false`).
- La inicialización de Firebase Admin pasa a ser **perezosa y opcional**: solo ocurre si
  `FIREBASE_ENABLED=true` y con credenciales válidas.
- `firebase.config.ts` deja de llamar `admin.initializeApp` y de devolver instancias vivas
  de `firestore`/`auth`/`storage` (que requieren app inicializada).
- `FirebaseService` expone `isEnabled()` y lanza `503 ServiceUnavailable` claro en endpoints
  que requieren Firestore cuando Firebase está deshabilitado.
- `GET /api/v1/health` refleja el estado real de Firebase (`disabled` / `connected`).
- Se documentan ambos modos en `.env.example` y `README.md`.

## Capabilities

### New Capabilities
- `firebase-optional-init`: arranque del backend sin dependencia estricta de Firebase, con
  flag `FIREBASE_ENABLED` y degradación controlada (503) de endpoints que lo requieren.

### Modified Capabilities
<!-- ninguno: no cambia el comportamiento con Firebase habilitado -->

## Impact

- Código: `backend/src/config/firebase.config.ts`, `backend/src/common/services/firebase.service.ts`,
  `backend/src/app.service.ts`, `backend/src/main.ts`, `backend/src/config/validation.config.ts`.
- Tests nuevos: `firebase.service.spec.ts`, `app.service.spec.ts`.
- Config: `backend/.env`, `backend/.env.example`.
- Docs: `backend/README.md`.
- Sin cambios en API pública ni en `docs/api-spec.yml` / `docs/data-model.md`.
