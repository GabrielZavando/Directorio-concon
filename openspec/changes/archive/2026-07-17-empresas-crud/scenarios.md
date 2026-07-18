# Scenarios — Empresas CRUD (empresas-crud)

> Escenarios de aceptación en formato Gherkin para el módulo de empresas.
> Referencia: docs/api-spec.yml, docs/data-model.md.

## Feature: Gestión de Empresas

### Scenario 1: Crear empresa con datos válidos

**Given** no existe una empresa con slug "restaurante-el-marino"
**When** un usuario autenticado envía `POST /api/v1/empresas` con:
  | Field | Value |
  |-------|-------|
  | nombre | Restaurante El Marino |
  | descripcion | Restaurante de mariscos frescos |
  | categoriaId | cat-restaurantes |
  | barrioId | barrio-centro |
  | direccion | Av. Borgoño 123, Concón |
  | planId | gratuito |

**Then** se crea la empresa con `status: pendiente`
**And** se genera un `slug` único "restaurante-el-marino"
**And** se crea una `solicitud` de tipo "registro" asociada
**And** la respuesta es `201` con la empresa creada (id, slug, status)

---

### Scenario 2: Crear empresa con slug duplicado falla

**Given** ya existe una empresa con slug "restaurante-el-marino"
**When** se envía `POST /api/v1/empresas` con nombre "Restaurante El Marino" (mismo slug derivado)
**Then** la respuesta es `409` con error "Slug duplicado"
**And** no se crea ninguna empresa ni solicitud

---

### Scenario 3: Crear empresa con DTO inválido falla

**Given** un payload sin `categoriaId` o con `email` mal formado
**When** se envía `POST /api/v1/empresas`
**Then** el `ValidationPipe` global responde `400` (no llega al servicio)
**And** no se persiste nada

---

### Scenario 4: Listar empresas con filtros y paginación

**Given** existen empresas aprobadas en la colección
**When** se envía `GET /api/v1/empresas?categoriaId=cat-restaurantes&page=1&limit=20`
**Then** la respuesta es `200` con `{ data: [...], meta: { total, page, limit } }`
**And** solo se incluyen empresas de esa categoría

---

### Scenario 5: Obtener empresa por id existente

**When** se envía `GET /api/v1/empresas/{id}` con un id válido
**Then** la respuesta es `200` con la empresa

---

### Scenario 6: Obtener empresa inexistente falla

**When** se envía `GET /api/v1/empresas/{id-inexistente}`
**Then** la respuesta es `404` con error "Empresa no encontrada"

---

### Scenario 7: Obtener empresa por slug

**When** se envía `GET /api/v1/empresas/slug/{slug}`
**Then** `200` con la empresa si existe, `404` si no

---

### Scenario 8: Actualizar empresa

**Given** existe la empresa con id `{id}`
**When** se envía `PUT /api/v1/empresas/{id}` con campos parciales (nombre, telefono)
**Then** `200` con la empresa actualizada y `updatedAt` renovado

---

### Scenario 9: Eliminar empresa

**Given** existe la empresa con id `{id}`
**When** se envía `DELETE /api/v1/empresas/{id}`
**Then** `200` (eliminada) y un `GET` posterior retorna `404`

---

## Edge Cases

| Edge Case | Expected Behavior |
|-----------|------------------|
| Slug duplicado | 409, no crear |
| DTO inválido | 400 (ValidationPipe) |
| id inexistente en GET/PUT/DELETE | 404 |
| Coordenadas/redesSociales opcionales | Aceptadas solo si cumplen DTO |
| Paginación sin page/limit | Defaults page=1, limit=20 |

## Definition of Done

- [ ] Todos los escenarios cubiertos por tests
- [ ] `EmpresasService` con create/findAll/findOne/findBySlug/update/remove
- [ ] `EmpresasController` con endpoints REST
- [ ] `EmpresasModule` registrado en `app.module.ts`
- [ ] `api-spec.yml` y `data-model.md` sincronizados
- [ ] `make lint` y `make test` en verde
