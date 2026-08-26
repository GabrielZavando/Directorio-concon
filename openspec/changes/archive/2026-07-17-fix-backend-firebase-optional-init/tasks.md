# Tasks — fix-backend-firebase-optional-init

> Una task a la vez. TDD obligatorio: test fallido antes de producción.

## Change Summary

Hacer que el backend arranque sin un proyecto Firebase configurado, mediante el flag
`FIREBASE_ENABLED` (default `false`). Firebase se inicializa de forma perezosa/opcional y
los endpoints que lo requieren devuelven 503 claros cuando está deshabilitado. `/health`
refleja el estado real.

---

### 1. Firebase optional init (núcleo)

- [x] 1.1 Escribir `src/common/services/firebase.service.spec.ts` (TDD rojo): con
  `FIREBASE_ENABLED=false` → `onModuleInit` NO llama `admin.credential.cert` ni
  `admin.initializeApp`; `isEnabled()` es `false`; `getFirestore()` lanza
  `ServiceUnavailableException` (503). Con `true` → sí inicializa y `getFirestore()` definido.
- [x] 1.2 Modificar `src/config/firebase.config.ts`: quitar `admin.initializeApp` del factory
  y quitar `firestore/auth/storage` del retorno (evita llamar APIs de admin sin app). Añadir
  `enabled: process.env.FIREBASE_ENABLED === "true"` al objeto de config.
- [x] 1.3 Modificar `src/common/services/firebase.service.ts`: leer `firebase.enabled`; si
  `false` → log warn + retornar early (sin init); si `true` → init como hoy. Añadir campo
  `enabled` + `isEnabled()`. Los getters `getFirestore/getAuth/getStorage` lanzan
  `ServiceUnavailableException` si `!enabled`.
- [x] 1.4 (hallazgo post-apply) Proveer `FirebaseService` en `EmpresasModule` (bug de DI
  preexistente, enmascarado porque el server moría antes en la init de Firebase). Sin esto
  el bootstrap no resuelve `EmpresasService → FirebaseService`.
- [x] 1.5 (hallazgo post-apply) Habilitar `esModuleInterop: true` en `tsconfig.json`. Con
  solo `allowSyntheticDefaultImports`, imports tipo `import cors from "cors"` compilan a
  `cors_1.default` (undefined) y crashean el bootstrap. Bug preexistente enmascarado.
- Priority: High
- Layer: Backend (Infra)
- Estimated: 3h

### 2. Health refleja estado real de Firebase

- [x] 2.1 Escribir `src/app.service.spec.ts` (TDD rojo): `getHealthStatus()` reporta
  `services.firebase: "disabled"` cuando `firebase.enabled` es `false`, y `"connected"`
  cuando es `true`.
- [x] 2.2 Modificar `src/app.service.ts`: `getHealthStatus()` lee
  `configService.get("firebase.enabled")` y setea `services.firebase` acorde.
- [x] 2.3 Modificar `src/main.ts`: el log final refleja estado real (no siempre
  "Firebase configurado correctamente").
- Priority: Medium
- Layer: Backend (API)
- Estimated: 1h

### 3. Config y validación

- [x] 3.1 Modificar `src/config/validation.config.ts`: añadir
  `FIREBASE_ENABLED: Joi.boolean().default(false)` y hacer las vars de Firebase
  `.when('FIREBASE_ENABLED', is: true → required, otherwise → optional())`.
- Priority: Low
- Layer: Backend (Config)
- Estimated: 1h

### 4. Documentación

- [x] 4.1 Actualizar `backend/.env.example`: añadir `FIREBASE_ENABLED=false` con comentario
  de los dos modos.
- [x] 4.2 Actualizar `backend/.env` (local, gitignored): añadir `FIREBASE_ENABLED=false`.
- [x] 4.3 Actualizar `backend/README.md`: sección "Firebase configuration" con modo
  deshabilitado y modo habilitado (pasos para generar service account en Firebase Console).
- Priority: Medium
- Layer: Docs
- Estimated: 1h

### 5. Verificar

- [x] 5.1 `npm --prefix backend run build` en verde.
- [x] 5.2 `npm --prefix backend test` en verde (nuevos specs + existentes).
- [x] 5.3 Arranque manual (`start:dev`) y `curl -s localhost:3000/api/v1/health` retorna
  `services.firebase: "disabled"` sin error PEM.
- Priority: High
- Layer: QA
- Estimated: 1h

---

## Guidelines

1. One task at a time. 2. TDD: test rojo → implementación → verde. 3. Marcar `[ ]`→`[x]`.
4. No cambiar API pública ni `docs/api-spec.yml`/`docs/data-model.md`.
