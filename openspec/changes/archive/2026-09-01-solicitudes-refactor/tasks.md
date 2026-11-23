# Tasks — Solicitudes Refactor (solicitudes-refactor)

> Una task a la vez. TDD obligatorio: test fallido → implementación mínima → refactor → verde.
> Docs/OpenSpec updates ANTES del código (SDD).
> SOLID thresholds: file ≤ 300 líneas, complexity ≤ 10, max-params ≤ 3.
> Cobertura ≥ 90% en módulos backend tocados.
> Alcance confirmado (PLAN_IMPLEMENTACION.md CH-05): eliminación total de tipos deprecated; campos `eventoId` y `proposal` removidos; solo `reclamo-place` permanece; migración con política de DELETE; nuevo endpoint de cola admin `GET /solicitudes`.

## Change Summary

Refactor del modelo `solicitudes` eliminando todos los tipos excepto `reclamo-place`. Remover campos `eventoId` y `proposal` de entity/adapter/DTOs. Conservar campos requeridos `placeId` y `solicitanteUid` (más `usuarioId`, `status`, `comentarios?`, `revisadoPor?`, `revisadoAt?`, `createdAt`). Mantener lógica de aprobación transaccional con auto-reject de otros reclamos pendientes del mismo `placeId`. Limpieza física de residuos legacy en `application/` y módulo `places`. Nuevo endpoint de cola admin. Migración one-time idempotente con política de delete.

> **Nota de estado:** una sesión previa dejó sin commit parte de la implementación (entity, repository interface, core del service, adapter, y edits parciales en `docs/api-spec.yml`, `docs/data-model.md`, `openspec/specs/solicitudes/spec.md`). Las tasks de docs dicen "revisar/completar", no rehacer desde cero.

---

### Task 1: Docs canónicas + spec delta — SDD pre-código

- [x] 1.1 Revisar/completar `docs/data-model.md` §solicitudes: enum `SolicitudTipo` con único valor `reclamo-place`; sin `eventoId` ni `proposal`; `placeId` y `solicitanteUid` required; nota de política de migración (DELETE de tipos deprecated, backfill de `solicitanteUid`).
- [x] 1.2 Revisar/completar `docs/api-spec.yml`: `SolicitudDto` ya agregado (sin commit) — verificar; AGREGAR path `GET /solicitudes` (admin-only, query `status/page/limit`, respuesta envelope `{data, meta}`); remover schemas de tipos deprecated si existen.
- [x] 1.3 Revisar/completar `openspec/specs/solicitudes/spec.md` (main spec, editada sin commit) para alinearla con el delta `openspec/changes/2026-09-01-solicitudes-refactor/specs/solicitudes/spec.md` (mensajes de error exactos del código, semántica de `usuarioId` en reclamos, requerimiento de listado y migración).
- [x] 1.4 `openspec validate 2026-09-01-solicitudes-refactor --strict` pasa sin errores.
- Priority: High | Layer: Docs | Estimate: 1.5h
- Suggested Path: `docs/data-model.md`, `docs/api-spec.yml`, `openspec/specs/solicitudes/spec.md`

### Task 2: Domain — entity tests de consolidación (TDD)

- [x] 2.1 Completar tests en `backend/src/modules/solicitudes/domain/solicitud.entity.spec.ts` (archivo nuevo sin commit): campos obligatorios `placeId`, `solicitanteUid`; `tipo` limitado a `'reclamo-place'`; ausencia de `eventoId`/`proposal` en el tipo compilado.
- [x] 2.2 Verificar `backend/src/modules/solicitudes/domain/solicitud.entity.ts` (ya refactorizada): interface estricta, sin cambios esperados.
- [x] 2.3 Tests verdes + lint.
- Priority: High | Layer: Domain | Estimate: 0.5h
- Suggested Path: `backend/src/modules/solicitudes/domain/solicitud.entity.ts`
- Test Path: `backend/src/modules/solicitudes/domain/solicitud.entity.spec.ts`

### Task 3: Application — service: validación + limpieza legacy (TDD)

- [x] 3.1 Test fallido: `solicitudes.service.spec.ts` — mensajes exactos: `eventoId` presente → `400` con `El campo 'eventoId' ha sido removido en CH-05 solicitudes-refactor. Use placeId para solicitudes de tipo 'reclamo-place'.`; `placeId` ausente → `400` con `Tipo de solicitud no permitido en esta fase. Solo 'reclamo-place' es válido.`
- [x] 3.2 Eliminar `createEventoSolicitud()` del service y de `solicitudes-service.interface.ts` (con `CreateEventoSolicitudInput`); eliminar `SolicitudesServiceInterface.create` deprecated; eliminar constantes muertas `XOR_REFERENCE_MESSAGE` y `EVENTO_HANDLER_MISSING`; eliminar `SolicitudesService.existsByPlaceId` (sin consumidores runtime).
- [x] 3.3 Eliminar `EventoApprovalHandler` + `EVENTO_APPROVAL_HANDLER` de `approval-handlers.ts` y su inyección `@Optional()` en el service; eliminar `PlaceApprovalHandler.approveRegistro` de la interfaz.
- [x] 3.4 Actualizar `backend/src/modules/solicitudes/application/solicitudes.service.extra-branches.spec.ts` (remover branches de tipos/campos eliminados).
- [x] 3.5 Tests verdes + lint.
- Priority: High | Layer: Application | Estimate: 1.5h
- Suggested Path: `backend/src/modules/solicitudes/application/solicitudes.service.ts`, `backend/src/modules/solicitudes/application/solicitudes-service.interface.ts`, `backend/src/modules/solicitudes/application/approval-handlers.ts`
- Test Path: `backend/src/modules/solicitudes/application/solicitudes.service.spec.ts`

### Task 4: Infrastructure — PlacesApprovalHandler: remover `approveRegistro` (TDD)

- [x] 4.1 Actualizar `backend/src/modules/places/application/place-approval.handler.ts`: eliminar `approveRegistro` (tipo `registro` deprecated).
- [x] 4.2 Actualizar `backend/src/modules/places/application/place-approval.handler.spec.ts`: remover describe de `approveRegistro`; mantener cobertura de `approveReclamo` (transferencia + auto-reject) y `rejectReclamo`.
- [x] 4.3 Actualizar `backend/src/modules/places/places.module.spec.ts`: el chequeo estructural `(repo as SolicitudesRepositoryInterface).existsByPlaceId` debe pasar a usar la interfaz local de places (`places/domain/solicitudes-repository.interface.ts`) si el método se remueve de la interfaz del módulo solicitudes.
- [x] 4.4 Tests verdes + lint.
- Priority: High | Layer: Infrastructure | Estimate: 1h
- Suggested Path: `backend/src/modules/places/application/place-approval.handler.ts`
- Test Path: `backend/src/modules/places/application/place-approval.handler.spec.ts`

### Task 5: Infrastructure — repository interface + contrato LSP (TDD)

- [x] 5.1 Test fallido: crear `backend/src/modules/solicitudes/domain/solicitudes-repository.contract.spec.ts` (patrón: `backend/src/modules/places/domain/solicitudes-repository.contract.spec.ts`) — contrato con `create`, `findById`, `findPendingReclamosByPlaceId`, `findPendingQueue`, `update` (ISP ≤ 5) y sin `existsByPlaceId`/métodos `eventoId`.
- [x] 5.2 Actualizar `backend/src/modules/solicitudes/domain/solicitudes-repository.interface.ts`: remover `existsByPlaceId`; agregar `findPendingQueue(status: Solicitud["status"], page: number, limit: number): Promise<{ items: Solicitud[]; total: number }>`.
- [x] 5.3 Verificar que `SolicitudesFirestoreAdapter` sigue satisfaciendo estructuralmente la interfaz local de places (places conserva `existsByPlaceId` para su guard de delete).
- [x] 5.4 Tests verdes.
- Priority: High | Layer: Infrastructure | Estimate: 1h
- Suggested Path: `backend/src/modules/solicitudes/domain/solicitudes-repository.interface.ts`
- Test Path: `backend/src/modules/solicitudes/domain/solicitudes-repository.contract.spec.ts`

### Task 6: Infrastructure — cola admin: controller + service + adapter (TDD)

- [x] 6.1 Test fallido: `solicitudes.controller.spec.ts` — `GET /solicitudes` admin → `200` envelope `{data, meta}` solo `reclamo-place` pendientes; owner → `403`; anónimo → `401`; cola vacía → `data: []`, `meta.total: 0`.
- [x] 6.2 Crear `backend/src/modules/solicitudes/infrastructure/dto/query-solicitudes.dto.ts`: `status` (`@IsIn(['pendiente','aprobado','rechazado'])`, default `'pendiente'`), `page` (`@IsOptional @IsInt @Min(1)`, default 1), `limit` (`@IsOptional @IsInt @Min(1) @Max(100)`, default 20).
- [x] 6.3 Implementar handler `GET /solicitudes` en `solicitudes.controller.ts` (`@Get()`, hereda `@Roles('admin')` de clase) + método `listarSolicitudes(query)` en el service delegando en `repo.findPendingQueue`.
- [x] 6.4 Test fallido: `solicitudes-firestore.adapter.spec.ts` — `findPendingQueue` filtra `tipo === 'reclamo-place'` + `status`, ordena `createdAt DESC`, pagina; `toPersistence` nunca escribe `eventoId`/`proposal`.
- [x] 6.5 Implementar `findPendingQueue` en `solicitudes-firestore.adapter.ts` (query compuesta; count total para `meta`).
- [x] 6.6 Tests verdes + lint.
- Priority: High | Layer: Infrastructure | Estimate: 2h
- Suggested Path: `backend/src/modules/solicitudes/infrastructure/solicitudes.controller.ts`, `backend/src/modules/solicitudes/infrastructure/solicitudes-firestore.adapter.ts`
- Test Path: `backend/src/modules/solicitudes/infrastructure/solicitudes.controller.spec.ts`, `backend/src/modules/solicitudes/infrastructure/solicitudes-firestore.adapter.spec.ts`

### Task 7: Infrastructure — Firestore indexes update

- [x] 7.1 Actualizar `firestore.indexes.json` (raíz): eliminar índice `solicitudes: eventoId + status`; agregar `solicitudes: tipo ASC + status ASC + createdAt DESC`; conservar `placeId + status` y `status + createdAt DESC`.
- [x] 7.2 Validar queries de cola contra emulador Firestore (si disponible) — `tipo + status + orderBy(createdAt)`.
- Priority: Medium | Layer: Infrastructure | Estimate: 0.5h
- Suggested Path: `firestore.indexes.json`

### Task 8: Migration script — política DELETE (TDD en emulador)

- [x] 8.1 Crear `backend/scripts/migrate-solicitudes.ts` (patrón: `migrate-places-verificacion.ts`), idempotente, con reporte `{ scanned, deleted, backfilled, orphans }`:
  - Docs con `tipo != 'reclamo-place'` → DELETE por lotes (`WriteBatch`, máx 500 ops).
  - Docs `reclamo-place` sin `solicitanteUid` con `usuarioId` presente → backfill `solicitanteUid = usuarioId`.
  - Docs sin ambos UIDs → log warning con doc ID, sin destruir (contados en `orphans`).
- [x] 8.2 Registrar `migrate:solicitudes` en `backend/package.json` (`ts-node scripts/migrate-solicitudes.ts`).
- [x] 8.3 Test en emulador Firestore: seed de docs modelo viejo (4 tipos deprecated + reclamo sin `solicitanteUid` + reclamo completo + huérfano) → ejecutar migración → verificar deletes/backfill/orphans → re-ejecutar y verificar idempotencia (contadores en cero salvo `scanned`).
- [x] 8.4 Documentar en `backend/scripts/README.md`: one-time, backup recomendado antes de producción.
- Priority: Medium | Layer: Tooling | Estimate: 2h
- Suggested Path: `backend/scripts/migrate-solicitudes.ts`
- Test Path: `backend/scripts/migrate-solicitudes.spec.ts` (emulador)

### Task 9: E2E — flujos completos (Supertest)

- [x] 9.1 Crear `backend/test/solicitudes-e2e.spec.ts` (patrón: `catalog-crud-e2e.spec.ts` + helpers): owner reclama place → admin lista cola → aprueba → `place.usuarioId` asignado + otros reclamos del place auto-rechazados.
- [x] 9.2 E2E: owner reclama → admin rechaza con `comentarios` → place sin modificar, solicitud `rechazado`.
- [x] 9.3 E2E: guards de `GET /solicitudes` — owner `403`, anónimo `401`, admin `200`.
- [x] 9.4 E2E: `POST /solicitudes/:id/approve` sobre solicitud ya revisada → `409`.
- Priority: High | Layer: Test | Estimate: 2h
- Suggested Path: `backend/test/solicitudes-e2e.spec.ts`
- Test Path: `backend/test/solicitudes-e2e.spec.ts`

### Task 10: Validación final del change

- [x] 10.1 `npm --prefix backend run lint` pasa sin violations.
- [x] 10.2 `npm --prefix backend run build` pasa.
- [x] 10.3 `npm --prefix backend test` pasa con cobertura ≥ 90% en módulos tocados (solicitudes + places handler).
- [x] 10.4 `openspec validate 2026-09-01-solicitudes-refactor --strict` pasa.
- [x] 10.5 Solid-lint (`make solid-lint`) pasa sin violations (max-lines, complexity, DIP, ISP).
- Priority: High | Layer: Verification | Estimate: 1h

### Task 11: Docs — sync post-implementación + tracking

- [x] 11.1 Sync final `docs/api-spec.yml`: path `GET /solicitudes` con response schema (`SolicitudDto` + envelope) y códigos 200/401/403.
- [x] 11.2 Sync final `docs/data-model.md` §solicitudes e índices (bloque de índices: eliminar referencia `eventoId`, agregar `tipo+status+createdAt`).
- [x] 11.3 Al archivar (`/archive`): marcar CH-05 como ✅ DONE en `PLAN_IMPLEMENTACION.md` con la ruta del change archivado.
- Priority: High | Layer: Docs | Estimate: 1h
- Suggested Path: `docs/api-spec.yml`, `docs/data-model.md`, `PLAN_IMPLEMENTACION.md`
