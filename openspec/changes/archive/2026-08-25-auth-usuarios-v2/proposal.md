# Proposal — auth-usuarios-v2 (CH-02)

## Why

Hoy el registro de usuarios depende de provisioning administrativo (`POST /api/v1/usuarios` solo `admin`), lo que bloquea los flujos de negocio centrales del MVP (Flujo 1 — registro de owner, Flujo 4 — auth). Además la relación usuario↔place está duplicada (`usuarios.placeId` + `places.usuarioId`), generando riesgo de deriva e impidiendo que un owner recién registrado exista sin place (la invariante actual exige `placeId` para `rol === 'owner'`).

Este change implementa **CH-02 del `PLAN_IMPLEMENTACION.md`** (con alcance ajustado y confirmado con stakeholder): self-registration con selección de rol, eliminación del provisioning admin, y relación invertida usuario↔place (fuente única de verdad: `places.usuarioId`).

**Ajustes de alcance confirmados respecto al plan original:**
- **Email verification fuera de scope de código** — se habilita directamente en Firebase Console (provider Email/Password + Google); `deploy-standards.md` documenta el requisito de entorno. No se implementa `EmailVerifiedGuard` ni página `/verificar-email`.
- **Eliminación total de `usuarios.placeId`** (no deprecated) — no hay datos en producción ni consumidores frontend.
- **Script `seed-admin.ts`** corre contra **Firebase real** (credenciales `firebase-admin.json`), no el Emulator.

## What Changes

### Backend

- **Nuevo endpoint público** `POST /api/v1/auth/registro` (`@Public()`): body `RegisterDto` `{ email, password, rol: 'member'|'owner', nombre }`. Crea el usuario en Firebase Auth (`createUser`) y el documento `usuarios/{uid}` con `rol` elegido. Transactionalidad compensatoria: si el write a Firestore falla, se elimina el usuario de Auth creado.
- **`AuthService.registerWithRole(input: RegisterWithRoleInput)`** en `auth/application/`: orquesta createUser + write Firestore + rollback.
- **ELIMINAR** `POST /api/v1/usuarios` (controller, service method, `CreateUsuarioDto`, tests asociados) — el provisioning admin desaparece; los usuarios llegan por self-registration y el primer admin por `seed-admin.ts`.
- **`PUT /api/v1/usuarios/:uid/rol`** restringido: body `{ rol }` con enum `['admin', 'member']`. Rechaza `'owner'` con `400` (el rol `owner` solo se obtiene vía self-registration; un admin no puede convertir usuarios en owners).
- **ELIMINAR campo `placeId` de `usuarios`** end-to-end:
  - `usuario.entity.ts` — quitar campo + docblock de invariante.
  - `usuario-repository.interface.ts` — quitar método `linkPlaceId()`.
  - `usuarios.service.ts` — quitar cascada `owner → no-owner` (líneas 124-130) y `assertRolPlaceIdInvariant` (líneas 144-151).
  - DTOs, adapter Firestore, `usuario-repository.contract.spec.ts`.
  - La relación usuario→place se resuelve siempre via query `places.where('usuarioId', '==', uid)`.

### Script

- **`backend/scripts/seed-admin.ts`**: crea el primer usuario con `rol: 'admin'` en **Firebase real** (Firebase Auth + doc `usuarios/{uid}`). Idempotente por email: si existe, actualiza el rol a `admin`. Credenciales via `firebase-admin.json` (mismo bootstrap que `scripts/lib/bootstrap-firebase.ts`). Comando `npm run seed:admin -- --email=... --password=... --nombre=...`.

### Frontend

- **`RegisterPageComponent`** (`/registrarse`) — reemplaza el skeleton actual de `features/registrate`: radio "Quiero descubrir lugares" (`member`) / "Quiero registrar mi negocio" (`owner`), Reactive Forms, llama Firebase `createUserWithEmailAndPassword` + `POST /auth/registro`, redirect según rol.
- **`LoginPageComponent`** (`/login`) — email/password + Google sign-in via Firebase Web SDK.
- **`AuthService` (frontend)** — wrapper de `@angular/fire` Auth + llamadas a `/auth/registro` y `GET /usuarios/me`; estado de sesión reactivo (Observable).
- Sin página de verificación de email (fuera de scope confirmado).

### Docs y specs

- `docs/data-model.md` §usuarios: eliminar `placeId` del schema y de la regla "owner gestiona su place (vinculado via `placeId`)" → reemplazar por "via query `places.usuarioId`"; registrar la nota histórica como cerrada por este change.
- `docs/api-spec.yml`: nuevo path `POST /auth/registro` + schema `RegisterDto`; eliminar `POST /usuarios`; `PUT /usuarios/{uid}/rol` con enum `['admin','member']`; schema `Usuario` sin `placeId`.
- `docs/deploy-standards.md`: sección "Firebase Auth config" — habilitar Email/Password + Google provider en Console (email verification opcional, gestionada en Firebase).
- OpenSpec specs delta: `auth`, `usuarios`, `api-contract`.

## Capabilities

### New Capabilities
- `auth` (ampliada): self-registration público con selección de rol (`member` | `owner`).

### Modified Capabilities
- `usuarios`: eliminación de `POST /usuarios` (provisioning admin); `PUT /usuarios/:uid/rol` restringido a `admin|member`; eliminación del campo `placeId` y del método `linkPlaceId()`.
- `api-contract`: nuevo endpoint público de registro; contratos actualizados de usuarios.

## Impact

- **Code**: `backend/src/modules/auth/` (service + controller + DTO nuevo); `backend/src/modules/usuarios/` (entity, repository interface, service, adapter, DTOs, controller, contract spec); `backend/scripts/seed-admin.ts` + `package.json` script `seed:admin`; `frontend/src/app/features/{registrate,login}/` + frontend `AuthService`.
- **APIs**: `POST /api/v1/auth/registro` (nuevo, público); `POST /api/v1/usuarios` (ELIMINADO — breaking); `PUT /api/v1/usuarios/:uid/rol` (enum restringido — breaking).
- **Data model**: `usuarios.placeId` eliminado (colección sin datos en producción — no requiere migración; docs actualizados).
- **Tests**: unit (`AuthService.registerWithRole`, `UsuariosService`, guard re-exports), contrato (`usuario-repository.contract.spec.ts` actualizado), integration (adapter usuarios), E2E (registro member → login; registro owner → `GET /places` con token; cambio rol owner→400). Cobertura ≥ 90% módulos tocados (backend), ≥ 80% frontend touched files.
- **Out of scope**: email verification (Firebase Console), Google OAuth backend-side (frontend Firebase SDK lo resuelve), custom claims sync, limite N places por owner (decisión de CH-03), panel admin UI.
