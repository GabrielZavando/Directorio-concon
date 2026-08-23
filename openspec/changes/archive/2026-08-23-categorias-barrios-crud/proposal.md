## Why

El proyecto Directorio de Concón no tiene persistencia ni administración de los catálogos de categorías y barrios en Firestore. Hoy solo existen como JSON estáticos en el frontend (`categorias.json`, `barrios.json`), lo que impide que el admin gestione el catálogo por API, que el backend valide referencias `categoriaId`/`barrioId` reales al crear/editar places y eventos, y que exista un `npm run seed` reproducible (funcionalidad prometida en AGENTS.md §8.3 y §8.4 MVP). Sin estas colecciones, los places/eventos almacenados guardan referencias "ciegas" que nunca se validan contra un catálogo real.

## What Changes

- **NUEVO backend module `categorias`** (Clean Architecture: `domain/` + `application/` + `infrastructure/`) con entity `Categoria`, VO `Subcategoria`, interface de repositorio, `CategoriasService`, `CategoriaFirestoreAdapter`, DTOs con class-validator y `CategoriasController`.
- **NUEVO backend module `barrios`** con la misma estructura Clean Architecture: `Barrio` entity, repo interface, `BarriosService`, `BarrioFirestoreAdapter`, DTOs y `BarriosController`.
- **NUEVOS endpoints admin** (solo rol `admin`, `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`): `POST/PATCH /categorias`, subcategorias anidadas, `POST/PATCH /barrios`, toggles `activar/desactivar`.
- **NUEVOS endpoints públicos** (`@Public()`, sin autenticación): `GET /categorias?activa=true` y `GET /barrios?activo=true` — usados por formularios de creación de places/eventos y por los filtros del buscador público.
- **NUEVO seed script** `backend/scripts/seed.ts` + `npm run seed` funcional — lee los JSON canónicos del frontend y pobla Firestore con `activo: true`. Idempotente (`set(merge:true)` por slug). Script adicional `seed-places.ts` con datos mock para places/eventos (para testing manual y E2E).
- **BREAKING en Places/Eventos:** `PlacesService` y `EventosService` validan AL crear/editar que `categoriaId`/`subcategoriaId`/`barrioId` referencian docs existentes con `activo: true` (400 si no). Validación condicional: solo se dispara cuando el campo se establece/modifica, no en ediciones que no tocan cat/barrio.
- **NUEVO script de auditoría previa** `backend/scripts/audit-cat-barrio-refs.ts` que recorre places/eventos existentes y reporta referencias huérfanas ANTES de activar la validación bloqueante. Requerido para migrar staging sin romper documentos existentes.
- **Firestore indexes:** forward-declare `categorias: activa+orden` y `barrios: tipo` (ya presentes en `firestore.indexes.json` como forward-declared, ahora se activan con datos reales).

## Capabilities

### New Capabilities
- `categorias`: CRUD admin + lectura pública + validación cruzada en places/eventos
- `barrios`: CRUD admin + lectura pública + validación cruzada en places/eventos

### Modified Capabilities
- `places`: `PlacesService` añade validación de existencia y `activo: true` para `categoriaId`, `subcategoriaId` y `barrioId` al crear/editar (solo cuando el campo se toca)
- `eventos`: `EventosService` añade las mismas validaciones de `categoriaId`/`subcategoriaId`/`barrioId`
- `backend-env-align`: se añade `npm run seed` funcional en `backend/package.json` (corrige debt existente — los scripts actuales apuntan a archivos inexistentes)

## Impact

- **Nuevo código backend:** ~25-30 archivos nuevos entre módulos `categorias` y `barrios` (entity, VO, interface, service, adapter, DTOs, controller, module, validators) + 2 scripts (`seed.ts`, `audit-cat-barrio-refs.ts`, `seed-places.ts`).
- **Modificación backend existente:** `PlacesService`, `EventosService` (injection de `CategoriasService`/`BarriosService` o un `CatalogValidator` compartido), `app.module.ts` (descomentar/registrar módulos), `package.json` (arreglar scripts `seed`/`migrate`).
- **API contracts:** NUEVOS endpoints documentados en `docs/api-spec.yml`; `CreatePlace`/`UpdatePlace`/`CreateEvento`/`UpdateEvento` heredan validación implícita (sin cambios de schema OpenAPI, la validación es backend-only).
- **Data model:** `docs/data-model.md` actualiza sección `categorias` (añade `activo`, reescribe `subcategorias[]` con形状 `{slug, nombre, activo}` y métodos CRUD anidados) y `barrios` (añade `activo`). Mantiene compatibilidad con JSONs existentes del frontend.
- **Firestore:** 2 nuevos composite indexes (forward-declared, ya presentes en `firestore.indexes.json`).
- **Docs:** Actualiza `docs/data-model.md`, `docs/api-spec.yml`, `docs/backend-standards.md` (sección de módulos).
- **Tests:** Unit (services, validators), integration (adapters con emulador Firestore), contratos LSP (`categoria-repository.contract.spec.ts`, `barrio-repository.contract.spec.ts`), E2E (controllers con Supertest — happy paths + 400/403/409).
