# Tasks — fire-001

> Una task a la vez. TDD obligatorio: test fallido antes de producción.
> Goal: Cargar credenciales de Firebase Admin desde `firebase-admin.json` (raíz del repo) y
> auto-habilitar Firebase para que `EmpresasService` persista en el proyecto Firestore real
> `directorioconcon`. Wiring puro — sin nuevos endpoints.

## 1. Seguridad — excluir credenciales de git

- [x] 1.1 Añadir `firebase-admin.json` y `firebase-*.json` al `.gitignore` raíz.
- [x] 1.2 Verificar con `git status` que ya NO aparece como untracked (`??`).
- [x] 1.3 Confirmar que `.env` ya está gitignored (creds nunca vienen de env commiteado).
- Priority: High
- Layer: Security
- Estimated: 15m

## 2. TDD — resolución de credenciales desde archivo (ROJO)

- [x] 2.1 Crear `src/config/firebase.config.spec.ts` que mockea `fs`/usa fixture:
  - resuelve `serviceAccountKey` desde un `firebase-admin.json` fixture.
  - `enabled:true` cuando archivo presente y `FIREBASE_ENABLED` indefinido.
  - `enabled:false` cuando archivo ausente y sin env creds.
  - `enabled:false` cuando `FIREBASE_ENABLED=false` (con/sin archivo).
  - el archivo tiene precedencia sobre `FIREBASE_*` env vars.
- [x] 2.2 Ejecutar `npm --prefix backend test -- firebase.config` → esperar FAIL (config aún solo-env).
- Priority: High
- Layer: Backend (Config)
- Estimated: 45m

## 3. Implementar carga de credenciales en `FirebaseConfig`

- [x] 3.1 Añadir `resolveServiceAccount()` con precedencia:
  `FIREBASE_ADMIN_CREDENTIALS_PATH` → candidatos
  (`cwd/firebase-admin.json`, `cwd/../firebase-admin.json`, `__dirname/../../../firebase-admin.json`).
- [x] 3.2 Si archivo encontrado: parsear JSON → `serviceAccountKey`; derivar `storageBucket`
  default `<project_id>.firebasestorage.app` (override `FIREBASE_STORAGE_BUCKET`) y `databaseURL` opcional.
- [x] 3.3 `enabled = (FIREBASE_ENABLED !== 'false') && (credentialsResolved)`.
- [x] 3.4 Mantener fallback a env vars cuando no hay archivo (Docker/CI).
- [x] 3.5 Hacer `FIREBASE_*` env vars opcionales en `validation.config.ts`; añadir
  `FIREBASE_ADMIN_CREDENTIALS_PATH` opcional.
- Priority: High
- Layer: Backend (Config)
- Estimated: 1h

## 4. TDD — pasar el test

- [x] 4.1 `npm --prefix backend test -- firebase.config` → GREEN.
- [x] 4.2 `npm --prefix backend test` → GREEN (el `firebase.service.spec` existente no se ve afectado).
- Priority: High
- Layer: Backend (Config)
- Estimated: 20m

## 5. Wiring de entorno local

- [x] 5.1 En `backend/.env`: set `FIREBASE_ENABLED=true`; eliminar creds `demo` de Firebase (el archivo es la fuente).
- [x] 5.2 En `backend/.env.example`: documentar `FIREBASE_ADMIN_CREDENTIALS_PATH` y notar que
  `firebase-admin.json` en raíz es la fuente por defecto; `FIREBASE_ENABLED` puede omitirse (auto-enable).
- Priority: Medium
- Layer: Backend (Config)
- Estimated: 15m

## 6. Validar Firestore end-to-end (manual — requiere red + creds reales)

- [x] 6.1 Arrancar con `FIREBASE_ENABLED=true` + archivo presente.
- [ ] 6.2 `POST /api/v1/empresas` válido → 201; confirmar doc en colección `empresas` de `directorioconcon`.
- [ ] 6.3 `GET /api/v1/empresas/{id}` retorna el doc persistido.
- [ ] 6.4 Confirmar `solicitudes` creada (`tipo:'registro'`, `status:'pendiente'`).
> Nota (dev): 6.2–6.4 diferidas — no escribir a Firestore de producción durante desarrollo.
> La integración quedó validada a nivel unidad (firebase.config.spec) y en el arranque con
> auto-enable (`/health` → `services.firebase: "connected"`). Re-ejecutar contra GCP cuando el
> API de Firestore esté habilitado y en un entorno de staging.
- Priority: High
- Layer: QA
- Estimated: 30m

## 7. Quality gate

- [x] 7.1 `npm --prefix backend run lint` limpio (0 errores, exit 0).
- [x] 7.2 `npm --prefix backend run build` (nest build) ok (exit 0).
- [x] 7.3 `npm --prefix backend test:cov` sin regresión: 40/40 tests ok; `firebase.config.ts` 93.33% stmts / 86.66% branch / 100% funcs; cobertura total sin caída vs base.
- Priority: High
- Layer: QA
- Estimated: 20m

## 8. Docs / OpenSpec

- [x] 8.1 Confirmar que `docs/api-spec.yml` y `docs/data-model.md` NO requieren cambios (solo wiring).
- [x] 8.2 Actualizar `backend/README.md` con el flujo de archivo `firebase-admin.json`
   (Opción A recomendada: archivo en raíz + auto-enable; precedentes en "Modo sin Firebase";
   tabla de env vars con `FIREBASE_ADMIN_CREDENTIALS_PATH` y `FIREBASE_*` opcionales).
- Priority: Low
- Layer: Docs
- Estimated: 20m

## 9. Seguridad — rotar clave (manual, fuera del repo)

- [ ] 9.1 Rotar la service-account key de `directorioconcon` en GCP Firebase console.
- [ ] 9.2 Reemplazar `firebase-admin.json` con la nueva key; tratar la anterior como comprometida.
- [ ] 9.3 Re-ejecutar paso 6 con la key rotada.
> Nota: paso manual de seguridad en GCP; no ejecutado por el agente en desarrollo. Recomendado
> tras haber expuesto la key (estuvo sin gitignore).
- Priority: High
- Layer: Security
- Estimated: 15m

---

## Guidelines

1. One task at a time. 2. TDD: test rojo → implementación → verde. 3. Marcar `[ ]`→`[x]`.
4. No cambiar API pública ni `docs/api-spec.yml`/`docs/data-model.md`.

---

## Archive Note

Archived 2026-07-17. **6 tasks intentionally deferred** (not executed in this change):

- **T6.2–T6.4**: Firestore end-to-end writes — blocked by GCP Cloud Firestore API not
  enabled in project `directorioconcon`. Re-run against GCP/staging once enabled.
- **T9.1–T9.3**: Manual GCP service-account key rotation — security step outside the repo.
  Recommended because the key lived un-gitignored briefly.

All dev-verifiable tasks (T1–T5, T6.1, T7, T8.1, T8.2) are complete: implementation,
unit/controller tests (44 passing), lint, build, and README docs are in place.
