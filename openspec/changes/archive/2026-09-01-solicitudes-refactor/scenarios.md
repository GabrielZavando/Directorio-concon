# Scenarios — Solicitudes Refactor (solicitudes-refactor)

> Escenarios de aceptación en formato Gherkin para el refactor del módulo solicitudes (CH-05).
> Referencias: `docs/data-model.md` §solicitudes, `openspec/specs/solicitudes/spec.md`, `PLAN_IMPLEMENTACION.md` CH-05.
> Mensajes de error alineados a la implementación real (`solicitudes.service.ts`).

## Feature: Tipos de solicitud reducidos a `reclamo-place`

### Scenario 1: Owner reclama un place (creación sin body)

**Given** un owner autenticado con UID `uid-owner-001` (JWT válido) y un place reclamable `place-001` (`usuarioId == null` o `gestionadoPorAdmin === true`)
**When** el owner llama `POST /api/v1/places/place-001/reclamar` **sin body** (`placeId` viene del path, `solicitanteUid` del token)
**Then** la respuesta es `201` con `{ claimed: true, placeId: 'place-001' }`
**And** se crea una `solicitud` con:
- `tipo: 'reclamo-place'`
- `status: 'pendiente'`
- `placeId: 'place-001'`
- `solicitanteUid: 'uid-owner-001'`
- `usuarioId: <place.usuarioId al momento del reclamo>`
- `comentarios: null`
**And** el documento persistido NO contiene `eventoId` ni `proposal`

### Scenario 2: Múltiples reclamos simultáneos sobre el mismo place son permitidos

**Given** el place `place-001` reclamable y dos owners distintos (`uid-owner-001`, `uid-owner-002`)
**When** ambos llaman `POST /api/v1/places/place-001/reclamar`
**Then** ambas respuestas son `201` y existen dos solicitudes `reclamo-place` con `status: 'pendiente'` para `place-001`
**And** ninguna es rechazada en el momento de creación (el auto-reject ocurre al aprobar)

### Scenario 3: Aprobar solicitud `reclamo-place` con auto-reject de otros reclamos

**Given** dos solicitudes `reclamo-place` con `status: 'pendiente'` para `place-001` (`solicitanteUid: 'uid-owner-001'` y `solicitanteUid: 'uid-owner-002'`)
**When** un admin llama `POST /api/v1/solicitudes/{id}/approve` con `Authorization: Bearer <idToken>` admin sobre la solicitud de `uid-owner-001`
**Then** la solicitud aprobada transita a `status: 'aprobado'`, `revisadoPor: <admin uid>`, `revisadoAt: <now>`
**And** el place `place-001` recibe `usuarioId: 'uid-owner-001'`
**And** la otra solicitud pendiente del mismo `placeId` transita a `status: 'rechazado'`
**And** la respuesta es `200` con el estado actualizado

### Scenario 4: Rechazar solicitud `reclamo-place`

**Given** una solicitud `reclamo-place` con `status: 'pendiente'` y `solicitanteUid: 'uid-owner-001'`
**When** un admin llama `POST /api/v1/solicitudes/{id}/reject` con payload `{ comentarios: 'Sin suficiente causa' }`
**Then** la solicitud transita a `status: 'rechazado'`, `revisadoPor: <admin uid>`, `revisadoAt: <now>`, `comentarios: 'Sin suficiente causa'`
**And** el place `usuarioId` no se modifica
**And** la respuesta es `200` con el estado actualizado

### Scenario 5: Cola admin lista solo `reclamo-place` pendientes

**Given** un admin autenticado y solicitudes `reclamo-place` con `status` mixto (`pendiente`, `aprobado`, `rechazado`)
**When** el admin llama `GET /api/v1/solicitudes?status=pendiente`
**Then** la respuesta es `200` con envelope `{ data, meta }` donde `data` contiene solo solicitudes `tipo === 'reclamo-place'` y `status === 'pendiente'`, ordenadas por `createdAt DESC`
**And** `meta.total` coincide con la cantidad de reclamos pendientes
**And** ningún otro tipo aparece en la lista (filtro `tipo` forzado server-side)

### Scenario 6: No-admin no puede listar solicitudes

**Given** un usuario autenticado con rol `owner` (o `member`)
**When** llama `GET /api/v1/solicitudes`
**Then** la respuesta es `403` (RolesGuard) y no se retorna data
**And** anónimo (sin `Authorization`) recibe `401`

### Scenario 7: Crear solicitud con tipo deprecated debe fallar validación

**Given** un intento de crear solicitud con `tipo: 'registro'` (u otro tipo deprecated: `actualizacion`, `registro-evento`, `actualizacion-evento`)
**When** el servicio `SolicitudesService.create` recibe el input con tipo no permitido
**Then** el servicio lanza `400 BadRequestException` con mensaje exacto: `Tipo de solicitud no permitido en esta fase. Solo 'reclamo-place' es válido.`
**And** nothing is persisted a la colección `solicitudes`

### Scenario 8: Crear solicitud con `eventoId` (campo removido) debe fallar

**Given** un intento de crear solicitud con `eventoId` seteado (campo a remover)
**When** `SolicitudesService.create` es llamado con `eventoId` presente en el input
**Then** el servicio lanza `400 BadRequestException` con mensaje exacto: `El campo 'eventoId' ha sido removido en CH-05 solicitudes-refactor. Use placeId para solicitudes de tipo 'reclamo-place'.`
**And** nothing is persisted

### Scenario 9: Migración elimina documentos con tipos deprecated

**Given** documentos en la colección `solicitudes` con `tipo: 'registro'`, `'actualizacion'`, `'registro-evento'` y `'actualizacion-evento'`
**When** se ejecuta `npm run migrate:solicitudes`
**Then** esos documentos son eliminados de la colección
**And** el reporte los cuenta bajo `deleted`

### Scenario 10: Migración backfilllea `solicitanteUid` faltante

**Given** un documento `reclamo-place` con `solicitanteUid` ausente y `usuarioId: 'uid-owner-001'`
**When** se ejecuta la migración
**Then** el documento recibe `solicitanteUid: 'uid-owner-001'`
**And** el reporte lo cuenta bajo `backfilled`

### Scenario 11: Migración idempotente

**Given** una migración ejecutada exitosamente
**When** se re-ejecuta `npm run migrate:solicitudes`
**Then** no se elimina ni modifica ningún documento
**And** el reporte muestra contadores en cero salvo `scanned`
