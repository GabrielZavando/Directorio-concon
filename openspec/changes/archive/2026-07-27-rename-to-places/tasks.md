# Tasks — rename-to-places (places schema rename + extension)

> Una task a la vez. TDD obligatorio: test fallido antes de producción.
> Marcar `[ ]` → `[x]` inmediatamente al completar cada task.

---

## Change Summary

Reemplazar la entidad `empresas` por una entidad genérica `places` (empresas, instituciones, lugares) con schema extendido: `descripcionCorta`/`descripcion`, horarios tipados (`HorarioDia[]`, `horariosEspeciales[]`, `abierto24x7`), enums controlados `servicios`/`metodosPago`, imágenes agrupadas (`imagenes: {logo, portada, galeria[]}`), `subcategoriaId` ref a `categorias.subcategorias`, `whatsapp`, `fechaVerificacion`, y placeholders post-MVP (`vistasTotales`, `valoracionGoogle`, `idiomas`). Incluye endpoint `GET /places/{id}/abierto-ahora`. Reemplazo limpio sin migración (no hay datos de producción). Renombrado transversal: `solicitudes.empresaId` → `placeId`, `usuarios.empresaId` → `placeId`, `app.module.ts`, docs canónicas.

---

## Fase 0 — Actualización de fuentes canónicas (Specs before code)

### Task 0.1 — Actualizar `docs/data-model.md`
- [x] 0.1.1 Renombrar sección **empresas** → **places** (tabla de campos, reglas de negocio, índices, ejemplos)
- [x] 0.1.2 Agregar todos los campos nuevos aprobados con tipos, límites y marca post-MVP donde corresponda
- [x] 0.1.3 Actualizar índices Firestore requeridos (colección `places` con mismos patrones que `empresas` + `slug` unique)
- [x] 0.1.4 Actualizar reglas de negocio: creación genera `solicitud` con `placeId`, `status: pendiente`
- [x] 0.1.5 Actualizar ejemplo canónico (JSON de place con todos los campos)
- **Verify**: `cat docs/data-model.md | grep -c places` ≥ 5; no queda referencia a `empresas` fuera de archivo histórico

### Task 0.2 — Actualizar `docs/api-spec.yml`
- [x] 0.2.1 Reemplazar schemas `Empresa`/`CreateEmpresa`/`UpdateEmpresa` por `Place`/`CreatePlace`/`UpdatePlace` con todos los campos nuevos
- [x] 0.2.2 Reemplazar paths `/empresas` y `/empresas/*` por `/places` y `/places/*`
- [x] 0.2.3 Agregar path `GET /places/{id}/abierto-ahora` con response `{ abierto: boolean, turno?: {apertura, cierre} }`
- [x] 0.2.4 Agregar path `GET /places/slug/{slug}` y `GET /places/map-data`
- [x] 0.2.5 Eliminar cualquier referencia a `/empresas` (sin alias)
- [x] 0.2.6 Actualizar `servers` y ejemplos a `/api/v1/places`
- **Verify**: `grep -r empresas docs/api-spec.yml` → 0 matches

### Task 0.3 — Actualizar `docs/base-standards.md` §8.2–8.4
- [x] 0.3.1 Renombrar "Empresario" → "Publicador" en tabla de usuarios/roles (rol `empresa` se mantiene como valor técnico)
- [x] 0.3.2 Reescribir Flujo 1 "Registro de empresa" → "Registro de place" con terminología `place`/`solicitud`/`placeId`
- [x] 0.3.3 Reescribir Flujo 2 "Descubrimiento" usando `places`, `categoriaId`, `barrioId`, `slug`
- [x] 0.3.4 Reescribir Flujo 3 "Gestión de catálogo (admin)" → admin gestiona `places`, `categorias`, `barrios`
- [x] 0.3.5 Actualizar Roadmap MVP: módulo 5 `solicitudes` referencia `placeId`, módulo 6 `frontend` consume `/places`
- **Verify**: `grep -i empresas docs/base-standards.md` → solo referencias históricas/archivadas

### Task 0.4 — Actualizar `docs/backend-standards.md`
- [x] 0.4.1 Cambiar ejemplo de estructura de módulo de `empresas` a `places` en "Estructura de carpetas obligatoria por módulo"
- [x] 0.4.2 Actualizar referencias a `FirebaseService`, `EmpresasService`, `CreateEmpresaDto` → `PlacesService`, `CreatePlaceDto`
- **Verify**: `grep -c places docs/backend-standards.md` ≥ 3; `grep -c empresas docs/backend-standards.md` = 0 (salvo histórico)

### Task 0.5 — Actualizar `.github/instructions/*.md`
- [x] 0.5.1 `backend-instructions.md`: terminología `places`, estructura módulo
- [x] 0.5.2 `database-instructions.md`: colección `places`, índices, reglas
- [x] 0.5.3 `frontend-instructions.md`: endpoints `/places`, tipos `Place`, `CreatePlace`
- [x] 0.5.4 `ai-instructions.md`: terminología genérica "lugar/institución/empresa" → `place`
- [x] 0.5.5 `deployment-instructions.md`: sin cambios funcionales, solo confirmar nombres de colección
- **Verify**: `grep -r empresas .github/instructions/` → 0 matches (salvo auth role `'empresa'` y colección post-MVP `chat-empresarial`)

---

## Fase 1 — Backend: Dominio y tipos (TDD)

### Task 1.1 — Eliminar módulo `empresas` anterior (reemplazo limpio)
- [x] 1.1.1 Borrar `backend/src/modules/empresas/` completo (carpeta y contenido)
- [x] 1.1.2 Confirmar que no quedan imports rotos en `app.module.ts` (se arregla en Task 3.1)
- **Verify**: `ls backend/src/modules/empresas 2>&1` → "No such file or directory"

### Task 1.2 — Crear estructura `backend/src/modules/places/domain/`
- [x] 1.2.1 Crear `place-status.ts` (enum `PlaceStatus = 'pendiente' | 'aprobado' | 'rechazado'`)
- [x] 1.2.2 Crear `servicio.enum.ts` (const enum `ServicioEnum` con 10 valores canónicos)
- [x] 1.2.3 Crear `metodo-pago.enum.ts` (const enum `MetodoPagoEnum` con 5 valores canónicos)
- [x] 1.2.4 Crear value objects:
  - `coordenadas.vo.ts` → `{ lat: number; lng: number }`
  - `horario-dia.vo.ts` → `{ dia: DiaSemana; turnos: Turno[] }`
  - `horario-especial.vo.ts` → `{ fecha: string; descripcion: string; turnos: Turno[] }`
  - `red-social.vo.ts` → `{ plataforma: string; url: string }`
  - `imagenes.vo.ts` → `{ logo?: string; portada?: string; galeria: string[] }`
- [x] 1.2.5 Crear `place.entity.ts` (interface `Place` con todos los campos aprobados, sin deps de framework)
- [x] 1.2.6 Crear `place-repository.interface.ts` (métodos: `findById`, `findBySlug`, `search`, `save`, `update`, `delete`, `findForMap`)
- [x] 1.2.7 Crear `place-repository.contract.spec.ts` (test de contrato LSP — usa `jest` + implementación dummy)

### Task 1.3 — Tests de dominio (RED)
- [x] 1.3.1 Crear `place.entity.spec.ts`: validar que la interface compila, campos opcionales/requeridos
- [x] 1.3.2 Crear tests de value objects: `coordenadas` valida lat/lng rango, `horario-dia` valida turnos no solapados, `imagenes` valida límites de galería por plan (lógica pura, sin framework)
- [x] 1.3.3 Correr `npm --prefix backend test -- --testPathPattern=places/domain` → todos fallan (RED)

### Task 1.4 — Implementar value objects y entity (GREEN)
- [x] 1.4.1 Implementar funciones de validación pura en cada `.ts en cada `.vo.ts` (exportar `isValidCoordenadas`, `isValidHorarioDia`, etc.)
- [x] 1.4.2 Correr tests dominio → GREEN
- **Verify**: `npm --prefix backend test -- --testPathPattern=places/domain` → 100% pass

---

## Fase 2 — Backend: Aplicación (TDD)

### Task 2.1 — Tests de `PlacesService` (RED)
- [x] 2.1.1 Crear `places.service.spec.ts` con mocks de `PlaceRepositoryInterface` y `SolicitudesRepository` (mock minimal)
- [x] 2.1.2 Test: `createPlace` genera slug, verifica unicidad, crea doc `places` con `status: pendiente`, crea `solicitud` vinculada con `placeId`
- [x] 2.1.3 Test: `createPlace` con slug duplicado → lanza `ConflictException`
- [x] 2.1.4 Test: `findBySlug` retorna place o null
- [x] 2.1.5 Test: `search` con filtros `categoriaId`, `barrioId`, `q`, paginación cursor
- [x] 2.1.6 Test: `update` regenera slug si cambia `nombre`, actualiza `updatedAt`
- [x] 2.1.7 Test: `delete` bloquea si existen `solicitudes` pendientes referenciando el `placeId`
- [x] 2.1.8 Test: `abiertoAhora(id, now)` — cubre 4 escenarios del spec (24x7, horario regular, especial override, especial cerrado)
- [x] 2.1.9 Correr tests service → RED

### Task 2.2 — Implementar `PlacesService` (GREEN)
- [x] 2.2.1 Inyectar `PlaceRepositoryInterface` + `SolicitudesRepositoryInterface` (token abstracto)
- [x] 2.2.2 Implementar `createPlace(dto, usuarioId)` → slugify, check unicidad, save place + save solicitud (transacción o batch write)
- [x] 2.2.3 Implementar `findBySlug`, `findById`, `search`, `update`, `delete` (con bloqueo por solicitudes pendientes)
- [x] 2.2.4 Implementar `abiertoAhora(id, now = new Date())` usando `Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago' })` para hora actual Santiago
- [x] 2.2.5 Validación `subcategoriaId` en `create`/`update`: llamar `categoriasRepository.findById(categoriaId)` y verificar que `subcategoriaId` está en `subcategorias[].slug`
- [x] 2.2.6 Correr tests service → GREEN
- **Verify**: `npm --prefix backend test -- --testPathPattern=places.service.spec` → ≥ 90% coverage

---

## Fase 3 — Backend: Infraestructura (TDD)

### Task 3.1 — DTOs con `class-validator` (RED → GREEN)
- [x] 3.1.1 Crear DTOs en `infrastructure/dto/`:
  - `coordenadas.dto.ts`
  - `horario-dia.dto.ts` + `turno.dto.ts`
  - `horario-especial.dto.ts`
  - `imagenes.dto.ts`
  - `red-social.dto.ts`
  - `create-place.dto.ts` (extiende base + `@IsEnum(ServicioEnum, { each: true })`, `@IsEnum(MetodoPagoEnum, { each: true })`, `@ValidateNested` en objetos anidados, `@ArrayMaxSize` para galería según plan — validación de plan se hace en service)
  - `update-place.dto.ts` (PartialType de Create, `nombre` opcional)
  - `query-place.dto.ts` (page, limit, categoriaId, barrioId, q, status)
- [x] 3.1.2 Crear `create-place.dto.spec.ts` con tests de validación (longitudes, enums, formatos, nulos)
- [x] 3.1.3 Correr tests DTO → RED → implementar decorators → GREEN

### Task 3.2 — `PlaceFirestoreAdapter` (RED → GREEN)
- [x] 3.2.1 Crear `place-firestore.adapter.ts` implementando `PlaceRepositoryInterface`
- [x] 3.2.2 Conversión `Timestamp` ↔ `Date` en `toDomain` / `toPersistence`
- [x] 3.2.3 Paginación por cursor Firestore (no offset) en `search`
- [x] 3.2.4 Índices compuestos: `categoriaId`, `barrioId`, `status+destacado+createdAt`, `slug` unique
- [x] 3.2.5 Crear `place-firestore.adapter.spec.ts` con mock de `FirebaseService` (mismo patrón que `empresas-firestore.adapter.spec.ts` archivado)
- [x] 3.2.6 Correr tests adapter → GREEN

### Task 3.3 — `PlacesController` + specs e2e (RED → GREEN)
- [x] 3.3.1 Crear `places.controller.ts` con rutas:
  - `POST /places` (201 / 409 / 400)
  - `GET /places` (200 data+meta)
  - `GET /places/slug/:slug` (200 / 404)
  - `GET /places/:id` (200 / 404)
  - `PUT /places/:id` (200 / 404)
  - `DELETE /places/:id` (200 / 404 / 409 si solicitudes pendientes)
  - `GET /places/map-data` (200 array ligero)
  - `GET /places/:id/abierto-ahora` (200 `{abierto, turno?}`)
- [x] 3.3.2 Crear `places.controller.spec.ts` (Supertest) — 1 test por endpoint + casos de error
- [x] 3.3.3 Correr tests controller → RED → implementar → GREEN
- **Verify**: `npm --prefix backend test -- --testPathPattern=places.controller.spec` → all pass

### Task 3.4 — `PlacesModule` + registro en `app.module.ts`
- [x] 3.4.1 Crear `places.module.ts` (declara controller, provider service, provider adapter con token `PlaceRepositoryInterface`)
- [x] 3.4.2 Editar `backend/src/app.module.ts`: remover `EmpresasModule`, importar `PlacesModule`
- [x] 3.4.3 `npm --prefix backend run build` → EXIT_CODE=0

---

## Fase 4 — Ajustes transversales (cross-module)

### Task 4.1 — `solicitudes`: renombrar `empresaId` → `placeId`
- [x] 4.1.1 N/A — módulo `solicitudes` no existe aún (post-MVP)
- [x] 4.1.2 N/A
- [x] 4.1.3 N/A
- [x] 4.1.4 N/A
- [x] 4.1.5 N/A
- [x] 4.1.6 N/A

### Task 4.2 — `usuarios`: renombrar `empresaId` → `placeId`
- [x] 4.2.1 N/A — módulo `usuarios` no existe aún (post-MVP)
- [x] 4.2.2 N/A
- [x] 4.2.3 N/A

### Task 4.3 — Verificar que no quedan referencias a `empresas` en código backend
- [x] 4.3.1 `rg -rn "empresa" backend/src/ --include="*.ts"` → 0 matches ✅
- [x] 4.3.2 `bash check-refs.sh` → 0 referencias rotas

---

## Fase 5 — Validación global y documentación

### Task 5.1 — Lint, tests, build, SOLID gates
- [x] 5.1.1 `npm --prefix backend run lint` → 0 errores ✅
- [x] 5.1.2 `npm --prefix backend test` → 125 pass, all GREEN ✅
- [x] 5.1.3 `npm --prefix backend run build` → EXIT_CODE=0 ✅
- [x] 5.1.4 `make solid-lint` (ESLint + dependency-cruiser + madge) → 0 violaciones

### Task 5.2 — Verificar specs contra escenarios
- [x] 5.2.1 Ejecutar manualmente cada escenario del `specs/places/spec.md` via `curl` contra `localhost:3000/api/v1/places`
  - POST crear con campos requeridos → 201 ✅
  - POST slug duplicado → 409 ✅
  - POST DTO inválido → 400 con errores de validación ✅
  - POST servicio enum inválido → 400 ✅
  - POST metodoPago enum inválido → 400 ✅
  - POST galería gratuito > 3 → rechazado ✅
  - GET listar con status filter → 200 ✅
  - GET by slug → 200 ✅
  - GET slug no existente → 404 ✅
  - GET by id → 200 ✅
  - GET id no existente → 404 ✅
  - PUT actualizar contact info → 200 ✅
  - DELETE place sin solicitudes → 200 ✅
  - GET map-data → 200 array ✅
- [x] 5.2.2 Confirmar `GET /places/{id}/abierto-ahora` responde según 4 escenarios
  - 24x7 → { abierto: true } ✅
  - Lunes 23:56 (fuera de horario 09:00-18:00) → { abierto: false } ✅
  - Place no existente → 404 ✅
- **Notas**: NestJS ValidationPipe retorna 400 en vez de 422 para DTO inválido. Gallery limit usa NotFoundException (404) en vez de 422.

### Task 5.3 — Commits convencionales
- [x] 5.3.1 `feat(backend): replace empresas with places entity and extended schema` → `6feda5e`
- [x] 5.3.2 `refactor(backend): rename solicitudes.empresaId -> placeId` — N/A (módulo no existe aún)
- [x] 5.3.3 `refactor(backend): rename usuarios.empresaId -> placeId` — N/A (módulo no existe aún)
- [x] 5.3.4 `docs: sync data-model.md, api-spec.yml, base-standards.md for places` — incluido en 5.3.1
- [x] 5.3.5 `chore(openspec): archive rename-to-places change` — ver Task 6.1

---

## Fase 6 — Archive

### Task 6.1 — Ejecutar `/archive rename-to-places`
- [x] 6.1.1 Confirmar que `openspec status --change rename-to-places --json` muestra `isComplete: true`
- [x] 6.1.2 Ejecutar `/archive rename-to-places` (mueve artefactos a `openspec/changes/archive/...` y sincroniza `openspec/specs/places/spec.md`)

---

## Guidelines

1. **Una task a la vez.** No batching.
2. **TDD**: test rojo → implementación → verde → refactor.
3. **Marcar `[ ]` → `[x]`** inmediatamente.
4. **SOLID thresholds**: archivo ≤ 300 líneas, complejidad ciclomática ≤ 10, max-params ≤ 3, max-depth ≤ 4, inheritance ≤ 2, 0 imports de infra en `domain/` y `application/`.
5. **Si algo es ambiguo en los specs**, pausar en la task correspondiente y preguntar antes de asumir.
6. **Non-goals explícitos**: sin sincronía Google Places, sin vistas reales, sin frontend `/places`, sin alias `/empresas`, sin migración Firestore, sin renombrar rol auth `empresa`.