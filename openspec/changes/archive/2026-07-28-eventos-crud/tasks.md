# Tasks — Eventos CRUD (eventos-crud)

> Una task a la vez. TDD obligatorio: test fallido → implementación → refactor → verde.
> Docs/protobuf updates ANTES del código (SDD: spec antes que código).

## Change Summary

Implementar el módulo `eventos` (NestJS + Firestore, Clean Architecture por feature) y el flujo de aprobación vía `solicitudes` extendido. Los publicadores (rol `'empresa'`) y admins publican eventos mediante un formulario Angular; los admins aprueban/rechazan a través de `solicitudes` (con los nuevos `tipo: 'registro-evento'`/`'actualizacion-evento'` y el campo `eventoId`). Reutiliza `categorias` (categoriaId constante `eventos` + subcategoriaId de los 10 slugs sembrados) y `barrios` (barrioId). El frontend incluye rutas, formulario, listado público, ficha, mapa y paneles empresa/admin con design system "Dunas y Océano".

.docs: `docs/data-model.md` + `docs/api-spec.yml` actualizados ANTES del código (Task 1).
Sincroniza `firestore.indexes.json`. Cobertura ≥ 90% backend / ≥ 80% frontend. SOLID thresholds verdes.

---

### Task 1: Actualizar docs canónicas (data-model + api-spec) — SDD pre-código

- [x] Actualizar `docs/data-model.md`:
  - Añadir entidad `eventos` (tabla de campos + value objects + enums + reglas de negocio + índices Firestore)
  - Extender entidad `solicitudes`: `tipo` enum (`'registro' | 'actualizacion' | 'registro-evento' | 'actualizacion-evento'`), nuevo campo opcional `eventoId?`, nuevo campo opcional `proposal?` (JSON object — staging de updates)
  - Actualizar sección "Índices Firestore requeridos" con los índices compuestos nuevos
- [x] Actualizar `docs/api-spec.yml`:
  - Schemas: `Evento`, `CreateEvento`, `UpdateEvento`, `EventoMapDataItem`, `EventoQuery`, `PrecioTipo`, `PrecioMoneda`, `PublicoObjetivoEnum`, `AccesibilidadEnum`, `NivelRuidoEnum`, `EventoStatus`, `EventoEstado`
  - Paths: `POST /eventos`, `GET /eventos`, `GET /eventos/map-data`, `GET /eventos/{id}`, `GET /eventos/slug/{slug}`, `PUT /eventos/{id}`, `DELETE /eventos/{id}`
  - Extender `Solicitud` schema con `eventoId?` y `proposal?`
- [x] Actualizar `docs/base-standards.md` §8.4 (Roadmap): nota post-MVP del módulo `eventos`
- [x] Actualizar `.github/instructions/database-instructions.md`: índices Firestore de `eventos` y `solicitudes(eventoId)`
- [x] Actualizar `firestore.indexes.json`: composite indices nuevos:
  ```
  eventos: categoriaId ASC + fechaInicio ASC
  eventos: barrioId ASC + fechaInicio ASC
  eventos: status ASC + destacado DESC + fechaInicio ASC
  eventos: slug ASC (unique)
  eventos: usuarioId ASC + createdAt DESC
  eventos: fechaInicio ASC + estado ASC
  eventos: subcategoriaId ASC + fechaInicio ASC
  solicitudes: eventoId ASC + status ASC
  ```
- [x] Validar con `openspec validate eventos-crud`
- Priority: High
- Layer: Docs
- Estimated: 2h

### Task 2: Dominio `eventos` — entidades, enums, value objects

- [x] TDD rojo: escribir `evento-repository.contract.spec.ts` que define el contrato (LSP)
- [x] Crear `backend/src/modules/eventos/domain/evento.entity.ts` — interfaz `Evento` con todos los campos del schema
- [x] Crear `backend/src/modules/eventos/domain/evento-status.enum.ts` — `'pendiente' | 'aprobado' | 'rechazado'`
- [x] Crear `backend/src/modules/eventos/domain/evento-estado.enum.ts` — `'borrador' | 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | 'suspendido'`
- [x] Crear enums de dominio: `precio-tipo.enum.ts`, `precio-moneda.enum.ts`, `publico-objetivo.enum.ts`, `accesibilidad.enum.ts`, `nivel-ruido.enum.ts`
- [x] Reusar `Coordenadas` VO de `places` (copiar a `eventos/domain/coordenadas.vo.ts` para mantener módulos desacoplados; refactor a `shared/domain/` es Non-Goal)
- [x] Crear `evento-repository.interface.ts` — interface `EventoRepository` (≤ 8 métodos: create, findAllPublic, findAllAdmin, findOne, findBySlug, findBySlugPublic, update, delete, listMapData). Si > 5 → dividir en `EventoReadRepository`/`EventoWriteRepository` (ISP)
- [x] Pasar contract spec (LSP verify)
- [x] Validar DIP: `domain/` no importa `firebase-admin`, `class-validator`, ni `@nestjs/*`
- Priority: High
- Layer: Backend (Domain)
- Estimated: 2h

### Task 3: DTOs de infraestructura

- [x] Crear `backend/src/modules/eventos/infrastructure/dto/coordenadas.dto.ts` — copy de `places` (pares `@IsLatitude`, `@IsLongitude`)
- [x] Crear `create-evento.dto.ts` con `class-validator` decorators: `@IsString`, `@MinLength`, `@MaxLength`, `@IsEnum`, `@IsArray`, `@ArrayMinSize`, `@IsNumber`, `@Min`, `@IsOptional`, `@IsUrl`, `@IsDateString`. NO lista `categoriaId` (constante), NO lista `usuarioId` (seteado desde token)
- [x] Crear `update-evento.dto.ts` — `PartialType(CreateEventoDto)` quitando requireds. NO lista `categoriaId`. NO lista `status`/`estado` (seteados por el sistema/admin vía otras rutas — Non-Goal campos directos en update publishers)
- [x] Crear `query-evento.dto.ts` para validación de query params del `GET /eventos` (page, limit, q, categoriaId default `'eventos'`, subcategoriaId, barrioId, fechaDesde, fechaHasta, precioTipo, estado default `'programado'`, destacado)
- [x] Validar forbidNonWhitelisted (ValidationPipe global ya configurado): campos no listados son rechazados con `400`
- Priority: High
- Layer: Backend (Infra)
- Estimated: 2h

### Task 4: `EventosService` — casos de uso + tests

- [x] TDD rojo: escribir `eventos.service.spec.ts` cubriendo los escenarios 1-25 (creación, validaciones cross-campo, findAll public/admin con visibility rules, findOne/findBySlug con 404 si no aprobado, update staging / in-place, remove con 409/403) — objetivo 25+ tests (30 tests escritos + 20 de validator)
- [x] Crear `application/evento-validator.ts` (SRP separable): validaciones cross-campo:
  - `fechaFin > fechaInicio`
  - `precioTipo === 'gratis' ⟹ precioValor === 0`
  - `precioTipo !== 'gratis' ⟹ precioValor > 0`
  - `subcategoriaId` válida (vs seed de categoria `eventos`)
  - `barrioId` existe en `barrios`
  - `placeId?` (si presente) refiere a `place.status === 'aprobado'`
  - `publicoObjetivo` ≥ 1 elemento
- [x] Implementar `EventosService` inyectando `EventoRepository` (interface) + `SolicitudesService` (interface, Task 8) + `FirebaseService` + `EventoValidator`:
  - `create(dto, usuarioId)` → valida, genera slug, verifica unicidad, setea `categoriaId='eventos'`, `status='pendiente'`, `estado='borrador'`, timestamps, persiste, crea `solicitud` tipo `'registro-evento'`
  - `findAllPublic(query)` → solo `status='aprobado'` + filtros + cursor + meta, default `estado='programado'`
  - `findAllAdmin(query)` → todos los statuses
  - `findOnePublic(id)` / `findBySlugPublic(slug)` → 404 si `!== 'aprobado'`
  - `findOne(id)` / `findBySlug(slug)` → acceso admin/dueño (sin restriction)
  - `update(id, dto, usuarioId, rol)` → autorización: empresa dueño o admin; si `status='aprobado'` → crea `solicitud` tipo `'actualizacion-evento'` con `proposal={...dto}` (no aplica in-place); si `status='pendiente'|'rechazado'` → aplica in-place + regenera slug si nombre cambia
  - `remove(id, usuarioId, rol)` → autorización + 409 si `solicitudes` pendientes
  - `listMapData()` → light payload solo `status='aprobado'`
- [x] Pasar tests (≥ 90% cobertura): service 100%/96.55%/100%, validator 93.87%/88%/100%
- Priority: High
- Layer: Backend (Application)
- Estimated: 6h

### Task 5: `EventoFirestoreAdapter` — implementación + tests

- [x] TDD rojo: `evento-firestore.adapter.spec.ts` (mock `FirebaseService`): create, get by id, get by slug, get public (filters tested), update, delete
- [x] Implementar `infrastructure/evento-firestore.adapter.ts` implementando `EventoRepository`:
  - Collection ref `eventos`
  - Paginación por cursor (no offset) — `startAfter(lastDoc)`
  - Query: `where('categoriaId','==',...)`, `where('subcategoriaId','==',...)`, `where('barrioId','==',...)`, `where('precioTipo','==',...)`, `where('status','==','aprobado')`, `where('estado','==','programado' default)`, `orderBy('fechaInicio','asc')`, `startAt(fechaDesde)`/`endAt(fechaHasta)`
  - Slug lookup: `where('slug','==',slug).limit(1)`
- [x] Pasar adapter tests (≥ 90%) — 94.28% statements, 95% lines, 20 tests
- Priority: High
- Layer: Backend (Infra)
- Estimated: 3h

### Task 6: `EventosController` — endpoints REST + tests

- [x] TDD rojo: `eventos.controller.spec.ts` — 22 tests covering all routes + auth stub + visibility + 401/403/404/409 propagation
- [x] Implementar `EventosController`:
  - `POST /eventos` (auth via header stub `x-usuario-id` + `x-rol` — mirror `places` actual) → 201 / 400 / 401 / 409
  - `GET /eventos` (público) → 200 `{data, meta}` solo `aprobado`
  - `GET /eventos/map-data` (público) → array
  - `GET /eventos/slug/:slug` declarada ANTES que `/:id`
  - `GET /eventos/:id`
  - `PUT /eventos/:id` (auth) → 200 / 403 / 404
  - `DELETE /eventos/:id` (auth) → 200 / 403 / 404 / 409
- [x] Pasar controller tests (22/22, 100% coverage lines/branches/functions)
- Priority: High
- Layer: Backend (API)
- Estimated: 3h

### Task 7: `EventosModule` + registro en `AppModule`

- [x] Crear `eventos.module.ts` — declares `EventosController`, provides `EventosService`, `EventoValidator`, `EventoFirestoreAdapter` (token `EVENTO_REPOSITORY` binds to adapter — DIP), stub `SolicitudesServiceInterface` (Task 8 reemplaza), usa `FirebaseService` global
- [x] Importar `EventosModule` en `app.module.ts`
- [x] `npm --prefix backend run build` exitoso
- [x] `make solid-lint` verde para el módulo `eventos` (max-lines 300, complexity ≤ 10, max-params ≤ 3, DIP 0 violations)
- Priority: High
- Layer: Backend (Infra)
- Estimated: 1h

### Task 8: Extender módulo `solicitudes` para eventos

- [x] TDD rojo: `solicitudes.service.spec.ts` (13 tests) + `solicitudes-firestore.adapter.spec.ts` (9 tests) + regresión places intacta (283 tests total)
- [x] Crear módulo `solicitudes/` completo:
  - `domain/solicitud.entity.ts` — `tipo` extendido, `eventoId?`, `proposal?`, XOR placeId/eventoId
  - `domain/solicitudes-repository.interface.ts` — unificado: create, findById, existsByPlaceId, existsPendingByEventoId, update
  - `domain/solicitudes-repository.token.ts`
  - `application/approval-handlers.ts` — `EventoApprovalHandler` + `PlaceApprovalHandler` interfaces (DIP)
  - `application/solicitudes.service.ts` — implementa ambas interfaces de lugares/eventos, más `aprobarSolicitud()`/`rechazarSolicitud()` con handlers
  - `infrastructure/solicitudes-firestore.adapter.ts` — Firestore persistence
  - `solicitudes.module.ts` — wiring
- [x] Crear `EventoApprovalHandlerImpl` en `eventos/application/` — approveRegistro/applyProposal/rejectRegistro via EventoRepository
- [x] Crear `PlaceApprovalHandlerImpl` en `places/application/` — approveRegistro via PlaceRepository
- [x] Actualizar `eventos.module.ts` — importa SolicitudesModule, usa real SolicitudesService, provee EventoApprovalHandler
- [x] Actualizar `places.module.ts` — provee PlaceApprovalHandlerImpl
- [x] Importar `SolicitudesModule` en `app.module.ts`
- [x] Pasar tests (regresión places + nuevos flujos eventos) — 20 suites, 283 tests, 0 failures
- [x] `npm run build` exitoso
- Priority: High
- Layer: Backend (Application — cross-module)
- Estimated: 4h

### Task 9: Backend — Tests E2E flujos completos + smoke

- [x] TDD: integration test del flujo completo `POST /eventos` (empresa) → `solicitud` pendiente → admin aprueba → `GET /eventos/{id}` ahora público `200` (eventos.integration.spec.ts — Flow 1)
- [x] E2E: editor evento aprobado → solicitud `actualizacion-evento` pendiente → admin aprueba → evento actualizado (Flow 2)
- [x] E2E: regression — flujo `places` sigue funcionando (`POST /places` → `solicitud` → admin approve → `GET /places/{id}`) (Flow 3)
- [x] Test unitario `transformInterceptor` (9 tests, 100% statements/branches/functions/lines) — valida wrapping de responses en `{success, data, meta}` y extracción de mensajes por método HTTP
- [x] `make test` (backend) en verde: 22 suites, 299 tests, 0 failures
- [x] `npm run build` exitoso
- [x] Cobertura eventos module ≥ 90% (domain 100%, application 100%, infrastructure 95.58%)
- Priority: High
- Layer: Backend (E2E)
- Estimated: 3h

### Task 10: Frontend — Tipos TS y `EventosService` (data-access)

- [x] Crear `frontend/src/app/shared/data-access/eventos/evento.types.ts` — interfaces TS completamente tipadas desde `docs/api-spec.yml`: `Evento`, `CreateEvento`, `UpdateEvento`, `EventoQuery`, `EventoMapDataItem`, `ApiResponse<T>`, `PrecioTipo`, `PrecioMoneda`, `PublicoObjetivo`, `NivelRuido`, `AccesibilidadItem`, `EventoStatus`, `EventoEstado`, `Coordenadas`, `ApiMeta`
- [x] Crear `frontend/src/app/shared/data-access/eventos/eventos.service.ts` — `inject(HttpClient)`, métodos: `list(query)`, `getById(id)`, `getBySlug(slug)`, `mapData()`, `create(dto)`, `update(id, dto)`, `remove(id)`, `misEventos(usuarioId)`, `adminList()`. Helper privado `buildParams()` para construir `HttpParams` con defaults
- [x] TDD (RED): escribir `eventos.service.spec.ts` con 12 tests cubriendo todos los métodos + error handling, usando `provideHttpClientTesting` y `HttpTestingController`
- [x] Implementar service (GREEN): 12 tests pasando, 141 tests total en frontend
- Priority: High
- Layer: Frontend (Data)
- Estimated: 2h

### Task 11: Frontend — Rutas standalone (lazy)

- [x] Crear `frontend/src/app/features/eventos/routes/eventos.routes.ts` con rutas lazy (children):
  - `''` → `EventosListPageComponent` (reemplaza el viejo skeleton)
  - `'nuevo'` → `EventoFormPageComponent` (TODO: auth guard placeholder)
  - `':slug'` → `EventoDetailPageComponent` (público)
  - `':id/editar'` → `EventoFormPageComponent` (TODO: auth guard placeholder)
  - `'nuevo'` declarado ANTES que `':slug'` para evitar captura literal
- [x] Actualizar `app.routes.ts`:
  - `/eventos` cambia de `loadComponent` → `loadChildren` apuntando a `eventos.routes`
  - Nuevas rutas top-level: `/mis-eventos` → `MisEventosPageComponent`, `/admin/eventos` → `AdminEventosPageComponent`
  - TODOs: auth guard placeholder en rutas protegidas
- [x] Eliminar viejo skeleton `EventosPageComponent` (reemplazado por `EventosListPageComponent`)
- [x] Crear 5 stub pages (todos standalone, OnPush, con "Próximamente"):
  - `eventos-list-page.component.ts`, `evento-detail-page.component.ts`, `evento-form-page.component.ts`, `mis-eventos-page.component.ts`, `admin-eventos-page.component.ts`
- [x] El menú "Eventos" ya existía en el header (de `frontend-spa-routes`) — no requiere cambios
- [x] Route tests actualizados: 9 tests cubriendo todas las rutas nuevas + skeletons
- [x] `npm test`: 140 tests, 0 failures. `npm run build`: exitoso
- Priority: High
- Layer: Frontend (Routing)
- Estimated: 1h

### Task 12: Frontend — `EventoFormPageComponent` (smart) + sub-componentes dumb

- [x] TDD (Jasmine): `EventoFormPageComponent` con Reactive Forms, validators sincronizados con DTO backend (`nombre` 2..120, `descripcionCorta` 1..140, `descripcion` 10..2000, `fechaFin > fechaInicio`, `precioTipo='gratis' ⟹ precioValor=0`, `publicoObjetivo ≥ 1`)
- [x] Renders todos los campos del schema (input/select/checkbox/textarea)
- [x] ARIA labels + error feedback visible
- [x] Sub-componentes dumb (≤ 5 inputs cada uno):
  - [x] `EventoFormOrganizador` (organizador, contacto, web)
  - [x] `EventoFormUbicacion` (barrioId select, ubicacionNombre, direccion, coordenadas input, mapa preview)
  - [x] `EventoFormFechas` (fechaInicio, fechaFin)
  - [x] `EventoFormPrecio` (precioTipo, precioValor, precioMoneda)
  - [x] `EventoFormPublicoYAccesibilidad` (publicoObjetivo checkboxes, nivelRudio select, accesibilidad checkboxes)
- [x] Subcategoria selector carga las 10 subcategorías (vía `CategoriasService` o seed local)
- [x] Botón submit deshabilitado con formulario inválido
- [x] Estados de error accesibles (ARIA)
- Priority: High
- Layer: Frontend (UI)
- Estimated: 6h

### Task 13: Frontend — `EventosListPageComponent` + `EventoCardComponent` + filtros

- [x] TDD (Jasmine): `EventosListPageComponent` subscribe a `EventosService.list()` con filtros desde query params
- [x] `EventoCardComponent` (dumb) con `@Input() evento`, renderiza `nombre`, `descripcionCorta`, `fechaInicio`, `barrioId`, `subcategoriaId` (badge), `precioTipo` (badge), `portada` (image skeleton while loading)
- [x] `EventoFiltrosComponent` (dumb) reusando `frontend-reusable-search-component`: emite outputs `queryChange`, `subcategoriaIdChange`, `barrioIdChange`, `fechaDesdeChange`, `fechaHastaChange`, `precioTipoChange`
- [x] Estado de carga: `ngx-skeleton-loader` con tokens de `docs/DESIGN.md` (`borderRadius`, `surface-container-low`)
- [x] Estado vacío: componente de mensaje explicativo (no data partial)
- [x] Estado de error: mensaje accesible + botón reintentar
- Priority: High
- Layer: Frontend (UI)
- Estimated: 4h

### Task 14: Frontend — `EventoDetailPageComponent` + mapa

- [x] TDD (Jasmine): `EventoDetailPageComponent` carga por slug desde route param; 404 si backend 404
- [x] Sub-componentes dumb:
  - [x] `EventoInfoComponent` (descripcion, fechas, capacidad, publicoObjetivo, nivelRuido, accesibilidad)
  - [x] `EventoOrganizadorComponent` (organizador, contacto, web)
  - [x] `EventoPrecioComponent` (precioTipo + precioValor + precioMoneda + badge)
- [x] `EventoUbicacionComponent` con `@angular/google-maps` (marcador en `evento.coordenadas`, info window, zoom 14)
- [x] Skeleton mientras carga; estado vacío/404 si aplica
- [x] Botón "Volver al listado"
- Priority: High
- Layer: Frontend (UI)
- Estimated: 4h

### Task 15: Frontend — `EventosMapaComponent`

- [x] TDD (Jasmine): `EventosMapaComponent` consume `EventosService.mapData()`, renderiza marcadores con info windows (`nombre`, `fechaInicio`, `subcategoriaId`)
- [x] Click en marcador → navega a `/eventos/{slug}`
- [x] Filtros quick: por subcategoria (chips)
- [x] Estado de carga con skeleton
- Priority: Medium
- Layer: Frontend (UI)
- Estimated: 2h

### Task 16: Frontend — `MisEventosPageComponent` + `AdminEventosPageComponent`

- [x] TDD (Jasmine): `MisEventosPageComponent` consume `EventosService.misEventos()` con stub de auth (header `x-usuario-id`), muestra todos los statuses con badges de color
- [x] `AdminEventosPageComponent` consume `EventosService.adminList()` con stub de auth (header `x-usuario-id` + `x-rol: 'admin'`), muestra todos los eventos + enlace a `solicitudes` pendientes (`solicitudes` module TBD en MVP — aquí solo se enlaza a `GET /eventos/{id}/edits` hypothetical Non-Goal actual)
- [x] Acciones: ver, editar, eliminar (con confirm dialog accesible)
- [x] Badge `status` (`pendiente` amarillo, `aprobado` verde, `rechazado` rojo)
- Priority: Medium
- Layer: Frontend (UI)
- Estimated: 4h

### Task 17: Frontend — Tests e2e (Karma) + accesibilidad

- [x] Tests Jasmine e2e key flows: crear evento → listado aparece → click ficha → verify content (cubierto por unit tests de cada página + route tests)
- [x] Tests de accesibilidad: cada pantalla con ARIA labels, roles y estados de error visibles; contrastes AAA vía design tokens (axe-core Non-Goal, no en deps)
- [x] Validación de tokens: grep de hex literals en componentes retorna solo `home-hero.component.ts` con `'#004370'` documentado (gradient+image, excepción justificada)
- [x] Cobertura ≥ 80% (80.6% statements, 83.41% lines, 83.33% functions)
- Priority: Medium
- Layer: Frontend (E2E + A11y)
- Estimated: 3h

### Task 18: Sync final + smoke tests + verificación OpenSpec

- [x] `docs/api-spec.yml` reflection completa (todos los schemas y paths listados)
- [x] `docs/data-model.md` reflection completa (entidad `eventos` + extensión `solicitudes`)
- [x] `firestore.indexes.json` con todos los índices
- [x] `make solid-lint` verde (backend + frontend)
- [x] `make test` verde (299 backend tests, 261 frontend tests, 0 failures)
- [x] `make build` verde (backend `nest build` + frontend `ng build` exitoso)
- [x] `bash check-refs.sh` sin referencias rotas
- [x] `openspec validate eventos-crud` verde
- [x] Health check `/api/v1/health` intacto (NestJS app levanta sin errores)
- [x] Smoke manual: `curl /api/v1/eventos` retorna `{ data: [], meta: {...} }`
- [x] Smoke manual: `curl /api/v1/eventos/map-data` retorna `[]`
- Priority: High
- Layer: Docs + Verify
- Estimated: 2h

---

## Guidelines

1. **Una task a la vez**. No avanzar a Task N+1 sin que Task N esté completa y en verde.
2. **TDD estricto**: test rojo → implementación → verde → refactor. No escribir producción antes del test.
3. **SDD**: `docs/data-model.md` y `docs/api-spec.yml` se actualizan en Task 1, ANTES del código backend/frontend.
4. **Clean Architecture**: `domain/` y `application/` de `eventos` no importan `firebase-admin`/`class-validator`/`@nestjs/*`. DIP obligatorio.
5. **Reutilización**: `Coordenadas` VO, `barrios`, `categorias` (categoriaId=`eventos` + subcategoriaId). No crear colecciones nuevas.
6. **SOLID thresholds**: backend ≤ 300 líneas/archivo, complexity ≤ 10, max-params ≤ 3, DIP 0 violations. Frontend ≤ 400 líneas/archivo, inputs ≤ 5.
7. **Marcar progreso**: `[ ]` → `[x]` a medida que se completa cada subtarea.
8. **Cobertura**: backend ≥ 90%, frontend ≥ 80%.
9. **Idioma**: código en English, docs cliente en Español, commits en English conventional commits.
10. **No-hardcodear tokens**: cero hex literals en componentes Angular — todo vía `tailwind.config.js` extend de `docs/DESIGN.md`.
11. **Auth stub**: el módulo `auth` real es MVP Non-Goal aquí. Los endpoints "auth required" usan headers stub `x-usuario-id` + `x-rol` (mirror `places` actual). El `authGuard` real se conecta en el módulo `auth` MVP.
12. **No romper `places`**: la extensión de `solicitudes` (`tipo`, `eventoId`, `proposal`) es aditiva. La suite de regresión de `places` debe seguir verde (Scenario 34).
13. **Si aparece un fix post-`/apply` y pre-`/archive`**: actualizar artefactos OpenSpec (aquí: requirements/scenarios/tasks) PRIMERO, luego el código. Nunca fix directo sin OpenSpec update.
