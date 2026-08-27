# Design — eventos-refactor (CH-04)

## Context

El módulo `eventos` fue implementado en el change `2026-07-28-eventos-crud` con un modelo de aprobación binario que acopla al owner a una cola de solicitudes admin:

- El owner crea un evento → se auto-crea una solicitud `tipo: 'registro-evento'`.
- El owner edita un evento `aprobado` → NO se aplican los cambios; se genera una solicitud `tipo: 'actualizacion-evento'` con `proposal` (staged update).

Este modelo, funcional para el MVP inicial, no soporta los flujos de negocio revisados (Flujo 3):

- **Flujo 3 (descubrimiento + publicación)**: el evento debe ser visible inmediatamente tras la creación, sin esperar aprobación admin. La verificación es un badge diferenciado ("Verificado"), no una puerta de entrada.
- **Edición simple (decisión #4)**: editar un evento verificado revierte a `pendiente` en el mismo write (sin regla de días, sin cola de solicitudes paralela).
- **Ubicación propia**: `placeId` opcional acopla el evento a un place; se reemplaza por el objeto `ubicacion` (el evento tiene su propio lugar, dirección y coordenadas).

Estado actual en código (2026-08-26):
- `evento.entity.ts`: `status: EventoStatus`, `verificado: boolean`, `placeId?: string`, `ubicacionNombre?`, `ubicacionDireccion`, `coordenadas`.
- `evento-status.enum.ts`: `EventoStatus = "pendiente" | "aprobado" | "rechazado"`.
- `eventos.service.ts:131-138`: `create` auto-crea solicitud `registro-evento`.
- `eventos.service.ts:233-238`: `update` bifurca — si `status === 'aprobado'` llama a `stageApprovedUpdate` (genera solicitud `actualizacion-evento`).
- `evento-approval.handler.ts` (en módulo eventos): handlers de aprobación de esas solicitudes.
- `eventos.module.ts`: inyecta `SOLICITUDES_SERVICE` (token `SolicitudesServiceInterface`) en `EventosService`.
- `eventos-firestore.adapter.ts`: reads/writes `status`, `verificado`, `placeId`, campos planos de ubicación.
- `firestore.indexes.json`: índices de eventos con `status` ASC.

El change CH-03 (`places-refactor`) ya estableció el patrón `activo + estadoVerificacion` y el type `EstadoVerificacion`. CH-04 lo replica en `eventos` para mantener consistencia de dominio.

## Goals / Non-Goals

**Goals:**
- Refactorizar el modelo `eventos` de `status + verificado + placeId` a `activo + estadoVerificacion + ubicacion + cambios[]`.
- Eliminar la auto-creación de solicitudes en `POST /eventos`.
- Implementar `POST /eventos/:id/verificar` (admin) y la reversión simple en `PUT /eventos/:id`.
- Soft-delete con `activo:false` en `DELETE /eventos/:id`.
- Historial `cambios[]` poblado en cada edición (siempre, y específicamente al revertir verificado).
- Migración idempotente de eventos existentes.
- Definir puerto `NotificacionesPort` (no-op) para el disparador `evento_revertido_pendiente`.

**Non-Goals:**
- Implementación real de notificaciones (Email + In-App) — queda en CH-06, que reemplaza el no-op.
- Eliminación física de tipos `registro-evento`/`actualizacion-evento` y campos `eventoId`/`proposal` en la entidad `solicitudes` — queda en CH-05 (`solicitudes-refactor`). En CH-04 solo se elimina el *uso* desde eventos y se marcan deprecated en el spec.
- `EmailVerifiedGuard` — Firebase maneja verificación de email (consistente con CH-03).
- Frontend UI de eventos (CH-08).
- Favoritos (CH-07).

## Decisions

### Decision 1: Evento visible inmediatamente sin solicitud auto-creada

**Choice**: `POST /eventos` crea el evento con `activo: true`, `estadoVerificacion: 'pendiente'`, y NO genera solicitud. El evento es visible en el directorio público inmediatamente.

**Rationale**: El Flujo 3 establece que el owner/publicador crea su evento y este es visible públicamente de inmediato. La verificación es un badge diferenciado que el admin asigna al revisar la ficha. Elimina la fricción de esperar aprobación y alinea con la decisión #4.

**Alternativa rechazada**: Mantener solicitud `registro-evento` con `status: 'pendiente'` — el evento no sería visible hasta aprobación admin, contradiciendo el Flujo 3.

### Decision 2: `activo` + `estadoVerificacion` en vez de `status` extendido

**Choice**: Separar la actividad (`activo: boolean`) de la verificación (`estadoVerificacion: "pendiente" | "verificado" | "rechazado"`), reusando el type `EstadoVerificacion` de CH-03 (ver ubicación: si el type vive en `places/domain`, mover a `common/domain` o a un módulo compartido; si no existe aún, crearlo en `eventos/domain` y luego CH-05 lo promueve si es necesario). Un evento puede estar activo pero no verificado, inactivo independientemente de su verificación, etc.

**Rationale**: Igual que en `places`, el modelo `status` mezcla dos dimensiones ortogonales (¿está activo? / ¿fue verificado?). Con el modelo separado:
- `activo=false, estadoVerificacion='verificado'` → evento verificado pero desactivado.
- `activo=true, estadoVerificacion='pendiente'` → evento visible sin badge (caso común).
- `activo=false, estadoVerificacion='rechazado'` → evento rechazado y oculto.

### Decision 3: Edición unificada con reversión simple (sin staged update)

**Choice**: `PUT /eventos/:id` aplica SIEMPRE los cambios in-place (con ownership guard). Si `estadoVerificacion === 'verificado'` antes del update, se revierte a `'pendiente'` en el mismo write y se registra el diff en `cambios[]`. No hay bifurcación por status ni generación de solicitud `actualizacion-evento`.

**Rationale**: La decisión #4 confirma "reversión simple sin regla de días". Generar una solicitud paralela duplicaba la cola de aprobación y confundía a los admins. La reversión a `pendiente` preserva la integridad (un evento modificado debe volver a revisión) y el `cambios[]` da trazabilidad.

**Alternativa rechazada**: Mantener `stageApprovedUpdate` con `proposal` — complejidad OCP-violating (creciente switch de tipos) y doble fuente de verdad.

### Decision 4: Soft-delete con `activo:false` en vez de hard delete

**Choice**: `DELETE /eventos/:id` cambia `activo:false`. El evento desaparece del directorio público pero persiste para auditoría.

**Rationale**: Consistente con `places` (CH-03). Hard delete pierde datos históricos (vistas, solicitudes de reclamo que apuntan a places, etc.).

**Implicancia**: se elimina el chequeo de 409 por "solicitudes pendientes asociadas" (ya no existen solicitudes de evento). La response es `{ deleted: true, id, activo: false }`.

### Decision 5: `ubicacion` objeto reemplaza `placeId` + campos planos

**Choice**: Agrupar `ubicacionNombre`/`ubicacionDireccion`/`coordenadas` en `ubicacion: { nombreLugar?: string; direccion: string; coordenadas: Coordenadas }` (VO `Ubicacion` en `eventos/domain`). Eliminar `placeId`.

**Rationale**: El evento tiene su propio lugar (playa, plaza, recinto) independiente de si pertenece a un place del directorio. `placeId` implicaba una validación de "place aprobado" innecesaria y un acoplamiento que el negocio no requiere. El VO centraliza validación de coordenadas y dirección.

**Alternativa rechazada**: Mantener `placeId` opcional — acopla eventos a places sin beneficio; la decisión de negocio #4 no lo menciona.

### Decision 6: Puerto `NotificacionesPort` con adapter no-op (CH-06 lo implementa)

**Choice**: `EventosService` depende de una interfaz `NotificacionesPort` (inyectada vía token). En CH-04 se provee un adapter no-op (`NoopNotificacionesAdapter`). Cuando un update revierte un evento verificado, el service llama `notificacionesPort.notifyEventoRevertidoPendiente(evento, cambios)`.

**Rationale**: DIP estricto — el service de eventos no conoce la implementación de notificaciones (que llega en CH-06). El contrato queda definido y testeado (mock del puerto) ahora; CH-06 solo reemplaza el adapter.

**Alternativa rechazada**: Inyectar `NotificacionesService` concreto (acoplamiento prematuro) o llamar a Firebase directamente (viola DIP).

### Decision 7: Migración idempotente con skip condicional

**Choice**: `migrate-eventos-verificacion.ts` verifica si el doc ya tiene `activo` antes de migrar; si ya fue migrado, lo salta. Reconstruye `ubicacion` desde los campos planos. Safe para re-ejecutar.

**Rationale**: Idempotencia elimina el riesgo de duplicar/sobreescribir en re-ejecuciones de desarrollo/staging.

## Risks / Trade-offs

- **Breaking API**: `status`, `verificado`, `placeId`, `ubicacionNombre`/`ubicacionDireccion` eliminados — consumidores (frontend actual de eventos) deben migrar a `activo` + `estadoVerificacion` + `ubicacion.*`. Mitigación: no hay frontend en producción; se documenta en `api-spec.yml`; CH-08 actualiza la UI.
- **Auto-solicitud eliminada**: consumidores que dependen de `registro-evento`/`actualizacion-evento` se rompen. Mitigación: eliminación física diferida a CH-05; en CH-04 se marca deprecated y se quita el uso.
- **`cambios[]` crece sin bound**: aceptable para MVP; post-MVP evaluar subcolección o cap.
- **Transición de `ubicacion` en migración**: si un evento viejo tenía `coordenadas` nulas, el mapper debe tolerarlo. Mitigación: validar en dry-run con datos de `seed-places.ts`.
- **Sin EmailVerifiedGuard**: owners sin email verificado pueden crear eventos. Mitigación: Firebase Console gestiona la verificación; el admin puede rechazar eventos de usuarios no verificados.

## Migration Plan

1. Ejecutar `migrate-eventos-verificacion.ts` en emulador Firestore con datos de `seed-places.ts` (dry-run + assert).
2. Aplicar en staging tras backup de la colección `eventos`.
3. Desplegar backend con nuevo modelo + índices (`firebase deploy --only firestore:indexes`).
4. **Rollback**: los campos nuevos son aditivos sobre los viejos hasta que el código deje de leer `status`; si se requiere rollback, el script no borra `status` sino que agrega `activo`/`estadoVerificacion` — un rollback de código seguiría leyendo `status` mientras exista (el script puede preservar `status` legacy como campo muerto o eliminarlo; en CH-04 se elimina en el write de migración, por lo que el rollback requiere restaurar el backup de la colección).
