# Tasks — eventos-location-model

Capas backend: `domain | application | infrastructure`. Cada task con subtareas, prioridad (P0=blocking, P1=high, P2=normal), capa y estimate.

> Conventions: TDD estricto — escribir el test fallido ANTES que el código de producción. Un task a la vez.

---

## T1 — Domain: Modalidad enum + Evento entity
- **Priority**: P0
- **Layer**: domain
- **Estimate**: S
- [x] T1.1 Crear `backend/src/modules/eventos/domain/modalidad.enum.ts` con `MODALIDAD_VALUES = ['presencial','online','hibrido'] as const` y `type Modalidad = typeof MODALIDAD_VALUES[number]`
- [x] T1.2 Agregar `modalidad: Modalidad` a `Evento` entity (`evento.entity.ts`); documentar regla de relajación de `ubicacion` en el comentario de la entidad
- [x] T1.3 Test unitario: `evento.entity.spec.ts` — construir Evento con `modalidad: 'online'` y sin `ubicacion` (válido); construir con `modalidad: 'presencial'` sin `ubicacion` (inválido si se valida en dominio — si la validación vive en DTO, este test solo documenta la forma)
- **Suggested Path**: `backend/src/modules/eventos/domain/modalidad.enum.ts`, `evento.entity.ts`
- **Test Path**: `backend/src/modules/eventos/domain/evento.entity.spec.ts`

## T2 — Domain: Relajar Ubicacion VO
- **Priority**: P0
- **Layer**: domain
- **Estimate**: S
- [x] T2.1 En `ubicacion.vo.ts` declarar `direccion?: string` (opcional) y conservar `coordenadas` requerida
- [x] T2.2 Ajustar `isValidUbicacion` para requerir solo `coordenadas` válidas (lat/lng numéricos); aceptar ausencia de `direccion`/`nombreLugar`
- [x] T2.3 Ampliar `ubicacion.vo.spec.ts`: caso válido sin `direccion`; caso inválido sin `coordenadas`
- **Suggested Path**: `backend/src/modules/eventos/domain/ubicacion.vo.ts`
- **Test Path**: `backend/src/modules/eventos/domain/ubicacion.vo.spec.ts`

## T3 — Infrastructure: DTOs + validación condicional
- **Priority**: P0
- **Layer**: infrastructure
- **Estimate**: M
- [x] T3.1 En `create-evento.dto.ts`: agregar `modalidad` con `@IsEnum(MODALIDAD_VALUES)` (no `@IsOptional`)
- [x] T3.2 En `ubicacion.dto.ts`: marcar `direccion` como `@IsOptional()` (mantener `coordenadas` requerida via `CoordenadasDto`)
- [x] T3.3 Crear validator custom `ModalidadUbicacionValidator` (class-validator `Validate`/`ValidatorConstraint`) que: si `modalidad === 'online'` → `ubicacion` debe ser ausente (400); si `modalidad !== 'online'` → `ubicacion` con `coordenadas` debe estar presente (400). Aplicar en `CreateEventoDto` y `UpdateEventoDto`
- [x] T3.4 Test unitario del validator: online+ubicacion → fail; presencial sin ubicacion → fail; presencial con solo coordenadas → pass; hibrido con coordenadas → pass
- **Suggested Path**: `backend/src/modules/eventos/infrastructure/dto/create-evento.dto.ts`, `update-evento.dto.ts`, `ubicacion.dto.ts`, `modalidad-ubicacion.validator.ts`
- **Test Path**: `backend/src/modules/eventos/infrastructure/dto/modalidad-ubicacion.validator.spec.ts`

## T4 — Infrastructure: Firestore adapter (persistencia + lectura retrocompat)
- **Priority**: P0
- **Layer**: infrastructure
- **Estimate**: M
- [x] T4.1 En `evento-firestore.adapter.ts`: al mapear doc→entity, si `modalidad` es undefined → `'presencial'`; siempre escribir `modalidad` en `entity→doc`
- [x] T4.2 Asegurar que `ubicacion` se persiste/lee tal cual (puede ser undefined para online)
- [x] T4.3 Test integration (emulador Firestore) o unit (mock): doc sin `modalidad` se hidrata como `'presencial'`; doc con `modalidad:'online'` y sin `ubicacion` round-trips correctamente
- **Suggested Path**: `backend/src/modules/eventos/infrastructure/evento-firestore.adapter.ts`
- **Test Path**: `backend/src/modules/eventos/infrastructure/evento-firestore.adapter.spec.ts`

## T5 — Application: EventosService normalización en update
- **Priority**: P1
- **Layer**: application
- **Estimate**: M
- [x] T5.1 En `eventos.service.ts` (update): si `dto.modalidad === 'online'` → forzar `ubicacion = undefined` en el patch
- [x] T5.2 Mantener la lógica existente de reversión a `pendiente` + `cambios[]` cuando el evento era `verificado` (CH-04b) — ahora también cubre transición a online
- [x] T5.3 Test unitario: update a online limpia `ubicacion`; update presencial sin ubicacion → 400 vía validación (o servicio lanza BadRequest)
- **Suggested Path**: `backend/src/modules/eventos/application/eventos.service.ts`
- **Test Path**: `backend/src/modules/eventos/application/eventos.service.spec.ts`

## T6 — Infrastructure: map-data exclusión online
- **Priority**: P2
- **Layer**: infrastructure
- **Estimate**: S
- [x] T6.1 Verificar `GET /api/v1/eventos/map-data` ya filtra por `coordenadas` presente; si no, añadir filtro explícito
- [x] T6.2 Test E2E/integration: online sin coordenadas excluido; presencial/híbrido con coordenadas incluido
- **Suggested Path**: `backend/src/modules/eventos/infrastructure/eventos.controller.ts` (o mapper de map-data)
- **Test Path**: `backend/src/modules/eventos/infrastructure/eventos.controller.spec.ts` (o e2e correspondiente)

## T7 — Spec delta + docs sync
- **Priority**: P1
- **Layer**: docs
- **Estimate**: M
- [x] T7.1 Actualizar `openspec/specs/eventos/spec.md` → requirement "Evento entity schema": agregar `modalidad` y enmendar la viñeta `ubicacion` (direccion opcional; ubicacion requerida solo si `modalidad !== 'online'`)
- [x] T7.2 Actualizar `docs/data-model.md` §eventos: campo `modalidad`, y `Ubicacion = { nombreLugar?: string; direccion?: string; coordenadas: Coordenadas }`
- [x] T7.3 Actualizar `docs/api-spec.yml`: `modalidad` requerido en `CreateEvento`/`UpdateEvento`; `ubicacion` condicional; `direccion` opcional en `Ubicacion`
- **Suggested Path**: `openspec/specs/eventos/spec.md`, `docs/data-model.md`, `docs/api-spec.yml`

## T8 — E2E coverage (happy + error)
- **Priority**: P1
- **Layer**: infrastructure
- **Estimate**: M
- [x] T8.1 E2E `POST /api/v1/eventos`: online sin ubicacion → 201; online con ubicacion → 400; presencial sin ubicacion → 400; presencial con solo coordenadas → 201; hibrido con coordenadas → 201
- [x] T8.2 E2E `PUT /api/v1/eventos/{id}`: a online limpia ubicacion → 200; a presencial sin ubicacion → 400
- **Suggested Path**: `backend/test/eventos/` (o `*.e2e-spec.ts` del módulo)
- **Test Path**: `backend/test/eventos/eventos-location.e2e-spec.ts`

## T9 — solid-lint + cobertura
- **Priority**: P2
- **Layer**: ci
- **Estimate**: S
- [x] T9.1 `make solid-lint` (backend) sin violaciones en archivos tocados
- [x] T9.2 Cobertura módulo eventos ≥ 90% (unit+integration); E2E 100% happy paths de T8
- **Suggested Path**: `Makefile`, `templates/ci/`
- **Test Path**: n/a
