# Proposal — places-refactor (CH-03)

## Why

El módulo `places` actual utiliza un modelo de aprobación legacy: `status: "pendiente" | "aprobado" | "rechazado"` con auto-creación de solicitud al crear un place. Este modelo tiene tres problemas:

1. **Acoplamiento innecesario**: toda creación de place genera una solicitud de tipo `registro`, lo que obliga al owner a esperar aprobación admin antes de que su lugar sea visible. El flujo de negocio real (Flujo 1) permite que el place sea visible inmediatamente tras la creación, con un badge "Verificado" diferenciado.

2. **Sin soporte para claiming**: no existe flujo para que un owner reclame un place existente (creado por admin o sin dueño). El modelo actual no tiene campos `gestionadoPorAdmin` ni `motivoRechazoVerificacion`.

3. **Campos obsoletos**: `verificado: boolean` y `fechaVerificacion` son redundantes con `status` y deberían consolidarse en un modelo unificado `estadoVerificacion`.

Este change implementa **CH-03 del `PLAN_IMPLEMENTACION.md`**: refactor del modelo `places` a `activo` + `estadoVerificacion`, eliminación de solicitud auto-creada, y nuevos flujos de owner (reclamar) y admin (verificar/rechazar).

## What Changes

### Backend — Modelo de datos

- **Reemplazar** `status: PlaceStatus` y `verificado: boolean` por `activo: boolean` + `estadoVerificacion: "pendiente" | "verificado" | "rechazado"`.
- **Nuevo campo** `motivoRechazoVerificacion?: string` (required si `rechazado`).
- **Nuevo campo** `gestionadoPorAdmin: boolean` (default `false`).
- **`usuarioId` pasa de optional a required** (ya es requerido por el flujo de auth, pero el tipo no lo reflejaba).
- **Eliminar** `fechaVerificacion` (reemplazado por `fechaPublicacion` para cuando pasa a verificado).

### Backend — Endpoints modificados

| Método | Path | Cambio clave |
|--------|------|--------------|
| `POST /places` | Sin solicitud auto-creada. Place creado con `activo: true`, `estadoVerificacion: 'pendiente'`, visible públicamente inmediatamente. |
| `GET /places` | Default `activo=true` (en vez de `status='aprobado'`). Nuevos query params: `estadoVerificacion`, `sinDueno`. |
| `GET /places/slug/:slug` | Filtro `activo=true`. 404 si `activo=false`. |
| `GET /places/map-data` | Filtro `activo=true`. |
| `DELETE /places/:id` | **Soft-delete**: `activo:false` en vez de hard delete. Bloqueado si tiene reclamos pendientes. |

### Backend — Endpoints nuevos

| Método | Path | Descripción |
|--------|------|-------------|
| `POST /places/:id/reclamar` | Owner reclama un place sin dueño o gestionado por admin. Crea solicitud `tipo: 'reclamo-place'`. Guard: `@Roles('owner')`. |
| `POST /places/:id/verificar` | Admin verifica o rechaza un place. Body: `{ resultado: 'verificado'\|'rechazado', motivo?: string }`. Guard: `@Roles('admin')`. |

### Backend — Solicitudes module

- **Nuevo tipo** `reclamo-place` en el enum `tipo` de `Solicitud`.
- **Nuevo campo** `solicitanteUid?: string` en `Solicitud` (required para `reclamo-place`).
- **Handler de aprobación** `approveReclamo`: transacción Firestore que actualiza `place.usuarioId = solicitanteUid` + auto-rechaza otros reclamos pendientes del mismo `placeId`.
- **Handler de rechazo** `rejectReclamo`: solo cambia status de la solicitud (sin side-effect en place).

### Backend — Adapter + Indexes

- `PlaceFirestoreAdapter`: queries usan `where("activo", "==", true)` como default.
- `firestore.indexes.json`: reemplazar `status` por `activo` en todos los índices de places. Agregar índices para `estadoVerificacion`, `sinDueno`, y `slug`.

### Backend — Migración

- Script idempotente `migrate-places-verificacion.ts`: migra places existentes al nuevo modelo (activo = status==='aprobado', estadoVerificacion = verificado?'verificado':'pendiente').

### Docs

- `docs/data-model.md`: actualizar §places con nuevo modelo.
- `docs/api-spec.yml`: endpoints modificados y nuevos.
- `openspec/specs/places/spec.md`: requirements actualizados.
- `openspec/specs/solicitudes/spec.md`: nuevo tipo reclamo-place.

## Capabilities

### Modified Capabilities
- `places`: refactor completo de modelo, repositorio, service, controller, adapter.
- `solicitudes`: nuevo tipo `reclamo-place`, handler de aprobación con auto-rechazo transaccional.
- `api-contract`: endpoints modificados y nuevos.

### New Capabilities
- (Ninguna nueva capability — todo es modificación de existentes)

## Impact

- **Code**: `backend/src/modules/places/` (domain, application, infrastructure — todos los archivos); `backend/src/modules/solicitudes/` (entity, repository, service, approval-handlers); `firestore.indexes.json`; `backend/scripts/migrate-places-verificacion.ts`.
- **APIs**: `POST /places` (cambio de comportamiento — sin solicitud auto-creada); `GET /places` (nuevos filtros); `DELETE /places` (soft-delete); `POST /places/:id/reclamar` (nuevo); `POST /places/:id/verificar` (nuevo).
- **Data model**: `places` — campos eliminados (`status`, `verificado`, `fechaVerificacion`), campos nuevos (`activo`, `estadoVerificacion`, `motivoRechazoVerificacion`, `gestionadoPorAdmin`), `usuarioId` required. `solicitudes` — nuevo tipo `reclamo-place`, nuevo campo `solicitanteUid`.
- **Tests**: unit (PlacesService, helpers, approval handlers), integration (PlaceFirestoreAdapter, SolicitudesFirestoreAdapter), E2E (6 flujos críticos). Cobertura ≥ 90% módulos tocados.
- **Migration**: script idempotente `migrate-places-verificacion.ts` ejecutado en emulador + staging antes de activar endpoints nuevos.
- **Breaking changes**: `status` field eliminado (consumers deben usar `activo` + `estadoVerificacion`). Solicitud auto-creada eliminada (consumers no deben depender de solicitud tipo `registro` en creación de places).
- **Out of scope**: `EmailVerifiedGuard` (Firebase maneja verificación como servicio), frontend UI de places (CH-08), eventos refactor (CH-04), favoritos (CH-07).
