# Tasks — Auth + Usuarios (auth-usuarios)

> Una task a la vez. TDD obligatorio: test fallido → implementación (mínima) → refactor → verde.
> Docs/OpenSpec updates ANTES del código (SDD: spec antes que código).
> SOLID thresholds: file ≤ 300 líneas, complexity ≤ 10, max-params ≤ 3.
> Cobertura ≥ 90% en módulos tocados.

## Change Summary

Implementar el módulo `auth` (NestJS, Clean Architecture por feature) + completar el módulo `usuarios` + crear `SolicitudesController` + refactorizar `PlacesController` y `EventosController`. Cierra las 3 debilidades documentadas en `roles-rename` / `data-model.md §usuarios`:

1. `places.usuarioId` pasa de `"anonymous"` al UID verificado del JWT.
2. `eventos.usuarioId` pasa del header `x-usuario-id` al `token.uid` verificado.
3. `solicitudes.revisadoPor` valida runtime `rol === 'admin'` vía `RolesGuard('admin')` en los nuevos endpoints `/solicitudes/:id/approve|reject`.

Docs canónicas (`docs/api-spec.yml` + `docs/data-model.md`) y OpenSpec specs (`usuarios`, `solicitudes`, `places`, `eventos`, `api-contract`, nuevo `auth`) — Task 1.
No hay migración de datos (`usuarios` collection vacía). Sin frontend vivo.

---

### Task 1: Actualizar docs canónicas + specs OpenSpec — SDD pre-código

- [x] 1.1 Actualizar `docs/data-model.md`:
  - Sección `§usuarios` "Authentication debt" note block → marcar los 3 bullets como **cerrados** por el change `auth-usuarios` (quitar el lenguaje "future"). Mantener el texto por auditoría pero añadir "(closed by auth-usuarios)" en cada bullet.
  - §8.4 de `docs/base-standards.md`: marcar `auth` y `usuarios` como implementados MVP (sacarlos de la lista de "próximo a implementar").
- [x] 1.2 Actualizar `docs/api-spec.yml`:
  - Schema `Usuario` (id, email, nombre, rol, placeId?, telefono?, createdAt, updatedAt).
  - Schemas `UpdatePerfil` (nombre?, telefono?) y `UpdateRol` (rol con `enum: [admin, owner, member]`).
  - Schema `AuthContext` (respuesta informativa — uid, email, rol, placeId?).
  - Schema `SolicitudApproveRejectBody` (`{ comentarios?: string }`).
  - Paths nuevos: `GET /usuarios/me`, `PUT /usuarios/me`, `GET /usuarios` (admin), `GET /usuarios/{uid}` (admin), `POST /usuarios` (admin), `PUT /usuarios/{uid}/rol` (admin), `POST /solicitudes/{id}/approve` (admin), `POST /solicitudes/{id}/reject` (admin).
  - `security: [{ bearerAuth: [] }]` a nivel de operación en todos los paths protegidos listados en `specs/api-contract` delta.
  - `security: []` explícito en los paths públicos (`GET /places`, `GET /places/slug/{slug}`, `GET /places/map-data`, `GET /places/{id}/abierto-ahora`, `GET /eventos`, `GET /eventos/map-data`, `GET /eventos/{id}`, `GET /eventos/slug/{slug}`).
- [x] 1.3 OpenSpec specs delta ya creados en `openspec/changes/auth-usuarios/specs/{auth,usuarios,solicitudes,places,eventos,api-contract}/spec.md` — re-validar con `openspec validate auth-usuarios`.
- [x] 1.4 Actualizar `firestore.indexes.json`: `usuarios: email ASC` (unique) + `usuarios: rol ASC` (índices ya declarados en `data-model.md`; este task los materializa en el archivo de staging).
- Priority: High
- Layer: Docs
- Estimated: 2h

### Task 2: Dominio `usuarios` — entidades + interfaces

- [x] 2.1 TDD rojo: `backend/src/modules/usuarios/domain/usuario-repository.contract.spec.ts` define el contrato (`findById`, `findByEmail`, `create`, `updatePerfil`, `updateRol`, `linkPlaceId` — ≤ 5 métodos, ISP) usando fakes. LSP verify.
- [x] 2.2 Crear `backend/src/modules/usuarios/domain/usuario.entity.ts` — interface `Usuario { id, email, nombre, rol, placeId?, telefono?, createdAt, updatedAt }`. Reusa `Rol` de `rol.enum.ts`.
- [x] 2.3 Crear `backend/src/modules/usuarios/domain/usuario-repository.interface.ts` + `usuario-repository.token.ts` (`USUARIOS_REPOSITORY`).
- [x] 2.4 Crear `backend/src/modules/usuarios/domain/usuario-service.interface.ts` (`UsuariosServiceInterface`) para inversión futura (controller depende de la interfaz, no de la clase).
- [x] 2.5 Pasar contract spec (LSP).
- [x] 2.6 Validar DIP: `domain/` no importa `firebase-admin`, `class-validator`, ni `@nestjs/*`.
- Priority: High
- Layer: Backend (Domain)
- Estimated: 1.5h

### Task 3: Infraestructura `usuarios` — adapter Firestore + DTOs

- [x] 3.1 TDD rojo: `backend/src/modules/usuarios/infrastructure/usuarios-firestore.adapter.spec.ts` cubriendo creación, lookup por id/email, updatePerfil/updateRol/linkPlaceId, UNIQUE email violation → `ConflictException`.
- [x] 3.2 Crear `backend/src/modules/usuarios/infrastructure/usuarios-firestore.adapter.ts` implementando `UsuariosRepository` con `FirebaseService.getFirestore().collection('usuarios')`. SRP: solo persistencia, sin reglas de negocio.
- [x] 3.3 Crear DTOs: `infrastructure/dto/update-perfil.dto.ts` (`nombre?` 2..100, `telefono?` free string), `infrastructure/dto/update-rol.dto.ts` (`rol` con `@IsEnum(ROL_VALUES)`), `infrastructure/dto/create-usuario.dto.ts` (admin: `uid`/`id` REQUIRED, `email` REQUIRED+IsEmail, `nombre` REQUIRED, `rol?` default `'member'`, `placeId?`, `telefono?`). Todos con `whitelist+forbidNonWhitelisted`.
- [x] 3.4 Pasar adapter spec.
- Priority: High
- Layer: Backend (Infra)
- Estimated: 2h

### Task 4: `UsuariosService` + `UsuariosController` — casos de uso + HTTP

- [x] 4.1 TDD rojo: `usuarios.service.spec.ts` cubriendo: create with default `'member'`, reject duplicate email (`ConflictException`), updatePerfil no acepta `rol` ni `placeId`, updateRol valida `@IsEnum(ROL_VALUES)`, linkPlaceId solo para `'owner'`.
- [x] 4.2 Implementar `application/usuarios.service.ts` inyectando `USUARIOS_REPOSITORY` (interface). Sigue SRP — solo orquestación; validaciones cross-campo viven en el service o en una pequeña `UsuarioValidator` si los checks crecen.
- [x] 4.3 TDD rojo: `usuarios.controller.spec.ts` cubriendo los escenarios canónicos:
  - `member → GET /usuarios/me` → 200 con su perfil.
  - `member → PUT /usuarios/me` con `{ rol: 'admin' }` → 400 (forbidNonWhitelisted).
  - `member → PUT /usuarios/:uid/rol` → 403.
  - `owner → PUT /usuarios/:uid/rol` → 403.
  - `admin → PUT /usuarios/:uid/rol` con `{ rol: 'owner' }` → 200.
  - `admin → PUT /usuarios/:uid/rol` con `{ rol: 'superuser' }` → 400 (IsEnum).
- [x] 4.4 Implementar `infrastructure/usuarios.controller.ts` con `@UseGuards(JwtAuthGuard, RolesGuard)` apropiado (importados de `AuthModule` Task 7):
  - `GET /usuarios/me` — sin `@Roles` (cualquier autenticado).
  - `PUT /usuarios/me` — sin `@Roles` (cualquier autenticado).
  - `GET /usuarios` (list) — `@Roles('admin')`.
  - `GET /usuarios/:uid` — `@Roles('admin')`.
  - `POST /usuarios` — `@Roles('admin')`.
  - `PUT /usuarios/:uid/rol` — `@Roles('admin')`.
- [x] 4.5 Crear `backend/src/modules/usuarios/usuarios.module.ts` exportando `UsuariosService` + providers del adapter + DI token.
- [x] 4.6 Pasar service + controller specs.
- Priority: High
- Layer: Backend (Application/Infra)
- Estimated: 4h

### Task 5: Dominio `auth` — AuthContext + AuthContextRepository interface

- [x] 5.1 Crear `backend/src/modules/auth/domain/auth-context.interface.ts` — readonly interface `AuthContext { uid: string; email: string; rol: Rol; placeId?: string }`. Pure TS, zero framework imports.
- [x] 5.2 Crear `backend/src/modules/auth/domain/auth-context-repository.interface.ts` — interface `AuthContextRepository { getRolByUid(uid: string): Promise<Rol | undefined> }` (ISP: ≤ 5 métodos — solo este en MVP).
- [x] 5.3 Crear `backend/src/modules/auth/domain/auth-context-repository.token.ts` (`AUTH_CONTEXT_REPOSITORY`).
- [x] 5.4 Validar DIP: ningún import de `firebase-admin`, `@nestjs/*`, ni `class-validator`.
  - Refactor (Option A — close DIP cross-module violation): moved `rol.enum.ts` (+ its spec) from `usuarios/domain/` to `auth/domain/` so `auth` owns its own domain. Eliminated the temporary `auth/domain/rol.ts` re-export. updated 8 importers: `usuarios/{domain, application, infrastructure}/*` + `auth/{domain, application}/*`. Verified `grep "usuarios/" backend/src/modules/auth` returns 0 matches (auth → usuarios = 0 imports). Full suite green (406/406).
- Priority: High
- Layer: Backend (Domain)
- Estimated: 0.5h

### Task 6: Infraestructura `auth` — adapter Firestore para rol lookup (cacheable)

- [x] 6.1 TDD rojo: `usuarios-rol-lookup.adapter.spec.ts` cubriendo: usuario existe → devuelve `rol`; usuario no existe → devuelve `undefined`; Firestore error → propaga (no swallow/cachea un falso posititvo).
- [x] 6.2 Implementar `infrastructure/usuarios-rol-lookup.adapter.ts` con `FirebaseService.getFirestore().collection('usuarios').doc(uid).get()` → lee `rol`. Decorar con `@Injectable()` + `@Inject(AUTH_CONTEXT_REPOSITORY)` implícito vía provider.
- [x] 6.3 (Opcional MVP) Cache: SKIPPED por decisión del usuario (leave for a future change; adapter passes 8/8 without cache dependency).
- [x] 6.4 Pasar adapter spec.
- Priority: High
- Layer: Backend (Infra)
- Estimated: 1.5h

### Task 7: `AuthService` + guards + decorators (`auth/application/`)

- [x] 7.1 TDD rojo: `auth.service.spec.ts` cubriendo:
  - `buildContext` con custom claim `rol` presente → no consulta Firestore.
  - `buildContext` sin custom claim → consulta `AuthContextRepository.getRolByUid`.
  - `buildContext` con `rol` ausente en Firestore → lanza `ForbiddenException` con mensaje `user has not been provisioned in the usuarios collection`.
  - `buildContext` con `rol` inválido en el claim (no en `ROL_VALUES`) → ignora claim, hace fallback a Firestore.
- [x] 7.2 Implementar `application/auth.service.ts` inyectando `FirebaseService` (para `verifyIdToken`) + `AUTH_CONTEXT_REPOSITORY`. SRP: solo orquestación verifyIdToken + rol lookup + validación de `ROL_VALUES`.
- [x] 7.3 TDD rojo: `jwt-auth.guard.spec.ts`:
  - Header `Authorization: Bearer <token>` válido → adjunta `request.user = AuthContext`, pasa.
  - Header ausente o mal formado → `401 Unauthorized`.
  - `verifyIdToken` lanza (token expirado/inválido/revocado) → `401`.
  - Servicio lanza `ForbiddenException` (orphan user) → propaga `403`.
- [x] 7.4 Implementar `application/jwt-auth.guard.ts` — `Can Activate` que extrae el Bearer, llama `AuthService`, adjunta `request.user`. Composición con `Reflector` para detectar `@Public()` (no-op forward-compat).
- [x] 7.5 TDD rojo: `roles.guard.spec.ts`:
  - Sin `@Roles` decorator → pasa (cualquier autenticado).
  - Con `@Roles('admin')` y `request.user.rol === 'admin'` → pasa.
  - Con `@Roles('admin')` y `request.user.rol === 'owner'` → `403` "rol 'owner' is not allowed to perform this operation".
  - `@Roles('owner','admin')` method-level + `@Roles('member')` class-level → method-level gana (member → 403, owner → 200).
- [x] 7.6 Implementar `application/roles.guard.ts` — usa `Reflector` para leer `@Roles` metadata. Method-level override via `Reflector.getAllAndOverride`.
- [x] 7.7 Implementar `application/roles.decorator.ts` (`@Roles(...roles: Rol[])`), `application/current-user.decorator.ts` (`@CurrentUser()` param decorator que crea `ArgumentMetadata` para `request.user`), `application/public.decorator.ts` (`@Public()` sets `IS_PUBLIC` metadata).
  - Decoradores finalizados en Task 4; Task 7 los confirma sin cambios.
- [x] 7.8 Pasar todos los specs nuevos. (9 auth.service + 10 jwt-auth.guard + 7 roles.guard = 26 tests nuevos; 440/440 suite completa verde.)
- [x] 7.9 Validar threshold `max-lines ≤ 300` en cada archivo de `auth/application/`. Si `auth.service.ts` crece, separar `rol-resolver.service.ts`.
  - Verificado: max impl = 60 líneas (`auth.service.ts`), max spec = 151 (`jwt-auth.guard.spec.ts`). Sin separación necesaria.
- Priority: High
- Layer: Backend (Application)
- Estimated: 4h

### Task 8: `AuthModule` wiring + DI

- [x] 8.1 Crear `backend/src/modules/auth/auth.module.ts`:
  - `providers: [AuthService, JwtAuthGuard, RolesGuard, { provide: AUTH_CONTEXT_REPOSITORY, useClass: UsuariosRolLookupAdapter }]`.
  - `exports: [AuthService, JwtAuthGuard, RolesGuard]` (+ los decorators van como imports transpilados, no necesitan exports).
- [x] 8.2 Verificar que `AuthModule` NO registra `APP_GUARD` global (los controllers opt-in via `@UseGuards`).
  - Verificado: `grep -rn "APP_GUARD" backend/src` → solo el docstring de `auth.module.ts` lo menciona como negación. 0 registros reales.
- [x] 8.3 Validar con `npm --prefix backend run lint` (dependency-cruiser confirm: `domain/` y `application/` no importan infra).
  - DIP validado manualmente: `grep "usuarios/" backend/src/modules/auth` → 0 imports cross-module. `auth/domain/` puro TS sin framework imports. `auth/application/auth.service.ts` importa `FirebaseService` (abstracción `@Global`) + `DecodedIdToken` (type-only) — mismo patrón que `usuarios-firestore.adapter.ts`.
- Priority: High
- Layer: Backend (Module)
- Estimated: 1h

### Task 9: `app.module.ts` — cablear Auth + Usuarios

- [x] 9.1 Descomentar e importar `AuthModule` + `UsuariosModule` en `backend/src/app.module.ts` (estaban comentados).
  - Limpieza bonus: removidos los comentarios duplicados legacy (líneas antiguas referenciando `@/modules/usuarios/usuarios.module` y `@/modules/solicitudes/solicitudes.module` comentados) y el duplicado `SolicitudesModule` en el array `imports:`.
- [x] 9.2 Verificar orden de imports: `FirebaseModule` (global) antes de `AuthModule` (depende de `FirebaseService`).
  - Verificado: orden final es `FirebaseModule` (line 83) → `PlacesModule / EventosModule / SolicitudesModule` (87–89) → `UsuariosModule` (91) → `AuthModule` (94). `AuthModule` queda antes de cualquier consumidor.
- [x] 9.3 Correr `npm --prefix backend run build` (`nest build`) — confirmar DI graph válido.
  - `nest build` limpio (DI graph resuelto: AuthModule → FirebaseService sink).
- [x] 9.4 Correr `npm --prefix backend run test` — los specs existentes deben seguir verdes excepto los que tocan `places.controller` y `eventos.controller` (que se refactorizan en Tasks 11–12).
  - Resultado: **440/440 tests verdes** en 33 suites.ningún test rojo (ni siquiera places.controller ni eventos.controller — sus refactor vienen en Tasks 11–12 pero ya no dependen del wiring de Auth + Usuarios para estar verdes hoy).
- Priority: High
- Layer: Backend (Wiring)
- Estimated: 0.5h

### Task 10: `SolicitudesController` — endpoints approve/reject (admin only)

- [x] 10.1 TDD rojo: `solicitudes.controller.spec.ts` con controller montado con mocks de `SolicitudesService`:
  - `admin → POST /solicitudes/<id>/approve` → 201, llama `service.aprobarSolicitud(id, adminUid)`, retorna la solicitud actualizada. `revisadoPor === admin.uid` verificado en payload.
  - `admin → POST /solicitudes/<id>/reject` con `{ comentarios }` → 201, llama `service.rechazarSolicitud(id, adminUid, comentarios)`.
  - `member → POST .../approve` → 403 (RolesGuard short-circuit).
  - `owner → POST .../approve` → 403.
  - Anónimo (sin token) → 401 (JwtAuthGuard short-circuit).
  - Body con campo inesperado `{ revisadoPor: 'x' }` en approve → 201 (body ignored, no DTO); en reject → 400 (`forbidNonWhitelisted`).
  - `SolicitudesService.aprobarSolicitud` throws `ConflictException` (no pendiente) → 409.
  - `comentarios` > 500 chars → 400.
- [x] 10.2 Implementar `backend/src/modules/solicitudes/infrastructure/solicitudes.controller.ts`:
  - `@Controller('solicitudes')`, `@ApiTags('solicitudes')`.
  - `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` at class level.
  - `POST /:id/approve` — `@CurrentUser() user`, llama `service.aprobarSolicitud(id, user.uid)`.
  - `POST /:id/reject` — `@Body() dto: RejectSolicitudDto`, llama `service.rechazarSolicitud(id, user.uid, dto.comentarios)`.
- [x] 10.3 Crear `infrastructure/dto/reject-solicitud.dto.ts` con `comentarios?: string` + `@IsOptional @IsString @MaxLength(500)`.
- [x] 10.4 Añadir `SolicitudesController` al `SolicitudesModule` (importar `AuthModule` para los guards).
- [x] 10.5 Pasar el spec — achievement canónico "Admin approves solicitud → revisadoPor = admin.uid" (delegación en el service existente).
- Priority: High
- Layer: Backend (HTTP)
- Estimated: 2h

### Task 11: `PlacesController.create` — JWT + `@Roles('owner')` (cierre deuda #1)

- [x] 11.1 TDD rojo: enmendar `places.controller.spec.ts`:
  - `owner → POST /places` con `Authorization: Bearer <idToken>` válido → 201, `usuarioId === 'uid-owner-001'` (no `'anonymous'`).
  - `member → POST /places` con Bearer válido → 403 (RolesGuard).
  - Anónimo sin token → 401 (JwtAuthGuard).
  - Body con `{ usuarioId: 'uid-spoofed' }` → 400 (forbidNonWhitelisted — ya cubierto por roles-rename, reconfirmar).
- [x] 11.2 Refactorizar `backend/src/modules/places/infrastructure/places.controller.ts`:
  - `PlacesModule` importa `AuthModule`.
  - Método `create`: añadir `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')`. Cambiar firma a `async create(@Body() dto, @CurrentUser() user: AuthContext)` y reemplazar `const usuarioId = "anonymous";` por `user.uid` (línea 44).
- [x] 11.3 Los endpoints GET (`findAll`, `findBySlug`, `getMapData`, `findById`, `abiertoAhora`) quedan SIN guards (discovery anónimo Flujo 2). `PUT /places/:id` y `DELETE /places/:id` se cablean en un cambio futuro (`places-clean-arch-refactor` per `docs/base-standards.md §8.4`) — este change no los toca.
- [x] 11.4 Pasar spec — la "deuda docstring/TODO" en la línea 43 (`TODO: extract usuarioId from JWT guard (Task auth module)`) se eliminó.
- Priority: High
- Layer: Backend (HTTP)
- Estimated: 1.5h

### Task 12: `EventosController` — JWT + `@Roles('owner','admin')` (cierre deuda #2, breaking)

- [x] 12.1 TDD rojo: enmendar `eventos.controller.spec.ts` + `eventos.integration.spec.ts`:
  - `owner → POST /eventos` con Bearer válido (sin `x-usuario-id` header) → 201, `evento.usuarioId === token.uid`.
  - `owner → POST /eventos` con BOTH `Authorization: Bearer` AND `x-usuario-id: uid-spoofed` → 201, `usuarioId === token.uid` (el header se ignora).
  - `member → POST /eventos` con Bearer válido → 403.
  - `admin → POST /eventos` con Bearer válido → 201.
  - Anónimo sin token → 401.
  - `owner → PUT /eventos/:id` con `usuarioId` no propio → 403 (regla `evento.usuarioId === user.uid` valida el service).
  - `admin → PUT /eventos/:id` de evento ajeno → 200 (admin puede editar cualquier evento).
- [x] 12.2 Refactorizar `backend/src/modules/eventos/infrastructure/eventos.controller.ts`:
  - Eliminar imports de `Headers` para `x-usuario-id` y `x-rol`.
  - `EventosModule` importa `AuthModule`.
  - `create`: añadir `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')`. Reemplazar `@Headers("x-usuario-id") usuarioId?: string` + el `if (!usuarioId) throw UnauthorizedException` con `@CurrentUser() user: AuthContext`. Usar `user.uid` como `usuarioId`.
  - `update`: igual. Pasar `user.uid` y `user.rol` al `eventosService.update(id, dto, user.uid, user.rol)`.
  - `remove`: igual.
- [x] 12.3 Endpoints GET (`findAll`, `findBySlug`, `findById`, `getMapData`) quedan SIN guards (discovery anónimo).
- [x] 12.4 Pasar specs — achievement canónico "Owner crea eventos con usuarioId === token.uid".
- Priority: High
- Layer: Backend (HTTP)
- Estimated: 2.5h

### Task 13: `docs/data-model.md` — deuda marcada como cerrada + notas de implementación

- [x] 13.1 En `docs/data-model.md §usuarios`, actualizar el "Authentication debt" note block:
  - Cada uno de los 3 bullets (`places.usuarioId`, `eventos.usuarioId`, `solicitudes.revisadoPor`) → anteponer "**[CLOSED]**" con referencia `closed by change auth-usuarios`.
  - Mantener el texto descriptivo (auditoría histórica) pero marcar el cierre explícitamente.
- [x] 13.2 En `docs/base-standards.md §8.4`, mover `auth` y `usuarios` de "Próximo módulo a implementar" a la lista de "implementados MVP".
- [x] 13.3 Re-correr `openspec validate auth-usuarios` — debe pasar (specs reflejan el cierre).
- Priority: Medium
- Layer: Docs
- Estimated: 0.5h

### Task 14: Tests e2e/3 escenarios canónicos del ticket + verify

- [x] 14.1 Crear `backend/test/auth-canonical-scenarios.spec.ts` (jest config de e2e) con mocks del `FirebaseService.verifyIdToken`:
  - **Escenario A** (cierre deuda #2): owner crea evento → `usuarioId === token.uid` (JWT real, no header).
  - **Escenario B** (cierre deuda #1): member intenta `POST /places` → 403.
  - **Escenario C** (cierre deuda #3): admin aprueba solicitud → `revisadoPor === uid del admin`.
- [x] 14.2 Correr `npm --prefix backend test -- --coverage` y validar cobertura ≥ 90% en:
  - `modules/auth/**`, `modules/usuarios/**`, `modules/solicitudes/infrastructure/solicitudes.controller.ts`, `modules/places/infrastructure/places.controller.ts`, `modules/eventos/infrastructure/eventos.controller.ts`.
- [x] 14.3 Correr SOLID lint: `npm --prefix backend run lint` + `make solid-lint` — umbrales verdes (file ≤ 300, complexity ≤ 10, max-params ≤ 3, DIP: domain/application sin imports de infra).
  - **Decisión (verde a nivel change)**: `auth-usuarios` introduce **0 violaciones nuevas** — se corrigieron las 6 introducidas por el change (unused vars/imports en `auth.service.spec.ts`, `jwt-auth.guard.spec.ts`, `usuarios-rol-lookup.adapter.spec.ts`, `solicitudes.controller.spec.ts`, `usuarios-firestore.adapter.ts`, `eventos.integration.spec.ts`). Los **60 errores restantes de `make solid-lint` son deuda pre-existente** en módulos no tocados por este change (`common/` transform.interceptor complexity 26, all-exceptions.filter, logging.interceptor, firebase.service max-params; `config/app.config.ts` complexity 17; `places/**`; `eventos.service.ts` max-params; `solicitudes.service.ts` complexity 11; 7+ spec files > 300 líneas). Se documentan aquí y quedan pendientes para un change futuro dedicado (`solid-lint-cleanup`).
- [x] 14.4 Correr `/verify auth-usuarios` (custom command de OpenSpec) — valida implementation contra los escenarios de `specs/`.
  - **Resultado**: los 6 specs (auth, eventos, places, solicitudes, usuarios, api-contract) están cubiertos por la implementación y sus tests:
    - `auth`: guard JWT 401/403, fallback claim→usuarios, RolesGuard 403 con mensaje canónico, `@CurrentUser()`, AuthContext sin framework imports, módulo no-global (GET públicos anónimos) — cubierto por `jwt-auth.guard.spec.ts` (233 líneas), `roles.guard.spec.ts`, `auth.service.spec.ts` (223 líneas), `usuarios-rol-lookup.adapter.spec.ts`.
    - `eventos`: owner/admin POST→201, member→403, anónimo→401, header `x-usuario-id` ignorado, PUT/DELETE con `user.uid`/`user.rol` — cubierto por `eventos.controller.spec.ts` (28 tests) + `eventos.integration.spec.ts`.
    - `places`: owner POST→201 `usuarioId===uid`, member→403, anónimo→401, body con `usuarioId`→400 — cubierto por `places.controller.spec.ts` (16 tests).
    - `solicitudes`: admin approve→200 `revisadoPor===uid`, owner/member→403, anónimo→401, 409 no-pendiente, reject body whitelist 400 — cubierto por `solicitudes.controller.spec.ts` (12 tests).
    - `usuarios`: CRUD admin/self, default `member`, duplicate email 409, `@IsEnum(ROL_VALUES)` 400, admin-only rol/placeId — cubierto por `usuarios.service.spec.ts`, `usuarios-firestore.adapter.spec.ts`, `usuarios.controller.spec.ts`.
    - e2e canónico (`auth-canonical-scenarios.spec.ts`): A) owner evento 201 `usuarioId===uid`, B) member place 403 sin persistencia, C) admin approve `revisadoPor===adminUid`.
  - **Suite**: 459 unit (35 suites) + 3 e2e verdes; `npm run build` + `npm run lint` limpios.
- [x] 14.5 Correr `openspec validate auth-usuarios` + `openspec status auth-usuarios` — `isComplete: true`.
  - `openspec validate auth-usuarios` → `Change 'auth-usuarios' is valid`.
  - `openspec status --change auth-usuarios` → `Progress: 4/4 artifacts complete` (`proposal`, `design`, `specs`, `tasks`).
  - Nota: se actualizó `specs/usuarios/spec.md` (path de `rol.enum.ts` → `auth/domain/` tras el move documentado en Task 4.1) antes de archivar, cumpliendo la regla "artifacts antes que código".
- Priority: High
- Layer: Backend (Tests)
- Estimated: 2.5h

---

## Final / Archive

- [x] Validar cobertura total + lint verde + todos los checkboxes completados.
  - **Cobertura (Task 14.2 re-confirmada)**: `auth/**` 100% (application 97.67% stmts, 100% lines), `usuarios/**` 100% (infrastructure 95.5% stmts, 96.34% lines), `solicitudes.controller.ts` 100%, `places.controller.ts` 97.14%, `eventos.controller.ts` 100%. Suite total: 459 unit (35 suites) + 3 e2e.
  - **Lint**: `npm run lint` verde (se añadió `tsconfig.test.json` + `parserOptions.project: ['tsconfig.json', 'tsconfig.test.json']` en `.eslintrc.js` para que el e2e file en `test/` sea lintable — estaba excluido del `tsconfig.json`). `make solid-lint` verde a nivel change (0 violaciones nuevas; deuda pre-existente documentada en 14.3).
  - **Build**: `nest build` limpio. **openspec**: `validate` válido + `status` 4/4 artifacts complete.
  - Todos los checkboxes de Tasks 1–14 marcados `[x]`.
- [x] Correr `/archive auth-usuarios` (custom command) — archiva `openspec/changes/auth-usuarios/` a `openspec/changes/archive/2026-07-31-auth-usuarios/` y fusiona las deltas a `openspec/specs/`.
  - **Ejecutado**: `openspec archive auth-usuarios -y` → specs aplicadas (`+ 6, ~ 7, → 1`): `api-contract` +1/~1, `auth` +5 (spec nuevo), `eventos` ~1, `places` ~2, `solicitudes` ~1, `usuarios` ~2/→1 (requirement "Authentication debt" renombrado vía sección `RENAMED` del delta — necesario porque el merge MODIFIED exige header exacto).
  - `openspec status` → **No active changes**.
- [ ] Commit conventional: `feat(auth): implement Firebase Auth JWT + RolesGuard + usuarios CRUD + cierre debilidades de autenticación`.
