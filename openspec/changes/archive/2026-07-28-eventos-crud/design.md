# Design — Eventos CRUD (eventos-crud)

> Decisiones de diseño y trade-offs. Referencia: `proposal.md`, `docs/backend-standards.md` (Clean Architecture por feature), `docs/frontend-standards.md`, `docs/data-model.md`.

## 1. Modelado de datos

### 1.1 Colección `eventos`

Nueva colección Firestore `eventos`, hermana de `places`. Convenciones de naming: camelCase en campos, IDs en slug kebab-case, timestamps `createdAt`/`updatedAt` (Firestore Timestamp). Misma familia de tipos que `places` (ver `docs/data-model.md`).

**Esquema (documentado canónicamente en `docs/data-model.md`, se sintetiza aquí para diseño):**

| Campo | Tipo | Constraints / Validación |
|-------|------|--------------------------|
| id | string (PK auto) | Firestore document id |
| nombre | string | 2..120 chars |
| slug | string UNIQUE | kebab-case, derivado de nombre |
| descripcionCorta | string | 1..140 chars (cards) |
| descripcion | string | 10..2000 chars (ficha) |
| categoriaId | string (ref) | `'eventos'` (constante; el evento siempre pertenece a la categoría madre Eventos) |
| subcategoriaId | string | debe existir en `categorias.subcategorias[].slug` donde `categorias.id === 'eventos'` (uno de los 10 slugs sembrados) |
| barrioId | string (ref) | ref a `barrios` |
| organizador | string | 1..200 chars |
| organizadorContacto | string? | teléfono o email (string libre, no too estricto para no romper datos externos) |
| organizadorWeb | string? | URL |
| ubicacionNombre | string? | 1..200 chars (ej: "Playa Amarilla", "Plaza de Armas") |
| ubicacionDireccion | string | 1..200 chars |
| coordenadas | Coordenadas | `{ lat: number; lng: number }` — reusar VO de `places` |
| fechaInicio | Timestamp | ISO 8601; `fechaInicio < fechaFin` |
| fechaFin | Timestamp | ISO 8601 |
| precioTipo | enum | `'gratis' \| 'pago' \| 'donacion' \| 'invitacion'` |
| precioValor | number | ≥ 0; si `precioTipo === 'gratis'` entonces **debe** ser `0` (regla de validación en `EventoValidator`) |
| precioMoneda | enum | `'CLP' \| 'USD'`; default `'CLP'` |
| capacidadMaxima | number? | > 0 si presente |
| publicoObjetivo | PublicoObjetivoEnum[] | ≥ 1 elemento; `'familia' \| 'adultos' \| 'tercera_edad' \| 'mascotas' \| 'todos' \| 'ninos' \| 'adolescentes'` |
| nivelRuido | enum | `'bajo' \| 'medio' \| 'alto'` |
| portada | string? | URL (16:9 recomendado) |
| accesibilidad | AccesibilidadEnum[]? | enum controlado |
| status | enum | `'pendiente' \| 'aprobado' \| 'rechazado'` (flujo `solicitudes`) |
| estado | enum | `'borrador' \| 'programado' \| 'en_curso' \| 'finalizado' \| 'cancelado' \| 'suspendido'` (ciclo de vida) |
| destacado | boolean | default `false` |
| verificado | boolean | default `false` |
| placeId | string? | ref opcional a `places` |
| usuarioId | string | Firebase Auth UID — REQUIRED, el creador/publicador |
| vistasTotales | number | default `0`; placeholder sin lógica de incremento (igual que `places`) |
| createdAt | Timestamp | auto |
| updatedAt | Timestamp | auto |
| fechaPublicacion | Timestamp? | set cuando `status` pasa a `'aprobado'` (espejo de `places.fechaPublicacion`) |

**Value Objects y enums (en `domain/`):**

```typescript
// Reusar de places: Coordenadas VO.
// Nuevos:
type PrecioTipo = 'gratis' | 'pago' | 'donacion' | 'invitacion';
type PrecioMoneda = 'CLP' | 'USD';
type PublicoObjetivoEnum = 'familia' | 'adultos' | 'tercera_edad' | 'mascotas' | 'todos' | 'ninos' | 'adolescentes';
type AccesibilidadEnum = 'acceso-silla-ruedas' | 'banos-accesibles' | 'estacionamiento-reservado' | 'interprete-señas' | 'material-braille' | 'rampa-acceso';
type NivelRuido = 'bajo' | 'medio' | 'alto';
type EventoStatus = 'pendiente' | 'aprobado' | 'rechazado';
type EventoEstado = 'borrador' | 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | 'suspendido';
```

### 1.2 `solicitudes` extendida

**`tipo` enum extended** (additive, non-breaking para el flujo `places`):
```
'registro' | 'actualizacion' | 'registro-evento' | 'actualizacion-evento'
```

**`eventoId`** (new, optional, nullable) — alongside existing `placeId`.

**Regla:** una `solicitud` tiene XOR entre `placeId`/`eventoId`. Se valida en `SolicitudesService`. El campo `placeId` queda **no-required** en esta extensión (en la implementación actual es required; el cambio lo hace nullable sin romper los tests existentes — caso cubierto en `solicitudes.service.spec.ts`).

## 2. Ciclo de vida del evento

### 2.1 Flujo de aprobación (`status`)

```
                        POST /eventos
                              │
                              ▼
                       status = pendiente
                       estado  = borrador
                              │
              ┌───────────────┴───────────────┐
              │ admin: aprobar solicitud      │ admin: rechazar solicitud
              ▼                               ▼
        status = aprobado              status = rechazado
        estado  = programado          estado  = cancelado (implícito)
        fechaPublicacion = now          
              │
              │ publisher edita (PUT)
              ▼
        status se mantiene 'aprobado' (visible)
        se crea solicitud tipo 'actualizacion-evento' (pendiente)
        estado = 'programado' sigue
        La edición NO se aplica hasta que el admin apruebe la solicitud
        → ver §2.3 "Edición de evento aprobado"
```

### 2.2 Flujo de ciclo de vida (`estado`)

| estado | cuándo | quién setea |
|--------|--------|-------------|
| `borrador` | al crear (POST) | sistema (default) |
| `programado` | cuando `status` pasa a `aprobado` | sistema (en `aprobar solicitud`) |
| `en_curso` | (post-MVP — automático al llegar `fechaInicio`) — acá solo seteable manualmente | admin o publisher via PUT |
| `finalizado` | (post-MVP — automático al pasar `fechaFin`) — manual acá | admin o publisher via PUT |
| `cancelado` | publisher o admin decide cancelar (PUT con `{estado:'cancelado'}`) | publisher (su evento) o admin (cualquiera) |
| `suspendido` | admin solo (operaciones de moderación) | admin solo |

**Non-Goal**: transiciones automáticas `programado`→`en_curso`→`finalizado` basadas en `fechaInicio`/`fechaFin`. Se persisten los timestamps (`fechaInicio`, `fechaFin`) pero la transición es manual en esta versión.

### 2.3 Edición de evento aprobado

Cuando un publisher edita un evento cuya `status === 'aprobado'`:

- El evento visible al público **NO se modifica en vivo**.
- Se crea una `solicitud` con `tipo: 'actualizacion-evento'`, `eventoId: <id>`, `usuarioId`, `status: 'pendiente'`, y un campo nuevo `proposal` (obj JSON con los campos a actualizar) — **miro del patrón de "staged update"**.
- Cuando el admin aprueba la solicitud, se aplican los campos del `proposal` al evento (`updatedAt` refresh). Si el admin rechaza, no se aplica nada.
- Durante el período "pending proposal", el evento sigue visible en su estado anterior.

> **Design trade-off**: la alternativa sería permitir edición en vivo (sin re-aprobación) para campos no-críticos (ej: descripción, contacto). Se decide **re-aprobar todo** por paridad con el flujo `places` (que re-aprueba en actualización) y para evitar que el publisher reescriba información sensible (ubicación, fecha, precio) sin control. Es más conservador pero más seguro. Documentado para revisión futura.

## 3. Backend — Clean Architecture por feature

```
backend/src/modules/eventos/
├── domain/
│   ├── evento.entity.ts
│   ├── evento-status.enum.ts
│   ├── evento-estado.enum.ts
│   ├── precio-tipo.enum.ts
│   ├── precio-moneda.enum.ts
│   ├── publico-objetivo.enum.ts
│   ├── accesibilidad.enum.ts
│   ├── nivel-ruido.enum.ts
│   ├── coordenadas.vo.ts                  ← reusar de places (lévelo a shared/domain a futuro, Non-Goal aquí)
│   ├── evento-repository.interface.ts
│   └── evento-repository.contract.spec.ts
├── application/
│   ├── eventos.service.ts
│   ├── eventos.service.spec.ts
│   └── evento-validator.ts                ← validaciones cross-campo (fechaInicio<fechaFin, precioTipo+precioValor, subcategoria válida)
└── infrastructure/
    ├── dto/
    │   ├── create-evento.dto.ts
    │   ├── update-evento.dto.ts
    │   ├── query-evento.dto.ts
    │   ├── coordenadas.dto.ts             ← reusar de places
    │   ├── publico-objetivo.dto.ts
    │   └── accesibilidad.dto.ts
    ├── evento-firestore.adapter.ts
    ├── evento-firestore.adapter.spec.ts
    ├── eventos.controller.ts
    ├── eventos.controller.spec.ts
    └── eventos.module.ts
```

### 3.1 DIP / SRP / OCP

- **DIP**: `domain/` y `application/` no importan `firebase-admin` ni `class-validator`/`class-transformer`. `EventoRepository` es una interfaz en `domain/`; el adapter concreto en `infrastructure/`.
- **SRP**: `EventoValidator` (validaciones cross-campo) separado de `EventosService` (casos de uso) para no mezclar lógica. `EventosController` solo HTTP.
- **OCP**: los enums (`PrecioTipo`, `PublicoObjetivoEnum`, etc.) son union types cerrados pero extendibles — añadir un nuevo valor de enum no rompe las interfaces (los DTOs validan con `@IsEnum` y `class-validator`).
- **ISP**: `EventoRepository` ≤ 7 métodos (`create`, `findAll`, `findOne`, `findBySlug`, `findByPublicFilters`, `findMapData`, `update`, `delete`). Justo por debajo del límite ≤5 de `backend-standards.md`; si crece, dividir en `EventoReadRepository`/`EventoWriteRepository`.
- **LSP**: `evento-repository.contract.spec.ts` valida que cualquier implementación cumple el contrato (mirror de `places`).

### 3.2 Service — casos de uso

```typescript
class EventosService {
  create(dto: CreateEventoDto, usuarioId: string): Promise<Evento>
  findAllPublic(query: EventoQuery): Promise<{ data: Evento[]; meta: Pagination }>
  findAllAdmin(query: EventoQuery): Promise<{ data: Evento[]; meta: Pagination }>   // todos los statuses
  findOne(id: string): Promise<Evento>
  findOnePublic(id: string): Promise<Evento>                                         // 404 si != aprobado
  findBySlug(slug: string): Promise<Evento>
  findBySlugPublic(slug: string): Promise<Evento>
  update(id: string, dto: UpdateEventoDto, usuarioId: string): Promise<Evento>
  remove(id: string): Promise<void>
  listMapData(): Promise<EventoMapDataItem[]>
}
```

### 3.3 Endpoints REST

| Método | Path | Auth | Status visibles | Respuestas |
|--------|------|------|------------------|------------|
| POST | `/eventos` | empresa/admin | — | 201 / 400 / 401 |
| GET | `/eventos` | público | `aprobado` | 200 `{data, meta}` |
| GET | `/eventos/map-data` | público | `aprobado` | 200 `EventoMapDataItem[]` |
| GET | `/eventos/{id}` | público | `aprobado` | 200 / 404 |
| GET | `/eventos/slug/{slug}` | público | `aprobado` | 200 / 404 |
| PUT | `/eventos/{id}` | empresa (dueño)/admin | — | 200 / 401 / 403 / 404 |
| DELETE | `/eventos/{id}` | empresa (dueño)/admin | — | 200 / 401 / 403 / 404 / 409 |

**Route ordering**: `/eventos/slug/{slug}` declarada ANTES de `/eventos/{id}` (mirror `places`) para evitar captura errónea.

**`/eventos` filtros querystring:**
- `q` (string, fallback a filtro por prefijo `nombre` like en `places`)
- `categoriaId` (default `'eventos'`)
- `subcategoriaId` (string)
- `barrioId` (string)
- `fechaDesde` (ISO 8601) — `fechaInicio >= fechaDesde`
- `fechaHasta` (ISO 8601) — `fechaInicio <= fechaHasta`
- `precioTipo` (`'gratis'|'pago'|'donacion'|'invitacion'`)
- `estado` (default `'programado'` — ver §2.2; el visitante anónimo normalmente quiere próximos eventos)
- `destacado` (boolean)
- `page` (default 1), `limit` (default 20)

**`/eventos/map-data`** returns light payload:
```json
[{
  "id": "festival-verano-concon-2025",
  "slug": "festival-verano-concon-2025",
  "nombre": "Festival de Verano Concón 2025",
  "coordenadas": { "lat": -32.923, "lng": -71.523 },
  "subcategoriaId": "festivales-culturales",
  "barrioId": "higuerillas",
  "fechaInicio": "2025-02-14T18:00:00Z"
}]
```

## 4. Frontend — Angular 20 standalone

Estructura (siguiendo `frontend-standards.md` smart/dumb):

```
frontend/src/app/features/eventos/
├── routes/
│   └── eventos.routes.ts             ← lazy standalone routes
├── pages/
│   ├── eventos-list-page.component.ts        (smart — EventosService)
│   ├── evento-detail-page.component.ts        (smart — EventosService)
│   ├── evento-form-page.component.ts          (smart — EventosService, Reactive Forms)
│   └── mis-eventos-page.component.ts          (smart — EventosService del usuario autenticado)
└── state/
    └── eventos.signals.ts                     ← RxJS-to-Signal adapter opcional
frontend/src/app/shared/ui/evento-*/
├── evento-card/        (dumb)
├── evento-info/        (dumb)
├── evento-ubicacion/   (dumb — @angular/google-maps)
├── evento-organizador/ (dumb)
├── evento-precio-badge/(dumb)
├── evento-skeleton/    (dumb — ngx-skeleton-loader)
└── evento-filtros/     (dumb — reuses frontend-reusable-search-component inputs)
```

### 4.1 Rutas
```typescript
// eventos.routes.ts (lazy en app.routes.ts)
{
  path: 'eventos',
  loadComponent: () => import('./pages/eventos-list-page.component').then(m => m.EventosListPage),
},
{ path: 'eventos/nuevo',     canActivate: [authGuard], loadComponent: () => import('./pages/evento-form-page.component').then(...) },
{ path: 'eventos/:slug',    loadComponent: () => import('./pages/evento-detail-page.component').then(...) },
{ path: 'eventos/:id/editar', canActivate: [authGuard], loadComponent: () => import('./pages/evento-form-page.component').then(...) },
{ path: 'mis-eventos',      canActivate: [authGuard], loadComponent: () => import('./pages/mis-eventos-page.component').then(...) },
{
  path: 'admin/eventos',    canActivate: [authGuard, adminGuard], loadComponent: () => import('./pages/mis-eventos-page.component').then(...) },
```

### 4.2 DIP / ISP frontend
- `EventosService` inyecta `HttpClient` via Angular DI (no `new HttpClient()`).
- Dumb components solo reciben `@Input()` y emiten `@Output()` — nunca inyectan `EventosService`.
- Selectors específicos: `selectEventosProximos`, `selectEventosPorBarrio`, `selectEventoActual` (no `Store<AppState>` monolítico).
- Component inputs ≤ 5.

### 4.3 Design system "Dunas y Océano"
- 100% tokens desde `docs/DESIGN.md` vía `tailwind.config.js` extend. **Cero hex literals en componentes** (lint manual + code review).
- Tipografía: títulos `font-headline` (Montserrat), cuerpo/UI `font-sans` (Inter).
- Iconografía: `lucide-angular` (`calendar`, `map-pin`, `ticket`, `users`, `volume-2`... consistente con `categorias.icono='party-popper'`).
- Estados de carga: `ngx-skeleton-loader` con `border-radius` y color de `surface-container-low` de `docs/DESIGN.md` (mirror `places` skeleton).
- Accesibilidad: AAA en labels (sunlight costero, ver `docs/DESIGN.md` Typography §Contrast). ARIA en filtros y botones.

## 5. Trade-offs importantes

### 5.1 `estado` automático vs manual — Non-Goal de transiciones automáticas
Las transiciones `programado→en_curso→finalizado` basadas en `fechaInicio`/`fechaFin` se postergan a post-MVP. Ahora son manuales. Pros: menos complejidad (no cron jobs, no Firestore triggers). Contras: los listados pueden mostrar eventos "en_curso" que ya terminaron. Mitigado: en `GET /eventos` público, el cursor por `fechaInicio` ASC filtra lógicamente (eventos pasados quedan al final). Se añade índice `eventos(fechaInicio ASC + estado ASC)`.

### 5.2 Re-aprobación de ediciones — decisión conservadora
Toda edición de un evento aprobado genera `solicitud` y no se aplica en vivo. Trade-off:用户体验 vs control de moderación.ادل Se eligió control por paridad con `places` y por seguridad de información sensible (ubicación/fecha/precio). Alternativa (edición en vivo sin re-aprobación) se documenta para revisión futura.

### 5.3 `macro_zona_id` descartado — reuso de `barrios`
La propuesta original usaba `macro_zona_id` (zona_01..zona_13), una división territorial nueva. Se descarta por:
- El data model canónico ya define `barrios` (12 urbanos + 1 rural) como la unidad territorial del directorio.
- Introducir una segunda taxonomía genera confusión y un modelo de datos duplicado.
- El frontend `frontend-reusable-search-component` ya filtra por `barrioId`.
Yellow bitmap de Concón a futuro (sectores mayores) puede ser un cambio separado. Non-Goal aquí.

### 5.4 Rol `'empresa'` NO renombrado a `'place'`
Decisión del stakeholder (confirmada): el rol Firebase Auth se mantiene como `'empresa'` (decisión canónica ya tomada en `openspec/specs/places/spec.md:293`). Aunque conceptualmente sería más limpio llamarlo `'place'`, el rename es transversal (auth, usuarios, guards, data-model) y se pospone a un change separado `rename-rol-empresa-to-place` (mismo patrón que `rename-to-places`).

### 5.5 `categoriaId` constante (`'eventos'`)
Todos los eventos tienen `categoriaId='eventos'`. La subcategoría es lo que aporta granularidad (`subcategoriaId`). Trade-off: denial del "evento que es a la vez del rubro Gastronomía" (una feria gastronómica). Se decide que la subcategoría `ferias-gastronomicas` es suficiente (ya sembrada). Alternativa (permitir `categoriaId` libre del evento) introduce complejidad de modelado (categoría madre distinta vs sub-categorización) que no aporta valor al visitante. Non-Goal.

### 5.6 `solicitudes.proposal` (staged update) — campo nuevo JSON
Para implementar el "staged update" del §2.3, `solicitudes` necesita almacenar los campos propuestos. Se añade `proposal: { ...campos-a-actualizar }` como objeto JSON. Este campo se documenta en `docs/data-model.md` (extiende `solicitudes`). Alternativa (snapshot completo del evento modificado) descartada por payload pesado.

## 6. Test strategy

| Layer | Tests | Tools | Objetivo cobertura |
|------|-------|-------|-------------------|
| `domain` | Enums, value objects, contrato repository | Jest | 100% |
| `application` (service) | Casos de uso: create, findAll public/admin, findOne, findBySlug, update (con re-aprobación), remove, validaciones cross-campo (fechaInicio<fechaFin, precioTipo+precioValor, subcategoria válida, status visibility rules), 404/409 propagación | Jest + mock `EventoRepository` | ≥ 90% |
| `infrastructure` (adapter) | GetById, GetBySlug, GetPublic (filters), Create, Update, Delete — mocks de Firestore | Jest + mock `FirebaseService` | ≥ 90% |
| `infrastructure` (controller) | Cada ruta, propagate service errors, auth required check, visibility rules | Jest + Supertest | ≥ 90% |
| `solicitudes` (regression) | El flujo `places` existente sigue funcionando (no-break de la extensión `tipo`/`eventoId?`) | Jest existente | mantener verde |
| `frontend` (componentes) | Lógica de `EventoFormComponent` (validators), `EventoCardComponent` (input → render), `EventoFiltrosComponent` (output events) | Jasmine + Karma | ≥ 80% |

## 7. SDD — documentos source-of-truth (actualizar ANTES del código)

1. **`docs/data-model.md`** — nueva entidad `eventos` (tabla + value objects + enums + reglas + índices), extensión de `solicitudes` (`tipo` новых values, `eventoId?`, `proposal?`).
2. **`docs/api-spec.yml`** — schemas `Evento`, `CreateEvento`, `UpdateEvento`, `EventoMapDataItem`, `EventoQuery`, paths `/eventos/*`.
3. **`docs/base-standards.md` §8.4** — nota de roadmap.
4. **`.github/instructions/database-instructions.md`** — índices Firestore.
5. **`firestore.indexes.json`** — composite indices.

Una vez actualizados, recién ahí se inicia TDD en el módulo `eventos` (Task 1): test rojo → implementación → verde.

## 8. Non-Goals (este change)

- Transiciones automáticas de `estado` (`programado`→`en_curso`→`finalizado` por cron/trigger).
- Edición en vivo de eventos aprobados sin re-aprobación (staged update baked in).
- Search full-text o semántica (IA) sobre `eventos`.
- Upload de imágenes de portada a Firebase Storage (la `portada` es URL en esta fase).
- Incremento automático de `vistasTotales` (placeholder como en `places`).
- Endpoint `GET /places/{id}/eventos` (relación inversa).
- Introducir `macro-zonas` como colección nueva.
- Renombrar rol `'empresa'`→`'place'` (change separado).
- Panel admin Angular Material para gestión de eventos (panel admin es post-MVP; este change usa el formulario smart Angular standalone).
- `openapi-generator` para tipos TS frontend (manual en esta fase).
- Notificaciones push/email al publisher cuando se aprueba/rechaza.
