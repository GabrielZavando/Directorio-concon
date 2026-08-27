# Tasks — eventos-refactor (CH-04)

> Una task a la vez. TDD obligatorio: test fallido → implementación mínima → refactor → verde.
> Docs/OpenSpec updates ANTES del código (SDD).
> SOLID thresholds: file ≤ 300 líneas, complexity ≤ 10, max-params ≤ 3.
> Cobertura ≥ 90% en módulos backend tocados.
> Alcance confirmado: sin `EmailVerifiedGuard` (Firebase maneja verificación); sin staged update (edición unificada con reversión a pendiente); visible inmediato sin solicitud; soft-delete; `NotificacionesPort` no-op (CH-06 lo implementa); eliminación física de tipos evento diferida a CH-05.

## 1. Docs canónicas + specs delta — SDD pre-código

- [x] 1.1 Actualizar `docs/data-model.md` §eventos: reemplazar campos (`status`, `verificado`, `placeId`, `ubicacionNombre`, `ubicacionDireccion` planos) por (`activo`, `estadoVerificacion`, `motivoRechazoVerificacion`, `cambios[]`, `ubicacion.{nombreLugar, direccion, coordenadas}`). Mantener `estado`, `destacado`, `usuarioId` required.
- [x] 1.2 Actualizar `docs/api-spec.yml`: schema `Evento` con campos nuevos/eliminados; `CreateEvento`/`UpdateEvento` con `ubicacion` y sin `placeId`; `POST /eventos` sin auto-solicitud; `GET /eventos` con filtro `estadoVerificacion`; `DELETE /eventos` soft-delete `{deleted, id, activo:false}`; nuevo `POST /eventos/{id}/verificar` con `VerificarEventoDto` (resultado enum + motivo condicional).
- [x] 1.3 `openspec validate eventos-refactor` pasa sin errores (proposal, design, specs, tasks).
- Priority: High | Layer: Docs | Estimated: 2h

## 2. Domain layer — Evento entity + Ubicacion VO + EstadoVerificacion (TDD)

- [x] 2.1 Test fallido: `evento.entity.spec.ts` — Evento interface con campos nuevos (`activo`, `estadoVerificacion`, `motivoRechazoVerificacion`, `cambios[]`, `ubicacion`) y sin `status`/`verificado`/`placeId`.
- [x] 2.2 Crear `ubicacion.vo.ts` (VO `{ nombreLugar?, direccion, coordenadas }` con validación de coordenadas).
- [x] 2.3 Crear `cambio-evento.interface.ts` (type `CambioEvento = { campo, valorAnterior, valorNuevo, fecha, usuarioId }`).
- [x] 2.4 Promover/crear `estado-verificacion.ts` type (`'pendiente'|'verificado'|'rechazado'`) en ubicación compartida si no existe en `eventos/domain` (reusa el de places si aplica).
- [x] 2.5 Actualizar `evento.entity.ts`: agregar campos nuevos, `ubicacion`; eliminar `status`, `verificado`, `placeId`, `ubicacionNombre`, `ubicacionDireccion`.
- [x] 2.6 Eliminar `evento-status.enum.ts` (o marcar legacy con comment deprecation).
- [x] 2.7 Tests verdes + lint.
- Priority: High | Layer: Domain | Estimated: 2h

## 3. Domain layer — Repository interfaces (TDD)

- [x] 3.1 Test fallido: `evento-repository.contract.spec.ts` — new filters `activo?`, `estadoVerificacion?` en `EventoSearchFilters`; métodos read con filtro `activo`.
- [x] 3.2 Actualizar `evento-repository.interface.ts`: `EventoSearchFilters` con `activo?`, `estadoVerificacion?`; `findAllPublic`/`findAllAdmin` usan esos filtros; `findById`/`findBySlug` devuelven `null` si inactivo (o el adapter filtra — definir contrato).
- [x] 3.3 Tests verdes.
- Priority: High | Layer: Domain | Estimated: 1h

## 4. Application layer — EventosService create + reads (TDD)

- [x] 4.1 Test fallido: `create()` sin auto-creación de solicitud, con `activo:true`, `estadoVerificacion:'pendiente'`, `ubicacion` mapeado.
- [x] 4.2 Actualizar `create`: eliminar llamada a `solicitudService.createEventoSolicitud`; setear campos nuevos; build `ubicacion` desde DTO.
- [x] 4.3 Test fallido: `findAllPublic`/`findOnePublic`/`findBySlugPublic`/`listMapData` filtran `activo=true` (no `status`).
- [x] 4.4 Actualizar reads públicos: filtro `activo=true`; incluir `estadoVerificacion` en respuestas; `map-data` con `ubicacion.coordenadas`.
- [x] 4.5 Tests verdes + lint.
- Priority: High | Layer: Application | Estimated: 2.5h

## 5. Application layer — EventosService update unificado + reversión (TDD)

- [x] 5.1 Test fallido: `update()` aplica in-place siempre; si `estadoVerificacion === 'verificado'` → revierte a `'pendiente'` + popula `cambios[]`.
- [x] 5.2 Crear `eventos-service.helpers.ts`: `computeChanges(existing, dto, usuarioId)` → `CambioEvento[]`.
- [x] 5.3 Actualizar `update`: eliminar rama `stageApprovedUpdate`; aplicar patch in-place; revertir + `cambios` si era verificado.
- [x] 5.4 Test fallido: update de evento pendiente NO revierte (solo aplica + `cambios` opcional).
- [x] 5.5 Test fallido: update dispara notificación `evento_revertido_pendiente` vía `NotificacionesPort` cuando revierte.
- [x] 5.6 Definir `NotificacionesPort` interface + token; inyectar en `EventosService`; crear `NoopNotificacionesAdapter` (en módulo eventos o shared) para CH-04.
- [x] 5.7 Tests verdes + lint.
- Priority: High | Layer: Application | Estimated: 3.5h

## 6. Application layer — EventosService verificar + soft-delete (TDD)

- [x] 6.1 Test fallido: `verificar()` caso verificado → `estadoVerificacion='verificado'`, `fechaPublicacion=now`.
- [x] 6.2 Implementar `verificar()`: caso verificado.
- [x] 6.3 Test fallido: `verificar()` caso rechazado con `motivo` → `estadoVerificacion='rechazado'`, `activo=false`, `motivoRechazoVerificacion=motivo`.
- [x] 6.4 Implementar `verificar()`: caso rechazado.
- [x] 6.5 Test fallido: `verificar()` sin `motivo` en rechazo → 400.
- [x] 6.6 Crear `VerificarEventoDto` con validación condicional (`motivo` required si `resultado==='rechazado'`).
- [x] 6.7 Test fallido: `remove()` soft-delete (`activo:false`), sin chequeo de solicitudes pendientes.
- [x] 6.8 Actualizar `remove`: `activo:false` (no hard delete); eliminar el 409 por solicitudes pendientes.
- [x] 6.9 Tests verdes + lint.
- Priority: High | Layer: Application | Estimated: 3h

## 7. Infrastructure layer — EventoFirestoreAdapter + mapper (TDD)

- [x] 7.1 Test fallido: adapter `findAllPublic` default `activo=true`.
- [x] 7.2 Actualizar `EventoFirestoreDoc` interface: campos nuevos/eliminados; `ubicacion` anidado.
- [x] 7.3 Actualizar `toDomain`/`toPersistence` con `ubicacion` VO y campos nuevos; quitar `status`/`verificado`/`placeId`.
- [x] 7.4 Test fallido: `findById`/`findBySlug` filtran `activo=true` en reads públicos (definir si el contrato filtra o el service).
- [x] 7.5 Actualizar `findBySlug`/`findById` para respetar `activo`.
- [x] 7.6 Test fallido: `update` persiste `cambios[]` y `estadoVerificacion` revertido.
- [x] 7.7 Tests verdes + lint.
- Priority: High | Layer: Infrastructure | Estimated: 3h

## 8. Infrastructure layer — Controller + DTOs (TDD)

- [x] 8.1 Test fallido: controller `POST /eventos` con `ubicacion` y sin `placeId`; 201 sin solicitud.
- [x] 8.2 Crear `UbicacionDto` con validación anidada (`direccion` required, `coordenadas` required, `nombreLugar` optional).
- [x] 8.3 Actualizar `CreateEventoDto`/`UpdateEventoDto`: `ubicacion`, quitar `placeId`, `ubicacionNombre`, `ubicacionDireccion`.
- [x] 8.4 Test fallido: controller `POST /eventos/:id/verificar` → 200, evento updated.
- [x] 8.5 Implementar endpoint `verificar` en `EventosController` (`@Roles('admin')`).
- [x] 8.6 Test fallido: `GET /eventos?estadoVerificacion=pendiente`.
- [x] 8.7 Actualizar `QueryEventoDto`: `estadoVerificacion?`.
- [x] 8.8 Test fallido: `DELETE` soft-delete response `{deleted:true, id, activo:false}`.
- [x] 8.9 Actualizar controller delete response.
- [x] 8.10 Tests verdes + lint.
- Priority: High | Layer: Infrastructure | Estimated: 2.5h

## 9. Solicitudes cleanup en módulo eventos

- [x] 9.1 Eliminar `solicitudes-service.interface.ts` del módulo eventos.
- [x] 9.2 Eliminar `evento-approval.handler.ts` del módulo eventos.
- [x] 9.3 Actualizar `eventos.module.ts`: quitar provider/wiring de `SOLICITUDES_SERVICE` y `SolicitudesServiceInterface`.
- [x] 9.4 Marcar tipos `registro-evento`/`actualizacion-evento` como deprecated en `solicitudes` spec delta (ya hecho en Task 1/specs) — verificar consistencia con CH-05.
- [x] 9.5 Tests verdes (el módulo eventos ya no inyecta solicitudes).
- Priority: High | Layer: Application | Estimated: 1.5h

## 10. Firestore indexes (TDD)

- [x] 10.1 Actualizar `firestore.indexes.json`: reemplazar `status` por `activo` en índices de eventos.
- [x] 10.2 Agregar índice: `eventos: activo + estadoVerificacion + createdAt` (cola admin).
- [x] 10.3 Validar con Firebase emulators: `firebase emulators:start` + queries.
- Priority: High | Layer: Infrastructure | Estimated: 1h

## 11. Migration script (TDD)

- [x] 11.1 Crear `backend/scripts/migrate-eventos-verificacion.ts` (idempotente): skip si ya tiene `activo`; mapear `activo = status==='aprobado'`, `estadoVerificacion = verificado?'verificado':'pendiente'`; reconstruir `ubicacion` desde planos; eliminar `status`/`verificado`/`placeId`.
- [x] 11.2 Registrar `npm run migrate:eventos` en `backend/package.json`.
- [x] 11.3 Test en emulador Firestore: crear eventos con modelo viejo → ejecutar migración → verificar modelo nuevo.
- [x] 11.4 Documentar en `backend/scripts/README.md`.
- Priority: Medium | Layer: Tooling | Estimated: 1.5h

## 12. Tests — Unit (TDD)

- [x] 12.1 `eventos.service.spec.ts`: actualizar create (sin solicitud), update (reversión + cambios), verificar, remove (soft-delete).
- [x] 12.2 `eventos-service.helpers.spec.ts`: `computeChanges`, `buildUbicacion`.
- [x] 12.3 `evento-validator.spec.ts`: actualizar asserts (sin `placeId`, con `ubicacion`).
- [x] 12.4 `create-evento.dto.spec.ts`: validación de `ubicacion` anidado.
- [x] 12.5 Cobertura ≥ 90% en módulos tocados.
- Priority: High | Layer: Test | Estimated: 3h

## 13. Tests — Integration (TDD)

- [x] 13.1 `EventoFirestoreAdapter`: CRUD, search activo, mapper bidireccional con `Ubicacion` (emulador Firestore).
- [x] 13.2 `evento-firestore.adapter.spec.ts`: queries `activo=true`, `cambios[]` persistencia.
- [x] 13.3 Cobertura ≥ 90% en adapters.
- Priority: High | Layer: Test | Estimated: 2h

## 14. Tests — E2E (TDD)

- [x] 14.1 E2E: Owner crea evento → visible público inmediato → admin verifica → badge verde.
- [x] 14.2 E2E: Admin rechaza → evento despublicado (`activo:false`, motivo stored).
- [x] 14.3 E2E: Owner edita evento verificado → revierte a pendiente + `cambios[]` poblado + notifica admin (puerto no-op mock).
- [x] 14.4 E2E: PUT evento sin ownership → 403.
- [x] 14.5 E2E: DELETE soft-delete → `activo:false`, GET 404.
- [x] 14.6 E2E: POST `placeId` → 400; `ubicacion` requerido.
- Priority: High | Layer: Test | Estimated: 2.5h

## 15. Validación final del change

- [x] 15.1 `npm --prefix backend run lint` pasa sin violations.
- [x] 15.2 `npm --prefix backend run build` pasa.
- [x] 15.3 `npm --prefix backend test` pasa con cobertura ≥ 90% en módulos tocados.
- [x] 15.4 `openspec validate eventos-refactor --strict` pasa.
- [x] 15.5 Solid-lint pasa sin violations (max-lines, complexity, DIP, ISP).
- [x] 15.6 Marcar CH-04 como DONE en `PLAN_IMPLEMENTACION.md` (al archivar el change).
- Priority: High | Layer: Verification | Estimated: 1.5h
