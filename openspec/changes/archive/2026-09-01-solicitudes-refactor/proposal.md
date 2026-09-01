# Proposal — Solicitudes Refactor

## Ticket Origin

- **Ticket ID**: CH-05
- **Original title**: Solicitudes refactor - reducir tipos a reclamo-place
- **Tag**: backend (affects backend entity, application service, controllers, infrastructure, migration; no frontend work)
- **Derived change name**: solicitudes-refactor
- **Change folder**: openspec/changes/2026-09-01-solicitudes-refactor/

## Summary

Refactor del modelo `Solicitud` eliminando todos los tipos excepto `reclamo-place`. Los tipos `registro`, `actualizacion`, `registro-evento` y `actualizacion-evento` serán removidos físicamente del código y la base de datos. Se conservarán solo los campos `placeId` y `solicitanteUid` como campos requeridos. Los campos `eventoId` y `proposal` serán removidos del contrato de persistencia. La lógica de aprobación transaccional con auto-reject de otros reclamos pendientes del mismo `placeId` se mantendrá del change CH-03.

## Motivation

El modelo actual de solicitudes soporta múltiples tipos (`registro`, `actualizacion`, `registro-evento`, `actualizacion-evento`) que ya no son necesarios después del refactor de places (CH-03) y eventos (CH-04). Mantener estos tipos obsoletos complica la validación XOR `placeId` ⊕ `eventoId`, introduce campos innecesarios en la entidad, y los endpoints asociados a tipos deprecated ya no tienen casos de uso en el MVP. El scope reduce a un único tipo: `reclamo-place`, que es el necesario para el flujo de reclamación de places por parte de owners.

## Changes Required

### 1. Domain Entity (`solicitud.entity.ts`)
- Remover tipos `registro`, `actualizacion`, `registro-evento`, `actualizacion-evento` del enum `SolicitudTipo`
- Dejar solo `'reclamo-place'`
- Remover campo `eventoId` de la entidad
- Remover campo `proposal` de la entidad
- Hacer `placeId` y `solicitanteUid` campos obligatorios (required) para todos los tipos restantes
- Actualizar validador inline: si `tipo !== 'reclamo-place'` → error de validación de dominio

### 2. Application Service (`solicitudes.service.ts`)

> Estado actual (sesión previa, sin commit): la entity, el repository interface y el core del service ya están refactorizados. Esta change consolida y completa.

- Simplificar `assertXorConstraint(input)`: solo valida `placeId` presente (XOR con `eventoId` removido). Si viene `eventoId`, lanzar 400 con el mensaje de campo obsoleto (ya implementado — mantener).
- Mantener `dispatchApproval` case `reclamo-place`: transacción auto-reject de otros reclamos pendientes mismo `placeId` (delegado a `PlaceApprovalHandlerImpl` del módulo places).
- **Limpieza legacy (remoción física):**
  - Eliminar `createEventoSolicitud()` del service y `CreateEventoSolicitudInput` de `solicitudes-service.interface.ts` (hoy solo autorreferenciados).
  - Eliminar `SolicitudesServiceInterface.create` deprecated (firma con `eventoId?` opcional).
  - Eliminar `EventoApprovalHandler` + `EVENTO_APPROVAL_HANDLER` de `approval-handlers.ts` (no existe implementación desde CH-04) y su inyección `@Optional()` en el service.
  - Eliminar `PlaceApprovalHandler.approveRegistro` de la interfaz y su implementación en `places/application/place-approval.handler.ts` (+ tests asociados).
  - Eliminar constantes muertas `XOR_REFERENCE_MESSAGE` y `EVENTO_HANDLER_MISSING`.
  - Eliminar `SolicitudesService.existsByPlaceId` (sin consumidores runtime — places usa su propio repo inyectado).

### 3. Controller (`solicitudes.controller.ts`)

- **NUEVO endpoint de cola admin:** `GET /solicitudes` (`@Roles('admin')`) — lista solo `tipo === 'reclamo-place'` (filtro server-side obligatorio), query params `status` (default `'pendiente'`), `page`, `limit`; respuesta en envelope `{ data, meta }`. Cierra la deuda "endpoints de listado/filtrado de solicitudes" (AGENTS.md §8.4 / PLAN CH-05).
- Mantener `POST /solicitudes/:id/approve|reject` (sin cambios funcionales).
- El `ValidationPipe` global (`whitelist + forbidNonWhitelisted`) rechaza campos `eventoId`, `proposal` en bodies.

### 4. Repository Interface (`solicitudes-repository.interface.ts`)

- ISP ≤ 5 métodos: remover `existsByPlaceId` (su único consumidor runtime es `PlacesService`, que bindea su propia interfaz local) y agregar `findPendingQueue(status, page, limit)` para la cola admin.
- Firma final: `create`, `findById`, `findPendingReclamosByPlaceId`, `findPendingQueue`, `update`.
- Contrato LSP: crear `solicitudes-repository.contract.spec.ts` (patrón existente en `places/domain/solicitudes-repository.contract.spec.ts`).

### 5. Firestore Adapter (`solicitudes-firestore.adapter.ts`)

- `toPersistence()` sin campo `eventoId` ni `proposal` (ya implementado en sesión previa — consolidar con tests).
- `toDomain()` mapea solo campos activos (`placeId`, `usuarioId`, `tipo`, `status`, `solicitanteUid`, `comentarios`, `revisadoPor`, `createdAt`, `revisadoAt`).
- La validación de `eventoId` presente vive en el SERVICE (`BadRequestException` 400, mensaje de campo removido) — el adapter nunca la escribe; no duplicar el gate en el adapter.

### 7. Firestore Indexes (`firestore.indexes.json` — raíz del repo)

- Eliminar el índice legacy `solicitudes: eventoId + status` (referencia campo removido).
- Agregar índice compuesto `solicitudes: tipo ASC + status ASC + createdAt DESC` (cola admin `GET /solicitudes?status=pendiente`).
- Conservar `solicitudes: placeId + status` y `solicitudes: status + createdAt DESC`.

### 8. Migration Script (`backend/scripts/migrate-solicitudes.ts`)

> Política confirmada en `PLAN_IMPLEMENTACION.md` CH-05: **eliminar** los docs deprecated (NO convertirlos a `reclamo-place` — convertir un `registro` en un reclamo fabricaría claims inexistentes y podría transferir ownership al aprobarse).

- Idempotente, one-time, con reporte `{ scanned, deleted, backfilled, orphans }`:
  1. Docs con `tipo != 'reclamo-place'` (`registro`, `actualizacion`, `registro-evento`, `actualizacion-evento`) → **DELETE** (recomendar backup antes de producción).
  2. Docs `reclamo-place` sin `solicitanteUid` → backfill desde `usuarioId` cuando esté presente.
  3. Docs sin `solicitanteUid` ni `usuarioId` → reportar como huérfanos (log con doc ID), sin tocarlos.
  4. Re-ejecución no produce cambios adicionales (contadores en cero salvo `scanned`).
- Batching por writer.batch; npm script `migrate:solicitudes` en `backend/package.json`.
- Nota: el nombre sigue el patrón de los scripts existentes (`migrate-places-verificacion.ts`, `migrate-eventos-verificacion.ts`).

### 9. Testing

- Unit tests: service (create con validación campo removido, approve/reject reclamo), entity, adapter (persistencia sin `eventoId`/`proposal`), controller (listado admin + guards).
- Integration tests: adapter Firestore, query de cola `tipo=reclamo-place` + `status=pendiente` paginada.
- Migration: test en emulador Firestore (delete de tipos deprecated, backfill, idempotencia).
- E2E flows: owner reclama place → admin lista cola → aprueba/rechaza; auto-reject de otros reclamos mismo `placeId`.

## Non-Functional Constraints

- Cobertura de tests ≥ 90% en módulos backend tocados
- Tipo completo en todo el código; no permitir `any` sin justificación explícita
- Respuestas consistentes con el formato del `TransformInterceptor` (envuelto en `data`)
- No exponer errores internos en producción
- Solid-lint: max-lines ≤ 300, complexity ≤ 10, max-params ≤ 3, DIP/ISP compliance

## Out of Scope (esta fase)

- Creación de nuevos tipos de solicitud beyond `reclamo-place`
- Cambio al modelo de usuarios o roles (fuera del scope CH-05)
- Refactor del módulo eventos (quedaría en cambio futuro)
- Modificaciones al diseño visual del frontend
- Consolidar la interfaz duplicada `places/domain/solicitudes-repository.interface.ts` (patrón repetido detectado — candidato a refactor propio; places sigue bindeando su interfaz local estructuralmente compatible)
- Rewirear `PlacesService.reclamar` para que pase por `SolicitudesService.create` (hoy crea directo por repo, comportamiento CH-03 vigente)

## Validation

After implementation, validar con:
- `openspec validate 2026-09-01-solicitudes-refactor --strict` pasa sin errores
- `npm --prefix backend run lint` pasa sin violations
- `npm --prefix backend run build` pasa
- `npm --prefix backend test` pasa con cobertura ≥ 90% en módulos tocados
- Migración idempotente probada en emulador Firestore