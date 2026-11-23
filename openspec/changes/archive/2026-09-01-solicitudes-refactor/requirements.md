# Requirements — Solicitudes Refactor (solicitudes-refactor)

## Functional Requirements

- **FR-1**: Eliminar todos los tipos de solicitud excepto `reclamo-place` del enum `SolicitudTipo`. Los tipos deprecated `registro`, `actualizacion`, `registro-evento`, `actualizacion-evento` deben removirse físicamente del código y la base de datos.
- **FR-2**: Retener solo los campos `placeId` y `solicitanteUid` como campos requeridos en la entidad `Solicitud`. Remover campo `eventoId` y campo `proposal` del contrato de persistencia (entity, adapter, DTOs).
- **FR-3**: El campo `tipo` en la entidad `Solicitud` debe ser obligatorio y limitado al valor `'reclamo-place'`; cualquier intento de crear solicitud con otro tipo debe fallar con `400 BadRequestException`.
- **FR-4**: Los endpoints `POST /solicitudes/{id}/approve` y `POST /solicitudes/{id}/reject` deben seguir funcionando solo para tipo `reclamo-place`, conservando la lógica de aprobación transaccional (auto-rechazo de otros reclamos pendientes del mismo `placeId`).
- **FR-5**: Los residuos de código de tipos deprecated deben eliminarse físicamente: `createEventoSolicitud`, `CreateEventoSolicitudInput`, `SolicitudesServiceInterface.create` (deprecated), `EventoApprovalHandler`, `PlaceApprovalHandler.approveRegistro` (interfaz + implementación en places + tests), constantes muertas del service.
- **FR-6**: Migración one-time idempotente (`backend/scripts/migrate-solicitudes.ts`, npm `migrate:solicitudes`): (1) documentos con `tipo != 'reclamo-place'` se ELIMINAN (decisión confirmada del plan — no se convierten a `reclamo-place`); (2) docs `reclamo-place` sin `solicitanteUid` se backfilllean desde `usuarioId` cuando esté presente; (3) docs sin ambos UIDs se reportan como huérfanos sin destruirse; (4) reporte `{ scanned, deleted, backfilled, orphans }` y re-ejecución sin efectos.
- **FR-7**: Nuevo endpoint de cola admin `GET /api/v1/solicitudes` (`@Roles('admin')`): lista solo solicitudes `tipo === 'reclamo-place'` (filtro server-side), query params `status` (default `'pendiente'`), `page`, `limit`; respuesta en envelope `{ data, meta }` ordenada por `createdAt DESC`. Cierra la deuda de "endpoints de listado/filtrado de solicitudes".
- **FR-8**: Índices Firestore (`firestore.indexes.json` raíz): eliminar `solicitudes: eventoId + status`; agregar `solicitudes: tipo ASC + status ASC + createdAt DESC`; conservar `placeId + status` y `status + createdAt DESC`.

## Non-Functional Requirements

- **NFR-1**: Cobertura de tests del service, controller y adapter (objetivo ≥ 90%) en los módulos de solicitudes tocados.
- **NFR-2**: Tipo completo en todo el código; no permitir `any` sin justificación explícita en los DTOs e interfaces.
- **NFR-3**: El invariante de referencia se simplifica: `placeId` es requerido y `eventoId` es rechazado con `400` (mensaje de campo removido) en `SolicitudesService`. No queda rama `eventoId` alcanzable en runtime.
- **NFR-4**: Respuestas consistentes con el formato del `TransformInterceptor` (envuelto en `data`).
- **NFR-5**: No exponer errores internos en producción (ya cubierto por `AllExceptionsFilter`).
- **NFR-6**: ISP: `SolicitudesRepositoryInterface` mantiene ≤ 5 métodos (`create`, `findById`, `findPendingReclamosByPlaceId`, `findPendingQueue`, `update`) tras absorber la cola admin y remover `existsByPlaceId`.

## Constraints

- El campo `proposal` está completamente deprecated y debe removerse del schema de validación, DTOs y persistencia.
- El campo `eventoId` ya no es un campo válido en la creación de solicitudes nuevas; solo documentos legacy pueden tenerlo y se eliminan (o backfilllean según FR-6) en la migración.
- La migración NO convierte tipos deprecated a `reclamo-place`: convertir un `registro` en un reclamo fabricaría claims inexistentes y podría transferir ownership al aprobarse (política de delete confirmada en `PLAN_IMPLEMENTACION.md`).
- No hay endpoint `POST /solicitudes` público: la única vía de creación es `POST /places/{id}/reclamar` (rol `owner`, `solicitanteUid` desde JWT).

## Out of Scope (esta fase)

- Creación de nuevos tipos de solicitud beyond `reclamo-place`.
- Cambio al modelo de usuarios o roles (fuera del scope CH-05).
- Refactor del módulo eventos (quedaría en cambio futuro).
- Modificaciones al diseño visual del frontend (aunque endpoints cambiantes afectan pantallas).