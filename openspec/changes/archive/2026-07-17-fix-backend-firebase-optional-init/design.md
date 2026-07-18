## Context

Hoy `firebase.config.ts` (factory de `@nestjs/config`) ejecuta `admin.initializeApp(...)`
en cuanto se carga la config, y `firebase.service.ts` (`OnModuleInit`) lo hace de nuevo.
Cualquier `.env` sin una `FIREBASE_PRIVATE_KEY` PEM válida hace crashear el bootstrap
completo. El `.env` del repo trae valores de relleno (`DEMO-PRIVATE-KEY-REPLACE-WITH-REAL-KEY`),
así que un arranque limpio sin Firebase es imposible.

Además, `app.service.ts` y `main.ts` asumen Firebase siempre "connected".

## Goals / Non-Goals

**Goals:**
- Backend arranca siempre (modo sin Firebase por defecto).
- Inicialización de Firebase perezosa y tras un flag explícito.
- Degradación controlada (503 con mensaje útil) en endpoints que necesitan Firestore.
- `/health` refleja el estado real de Firebase.

**Non-Goals (Opción A — minimal):**
- No se implementa un repositorio in-memory mock para `EmpresasService` (los endpoints
  Firestore devuelven 503 claros cuando Firebase está off).
- No se cablea `validationSchema` de Joi a `ConfigModule` (se actualiza el schema para
  consistencia, pero no se enforcea en este cambio).

## Decisions

1. **Flag `FIREBASE_ENABLED` default `false`.** Así el repo arranca hoy sin tocar `.env`;
   mañana basta con `FIREBASE_ENABLED=true` + credenciales reales (config, no código).
2. **Quitar `admin.initializeApp` del factory** (`firebase.config.ts`). El factory solo
   construye y devuelve valores de configuración (incluido `enabled`). La app se inicializa
   una sola vez, en `FirebaseService.onModuleInit`, y solo si `enabled`.
3. **Quitar `firestore/auth/storage` del retorno del factory** (llamaban a `admin.firestore()`
   etc. que requieren app inicializada y no se usaban en `FirebaseService`).
4. **`getters` lanzan `ServiceUnavailableException` (503)** cuando `!enabled`, en lugar de
   devolver `undefined` (evita crashes crípticos tipo "Cannot read properties of undefined").
5. **`/health` lee `firebase.enabled`** desde `ConfigService` para reportar el estado real.

## Risks / Trade-offs

- Si un dev deja `FIREBASE_ENABLED=true` con clave demo, el arranque sigue fallando (fail-fast
  intencional). El README lo aclarará.
- `validation.config.ts` tiene las vars de Firebase como `.required()` pero ese schema no está
  cableado a `ConfigModule.forRoot`, así que no se enforcea. Se ajusta el schema a
  `FIREBASE_ENABLED` + condicionales para cuando se cablee, sin romper el arranque actual.
