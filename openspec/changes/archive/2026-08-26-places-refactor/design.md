# Design — places-refactor (CH-03)

## Context

El módulo `places` fue implementado originalmente con un modelo de aprobación binario: el owner crea un place → se auto-crea una solicitud `tipo: 'registro'` → el admin aprueba/rechaza → el place cambia de `status`. Este modelo, funcional para el MVP inicial, no soporta los flujos de negocio revisados:

- **Flujo 1 (owner)**: el place debe ser visible inmediatamente tras la creación, sin esperar aprobación admin. La verificación es un badge diferenciado ("Verificado"), no una puerta de entrada al directorio.
- **Flujo 2 (público)**: el visitante ve places activos con o sin badge. La búsqueda debe soportar filtros por `estadoVerificacion` y `sinDueno`.
- **Claiming**: un owner debe poder reclamar un place existente (creado por admin o sin dueño) vía una solicitud transaccional.

Estado verificado en código (2026-08-25):
- `place.entity.ts`: `status: PlaceStatus`, `verificado: boolean`, `usuarioId?: string` (optional).
- `place-status.ts`: `PlaceStatus = "pendiente" | "aprobado" | "rechazado"`.
- `places.service.ts:132-177`: `createPlace` setea `status: "pendiente"` y auto-crea solicitud `tipo: 'registro'`.
- `places.service.ts:199-208`: `search` filtra por `status` (default `'aprobado'`).
- `place-firestore.adapter.ts:102-107`: queries usan `where("status", "==", "aprobado")`.
- `place-firestore.adapter.ts:208-209`: `findForMap` filtra por `status == "aprobado"`.
- `solicitud.entity.ts`: 4 tipos: `registro`, `actualizacion`, `registro-evento`, `actualizacion-evento`.
- `place-approval.handler.ts:20-23`: `approveRegistro` setea `status: "aprobado" as never`.
- `solicitudes.controller.ts`: solo `POST :id/approve` + `POST :id/reject`.
- `firestore.indexes.json`: 4 índices places con `status` ASC.
- `EmailVerifiedGuard`: NO existe (excluido de CH-02, Firebase maneja verificación).

## Goals / Non-Goals

**Goals:**
- Refactorizar el modelo `places` de `status + verificado` a `activo + estadoVerificacion`.
- Eliminar la auto-creación de solicitud en `POST /places`.
- Implementar `POST /places/:id/reclamar` (owner) y `POST /places/:id/verificar` (admin).
- Soft-delete con `activo:false` en `DELETE /places/:id`.
- Nuevo tipo `reclamo-place` en solicitudes con aprobación transaccional.
- Migración idempotente de places existentes.

**Non-Goals:**
- `EmailVerifiedGuard` — Firebase maneja verificación de email como servicio externo. No se crea guard en código.
- Reversión automática de `estadoVerificacion` en `PUT /places/:id` (a diferencia de eventos en CH-04). El owner edita libremente; el admin re-verifica si es necesario.
- Frontend UI de places (CH-08).
- Eventos refactor (CH-04).
- Favoritos (CH-07).
- Límite de places por owner (decisión de negocio pendiente).

## Decisions

### Decision 1: Place visible inmediatamente sin solicitud auto-creada

**Choice**: `POST /places` crea el place con `activo: true`, `estadoVerificacion: 'pendiente'`, y NO genera solicitud. El place es visible en el directorio público inmediatamente.

**Rationale**: El Flujo 1 del plan de implementación establece que el owner crea su place y este es visible públicamente de inmediato. La verificación es un badge diferenciado ("Verificado") que el admin asigna cuando revisa la ficha. Esto elimina la fricción de esperar aprobación para un lugar nuevo, y alinea con el comportamiento de plataformas como Google Business (visible inmediatamente, verificación posterior).

**Alternativa rechazada**: Mantener solicitud auto-creada con `status: 'pendiente'` — el lugar no sería visible hasta aprobación admin, lo cual contradice el Flujo 1 y agrega latencia innecesaria.

### Decision 2: `activo` + `estadoVerificacion` en vez de `status` extendido

**Choice**: Separar la actividad (`activo: boolean`) de la verificación (`estadoVerificacion: "pendiente" | "verificado" | "rechazado"`). Un place puede estar activo pero no verificado, inactivo independientemente de su estado de verificación, etc.

**Rationale**: El modelo `status: "pendiente" | "aprobado" | "rechazado"` mezcla dos dimensiones orthogonal: ¿está el lugar activo en el directorio? y ¿fue verificado por un admin? Con el modelo separado:
- `activo=false, estadoVerificacion='verificado'` → place verificado pero desactivado por el owner o admin.
- `activo=true, estadoVerificacion='pendiente'` → place visible pero sin badge (caso más común).
- `activo=false, estadoVerificacion='rechazado'` → place rechazado y oculto.

**Alternativa rechazada**: Agregar `estadoVerificacion` como cuarto valor de `status` — rompe la semántica de `activo` como soft-delete y dificulta queries (un `status` con 5 valores es confuso).

### Decision 3: Soft-delete con `activo:false` en vez de hard delete

**Choice**: `DELETE /places/:id` cambia `activo:false` en vez de eliminar el documento. El place desaparece del directorio público pero persiste para auditoría y datos históricos.

**Rationale**: Hard delete pierde datos históricos (vistas, eventos asociados, solicitudes). Soft-delete es el patrón estándar para entidades con relaciones en Firestore. El place puede ser restaurado por admin si es necesario.

**Implicancia**: las queries públicas filtran por `activo=true`, por lo que un place soft-deleted es invisible para el público pero visible para admin.

### Decision 4: Sin `EmailVerifiedGuard` — Firebase maneja verificación

**Choice**: No se crea `EmailVerifiedGuard` en este change. La verificación de email se gestiona exclusivamente en Firebase Console (provider Email/Password + Google). Los endpoints de owner (`POST /places`, `PUT /places/:id`, `POST /places/:id/reclamar`) funcionan sin verificación de email a nivel de código.

**Rationale**: Firebase Admin SDK puede verificar `emailVerified` del token, pero el stakeholder confirmó que la verificación se gestiona en Firebase Console. Agregar un guard en código crearía una dependencia innecesaria y un punto de fallo (si Firebase falla, los endpoints no funcionan). La verificación de email es un concern de Firebase, no del dominio places.

**Alternativa rechazada**: Crear `EmailVerifiedGuard` y aplicar a endpoints owner — agrega complejidad sin beneficio claro para MVP.

### Decision 5: Reclamo Place — handler en `SolicitudesService` con transacción Firestore

**Choice**: La aprobación de `reclamo-place` vive en `SolicitudesService.aprobarSolicitud()` con un case `reclamo-place` en `dispatchApproval()`. El handler usa una transacción Firestore que: (1) actualiza `place.usuarioId = solicitud.solicitanteUid`, (2) auto-rechaza otros reclamos pendientes del mismo `placeId`, (3) actualiza el status de la solicitud.

**Rationale**: Este es el patrón ya establecido por los handlers de eventos (`EventoApprovalHandler`). Mantener la lógica de aprobación en `SolicitudesService` (no en `PlacesService`) preserva la separación de concerns: `SolicitudesService` orquesta el lifecycle de solicitudes, y los handlers implementan los side-effects en las entidades asociadas.

**Alternativa rechazada**: Lógica en `PlacesService` — rompe la separación de concerns y duplica la orquestación de transacciones.

### Decision 6: Migración idempotente con skip condicional

**Choice**: El script `migrate-places-verificacion.ts` verifica si el doc ya tiene el campo `activo` antes de migrar. Si ya fue migrado, lo salta. Safe para re-ejecutar.

**Rationale**: En entornos de desarrollo es común necesitar re-ejecutar migraciones. La idempotencia elimina el riesgo de duplicar datos o sobreescribir cambios manuales. El costo es un read extra por doc (aceptable para la escala del directorio).

## Risks / Trade-offs

- **Breaking API**: `status` field eliminado — consumidores deben usar `activo` + `estadoVerificacion`. Mitigación: no hay frontend en producción; se documenta en `api-spec.yml`.
- **Solicitud auto-creada eliminada**: consumidores que dependen de solicitud `tipo: 'registro'` en creación de places se rompen. Mitigación: no hay consumidores externos; el frontend actual no usa este flujo.
- **Transacción Firestore en reclamo-place**: requiere `runTransaction` que puede fallar por contención. Mitigación: retry en caso de transacción perdida (Firestore transient error).
- **Query `sinDueno` requiere dos queries**: Firestore no soporta `!= null` directamente. Mitigación: merge en service, acceptable para MVP.
- **Sin EmailVerifiedGuard**: owners sin email verificado pueden crear places. Mitigación: Firebase Console gestiona la verificación; el admin puede rechazar places de usuarios no verificados manualmente.
