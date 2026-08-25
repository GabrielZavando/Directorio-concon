# Tasks — auth-usuarios-v2 (CH-02)

> Una task a la vez. TDD obligatorio: test fallido → implementación mínima → refactor → verde.
> Docs/OpenSpec updates ANTES del código (SDD).
> SOLID thresholds: file ≤ 300 líneas, complexity ≤ 10, max-params ≤ 3.
> Cobertura ≥ 90% en módulos backend tocados; ≥ 80% frontend touched.
> Alcance confirmado: SIN email verification en código (Firebase Console); eliminación total de `usuarios.placeId`; `seed-admin.ts` contra Firebase real.

## Change Summary

Self-registration público con selección de rol (`member` | `owner`) vía `POST /api/v1/auth/registro`; eliminación del provisioning admin (`POST /usuarios`); restricción de `PUT /usuarios/:uid/rol` a `admin|member`; eliminación end-to-end del campo `usuarios.placeId` (fuente única de verdad `places.usuarioId`); script `seed-admin.ts` contra Firebase real; frontend con páginas reales de registro/login + `AuthService` wrapper.

---

### Task 1: Actualizar docs canónicas + validar specs delta — SDD pre-código

- [x] 1.1 Actualizar `docs/data-model.md` §usuarios:
  - Quitar `placeId` de la tabla de campos (línea ~101).
  - Regla "owner gestiona su place (vinculado via `placeId`)" → reescribir: "la relación usuario→place se resuelve via query `places` WHERE `usuarioId == uid`; `places.usuarioId` es la fuente única de verdad".
  - Añadir nota histórica: el campo `usuarios.placeId` existió entre `auth-usuarios` y este change; eliminado por `auth-usuarios-v2` para evitar duplicación de la relación.
- [x] 1.2 Actualizar `docs/api-spec.yml`:
  - Nuevo path `POST /auth/registro` (público, `security: []`) con schema `RegisterDto { email, password (min 8), nombre (2..100), rol enum [member, owner] }` y responses 201/400/409.
  - ELIMINAR path `POST /usuarios`.
  - `PUT /usuarios/{uid}/rol`: body enum restringido a `[admin, member]`; documentar 400 al intentar `owner`.
  - Schema `Usuario`: quitar `placeId`.
- [x] 1.3 Actualizar `docs/deploy-standards.md`: sección "Firebase Auth config" — habilitar providers Email/Password y Google en Firebase Console; email verification gestionada en Console (opción de plantilla/action URL), fuera del código del backend.
- [x] 1.4 `openspec validate auth-usuarios-v2` pasa sin errores.
- Priority: High | Layer: Docs | Estimated: 1.5h

### Task 2: Backend — `RegisterDto` + AuthService.registerWithRole (TDD)

- [x] 2.1 Test fallido: `auth.service.spec.ts` — `registerWithRole` crea user en Auth + doc en usuarios con rol elegido; rechaza `rol: 'admin'`; rollback `deleteUser` si el write Firestore falla (mock `FirebaseService` + repo).
- [x] 2.2 Implementar `RegisterWithRoleInput` interface + `AuthService.registerWithRole()` (application; DIP: solo interfaces de domain, sin imports de `firebase-admin` directos — usar `FirebaseService` inyectado de `common`).
- [x] 2.3 Crear `RegisterDto` en `auth/infrastructure/dto/`: `@IsEmail email`, `@MinLength(8) password`, `@MinLength(2) @MaxLength(100) nombre`, `@IsIn(['member','owner']) rol`.
- [x] 2.4 Refactor + verificar tests verdes.
- Priority: High | Layer: Application | Estimated: 2h

### Task 3: Backend — Endpoint `POST /auth/registro` (TDD)

- [x] 3.1 Test fallido: `auth.controller.spec.ts` — POST público (`@Public()`), 201 con `{ uid, email, rol }`; 400 en body inválido; 409 si email ya existe.
- [x] 3.2 Crear/actualizar `AuthController` (`@Controller('auth')`) con `@Post('registro')` + `@Public()`.
- [x] 3.3 Mapear error de Auth `email-already-exists` → `ConflictException` (409).
- [x] 3.4 Verificar tests verdes + lint (`npm --prefix backend run lint`).
- Priority: High | Layer: Infrastructure | Estimated: 1.5h

### Task 4: Backend — Eliminar `POST /usuarios` provisioning admin (TDD)

- [x] 4.1 Actualizar/eliminar tests que cubran el endpoint (controller spec + e2e references).
- [x] 4.2 Eliminar `@Post()` handler del controller, método `create` admin-only del service (si queda sin consumidores), `CreateUsuarioDto` si solo servía al endpoint. Si `create` del service es reusado por `registerWithRole`, mantenerlo pero ajustar comentarios de contrato.
- [x] 4.3 Verificar suite verde.
- Priority: High | Layer: Infrastructure | Estimated: 1h

### Task 5: Backend — `PUT /usuarios/:uid/rol` restringido a `admin|member` (TDD)

- [x] 5.1 Test fallido: controller/service spec — body `{ rol: 'owner' }` → 400 Bad Request con mensaje explícito.
- [x] 5.2 Actualizar `UpdateRolDto`: enum `['admin','member']`.
- [x] 5.3 Verificar tests verdes.
- Priority: High | Layer: Infrastructure | Estimated: 45min

### Task 6: Backend — Eliminar `usuarios.placeId` end-to-end (TDD)

- [x] 6.1 Actualizar `usuario-repository.contract.spec.ts`: quitar `linkPlaceId` del fake repo y del contrato; ajustar fixtures sin `placeId`.
- [x] 6.2 Tests fallidos en `usuarios.service.spec.ts`: quitar casos de cascada owner→non-owner y de invariante placeId↔rol.
- [x] 6.3 Eliminar: campo en `usuario.entity.ts` (+docblock), método `linkPlaceId` en `usuario-repository.interface.ts` y adapter Firestore, cascada e invariante en `usuarios.service.ts`, campo en `usuario-service.interface.ts` y DTOs.
- [x] 6.4 Grep global `placeId` en `backend/src/modules/usuarios/` y `auth/` → cero referencias al campo de usuarios.
- [x] 6.5 Suite completa verde + lint.
- Priority: High | Layer: Domain/Application/Infrastructure | Estimated: 2h

### Task 7: Script `seed-admin.ts` (Firebase real)

- [x] 7.1 Crear `backend/scripts/seed-admin.ts` usando `scripts/lib/bootstrap-firebase.ts`: flags `--email --password --nombre`; idempotente por email (`getUserByEmail` → si existe, actualiza doc a `rol: 'admin'`; si no, `createUser` + write `usuarios/{uid}`).
- [x] 7.2 Registrar `npm run seed:admin` en `backend/package.json`.
- [x] 7.3 Documentar uso en `backend/scripts/README.md`.
- [x] 7.4 Ejecución de prueba contra Firebase real (proyecto dev) y verificación en Console.
- Priority: Medium | Layer: Tooling | Estimated: 1.5h

### Task 8: Frontend — `AuthService` wrapper (TDD)

- [x] 8.1 Test fallido: `auth.service.spec.ts` (frontend) — `register()` llama `POST /auth/registro` con payload correcto; `login()` wrappea `signInWithEmailAndPassword`; `loginWithGoogle()` wrappea `signInWithPopup`; `session$` emite estado.
- [x] 8.2 Implementar `frontend/src/app/shared/data-access/auth/auth.service.ts` con `HttpClient` por DI (nunca `new`) + `@angular/fire` Auth.
- [x] 8.3 Verificar tests verdes.
- Priority: High | Layer: Data-access | Estimated: 2h

### Task 9: Frontend — `RegisterPageComponent` real (TDD)

- [x] 9.1 Test fallido: form reactivo con radio member/owner, validaciones (email, min 8 password, nombre 2..100), submit llama AuthService y redirige (`/` para member, intención panel owner).
- [x] 9.2 Reemplazar skeleton en `features/registrate/` por implementación real (Reactive Forms, tokens "Dunas y Océano" vía Tailwind — sin valores hardcodeados, skeleton loaders, estados error/loading/empty).
- [x] 9.3 Verificar tests verdes + OnPush + tipado completo.
- Priority: High | Layer: Feature | Estimated: 2.5h

### Task 10: Frontend — `LoginPageComponent` (TDD)

- [x] 10.1 Test fallido: `features/login/login-page.component.spec.ts` — email/password + botón Google; errores mapeados a feedback visible; redirect post-login.
- [x] 10.2 Crear `features/login/` (ruta lazy `/login`) siguiendo la referencia `docs/login/code.html` y tokens de `docs/DESIGN.md`.
- [x] 10.3 Registrar ruta en `app.routes.ts` + spec de ruta.
- [x] 10.4 Verificar tests verdes.
- Priority: High | Layer: Feature | Estimated: 2h

### Task 11: E2E backend — flujos críticos de registro

- [x] 11.1 E2E: registro member → 201; login con token → `GET /usuarios/me` 200.
- [x] 11.2 E2E: registro owner → 201; con token puede `POST /places` (guards existentes).
- [x] 11.3 E2E: email duplicado → 409.
- [x] 11.4 E2E: admin intenta `PUT /usuarios/:uid/rol { rol: 'owner' }` → 400.
- Priority: Medium | Layer: Test | Estimated: 2h

### Task 12: Validación final del change

- [x] 12.1 `npm --prefix backend test` + `npm --prefix backend run build` + `npm --prefix backend run lint` verdes.
- [x] 12.2 `npm --prefix frontend test` verde (touched files ≥ 80%).
- [x] 12.3 `openspec validate auth-usuarios-v2 --strict` pasa.
- [x] 12.4 Marcar CH-02 como ✅ DONE en `PLAN_IMPLEMENTACION.md` (al archivar el change).
- Priority: High | Layer: Verification | Estimated: 1h
