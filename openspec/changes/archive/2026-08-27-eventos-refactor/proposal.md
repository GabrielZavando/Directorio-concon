# Proposal — eventos-refactor (CH-04)

## Why

El módulo `eventos` (implementado en el change `2026-07-28-eventos-crud`) utiliza un modelo de aprobación legacy: `status: "pendiente" | "aprobado" | "rechazado"` con auto-creación de solicitudes (`registro-evento` al crear, `actualizacion-evento` al editar evento aprobado), y `placeId` opcional que acopla el evento a un place. Este modelo tiene tres problemas que contradicen el Flujo 3 del `PLAN_IMPLEMENTACION.md` y la decisión de negocio #4:

1. **Invisibilidad inmediata**: el evento creado queda `status: 'pendiente'` y solo se hace público tras aprobación admin, obligando al owner a esperar. El flujo de negocio real permite que el evento sea visible inmediatamente tras la creación, con un badge "Verificado" diferenciado.
2. **Edición bifurcada (staged update)**: editar un evento `aprobado` no aplica los cambios — genera una solicitud `actualizacion-evento` con `proposal`. Esto añade complejidad y una cola de aprobación paralela a `solicitudes`. La decisión #4 confirma **reversión simple**: editar un evento verificado lo revierte a `pendiente` en el mismo write (sin regla de días).
3. **Campos obsoletos**: `status`, `verificado`, `placeId` deben desaparecer y consolidarse en `activo` + `estadoVerificacion`, alineándose con el modelo ya aplicado a `places` (CH-03). Además falta un historial de cambios (`cambios[]`) para auditoría y para que el admin vea qué se modificó al revertir.

Este change implementa **CH-04 del `PLAN_IMPLEMENTACION.md`**: refactor del modelo `eventos` a `activo` + `estadoVerificacion`, eliminación de la auto-creación de solicitudes, edición unificada con reversión automática a pendiente, nuevo endpoint admin de verificación, reemplazo de `placeId` por el objeto `ubicacion`, y migración idempotente.

## What Changes

### Backend — Modelo de datos (collection `eventos`)
- **Reemplazar** `status: EventoStatus` y `verificado: boolean` por `activo: boolean` + `estadoVerificacion: "pendiente" | "verificado" | "rechazado"`.
- **Nuevo campo** `motivoRechazoVerificacion?: string` (required si `estadoVerificacion === 'rechazado'`).
- **Nuevo campo** `cambios?: CambioEvento[]` — historial: `{ campo, valorAnterior, valorNuevo, fecha, usuarioId }`.
- **Reestructurar ubicación**: `ubicacionNombre` + `ubicacionDireccion` + `coordenadas` (planos) → objeto `ubicacion: { nombreLugar?: string; direccion: string; coordenadas: Coordenadas }`.
- **Eliminar** `status`, `verificado`, `placeId` (+ toda validación "placeId → place aprobado").
- `usuarioId` se mantiene required. `estado` (lifecycle propio), `destacado`, `fechaPublicacion`, enums de pricing/audiencia/accesibilidad se mantienen.

### Backend — Endpoints modificados
| Método | Path | Cambio clave |
|--------|------|--------------|
| `POST /eventos` | Sin solicitud auto-creada. Crea con `activo: true`, `estadoVerificacion: 'pendiente'`, visible público inmediato. Body sin `placeId`, con `ubicacion` anidado. |
| `GET /eventos` | Filtro default `activo=true` (en vez de `status='aprobado'`). Nuevo query param `estadoVerificacion`. Incluye `estadoVerificacion` en response. |
| `GET /eventos/slug/:slug` | Filtro `activo=true`. 404 si `activo=false`. Incluye `estadoVerificacion`. |
| `GET /eventos/map-data` (o `/mapa`) | Filtro `activo=true`. |
| `PUT /eventos/:id` | **Lógica unificada**: aplica cambios in-place siempre. Si `estadoVerificacion === 'verificado'` ANTES del update → revierte a `'pendiente'` en el mismo write y popula `cambios[]`. Sin bifurcación por status. |
| `DELETE /eventos/:id` | **Soft-delete**: `activo:false` (en vez de hard delete). Elimina el chequeo de 409 por solicitudes pendientes (ya no existen solicitudes de evento). |

### Backend — Endpoints nuevos (Admin)
| Método | Path | Body | Efecto |
|--------|------|------|--------|
| `POST /eventos/:id/verificar` | `{ resultado: 'verificado'\|'rechazado', motivo?: string }` | `motivo` required si `rechazado`. Verificado: `estadoVerificacion='verificado'`, `fechaPublicacion=now`. Rechazado: `estadoVerificacion='rechazado'`, `activo=false`, `motivoRechazoVerificacion=motivo`. Guard: `@Roles('admin')`. |
| `GET /eventos?estadoVerificacion=pendiente` | — | Cola verificación admin (paginado). |

### Backend — Notificación (diferenciada)
- Si un update revierte un evento verificado → disparar notificación también al admin (`tipo: 'evento_revertido_pendiente'`). En CH-04 se define un **puerto `NotificacionesPort`** con un adapter no-op; la implementación real (Email + In-App) queda en CH-06, que reemplaza el no-op.

### Backend — Módulo `solicitudes` (en este change, solo deprecación de uso)
- **Eliminar el uso** de `registro-evento` y `actualizacion-evento` desde `eventos` (el service ya no llama a `solicitudService.createEventoSolicitud`).
- **Eliminar del módulo eventos**: `solicitudes-service.interface.ts`, `evento-approval.handler.ts`, y el wiring DI `SOLICITUDES_SERVICE`.
- **Eliminación física** de los tipos `'registro-evento'`/`'actualizacion-evento'` y campos `eventoId`/`proposal` en la entidad `solicitudes` queda diferida a **CH-05** (`solicitudes-refactor`) para evitar scope creep — en CH-04 se marcan como deprecated en el spec delta.

### Backend — Adapter + Indexes
- `EventoFirestoreAdapter`: queries usan `where("activo", "==", true)` como default. Mapper bidireccional con `Ubicacion` VO y campos nuevos/eliminados.
- `firestore.indexes.json`: reemplazar `status` por `activo` en índices de eventos. Agregar índice `eventos: activo + estadoVerificacion + createdAt` (cola admin).
- **BREAKING**: field `status` eliminado (consumers deben usar `activo` + `estadoVerificacion`). Campo `verificado` eliminado. Campo `placeId` eliminado. `ubicacionNombre`/`ubicacionDireccion`/`coordenadas` planos reemplazados por `ubicacion.*`.

### Backend — Migración
- Script idempotente `migrate-eventos-verificacion.ts`: migra eventos existentes al nuevo modelo (`activo = status==='aprobado'`, `estadoVerificacion = verificado?'verificado':'pendiente'`; reconstruye `ubicacion` desde campos planos; elimina `status`, `verificado`, `placeId`). Dry-run en emulador Firestore + staging.

### Docs
- `docs/data-model.md` §eventos: nuevo modelo.
- `docs/api-spec.yml`: endpoints modificados y nuevos, schema `Evento` actualizado.
- `openspec/specs/eventos/spec.md`: requirements actualizados.
- `openspec/specs/solicitudes/spec.md`: deprecación de tipos evento.
- `openspec/specs/api-contract/spec.md`: endpoints modificados/nuevos.

## Capabilities

### New Capabilities
- (Ninguna nueva capability — todo es modificación de existentes)

### Modified Capabilities
- `eventos`: refactor completo de modelo, repositorio, service, controller, adapter; eliminación de auto-solicitud; edición unificada con reversión; soft-delete; endpoint admin `verificar`; objeto `ubicacion`.
- `solicitudes`: deprecación de los tipos `registro-evento` y `actualizacion-evento` (uso eliminado desde eventos; eliminación física en CH-05).
- `api-contract`: endpoints `POST /eventos`, `GET /eventos`, `GET /eventos/slug/:slug`, `GET /eventos/mapa`, `PUT /eventos/:id`, `DELETE /eventos/:id` modificados; nuevo `POST /eventos/:id/verificar`.

## Impact

- **Code**: `backend/src/modules/eventos/` (domain, application, infrastructure — todos los archivos); `firestore.indexes.json`; `backend/scripts/migrate-eventos-verificacion.ts`.
- **APIs**: `POST /eventos` (sin solicitud auto-creada; body `ubicacion`); `GET /eventos` (filtros `activo`/`estadoVerificacion`); `GET /eventos/slug/:slug`, `GET /eventos/mapa` (filtro `activo`); `PUT /eventos/:id` (reversión verificado); `DELETE /eventos/:id` (soft-delete); `POST /eventos/:id/verificar` (nuevo).
- **Data model**: `eventos` — eliminados (`status`, `verificado`, `placeId`, `ubicacionNombre`, `ubicacionDireccion` planos), nuevos (`activo`, `estadoVerificacion`, `motivoRechazoVerificacion`, `cambios[]`, `ubicacion.{nombreLugar,direccion,coordenadas}`). `solicitudes` — tipos evento marcados deprecated.
- **Tests**: unit (EventosService create/update/verificar/helpers, validators), integration (EventoFirestoreAdapter), contract (evento-repository), E2E (6 flujos críticos). Cobertura ≥ 90% en módulos tocados.
- **Migration**: script idempotente `migrate-eventos-verificacion.ts` ejecutado en emulador + staging antes de activar endpoints nuevos.
- **Breaking changes**: `status`/`verificado`/`placeId` eliminados. `ubicacionNombre`/`ubicacionDireccion`/`coordenadas` reemplazados por `ubicacion`. Solicitud auto-creada eliminada. Edición de evento aprobado ya no genera solicitud (aplica in-place + posible reversión a pendiente).
- **Out of scope**: implementación real de notificaciones (CH-06, reemplaza el no-op `NotificacionesPort`); eliminación física de tipos evento en `solicitudes` (CH-05); frontend UI de eventos (CH-08); favoritos (CH-07).
