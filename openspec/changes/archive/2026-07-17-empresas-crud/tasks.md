# Tasks — Empresas CRUD (empresas-crud)

> Una task a la vez. TDD obligatorio: test fallido antes de producción.

## Change Summary

Implementar el módulo `empresas` (NestJS + Firestore) con CRUD completo:
create, findAll (filtros+paginación), findOne, findBySlug, update, remove.
Reutiliza `FirebaseService` y el `CreateEmpresaDto` ya existente. Registra el módulo
en `app.module.ts`. Sincroniza `api-spec.yml` / `data-model.md`.

---

### Task 1: EmpresasService — lógica de dominio + tests ✅ COMPLETED

- [x] Escribir `empresas.service.spec.ts` (TDD rojo→verde): create, findAll, findOne, findBySlug, update, remove, slug duplicado (409), not found (404) — 13 tests
- [x] Crear `entities/empresa.entity.ts` (interfaz Empresa) y `entities/empresa-status.ts`
- [x] Implementar `EmpresasService` inyectando `FirebaseService`:
  - `create(dto)` → genera slug, verifica unicidad, crea doc `empresas` (status pendiente) + doc `solicitudes`
  - `findAll(filters, page, limit)` → query Firestore + filtro `q` + meta
  - `findOne(id)` → 404 si no existe
  - `findBySlug(slug)` → 404 si no existe
  - `update(id, dto)` → 404 si no existe, regenera slug si cambia nombre, actualiza updatedAt
  - `remove(id)` → 404 si no existe, elimina
- [x] Pasar tests (13/13)
- Priority: High
- Layer: Backend (Domain/Data)
- Estimated: 5h

### Task 2: EmpresasController — endpoints REST + tests ✅ COMPLETED

- [x] Escribir `empresas.controller.spec.ts` (12 tests): cada ruta + propagación 404/409
- [x] Crear `update-empresa.dto.ts` (PartialType de CreateEmpresaDto, nombre opcional)
- [x] Implementar `EmpresasController` con:
  - `POST /empresas` (201 / 409 / 400 vía ValidationPipe)
  - `GET /empresas` (200 con data+meta)
  - `GET /empresas/slug/:slug` (200 / 404) — declarada antes de `:id`
  - `GET /empresas/:id` (200 / 404)
  - `PUT /empresas/:id` (200 / 404)
  - `DELETE /empresas/:id` (200 {deleted:true,id})
- [x] Pasar tests (12/12)
- Priority: High
- Layer: Backend (API)
- Estimated: 3h

### Task 3: EmpresasModule + registro en AppModule ✅ COMPLETED

- [x] Crear `empresas.module.ts` (declara controller + provider; usa FirebaseService global)
- [x] Importar `EmpresasModule` en `app.module.ts`
- [x] `make build` exitoso
- Priority: High
- Layer: Backend (Infra)
- Estimated: 1h

### Task 4: Sincronizar docs y validar ✅ COMPLETED

- [x] `docs/api-spec.yml` ya cubre /empresas (sin cambios necesarios)
- [x] `docs/data-model.md`: nota de creación automática de `solicitudes` al crear empresa
- [x] `make lint` y `make test` en verde (25 tests)
- [x] Health check en `/api/v1/health` intacto
- [x] Ajustes de tooling: `.eslintrc.js` + `.eslintignore`, `moduleNameMapper` en jest (alias @/), `usuarioId` en CreateEmpresaDto
- Priority: Medium
- Layer: Docs
- Estimated: 1h

---

## Guidelines

1. One task at a time. 2. TDD: test rojo → implementación → verde. 3. Marcar `[ ]`→`[x]`.
4. Si cambia API/data-model, actualizar docs antes de `/archive`.
