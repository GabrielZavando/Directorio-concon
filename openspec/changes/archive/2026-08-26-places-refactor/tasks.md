# Tasks — places-refactor (CH-03)

> Una task a la vez. TDD obligatorio: test fallido → implementación mínima → refactor → verde.
> Docs/OpenSpec updates ANTES del código (SDD).
> SOLID thresholds: file ≤ 300 líneas, complexity ≤ 10, max-params ≤ 3.
> Cobertura ≥ 90% en módulos backend tocados.
> Alcance confirmado: sin EmailVerifiedGuard (Firebase maneja verificación); sin reversión de estadoVerificacion en PUT; visible inmediato sin solicitud; soft-delete; migración idempotente.

## Change Summary

Refactor del modelo `places` de `status + verificado` a `activo + estadoVerificacion`. Eliminación de solicitud auto-creada en POST /places. Nuevos endpoints: POST /places/:id/reclamar (owner) y POST /places/:id/verificar (admin). Soft-delete con activo:false. Nuevo tipo `reclamo-place` en solicitudes con aprobación transaccional. Migración idempotente de places existentes.

---

### Task 1: Actualizar docs canónicas + validar specs delta — SDD pre-código

- [x] 1.1 Actualizar `docs/data-model.md` §places:
  - Reemplazar tabla de campos: eliminar `status`, `verificado`, `fechaVerificacion`. Agregar `activo`, `estadoVerificacion`, `motivoRechazoVerificacion`, `gestionadoPorAdmin`.
  - Cambiar `usuarioId` de optional a required.
  - Actualizar reglas de negocio: "Place visible inmediatamente", "Badge verificado", "Soft-delete".
  - Documentar campo `fechaPublicacion` como reemplazo de `fechaVerificacion`.
- [x] 1.2 Actualizar `docs/api-spec.yml`:
  - Modificar `POST /places`: quitar referencia a solicitud auto-creada.
  - Modificar `GET /places`: nuevos query params `activo`, `estadoVerificacion`, `sinDueno`.
  - Modificar `DELETE /places`: soft-delete (response incluye `activo: false`).
  - Agregar `POST /places/{id}/reclamar` (owner).
  - Agregar `POST /places/{id}/verificar` (admin).
  - Actualizar schema `Place`: campos nuevos, campos eliminados.
- [x] 1.3 Actualizar `openspec/specs/places/spec.md` (en `openspec/specs/`):
  - Reemplazar requirements de `status` por `activo + estadoVerificacion`.
  - Agregar requirements de claiming y verificación.
  - Eliminar requirement de solicitud auto-creada.
- [x] 1.4 Actualizar `openspec/specs/solicitudes/spec.md` (en `openspec/specs/`):
  - Agregar tipo `reclamo-place` al enum `tipo`.
  - Agregar campo `solicitanteUid`.
  - Agregar requirements de approve/reject reclamo-place.
- [x] 1.5 `openspec validate places-refactor` pasa sin errores.
- Priority: High | Layer: Docs | Estimated: 2h

### Task 2: Domain layer — Place entity + EstadoVerificacion (TDD)

- [x] 2.1 Test fallido: `place.entity.spec.ts` — Place interface con campos nuevos (`activo`, `estadoVerificacion`, `motivoRechazoVerificacion`, `gestionadoPorAdmin`, `usuarioId` required).
- [x] 2.2 Crear `estado-verificacion.ts` (type `EstadoVerificacion = "pendiente" | "verificado" | "rechazado"`).
- [x] 2.3 Actualizar `place.entity.ts`:
  - Agregar campos: `activo`, `estadoVerificacion`, `motivoRechazoVerificacion`, `gestionadoPorAdmin`.
  - Cambiar `usuarioId` de optional a required.
  - Eliminar `status`, `verificado`, `fechaVerificacion`.
  - Agregar import de `EstadoVerificacion`.
- [x] 2.4 Eliminar `place-status.ts` (o renombrar a `place-status.legacy.ts` con comment deprecation).
- [x] 2.5 Tests verdes + lint.
- Priority: High | Layer: Domain | Estimated: 1.5h

### Task 3: Domain layer — Repository interfaces (TDD)

- [x] 3.1 Test fallido: `place-repository.contract.spec.ts` — nuevos métodos `findSinDueno`, `countByUsuarioId`.
- [x] 3.2 Actualizar `place-repository.interface.ts`:
  - Agregar `findSinDueno(filters: { page?: number; limit?: number }): Promise<PaginatedPlaces>`.
  - Agregar `countByUsuarioId(usuarioId: string): Promise<number>`.
  - Actualizar `PlaceSearchFilters`: `activo?`, `estadoVerificacion?`, `sinDueno?`.
- [x] 3.3 Actualizar `solicitudes-repository.interface.ts` (en places/domain/):
  - Agregar `findPendingReclamosByPlaceId(placeId: string): Promise<Solicitud[]>`.
- [x] 3.4 Tests verdes.
- Priority: High | Layer: Domain | Estimated: 1h

### Task 4: Application layer — PlacesService refactor create + search (TDD)

- [x] 4.1 Test fallido: `places.service.spec.ts` — `createPlace` sin solicitud auto-creada, con campos nuevos (`activo: true`, `estadoVerificacion: 'pendiente'`, `gestionadoPorAdmin: false`).
- [x] 4.2 Actualizar `createPlace`: eliminar auto-creación de solicitud, setear campos nuevos.
- [x] 4.3 Test fallido: `search()` default `activo=true`.
- [x] 4.4 Actualizar `search`: default `activo=true` (en vez de `status='aprobado'`), nuevos filtros `estadoVerificacion`, `sinDueno`.
- [x] 4.5 Test fallido: `findBySlug()` con filtro `activo`.
- [x] 4.6 Actualizar `findBySlug`: filtro `activo=true`. 404 si `activo=false`.
- [x] 4.7 Test fallido: `findForMap()` con filtro `activo`.
- [x] 4.8 Actualizar `findForMap`: filtro `activo=true`.
- [x] 4.9 Tests verdes + lint.
- Priority: High | Layer: Application | Estimated: 2.5h

### Task 5: Application layer — PlacesService delete soft + nuevos métodos (TDD)

- [x] 5.1 Test fallido: `delete()` soft-delete (`activo:false`).
- [x] 5.2 Actualizar `delete`: `activo:false` en vez de hard delete. Mantener bloqueo si reclamos pendientes.
- [x] 5.3 Test fallido: `reclamar()` crea solicitud tipo `reclamo-place`.
- [x] 5.4 Implementar `reclamar()` en PlacesService: crea solicitud con `solicitanteUid`.
- [x] 5.5 Test fallido: `verificar()` admin — caso verificado.
- [x] 5.6 Implementar `verificar()` — caso verificado: `estadoVerificacion='verificado'`, `fechaPublicacion=now`.
- [x] 5.7 Test fallido: `verificar()` admin — caso rechazado con motivo.
- [x] 5.8 Implementar `verificar()` — caso rechazado: `estadoVerificacion='rechazado'`, `activo=false`, `motivoRechazoVerificacion=motivo`.
- [x] 5.9 Test fallido: `verificar()` sin motivo → 400.
- [x] 5.10 Implementar `VerificarPlaceDto` con validación condicional (`motivo` required si `resultado === 'rechazado'`).
- [x] 5.11 Tests verdes + lint.
- Priority: High | Layer: Application | Estimated: 3h

### Task 6: Infrastructure layer — PlaceFirestoreAdapter (TDD)

- [x] 6.1 Test fallido: `adapter.search()` default `activo=true`.
- [x] 6.2 Actualizar `PlaceFirestoreDoc` interface: campos nuevos, campos eliminados.
- [x] 6.3 Actualizar `search()`: default `where("activo", "==", true)`, nuevos filtros.
- [x] 6.4 Actualizar `toDomain()`: mapear `activo`, `estadoVerificacion`, `motivoRechazoVerificacion`, `gestionadoPorAdmin`. Quitar `status`, `verificado`, `fechaVerificacion`.
- [x] 6.5 Actualizar `toPersistence()`: mapear campos nuevos. Quitar campos viejos.
- [x] 6.6 Test fallido: `findBySlug()` con filtro `activo`.
- [x] 6.7 Actualizar `findBySlug`: `where("activo", "==", true)`.
- [x] 6.8 Test fallido: `findForMap()` con filtro `activo`.
- [x] 6.9 Actualizar `findForMap`: `where("activo", "==", true)`.
- [x] 6.10 Implementar `findSinDueno()`: query `activo=true` + (`usuarioId == null` OR `gestionadoPorAdmin == true`).
- [x] 6.11 Implementar `countByUsuarioId()`: `where("usuarioId", "==", uid).where("activo", "==", true).count()`.
- [x] 6.12 Tests verdes + lint.
- Priority: High | Layer: Infrastructure | Estimated: 3h

### Task 7: Infrastructure layer — Controller + DTOs (TDD)

- [x] 7.1 Test fallido: controller `POST /places/:id/reclamar` — 201, solicitud created.
- [x] 7.2 Implementar endpoint `reclamar` en `PlacesController`.
- [x] 7.3 Test fallido: controller `POST /places/:id/verificar` — 200, place updated.
- [x] 7.4 Crear `VerificarPlaceDto` con validación condicional.
- [x] 7.5 Implementar endpoint `verificar` en `PlacesController`.
- [x] 7.6 Test fallido: `GET /places?sinDueno=true`.
- [x] 7.7 Actualizar `QueryPlaceDto`: `activo`, `estadoVerificacion`, `sinDueno`.
- [x] 7.8 Test fallido: `DELETE` soft-delete response.
- [x] 7.9 Actualizar controller delete response: `{ deleted: true, id, activo: false }`.
- [x] 7.10 Tests verdes + lint.
- Priority: High | Layer: Infrastructure | Estimated: 2h

### Task 8: Solicitudes module — reclamo-place (TDD)

- [x] 8.1 Test fallido: `solicitudes.service.spec.ts` — `aprobarSolicitud` with `tipo: 'reclamo-place'`.
- [x] 8.2 Actualizar `solicitud.entity.ts`: agregar tipo `'reclamo-place'`, campo `solicitanteUid?: string`.
- [x] 8.3 Actualizar `SolicitudesRepositoryInterface` (en solicitudes/domain): `findPendingReclamosByPlaceId`.
- [x] 8.4 Actualizar `assertXorConstraint`: `reclamo-place` requiere `placeId` + `solicitanteUid`.
- [x] 8.5 Implementar `PlaceApprovalHandler.approveReclamo`: transacción Firestore (place update + auto-rechazo otros reclamos).
- [x] 8.6 Implementar `PlaceApprovalHandler.rejectReclamo`: solo cambia status (sin side-effect en place).
- [x] 8.7 Actualizar `dispatchApproval`: nuevo case `reclamo-place`.
- [x] 8.8 Actualizar `rechazarSolicitud`: nuevo case `reclamo-place`.
- [x] 8.9 Tests verdes + lint.
- Priority: High | Layer: Application | Estimated: 2.5h

### Task 9: Firestore indexes (TDD)

- [x] 9.1 Actualizar `firestore.indexes.json`: reemplazar `status` por `activo` en todos los índices de places.
- [x] 9.2 Agregar índice: `places: activo + estadoVerificacion + createdAt` (cola admin verificación).
- [x] 9.3 Agregar índice: `places: activo + gestionadoPorAdmin + createdAt` (sinDueno).
- [x] 9.4 Agregar índice: `places: slug` (verificar unicidad).
- [x] 9.5 Validar con Firebase emulators: `firebase emulators:start` + queries.
- Priority: High | Layer: Infrastructure | Estimated: 1h

### Task 10: Migration script (TDD)

- [x] 10.1 Crear `backend/scripts/migrate-places-verificacion.ts` (idempotente):
  - Verificar si doc tiene `activo` field → skip si ya migrado.
  - Mapear: `activo = status === 'aprobado'`, `estadoVerificacion = verificado ? 'verificado' : 'pendiente'`.
  - Eliminar campos viejos: `status`, `verificado`, `fechaVerificacion`.
- [x] 10.2 Registrar `npm run migrate:places` en `backend/package.json`.
- [x] 10.3 Test en emulador Firestore: crear places con modelo viejo → ejecutar migración → verificar modelo nuevo.
- [x] 10.4 Documentar en `backend/scripts/README.md`.
- Priority: Medium | Layer: Tooling | Estimated: 1.5h

### Task 11: Tests — Unit (TDD)

- [x] 11.1 `places.service.spec.ts`: actualizar tests existentes + agregar tests para `reclamar`, `verificar`, soft-delete.
- [x] 11.2 `places-service.helpers.spec.ts`: actualizar asserts para campos nuevos.
- [x] 11.3 `PlaceApprovalHandlerImpl.spec.ts`: tests para `approveReclamo`, `rejectReclamo`.
- [x] 11.4 `solicitudes.service.spec.ts`: tests para `aprobarSolicitud` y `rechazarSolicitud` con `reclamo-place`.
- [x] 11.5 Cobertura ≥ 90% en módulos tocados.
- Priority: High | Layer: Test | Estimated: 3h

### Task 12: Tests — Integration (TDD)

- [x] 12.1 `PlaceFirestoreAdapter`: CRUD, search activo, findSinDueno, countByUsuarioId (emulador Firestore).
- [x] 12.2 `SolicitudesFirestoreAdapter`: reclamo-place flow completo.
- [x] 12.3 Cobertura ≥ 90% en adapters.
- Priority: High | Layer: Test | Estimated: 2h

### Task 13: Tests — E2E (TDD)

- [ ] 13.1 E2E: Owner crea place → visible público inmediato → admin verifica → badge verificado.
- [ ] 13.2 E2E: Admin rechaza → place despublicado (activo:false, motivo stored).
- [ ] 13.3 E2E: Owner reclama place admin → auto-rechaza otros reclamos.
- [ ] 13.4 E2E: PUT place sin ownership → 403.
- [ ] 13.5 E2E: DELETE soft-delete → activo:false.
- [ ] 13.6 E2E: GET /places?sinDueno=true → places sin usuarioId o gestionadoPorAdmin.
- Priority: High | Layer: Test | Estimated: 2.5h

### Task 14: Docs — Update canónicas (post-implementación)

- [x] 14.1 Actualizar `openspec/specs/places/spec.md` (en `openspec/specs/`) con todos los requirements nuevos y modificados.
- [x] 14.2 Actualizar `openspec/specs/solicitudes/spec.md` (en `openspec/specs/`) con reclamo-place.
- [x] 14.3 Actualizar `docs/data-model.md` §places con nuevo modelo.
- [x] 14.4 Actualizar `docs/api-spec.yml` endpoints modificados y nuevos.
- [x] 14.5 Actualizar `PLAN_IMPLEMENTACION.md`: CH-03 → DONE (al archivar el change).
- Priority: High | Layer: Docs | Estimated: 1.5h

### Task 15: Validación final del change

- [x] 15.1 `npm --prefix backend run lint` pasa sin violations.
- [x] 15.2 `npm --prefix backend run build` pasa.
- [x] 15.3 `npm --prefix backend test` pasa con cobertura ≥ 90% en módulos tocados.
- [x] 15.4 `openspec validate places-refactor --strict` pasa.
- [x] 15.5 Solid-lint pasa sin violations (max-lines, complexity, DIP, ISP).
- [x] 15.6 Marcar CH-03 como DONE en `PLAN_IMPLEMENTACION.md` (al archivar el change).
- Priority: High | Layer: Verification | Estimated: 1h
