## 1. Bootstrap — module scaffolding

- [x] 1.1 Crear estructura de carpetas `backend/src/modules/categorias/{domain,application,infrastructure/dto}` y `backend/src/modules/barrios/{domain,application,infrastructure/dto}` (vacías con `.gitkeep`)
- [x] 1.2 Crear `categorias.module.ts` y `barrios.module.ts` vacíos con `@Module({})` (sin providers aún); registrarlos en `app.module.ts` (descomentar líneas 16-17 si procede, usando los nuevos nombres)
- [x] 1.3 Crear `backend/scripts/` y `backend/scripts/.gitkeep`. Documentar en `backend/scripts/README.md` que el directorio aloja `seed.ts`, `seed-places.ts`, `audit-refs.ts`

## 2. Categorias — domain layer (TDD)

- [x] 2.1 Escribir `categoria.entity.spec.ts` (red): validar constructor, `slug` y `orden` únicos en memoria (no persistencia), `activo` default `true`, `subcategorias` default `[]`
- [x] 2.2 Implementar `backend/src/modules/categorias/domain/categoria.entity.ts` (green) para pasar `categoria.entity.spec.ts`
- [x] 2.3 Escribir `subcategoria.vo.spec.ts` (red): equivalencia por `slug`, formato, `activo` bool
- [x] 2.4 Implementar `backend/src/modules/categorias/domain/subcategoria.vo.ts` (green)
- [x] 2.5 Escribir `categoria-repository.contract.spec.ts` (LSP red): define contrato (findById, findBySlug, list, create, updateById, deactivateSubcategoria, addSubcategoria) — debe fallar contra un mock-incompleto
- [x] 2.6 Implementar `categoria-repository.interface.ts` (≤5 métodos por interfaz — dividir en `CategoriaReadRepository` + `CategoriaWriteRepository` si se excede) para que el contract pase

## 3. Categorias — infrastructure (DTOs + adapter) (TDD)

- [x] 3.1 Escribir `create-categoria.dto.spec.ts` (red): valida `@IsString`, `@MinLength(2)`, `@MaxLength(80)` en `nombre`; `@IsIn(LUCIDE_ICONS)` en `icono`; `@IsInt`, `@Min(1)`, `@Max(99)` en `orden`; `@IsOptional` en `descripcion`/`color`; `forbidNonWhitelisted` rechaza `activo` en el body
- [x] 3.2 Implementar `infrastructure/dto/create-categoria.dto.ts` (green). Definir constante `LUCIDE_ICONS = ['utensils','store','tent','briefcase','car','heart-pulse','graduation-cap','building-2','party-popper'] as const`
- [x] 3.3 Implementar `update-categoria.dto.ts` como `PartialType(CreateCategoriaDto)` quitando `slug` (inmutable post-create)
- [x] 3.4 Implementar `create-subcategoria.dto.ts` (`@IsString`, `@MinLength(2)`, `@MaxLength(60)` en `nombre`; `@Matches(/^[a-z0-9-]+$/)` en `slug`), `update-subcategoria.dto.ts` (PartialType sin `slug`)
- [x] 3.5 Implementar `query-categoria.dto.ts` (`@IsOptional`, `@IsBoolean` en `activa`)
- [x] 3.6 Escribir `categoria-firestore.adapter.spec.ts` (integration red, emulador Firestore): create con slug único → 409 ConflictException si existe; findById; findBySlug; list con filtro `where('activo','==',true)`; updateById; addSubcategoria con transacción; deactivateSubcategoria con transacción
- [x] 3.7 Implementar `infrastructure/categoria-firestore.adapter.ts` (green) con `FirebaseService` inyectado. Usar `runTransaction`. Subcategorias se manipulan dentro del array

## 4. Categorias — application + controller (TDD)

- [x] 4.1 Escribir `categorias.service.spec.ts` (red): create duplicate slug → ConflictException; create duplicate orden → ConflictException; create invalid icono → BadRequestException (delegado al DTO); addSubcategoria transacción; deactivateSubcategoria preserva otros elementos; list con filtrado post-query de subcategorias `activo:true`; findById cuando no existe → NotFoundException. Mock de `CategoriaRepository` interface (no la implementación concreta)
- [x] 4.2 Implementar `application/categorias.service.ts` (green). Inyectar `CategoriaReadRepository` + `CategoriaWriteRepository` (ISP)
- [x] 4.3 Implementar `application/catalog-validator.service.ts` (métodos `assertCategoriaActiva`, `assertSubcategoriaActiva`, `assertBarrioActivo`) — usado por Places y Eventos (ver task 8.x)
- [x] 4.4 Escribir `categorias.controller.spec.ts` (E2E red con Supertest + Nest app de testing): `POST /categorias` admin 201, owner 403, anonymous 401; `PATCH /categorias/:id` 200 ó 409 (orden dup) ó 404; `PATCH /categorias/:id/desactivar` 200; `PATCH /categorias/:id/activar` 200; `POST /categorias/:id/subcategorias` 201 ó 409 ó 404; `PATCH /categorias/:id/subcategorias/:subId/desactivar` 200 ó 404; `GET /categorias?activa=true` 200 con subcategorias filtradas, sin `activo` en cada sub; `GET /categorias` admin 200 incluye inactivas con flag `activo`
- [x] 4.5 Implementar `infrastructure/categorias.controller.ts` (green): `@Controller('categorias')`, `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel clase, `@Roles('admin')` en mutaciones; `GET /categorias` con `@Public()` (lectura pública); parsing de `?activa=true` query; path params `:id` (slug-as-id), `:subId` (subcategoria slug)
- [x] 4.6 Registrar providers en `categorias.module.ts` (service, adapter, validator, controller). Re-exportar `CatalogValidator` para que lo consuman `PlacesModule` y `EventosModule`

## 5. Barrios — domain layer (TDD)

- [x] 5.1 Escribir `barrio.entity.spec.ts` (red): campos mínimos, `tipo` enum `{urbano, rural}`, `activo` default `true`
- [x] 5.2 Implementar `backend/src/modules/barrios/domain/barrio.entity.ts` (green)
- [x] 5.3 Escribir `barrio-repository.contract.spec.ts` (LSP red): contrato `findById`, `findBySlug`, `list`, `create`, `updateById`
- [x] 5.4 Implementar `barrio-repository.interface.ts` (≤5 métodos) — se dividió en `BarrioReadRepository` (4 métodos) + `BarrioWriteRepository` (4 métodos)

## 6. Barrios — infrastructure (DTOs + adapter) (TDD)

- [x] 6.1 Escribir `create-barrio.dto.spec.ts` (red): `@IsString`, `@MinLength(2)`, `@MaxLength(80)` `nombre`; `@Matches(/^[a-z0-9-]+$/)` `slug`; `@IsIn(['urbano','rural'])` `tipo`; `@IsOptional` para `descripcion`/`territorio`/`codigo`/`coordenadas`; `forbidNonWhitelisted` rechaza `activo`
- [x] 6.2 Implementar `infrastructure/dto/create-barrio.dto.ts`, `update-barrio.dto.ts` (PartialType sin `slug`), `query-barrio.dto.ts` (`@IsOptional @IsBoolean activo`)
- [x] 6.3 Escribir `barrio-firestore.adapter.spec.ts` (integration red, emulador): create, slug dup → 409, findBySlug, list con `where('activo','==',true)`, updateById
- [x] 6.4 Implementar `infrastructure/barrio-firestore.adapter.ts` (green)

## 7. Barrios — application + controller (TDD)

- [x] 7.1 Escribir `barrios.service.spec.ts` (red): create dup slug → ConflictException; update de campos opcionales; list con filtro; GetById no existe → NotFoundException. Mock de interface
- [x] 7.2 Implementar `application/barrios.service.ts` (green)
- [x] 7.3 Escribir `barrios.controller.spec.ts` (E2E red con Supertest): `POST /barrios` admin 201, owner 403; `PATCH /barrios/:id` 200 ó 404; `PATCH /barrios/:id/desactivar` 200; `PATCH /barrios/:id/activar` 200; `GET /barrios?activo=true` 200 sin flag activo para público; `GET /barrios` admin 200 incluye flag activo
- [x] 7.4 Implementar `infrastructure/barrios.controller.ts` (green) con guards y `@Public()` en GET
- [x] 7.5 Registrar providers en `barrios.module.ts` (read/write repo exportados para `CatalogValidator`)

## 8. Feature flag + Cross-catalog validation in Places & Eventos (TDD)

- [x] 8.1 Crear `backend/src/config/catalog-validation.config.ts` (env var `CATALOG_VALIDATION_ENABLED`, default `false` en dev) y validador token inyectable
- [x] 8.2 Modificar `PlacesService.spec.ts` (red): create con `categoriaId` inactivo → BadRequestException cuando flag activo; create con subcategoriaId inactivo; create con `barrioId` inactivo; PUT cambiando `categoriaId` a inactivo; PUT tocando solo `nombre` (NO debe llamar a `assertCategoriaActiva`); PUT repitiendo `categoriaId` actual (NO debe validar); flag desactivado → no ejecuta validación. Spy sobre `CatalogValidator`
- [x] 8.3 Implementar en `PlacesService` la diff-aware validate (campo vs valor previo) inyectando `CatalogValidator`. Solo invoca `assert*` cuando el campo se añade/modifica y el flag está activo
- [x] 8.4 Modificar `EventosService.spec.ts` (red) con los mismos casos para `subcategoriaId`/`barrioId`. `categoriaId` siempre constante `'eventos'`: si el flag está activo y la categoria `'eventos'` no existe/inactiva → 400 (este caso solo ocurre si el seed no corrió)
- [x] 8.5 Implementar en `EventosService` la diff-aware validate reutilizando `CatalogValidator`
- [x] 8.6 Asegurar que los E2E de places y eventos existentes siguen pasando cuando el flag está en `false` (regression guard)
- [x] 8.7 (post-apply fix) Normalizar slugs ASCII en `categorias.json`: `cabañas-y-camping` → `cabanas-y-camping`, `diseñadores` → `disenadores` (los slugs con acentos violaban `Subcategoria.SLUG_REGEX` y rompían `GET /categorias` tras el seed). Aprobado por usuario.

## 9. Seed scripts

- [x] 9.1 Implementar `backend/scripts/seed.ts`: bootstrap FirebaseService manual (sin Nest), instanciar `CategoriaFirestoreAdapter` + `BarrioFirestoreAdapter`, leer `frontend/src/app/shared/data-access/local/data/categorias.json` y `barrios.json`, escribir con `set(merge:true)` keyed by slug, asignar `activo:true` a todos, materializar subcategorias con `activo:true`. Logging claro + reporte `n categorias, m barrios escritas`
- [x] 9.2 Implementar `backend/scripts/seed-places.ts`: 20-30 places mock con datos inventados válidos (categoria/barrio de los seedeados, coordenadas válidas Concón, todos los campos required), 10-15 eventos mock con `subcategoriaId` válido de la categoria `eventos`. Idempotente vía `set(merge:true)` keyed by slug
- [x] 9.3 Actualizar `backend/package.json`: `"seed": "ts-node scripts/seed.ts && ts-node scripts/seed-places.ts"`, `"seed:cat": "ts-node scripts/seed.ts"`, `"seed:places": "ts-node scripts/seed-places.ts"`. Quitar `migrate` roto o apuntarlo a un no-op `scripts/audit-refs.ts`
- [x] 9.4 Documentar en `backend/scripts/README.md`: prerequisitos (credenciales Firebase + emulador local para dev), flags, idempotencia, qué hacer si hay conflicto de slugs en producción

## 10. Audit script

- [x] 10.1 Implementar `backend/scripts/audit-refs.ts`: lee todos los docs de `places` y `eventos`, para cada uno resuelve `categoriaId` en `categorias` y `barrioId` en `barrios` (y `subcategoriaId` en la categoria correspondiente). Imprime JSON `{validos: number, huerfanos: [{coleccion, docId, campo, valor}]}`. Exit `1` si `huerfanos.length > 0`, `0` si no
- [x] 10.2 Añadir script `npm run audit-refs` en `backend/package.json`
- [x] 10.3 Documentar uso del script en `backend/scripts/README.md` y en `docs/deploy-standards.md` (paso previo al deploy con flag activado)

## 11. Firestore indexes + environment docs

- [x] 11.1 Verificar en `firestore.indexes.json` que los índices `categorias: activa+orden` y `barrios: tipo` (ya forward-declared) están correctos. Ajustar nombre de campos a los definitivos (`activo` en singular, no `activa` si cambia en la entity). Confirmar que `places` y `eventos` no requieren nuevos índices por ahora
- [x] 11.2 Documentar la env var `CATALOG_VALIDATION_ENABLED` en `docs/deploy-standards.md` y `backend/.env.example` (si existe) o `backend/README.md` sección de variables de entorno

## 12. Documentation updates

- [x] 12.1 Actualizar `docs/data-model.md` secciones `categorias` y `barrios` para reflejar campos `activo`, `subcategorias[].activo`, `descripcion`/`color`/`coordenadas` opcionales, `createdAt` + `updatedAt`. Añadir nota "Fuentes canónicas: `categorias.json`/`barrios.json` en frontend + colección Firestore poblada por `npm run seed`"
- [x] 12.2 Actualizar `docs/api-spec.yml` con los nuevos endpoints admin (`POST/PATCH /categorias`, subcategorias, `POST/PATCH /barrios`, toggles) + públicos (`GET /categorias?activa=true`, `GET /barrios?activo=true`). Incluir schemas `Categoria`, `Subcategoria`, `Barrio` y DTOs `CreateCategoria`, `UpdateCategoria`, `CreateSubcategoria`, `CreateBarrio`, `UpdateBarrio`
- [x] 12.3 Actualizar `docs/backend-standards.md` si hay ajustes de convención (módulos `categorias`/`barrios` añadidos al inventario, plantilla Clean Architecture por feature confirmada)
- [x] 12.4 Actualizar `AGENTS.md` §8.4 roadmap: mover `categorias` y `barrios` de "Pendiente" a "Implementado" (al archivar el change)
- [x] 12.5 Actualizar `README.md` raíz mencionando `npm run seed` y `npm run audit-refs` como comandos del backend

## 13. Quality gates

- [x] 13.1 Ejecutar `npm --prefix backend run lint` y arreglar warnings nuevos
- [x] 13.2 Ejecutar `make solid-lint` y verificar: zero archivos >300 líneas nuevos (los nuevos módulos deben quedar debajo del umbral). Cyclomatic complexity ≤10. Zero violations DIP en `domain/`/`application/`
- [x] 13.3 Ejecutar `npm --prefix backend test -- --coverage` y verificar cobertura ≥90% en archivos nuevos de `categorias` y `barrios` (services, validators, adapters)
- [x] 13.4 Ejecutar `npm --prefix backend run test:e2e` cubriendo todos los nuevos endpoints (admin happy paths + 400/403/409/404) y los E2E de places/eventos con el flag activado
- [x] 13.5 Ejecutar `bash check-refs.sh` para confirmar integridad referencial de {file:...}

## 14. Smoke + archive

- [x] 14.1 Levantar el backend contra el emulador Firestore, ejecutar `npm run seed` y `npm run seed-places`, validar con curl que `GET /api/v1/categorias?activa=true` y `GET /api/v1/barrios?activo=true` devuelven datos correctos (sin auth) y `POST /api/v1/categorias` rechaza a un owner(403)
- [x] 14.2 Ejecutar `npm run audit-refs` contra el emulador con datos seed y confirmar exit code 0
- [x] 14.3 Confirmar que `/api/v1/health` responde 200 con los nuevos módulos cargados
  - [x] 14.4 Marcar todos los checkboxes como completados y ejecutar `/verify categorias-barrios-crud` seguido de `/archive categorias-barrios-crud` para archivar el change
