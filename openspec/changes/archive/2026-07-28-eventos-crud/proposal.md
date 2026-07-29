## Why

The Directorio de Concón currently models **places** (companies, institutions, public-interest places) but has no concept of **time-bound activities**. The commune runs a rich calendar of events (Festival de Verano, Fiestas Patrias, ferias gastronómicas, conciertos, carreras deportivas) that draws both residents and tourists, and the directory is missing the natural complement to a place listing: an **agenda**. Today, event discovery for Concón is scattered across Instagram feeds and the municipal Facebook page — there is no canonical, searchable, map-aware source.

Adding an `eventos` entity lets **publishers** (rol `empresa`, optionally anchored to their own `place`) and **admins** (for official/institutional events) record an event once — with category (reusing the existing `eventos` category + its 10 seeded subcategories), barrio (reusing the existing `barrios` collection), exact GPS coordinates, date/time range, pricing, accessibility, target audience and noise level — and have an admin approve it through the same `solicitudes` workflow already in place for places (Flujo 1). Visitors (anonymous) can then filter upcoming events by category, barrio, date range, price type and free-text query, open a ficha, and see them on an interactive map. The frontend already has a re-usable search component (`frontend-reusable-search-component`), a SPA navigation shell (`frontend-spa-routes`), a layout base (`frontend-layout-base`) and a Google Maps setup (`@angular/google-maps` consumed for `places/map-data`) — all reusable for the events surface without new design-token work.

This change is **post-MVP** per AGENTS.md §8.4 (the roadmap lists `auth`, `usuarios`, `categorias`, `barrios`, `solicitudes` and the 4 frontend screens as the MVP core, with `eventos` not enumerated). It is being prioritised because the publisher workflow (rol `empresa` creating content) and the `solicitudes` approval flow already exist for `places`, so the marginal cost of adding `eventos` is low and it validates the platform's extensibility.

## What Changes

- **NEW**: Add a Firestore collection `eventos` alongside `places`. Each document represents a single time-bound activity (festival, feria, concierto, carrera, taller, etc.). No data is migrated from `places`; the `places` collection is untouched.
- **REUSE**: `eventos` references existing collections, it does NOT create new ones:
  - `categoriaId` → always `'eventos'` (already in the seed `frontend/src/app/shared/data-access/local/data/categorias.json` with 10 subcategorias: `festivales-culturales`, `ferias-gastronomicas`, `ferias-libres`, `deportes-y-competencias`, `conciertos-y-shows`, `talleres-y-clases-abiertas`, `eventos-familiares`, `temporada-de-verano`, `fiestas-patrias`, `mercados-sustentables`). The event's `subcategoriaId` MUST match one of these 10 slugs (`categorias.subcategorias[].slug` where `categorias.id === 'eventos'`).
  - `barrioId` → reference to existing `barrios` collection (12 urbanos + 1 rural). The proposed `macro_zona_id` (zona_01..zona_13) is **NOT introduced** — Concón's canonical territorial division in this directory is the existing `barrios`. (Non-Goal.)
  - `solicitudes` → reused for the admin approval flow, extended with two new `tipo` values: `'registro-evento'` (auto-created on `POST /eventos`) and `'actualizacion-evento'` (created when a publisher edits an already-approved event). The existing fields `placeId`, `usuarioId`, `status`, `comentarios`, `revisadoPor`, `revisadoAt` are reused; a new optional `eventoId` field is added to `solicitudes` so an approval/rejection can reference an event. `tipo` enum is extended (non-breaking — additive).
- **SCHEMA** for `eventos` (camelCase per `docs/data-model.md` conventions; renames from the snake_case original proposal):
  - Top-level scalars: `id`, `nombre` (2..120), `slug` UNIQUE, `descripcionCorta` (1..140), `descripcion` (10..2000), `organizador` (1..200), `organizadorContacto?` (phone-or-email free string), `organizadorWeb?` (URL), `ubicacionNombre?` (1..200), `ubicacionDireccion` (1..200), `fechaInicio` (ISO 8601), `fechaFin` (ISO 8601, MUST be > `fechaInicio`), `precioValor` (number ≥ 0), `capacidadMaxima?` (> 0), `nivelRuido` (`'bajo'|'medio'|'alto'`), `portada?` (URL, 16:9 recommended), `vistasTotales` (number, default 0 — placeholder, no increment logic in this change, mirroring `places`), `destacado` (boolean, default false), `verificado` (boolean, default false).
  - References: `categoriaId` (= `'eventos'`), `subcategoriaId` (one of the 10 seeded slugs), `barrioId`, `placeId?` (optional reference to a `places` document — set when the event is organised by a place of the directory; `null`/omitted for external organisers like the municipality), `usuarioId` (Firebase Auth UID of the creator — REQUIRED, never null; identifies who published the event).
  - Nested objects (value objects, mirroring `places` conventions):
    - `coordenadas` → `{ lat: number; lng: number }` (reuses the `Coordenadas` value object already in `data-model.md`).
    - `precioTipo: 'gratis' | 'pago' | 'donacion' | 'invitacion'`, `precioMoneda: 'CLP' | 'USD'` (default `'CLP'`).
    - `publicoObjetivo: PublicoObjetivoEnum[]` — controlled enum (`'familia' | 'adultos' | 'tercera_edad' | 'mascotas' | 'todos' | 'ninos' | 'adolescentes'`). At least one element required.
    - `accesibilidad: AccesibilidadEnum[]?` — controlled enum (`'acceso-silla-ruedas' | 'banos-accesibles' | 'estacionamiento-reservado' | 'interprete-señas' | 'material-braille' | 'rampa-acceso'`).
  - Lifecycle (two distinct concepts — confirmed with stakeholder):
    - `status: 'pendiente' | 'aprobado' | 'rechazado'` — drives the `solicitudes` approval workflow (mirrors `places`).
    - `estado: 'borrador' | 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | 'suspendido'` — the event's own lifecycle. Set by the publisher/admin; only becomes `'programado'` once `status: 'aprobado'`. The_manageable transitions are documented in `design.md`. In this change, `estado` is persisted but its *automatic* transitions (`programado`→`en_curso`→`finalizado` based on `fechaInicio`/`fechaFin`) are **Non-Goal** (post-MVP).
  - Timestamps: `createdAt`, `updatedAt`, `fechaPublicacion?` (set when the solicitud is approved — mirrors `places.fechaPublicacion`).
- **NEW backend module** `backend/src/modules/eventos/` following Clean Architecture por feature (per `docs/backend-standards.md`):
  - `domain/` — `evento.entity.ts`, `evento-status.ts` (status enum), `evento-estado.ts` (estado enum), value objects + enums (`precio-tipo.enum.ts`, `precio-moneda.enum.ts`, `publico-objetivo.enum.ts`, `accesibilidad.enum.ts`, `nivel-ruido.enum.ts`, `coordenadas.vo.ts` reusing the `places` one), `evento-repository.interface.ts`, `evento-repository.contract.spec.ts`. No framework imports (DIP).
  - `application/` — `eventos.service.ts` + `eventos.service.spec.ts`. Use cases: `create` (auto-creates `solicitud` tipo `'registro-evento'`), `findAll` (filters + cursor pagination, returns only `status: 'aprobado'` for public), `findOne`, `findBySlug`, `update` (auto-creates `solicitud` tipo `'actualizacion-evento'` when event is `status: 'aprobado'`), `remove`, `listMapData` (lightweight fields for the map).
  - `infrastructure/` — DTOs (`create-evento.dto`, `update-evento.dto`, `coordenadas.dto` reused from `places`, `query-evento.dto`, `map-data-evento.dto`, `publico-objetivo.dto`, `accesibilidad.dto`), `evento-firestore.adapter.ts` + spec, `eventos.controller.ts` + spec, `eventos.module.ts`.
- **NEW REST endpoints** under `/api/v1/eventos` (added to `docs/api-spec.yml` BEFORE code, per SDD):
  - `POST /eventos` — auth required (rol `empresa` or `admin`); sets `status: 'pendiente'`, `estado: 'borrador'`, `usuarioId` from the verified Firebase Auth UID, auto-creates `solicitud` tipo `'registro-evento'`. Returns `201` with the created event.
  - `GET /eventos` — public; filters: `q`, `categoriaId` (defaults `'eventos'`), `subcategoriaId`, `barrioId`, `fechaDesde`, `fechaHasta`, `precioTipo`, `estado` (defaults `'programado'`/`'en_curso'`), `destacado`, `page`, `limit`; returns only events with `status: 'aprobado'`. Response `{ data, meta }` (same shape as `places`).
  - `GET /eventos/map-data` — public; returns array of light `{ id, slug, nombre, coordenadas, subcategoriaId, barrioId, fechaInicio }` items (status `aprobado` only).
  - `GET /eventos/{id}` — public; `404` if not found OR `status !== 'aprobado'` (hide pending/rejected from anonymous users).
  - `GET /eventos/slug/{slug}` — public; same `404` rule as by-id; declared before `/{id}` in the controller (mirror `places` route ordering).
  - `PUT /eventos/{id}` — auth required; publisher may edit only their own events (`usuarioId` match); admin may edit any. If the event is `status: 'aprobado'`, the edit auto-creates `solicitud` tipo `'actualizacion-evento'` and the event remains visible (the edit is staged for re-approval — documented in `design.md`).
  - `DELETE /eventos/{id}` — auth required; publisher may delete only their own; admin may delete any. `409` if there are `solicitudes` asociadas pendientes (mirror `places`).
- **MODULE cross-references**:
  - `solicitudes` module: extend `tipo` enum (additive, non-breaking), add optional `eventoId` field, update `SolicitudesService`/adapter/DTOs to handle `tipo='registro-evento'|'actualizacion-evento'`. Non-breaking for existing `places` approvals.
  - `usuarios`: no change (the rol stays `'empresa'` — confirmed as canonical; the stakeholder's comment about renaming `empresa`→`place` as auth role is explicitly out of scope here, it would be a separate change).
  - `places`: no change — `eventos.placeId` is just an optional ref.
- **NEW frontend** (Angular 20 standalone, Tailwind v3, design system "Dunas y Océano", reusing existing capabilities):
  - Rutas añadir a `frontend-spa-routes`: `/eventos` (listado público), `/eventos/:slug` (ficha), `/mis-eventos` (panel empresa), `/admin/eventos` (panel admin), `/eventos/nuevo` y `/eventos/:id/editar` (formulario empresa/admin).
  - Componentes:
    - `EventoFormComponent` (smart) — Reactive Forms, validación client-side, todos los campos del schema (incluidos los enums controlados). Accesible (ARIA labels, feedback de error visible).
    - `EventoListComponent` (smart) + `EventoCardComponent` (dumb) — reutiliza `frontend-reusable-search-component` para filtros.
    - `EventoDetalleComponent` (smart) + sub-componentes dumb (`EventoInfoComponent`, `EventoUbicacionComponent` con `@angular/google-maps`, `EventoOrganizadorComponent`).
    - `EventosMapaComponent` — reutiliza `@angular/google-maps` como `places/map-data`.
    - `EventoSkeletonComponent` — usa `ngx-skeleton-loader` con tokens de `docs/DESIGN.md`.
  - Servicios data-access: `EventosService` (HttpClient), tipos TS generados desde `api-spec.yml` (manual en esta fase, `openapi-generator` es Non-Goal).
  - Accesibilidad AAA en labels (uso outdoor costero, ver `docs/DESIGN.md` Typography).
- **DOCUMENTATION updates (SDD — antes que el código)**:
  - `docs/data-model.md` — añadir entidad `eventos` (tabla de campos, value objects, enums, reglas de negocio, índices Firestore) y extender la entidad `solicitudes` con el nuevo campo opcional `eventoId` y los nuevos `tipo` values.
  - `docs/api-spec.yml` — añadir schemas `Evento`, `CreateEvento`, `UpdateEvento`, `EventoMapDataItem`, `EventoQuery`, y los paths `POST/GET /eventos`, `GET /eventos/map-data`, `GET /eventos/{id}`, `GET /eventos/slug/{slug}`, `PUT /eventos/{id}`, `DELETE /eventos/{id}`.
  - `docs/base-standards.md` §8.4 (Roadmap) — marcar `eventos` como módulo post-MVP en implementación (ờ del bloque "Comentados / fuera de MVP" si aplica).
  - `.github/instructions/database-instructions.md` — añadir índices Firestore para `eventos` y `solicitudes(eventoId)`.
  - `firestore.indexes.json` — añadir los índices compuestos nuevos.
- **NEW spec** `openspec/specs/eventos/spec.md` — created when this change archives.

## Capabilities

### New Capabilities
- `eventos`: Colección Firestore + módulo NestJS CRUD + endpoints REST + flujo de aprobación vía `solicitudes` (reutilizado) + frontend Angular (formulario empresa/admin, listado público, ficha, mapa). Define el schema del evento, las validaciones (DTOs), el ciclo de vida (`status` + `estado`), la relación opcional con `places.placeId`, y las reglas de visibilidad pública.

### Modified Capabilities
- `places` — sin cambios a nivel de spec. La relación es unidireccional (`eventos.placeId? → places.id`); `places` no sabe que tiene eventos asociados en esta fase. (Un endpoint `GET /places/{id}/eventos` que liste los eventos de un place sería un cambio futuro separado — Non-Goal aquí.)
- `solicitudes` (spec futurible) — la extensión de `tipo` con dos nuevos valores y el campo `eventoId` opcional es un cambio a la entidad `solicitudes`. Como no existe todavía spec canónica publicada para `solicitudes` (no está en `openspec/specs/`), este cambio introduce la actualización directamente en `docs/data-model.md` + `api-spec.yml`. La creación del spec `openspec/specs/solicitudes/spec.md` es Non-Goal aquí (queda para cuando se implemente el módulo `solicitudes` en el MVP).

## Impact

- **Backend code**:
  - **New**: `backend/src/modules/eventos/` (full Clean Architecture tree: domain, application, infrastructure).
  - **Modified**: `backend/src/modules/solicitudes/` — `tipo` enum extended (additive), `eventoId?` field added (nullable, alongside `placeId`), DTO + service + adapter updated to handle event approvals. Non-breaking for existing `places` approvals.
  - **Modified**: `backend/src/app.module.ts` — register `EventosModule`.
  - **No change**: `places`, `usuarios`, `categorias`, `barrios`, `auth` modules.
- **Database (Firestore)**:
  - New collection `eventos`. New composite indices (added to `firestore.indexes.json`):
    ```
    eventos: categoriaId (ASC) + fechaInicio (ASC)
    eventos: barrioId (ASC) + fechaInicio (ASC)
    eventos: status (ASC) + destacado (DESC) + fechaInicio (ASC)
    eventos: slug (ASC) — unique
    eventos: usuarioId (ASC) + createdAt (DESC)
    eventos: fechaInicio (ASC) + estado (ASC)  — for the upcoming-events query
    eventos: subcategoriaId (ASC) + fechaInicio (ASC)
    solicitudes: eventoId (ASC) + status (ASC)
    ```
  - No migration script — new collection, no existing data.
- **Frontend**:
  - New routes added to `frontend-spa-routes` capability (lazy-loaded standalone components).
  - New components under `frontend/src/app/features/eventos/` (smart) and `frontend/src/app/shared/ui/evento-*/` (dumb).
  - New data-access service `EventosService`.
  - Reuses: `frontend-reusable-search-component`, `frontend-layout-base`, `@angular/google-maps`, `ngx-skeleton-loader`, `lucide-angular` (consistente con `categorias.icono='party-popper'`).
  - No new design tokens (all from `docs/DESIGN.md` "Dunas y Océano").
- **Documentation**:
  - `docs/data-model.md` — new `eventos` entity + extensions to `solicitudes`.
  - `docs/api-spec.yml` — new schemas + new paths.
  - `docs/base-standards.md` §8.4 — roadmap note.
  - `.github/instructions/database-instructions.md` — new indices.
  - `firestore.indexes.json` — composite indices.
- **Dependencies**: none added. `class-validator`, `class-transformer`, `firebase-admin`, `@nestjs/*`, `@angular/google-maps`, `ngx-skeleton-loader`, `lucide-angular` already present.
- **Public API contract**: additive only — new `/api/v1/eventos` paths, new schemas. No breaking changes to `/places` or `/solicitudes`.
- **Risk**:
  - `solicitudes` extension must remain backward compatible — the existing `places` approval flow (Flujo 1) must keep working unchanged. Mitigated by making `eventoId` nullable and `tipo` enum additions non-breaking, with full regression coverage of the `places`-solicitud flow in `solicitudes.controller.spec.ts`.
  - Frontend route additions to `frontend-spa-routes` must not break the existing layout/menu (only-additive changes; new menu item `Eventos`).
  - Event visibility (`status: 'aprobado'` only on public `GET /eventos` and `GET /eventos/{id}`) must be enforced at the repository/service layer, not the controller, so it cannot be bypassed.
  - SOLID thresholds (`max-lines` 300 backend / 400 frontend, complexity ≤ 10, max-params ≤ 3, DIP no-infra-imports-in-domain) must remain green for the new `eventos` module. `make solid-lint` + `bash check-refs.sh` must report zero violations before `/archive`.
