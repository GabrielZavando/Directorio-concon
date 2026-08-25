# Design — auth-usuarios-v2 (CH-02)

## Context

El change archivado `2026-07-31-auth-usuarios` implementó la infraestructura de autenticación (`JwtAuthGuard`, `RolesGuard`, `@Roles`, `@Public`, `@CurrentUser`, `AuthContext`) y el módulo `usuarios` con provisioning **admin-only**. Ese modelo cierra la deuda de autenticación pero bloquea los flujos de negocio: un visitante no puede registrarse sin intervención de un admin.

Además, la relación usuario↔place vive en dos colecciones simultáneamente (`usuarios.placeId` y `places.usuarioId`), y el dominio de usuarios fuerza una invariante (`owner` REQUIERE `placeId`) incompatible con el self-registration: un owner se registra antes de tener place.

Estado verificado en código (2026-08-24):
- `usuarios.controller.ts`: `POST /` (línea 101, `@Roles('admin')`), `PUT /:uid/rol` (línea 130).
- `usuarios.service.ts`: cascada `linkPlaceId(null)` (líneas 124-130), `assertRolPlaceIdInvariant` (líneas 144-151).
- `usuario.entity.ts:47`: `placeId?: string | null` con invariante documentada.
- `@Public()` decorator ya existe en `auth/application/public.decorator.ts`.
- `places.usuarioId` ya es la fuente real (seteada desde JWT en `PlacesService.createPlace`).
- Frontend: `features/registrate/` es un skeleton sin formulario; no existe feature `login`.

## Goals / Non-Goals

**Goals:**
- Self-registration público (`POST /auth/registro`) con selección de rol `member` | `owner`.
- Eliminación del provisioning admin (`POST /usuarios`).
- Eliminación total de `usuarios.placeId` (fuente única: `places.usuarioId`).
- `PUT /usuarios/:uid/rol` restringido a `admin|member` (un admin nunca asigna `owner`).
- Script `seed-admin.ts` contra Firebase real para el primer admin.
- Frontend: páginas reales de registro y login + `AuthService` wrapper.

**Non-Goals:**
- Email verification en código (guards, página `/verificar-email`) — configuración de Firebase Console, documentada en `deploy-standards.md`.
- Google OAuth server-side flows — el cliente resuelve con Firebase Web SDK y envía `idToken`.
- Custom claims `rol` sync (Cloud Function) — el fallback a Firestore existente cubre el caso.
- Límite de places por owner — decisión de CH-03 (`places-refactor`).
- Panel admin UI — fuera del MVP público.

## Decisions

### Decision 1: Registro server-side en `POST /auth/registro`, no solo client-side

**Choice**: El frontend puede registrar con Firebase Web SDK directamente, pero el documento `usuarios/{uid}` con el `rol` elegido lo crea el backend vía `POST /auth/registro` (Admin SDK `createUser` + Firestore write).

**Rationale**: El `rol` es un dato de dominio que NO debe ser seteable por el cliente sin validación server-side — si el cliente pudiera escribir `usuarios/{uid}` directamente, cualquiera podría auto-asignarse `owner` (o peor, `admin`) vía SDK. El backend valida `@IsIn(['member','owner'])` (nunca `admin` vía API pública) y usa Admin SDK, que bypasea security rules. El flujo final: frontend llama `POST /auth/registro` con email+password+rol+nombre → backend crea en Auth + Firestore → frontend hace `signInWithEmailAndPassword`.

**Alternativa rechazada**: `createUserWithEmailAndPassword` en cliente + write directo a Firestore con security rules — requiere diseñar/deployar Firestore rules (fuera del modelo actual, que usa Admin SDK exclusivamente) y abre superficie de ataque innecesaria para el MVP.

### Decision 2: Rollback compensatorio si falla el write a Firestore

**Choice**: `registerWithRole` ejecuta: (1) `admin.auth().createUser(...)`, (2) `usuariosRepo.create({ uid, email, nombre, rol })`. Si (2) falla, se ejecuta `admin.auth().deleteUser(uid)` para no dejar un usuario de Auth huérfano sin documento de dominio.

**Rationale**: Firestore no tiene transacciones cross-servicio con Firebase Auth. Sin rollback, un fallo parcial deja al usuario autenticable pero sin `rol` → los guards responden `403` permanentemente. El compensating delete es el patrón saga mínimo aceptable para MVP.

### Decision 3: Eliminación inmediata de `usuarios.placeId` (sin período deprecated)

**Choice**: Se borra el campo, el método `linkPlaceId()`, la cascada y el invariante en el mismo change, sin transición.

**Rationale**: No hay datos en producción (colección en entorno dev/emulator) ni consumidores frontend del campo. Mantenerlo deprecated solo arrastraría deuda a CH-03. La lectura "¿qué places tiene este usuario?" se resuelve con `places.where('usuarioId','==',uid)` (índice simple, ya cubierto por el patrón de acceso de `places`).

**Implicancia dominio**: un owner recién registrado sin place es válido por diseño (Flow 1: registra → crea place → lugar queda `pendiente` via solicitud). La cardinalidad "1 owner : N places" queda libre; si el negocio decide restringir a 1:1, la regla se enforcea en `PlacesService` (count query) en CH-03, no en el doc del usuario.

### Decision 4: `PUT /usuarios/:uid/rol` rechaza `'owner'` con 400

**Choice**: El DTO de cambio de rol usa enum `['admin','member']`. Intentar asignar `owner` retorna `400 Bad Request` con mensaje explícito.

**Rationale**: `owner` implica intención de negocio (publicar un place) y nace del self-registration. Si un admin pudiera asignarlo, se bypasearía el flujo y se crearían owners sin rastro. La transición contraria (owner → member/admin) se permite? **No**: como `PUT /:uid/rol` ya no debe recibir `'owner'` como target y el plan original solo lista `admin|member` como body válido, las transiciones permitidas son entre `admin` y `member` únicamente. Un owner que debe perder su rol se gestiona en CH-03 (con decisión sobre sus places) — fuera de scope aquí. Se documenta en el spec delta.

### Decision 5: `seed-admin.ts` contra Firebase real, idempotente por email

**Choice**: Script standalone `backend/scripts/seed-admin.ts` que usa el bootstrap existente (`scripts/lib/bootstrap-firebase.ts` → `firebase-admin.json`). Flags `--email --password --nombre`. Si el email ya existe en Auth (`getUserByEmail`), actualiza/customiza rol en Firestore a `admin` en vez de fallar. Comando: `npm run seed:admin -- --email=... --password=... --nombre=...`.

**Rationale**: El primer admin no puede auto-registrarse (`rol ∈ {member, owner}` en el endpoint público) — necesita bootstrap. Reusar el bootstrap existente mantiene consistencia con `seed.ts`/`seed-places.ts`. Apunta a Firebase real (no Emulator) por decisión del stakeholder: el admin es operación real del proyecto.

## Risks / Trade-offs

- **Breaking API**: eliminar `POST /usuarios` rompe consumidores hipotéticos. Mitigación: el frontend actual no lo usa; se documenta en `api-spec.yml` y en el spec delta.
- **Doble write Auth + Firestore no atómico**: mitigado con rollback (Decision 2). Fallo del rollback queda loggeado (`logger.error`) para intervención manual — aceptable en MVP.
- **Frontend sin tests E2E**: se cubre con unit tests de components + service (Karma); Cypress queda para change futuro de test-infra (consistente con deferments previos).
