# Tasks — Places Auth Fix (places-auth-fix)

> Una task a la vez. TDD obligatorio: test fallido → implementación (mínima) → refactor → verde.
> Docs/OpenSpec updates ANTES del código (SDD: spec antes que código).
> SOLID thresholds: file ≤ 300 líneas, complexity ≤ 10, max-params ≤ 3.
> Cobertura ≥ 90% en módulos tocados.

## Change Summary

Cerrar los 3 blockers detectados en la auditoría post-`auth-usuarios` del wiring de `places` + `solicitudes`:

1. **F-01** — `PUT /places/:id` y `DELETE /places/:id` sin guards: `update` escribe `usuarioId = "anonymous"` (`places.controller.ts:136`) y `remove` no tiene actor. Añadir `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner','admin')` + `@CurrentUser()`, y validar ownership en el servicio (owner solo su place; admin cualquiera).
2. **F-02** — `StubSolicitudesRepository` en `places.module.ts:27-37`: eliminar stub e importar el `SolicitudesModule` real (import directo, sin `forwardRef` — sin dependencia circular) para que las solicitudes de places persistan y el delete-guard lea estado real.
3. **F-05** — XOR (`placeId` ⊕ `eventoId`) documentado pero no enforced: `assertXorConstraint` en `SolicitudesService.create` / `createEventoSolicitud` (400 antes de persistir).

Bonus (mismo change): alinear `firestore.indexes.json` + `docs/data-model.md §Índices` con las queries reales de los adapters.

Docs canónicas (`docs/api-spec.yml` + `docs/data-model.md`) y OpenSpec specs (`places`, `solicitudes`, `api-contract`) — Task 1.
No hay migración de datos. Sin frontend vivo.

---

### Task 1: Actualizar docs canónicas + specs OpenSpec — SDD pre-código

- [x] 1.1 Actualizar `docs/api-spec.yml`:
  - `PUT /places/{id}` y `DELETE /places/{id}`: quitar la caveat "fine-grained guards deferred to a future `places-clean-arch-refactor` change" (líneas ~983-989 y ~1016).
  - Documentar en ambas operaciones la regla owner/admin (owner solo su place, admin cualquiera) + response `403` + response `401`.
- [x] 1.2 Actualizar `docs/data-model.md §Índices Firestore requeridos` (líneas ~250-272) para que la lista canónica coincida con `firestore.indexes.json` post-T5 (ver Task 5).
- [x] 1.3 OpenSpec specs delta ya creados en `openspec/changes/places-auth-fix/specs/{places,solicitudes,api-contract}/spec.md` — re-validar con `openspec validate places-auth-fix`.
- Priority: High
- Layer: Docs
- Estimated: 1.5h

### Task 2: F-01 — Guards + ownership en `PUT /places/:id` y `DELETE /places/:id`

- [x] 2.1 TDD rojo: enmendar `places.controller.spec.ts` (montar controller con mocks + `JwtAuthGuard`/`RolesGuard` del `AuthModule` real, o stubs que resuelvan `request.user`):
  - `owner` (UID propio) → `PUT /places/:id` con Bearer válido → 200, llama `placesService.update(id, dto, { uid, rol: 'owner', ... })`.
  - `owner` (UID ajeno) → `PUT` → 403 (service ownership).
  - `admin` → `PUT` de place ajeno → 200.
  - `member` → `PUT` → 403 (RolesGuard short-circuit).
  - Anónimo sin token → `PUT` → 401 (JwtAuthGuard).
  - Mismo matrix para `DELETE /places/:id` (owner propio 200, owner ajeno 403, admin 200, member 403, anónimo 401).
- [x] 2.2 TDD rojo: enmendar `places.service.spec.ts`:
  - `update(id, dto, actor)` con `actor.rol === 'owner'` y `existing.usuarioId === actor.uid` → aplica patch.
  - `update` con `actor.rol === 'owner'` y `existing.usuarioId !== actor.uid` → `ForbiddenException` "No tienes permiso para modificar este lugar", sin update.
  - `update` con `actor.rol === 'admin'` y `usuarioId` ajeno → aplica patch.
  - `delete(id, actor)` con owner propio y sin solicitudes pendientes → 200 `{ deleted: true, id }`.
  - `delete` con owner ajeno → `ForbiddenException` "No tienes permiso para eliminar este lugar".
  - `delete` con admin → procede (sujeto al guard de solicitudes pendientes).
- [x] 2.3 Refactorizar `backend/src/modules/places/infrastructure/places.controller.ts`:
  - `update(@Param('id') id, @Body() dto, @CurrentUser() user: AuthContext)` → `this.placesService.update(id, dto, user)`.
  - Añadir `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')` en `update` y `remove`.
  - Eliminar la línea 136 (`const usuarioId = "anonymous";`) y el TODO de la línea 135.
  - `remove(@Param('id') id, @CurrentUser() user: AuthContext)` → `this.placesService.delete(id, user)`.
- [x] 2.4 Refactorizar `backend/src/modules/places/application/places.service.ts`:
  - Firma `update(id, dto, actor: AuthContext)` — ownership: `if (actor.rol !== 'admin' && existing.usuarioId !== actor.uid) throw ForbiddenException(...)`.
  - Firma `delete(id, actor: AuthContext)` — ownership check antes del guard de solicitudes.
  - Importar `AuthContext` (type-only) desde `../../auth/domain/auth-context.interface`.
- [x] 2.5 Pasar specs — achievement canónico "Owner updates own place → 200; non-owner → 403; admin → 200".
- Priority: High
- Layer: Backend (HTTP + Application)
- Estimated: 3h

### Task 3: F-02 — Reemplazar `StubSolicitudesRepository` por el `SolicitudesModule` real

- [x] 3.1 TDD rojo: enmendar `places.service.spec.ts` + añadir cobertura DI:
  - `createPlace` persiste solicitud real: mock del repo real devuelve `{ id: 'sol-001', ... }` → el place creado reporta/linkea `sol-001` (no `'stub'`).
  - `delete(id, actor)` con una solicitud pendiente existente (mock `existsByPlaceId → true`) → 409 "No se puede eliminar: existen solicitudes asociadas a este lugar".
  - `delete(id, actor)` con solicitud aprobada/rechazada (mock `existsByPlaceId → false`, semantic pending-only) → 200.
- [x] 3.2 Refactorizar `backend/src/modules/places/places.module.ts`:
  - Eliminar la clase `StubSolicitudesRepository` (líneas 27-37).
  - Eliminar el provider `SOLICITUDES_REPOSITORY: { useClass: StubSolicitudesRepository }` (líneas 55-58).
  - Importar `SolicitudesModule` en `imports:` — **import directo, sin `forwardRef`**: `SolicitudesModule` no importa `PlacesModule`, por lo que el grafo de módulos no tiene dependencia circular (verificado en `places.module.spec.ts` DI).
  - Mantener `PLACE_APPROVAL_HANDLER` (lo consume `SolicitudesService` vía `@Optional()`).
  - Limpiar imports huérfanos (`SolicitudesRepositoryInterface`, `CreateSolicitudInput`, `SOLICITUDES_REPOSITORY` local).
- [x] 3.3 Verificar que `PlacesModule` NO registra `SOLICITUDES_REPOSITORY` propio — el token resuelve al export del `SolicitudesModule` (misma string token `'SolicitudesRepository'`, verificar 0 providers locales).
- [x] 3.4 Pasar specs + `npm --prefix backend run build` (DI graph válido — build OK, sin `forwardRef`).
- Priority: High
- Layer: Backend (Module wiring)
- Estimated: 1.5h

### Task 4: F-05 — XOR constraint en `SolicitudesService`

- [x] 4.1 TDD rojo: enmendar `solicitudes.service.spec.ts`:
  - `create({ placeId, eventoId, tipo: 'registro' })` → `400 BadRequestException` con mensaje XOR, repo no llamado.
  - `create({ placeId, eventoId, tipo: 'registro-evento' })` → `400`.
  - `create({ tipo: 'registro' })` (sin refs) → `400`.
  - `create({ placeId, tipo: 'registro-evento' })` (mismatched) → `400`.
  - `create({ placeId, tipo: 'registro' })` (válido) → delega al repo, persiste.
  - `createEventoSolicitud({ eventoId, tipo: 'registro-evento' })` (válido) → delega, persiste.
  - `createEventoSolicitud({ placeId, eventoId, tipo: 'registro-evento' })` → `400`.
  - `createEventoSolicitud({ tipo: 'registro-evento' })` (sin refs) → `400`.
- [x] 4.2 Implementar `private assertXorConstraint(input: { placeId?: string; eventoId?: string; tipo: Solicitud['tipo'] }): void` en `backend/src/modules/solicitudes/application/solicitudes.service.ts`:
  - Ambos presentes → throw `BadRequestException('Una solicitud debe referenciar exactamente un placeId o eventoId (XOR)')`.
  - Ninguno presente → throw mismo mensaje.
  - Presente no coincide con `tipo` → throw mismo mensaje.
- [x] 4.3 Ajustar tipos en `solicitudes.service.ts` + `solicitudes-service.interface.ts`: `create(input: { placeId?: string; eventoId?: string; ... })` y `CreateEventoSolicitudInput` ya es compatible (`eventoId` requerido; opcionalizar para permitir test del caso "ninguno" vía interface — decisión de implementación, mantener DIP).
- [x] 4.4 Pasar spec — achievement canónico "XOR invariant enforced at the application boundary, before persistence".
- Priority: High
- Layer: Backend (Application)
- Estimated: 1.5h

### Task 5: Alinear `firestore.indexes.json` + `docs/data-model.md §Índices`

- [x] 5.1 Añadir a `firestore.indexes.json`:
  - `solicitudes`: `placeId ASC` + `status ASC`.
  - `solicitudes`: `status ASC` + `createdAt DESC`.
  - `eventos`: `status ASC` + `estado ASC` + `fechaInicio ASC`.
  - `eventos`: `status ASC` + `estado ASC` + `subcategoriaId ASC` + `fechaInicio ASC`.
  - `eventos`: `status ASC` + `estado ASC` + `barrioId ASC` + `fechaInicio ASC`.
  - `eventos`: `status ASC` + `estado ASC` + `precioTipo ASC` + `fechaInicio ASC`.
  - `eventos`: `categoriaId ASC` + `createdAt DESC`.
  - `eventos`: `subcategoriaId ASC` + `createdAt DESC`.
  - `eventos`: `barrioId ASC` + `createdAt DESC`.
  - `eventos`: `estado ASC` + `createdAt DESC`.
  - `categorias`: `activa ASC` + `orden ASC`.
  - `barrios`: `tipo ASC`.
  - Validar que el JSON sigue el formato vigente (indexes + fieldOverrides, sin duplicados).
- [x] 5.2 Actualizar `docs/data-model.md §Índices Firestore requeridos` (líneas ~250-272) para que la lista canónica incluya los índices nuevos y elimine la ambigüedad (documentar cuáles son forward-declared vs requeridos por queries vigentes).
- [ ] 5.3 (Opcional) Añadir un spec test de integración que ejecute `findAllPublic` con filtros simples vía adapter mockeado — solo si aporta cobertura; el índice en sí no es testeable en unit tests (se valida en deploy). — **SKIPPED (optional)**: no aporta cobertura a los módulos tocados (eventos adapter fuera de scope); el índice se valida en deploy.
- Priority: Medium
- Layer: Infra (Firestore)
- Estimated: 1h

### Task 6: Tests e2e/verify + cobertura + lint

- [x] 6.1 Enmendar `backend/test/auth-canonical-scenarios.spec.ts` (o añadir caso) con los escenarios canónicos del change:
  - **F-01**: `member → PUT /places/:id` → 403; anónimo → `DELETE /places/:id` → 401.
  - **F-01 (ownership)**: `owner` ajeno → `PUT /places/:id` → 403 (service), sin update en Firestore.
  - **F-02**: `owner → POST /places` → solicitud persistida con id real (verificar `createDocument('solicitudes', ...)` llamado, no stub).
  - **F-05**: `SolicitudesService.create` con ambos refs → 400 (unit ya cubierto; e2e opcional).
- [x] 6.2 Correr `npm --prefix backend test -- --coverage` y validar cobertura ≥ 90% en:
  - `modules/places/infrastructure/places.controller.ts`, `modules/places/application/places.service.ts`, `modules/places/places.module.ts`, `modules/solicitudes/application/solicitudes.service.ts`.
- [x] 6.3 Correr SOLID lint: `npm --prefix backend run lint` + `make solid-lint` — 0 violaciones nuevas (deuda pre-existente de `auth-usuarios` documentada en tasks.md 14.3 NO se toca).
- [x] 6.4 Correr `/verify places-auth-fix` (custom command de OpenSpec) — valida implementation contra los escenarios de `specs/`.
- [x] 6.5 Correr `openspec validate places-auth-fix` + `openspec status --change places-auth-fix` — `isComplete: true` (4/4 artifacts).
- Priority: High
- Layer: Backend (Tests)
- Estimated: 2h

---

## Final / Archive

- [x] Validar cobertura total + lint verde + todos los checkboxes completados.
- [x] Correr `/archive places-auth-fix` (custom command) — archiva `openspec/changes/places-auth-fix/` y fusiona deltas a `openspec/specs/`.
- [x] Commit conventional: `feat(places): enforce owner/admin guards on PUT/DELETE + real solicitudes wiring + XOR validation` (o commits lógicos separados siguiendo precedente `auth-usuarios`).
