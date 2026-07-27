## Why

The home page Hero (`frontend-home-hero` capability, already archived) currently owns its search form: `HomeHeroComponent` declares the `FormGroup`, `@Output() searchSubmit`, and `HomePageComponent` hardcodes dummy `CATEGORIAS_MVP` / `BARRIOS_MVP` arrays (`cat-` / `b-` prefixed slugs) that do not match the canonical Concón categorías and barrios the production directory will use. The same search behaviour needs to be reused on `/directorio`, but duplicating the form markup and the categories/barrios data across two pages violates SRP and DRY, and the hardcoded dummy `cat-` / `b-` ids will drift from the real Firestore `slug` ids the backend will use when the `categorias` / `barrios` modules are implemented.

We need a reusable `SearchBarComponent` with its own logic, fed by a canonical seed of Concón categorias and barrios (13 zones, 9 categories with ~95 sub-categories) defined now and persisted as a JSON bundle so the frontend works today without a backend, plus a DIP-based data-access layer so the upcoming `RemoteDirectorioOpcionesService` (when `categorias` / `barrios` backend exists) can drop in with graceful fallback to the local seed on failure.

## What Changes

- Add a **dumb** presentational `SearchBarComponent` in `shared/ui/search-bar/` that renders the search form (free-text `q`, category `<select>`, location `<select>`, submit button) using the existing "Dunas y Océano" M3 design tokens. It accepts `categorias` and `barrios` via `@Input()` and emits a typed `SearchCriteria` via `@Output() searchSubmit`. No DI, no data fetching — pure Smart/Dumb split per `frontend-standards.md`.
- Add a **smart** `SearchBarContainerComponent` (same module) that injects a `DirectorioOpcionesPort` and streams the categorias/barrios to the dumb component, re-emitting `searchSubmit` as a delegate output. This is the only component a page needs to embed to get a fully functional search bar.
- Add a **DIP data-access layer** in `shared/data-access/`:
  - `DirectorioOpcionesPort` interface + `DIRECTORIO_OPCIONES_PORT` `InjectionToken`.
  - `LocalDirectorioOpcionesService` implementation that statically imports two JSON seed files (`barrios.json` and `categorias.json`) via `resolveJsonModule` and exposes `getOpciones(): Observable<DirectorioOpciones>`.
  - `provideDirectorioOpciones()` helper registered in `app.config.ts`.
  - Documented **future contract**: a future `RemoteDirectorioOpcionesService` calling `/api/v1/categorias` + `/api/v1/barrios` SHALL fall back to the local service on network failure (graceful degradation).
- Add the **canonical Concón data seed** as two JSON files in `shared/data-access/local/data/`:
  - `barrios.json` — 13 barrios with `id` = Firestore slug (`higuerillas`, `concon-sur`, ...), `nombre`, `descripcion`, `territorio`, `tipo` (`urbano` / `rural` — only `zona-rural` is `rural`), `coordenadas: null`.
  - `categorias.json` — 9 categorias with `id` = Firestore slug (`gastronomia`, `comercio`, ...), `nombre`, `descripcion`, `icono` (Lucide: `utensils`, `store`, `tent`, `briefcase`, `car`, `heart-pulse`, `graduation-cap`, `building-2`, `party-popper`), `orden` 1..9, `activa: true`, and `subcategorias[]` (slug + nombre + descripcion, ~95 in total) preserved for future advanced filters / panel admin.
- Add a **shared util** `buildQueryParams(criteria: SearchCriteria): Record<string, string>` in `shared/utils/query-params.util.ts` that omits empty `q` / `categoriaId` / `barrioId` from the resulting query params object. Required so both `/` and `/directorio` build URL params identically (DRY).
- Refactor `HomeHeroComponent` to delegate the search form to `<app-search-bar-container>`. The hero keeps the overlay, headline, subtitle and responsive layout; it loses the `FormGroup`, `categorias` / `barrios` `@Input()` and the `searchSubmit` direct emission (now delegating to the container's output).
- Refactor `HomePageComponent` to remove the hardcoded `CATEGORIAS_MVP` / `BARRIOS_MVP` arrays and the inline `buildQueryParams` logic; it now imports `buildQueryParams` from `shared/utils/` and uses `<app-home-hero (searchSubmit)="onSearchSubmit($event)">` (no more `[categorias]` / `[barrios]` bindings to the hero).
- Refactor `PlaceholderDirectorioComponent` to render `<app-search-bar-container>` at the top and to merge incoming `searchSubmit` events into the current URL via `Router.navigate(['/directorio'], { queryParams, queryParamsHandling: 'merge' })`, using the same `buildQueryParams` util.
- Update `docs/data-model.md` to canonicalize:
  - `categorias`: `id` is the Firestore slug; add `subcategorias[]` (`{ slug, nombre, descripcion }`); document the Lucide `icono`, `orden`, `activa` fields.
  - `barrios`: `id` is the Firestore slug; add `territorio` and clarify `tipo` (`urbano` / `rural`).
- Enable `resolveJsonModule: true` in `frontend/tsconfig.app.json` so `LocalDirectorioOpcionesService` can `import` the JSON seeds as typed objects.
- **Buscador global**: the dumb `SearchBarComponent` SHALL allow submit with `q` only (no category and no barrio selected). The `buildQueryParams` util omits empty filters so the resulting URL is `/directorio?q=foo` (not `/directorio?q=foo&categoriaId=&barrioId=`).

## Capabilities

### New Capabilities

- `frontend-reusable-search-component`: Reusable search bar (dumb + smart + DIP port) plus the canonical Concón categorias/barrios JSON seed consumed via a `DirectorioOpcionesPort`. Includes the shared `buildQueryParams` util so `/` and `/directorio` build identical URL query params.

### Modified Capabilities

- `frontend-home-hero`: The hero no longer owns the search form. `HomePageComponent` no longer hardcodes `CATEGORIAS_MVP` / `BARRIOS_MVP` and no longer passes `[categorias]` / `[barrios]` to the hero. The hero embeds `<app-search-bar-container (searchSubmit)>` and only owns overlay + headline + subtitle + responsive framing.

## Impact

- **Frontend code (new):**
  - `frontend/src/app/shared/ui/search-bar/interfaces/` — `category-option.interface.ts`, `barrio-option.interface.ts`, `search-criteria.interface.ts`.
  - `frontend/src/app/shared/ui/search-bar/search-bar.component.{ts,html,css,spec.ts}` (dumb).
  - `frontend/src/app/shared/ui/search-bar/search-bar-container.component.{ts,spec.ts}` (smart).
  - `frontend/src/app/shared/data-access/directorio-opciones.port.ts`, `directorio-opciones.types.ts`, `directorio-opciones.provider.ts`.
  - `frontend/src/app/shared/data-access/local/local-directorio-opciones.service.{ts,spec.ts}`.
  - `frontend/src/app/shared/data-access/local/data/barrios.json` (13 barrios).
  - `frontend/src/app/shared/data-access/local/data/categorias.json` (9 categorias + ~95 subcategorias).
  - `frontend/src/app/shared/utils/query-params.util.{ts,spec.ts}`.
- **Frontend code (modified):**
  - `frontend/src/app/features/home/hero/home-hero.component.{ts,html,spec.ts}` — delegate form to `SearchBarContainerComponent`.
  - `frontend/src/app/features/home/home-page.component.{ts,spec.ts}` — eliminate dummy arrays, use shared `buildQueryParams`.
  - `frontend/src/app/features/directorio/placeholder-directorio.component.{ts,spec.ts}` — render `<app-search-bar-container>` and merge query params.
  - `frontend/src/app/app.config.ts` — register `provideDirectorioOpciones()`.
  - `frontend/tsconfig.app.json` — `resolveJsonModule: true`.
- **Backend code:** None. The `categorias` / `barrios` backend modules remain out of scope (post-MVP change). The local JSON seed is consumed only by the frontend; the future `RemoteDirectorioOpcionesService` will call the yet-to-be-built `/api/v1/categorias` and `/api/v1/barrios` endpoints.
- **Design system:** No changes to `tailwind.config.js` or `docs/DESIGN.md` — the search bar reuses existing M3 tokens (`bg-primary`, `bg-secondary-container`, `text-primary`, `rounded-lg`, `focus:ring-primary`).
- **Dependencies:** None added. `@lucide/angular` (v1.26.0) is already present in `frontend/package.json` and will be used only when rendering category icons in a future change — `icono` is baked into the JSON seed now but not rendered by the MVP search bar.
- **Public API:** No `/api` impact in this change.
- **Docs:** `docs/data-model.md` updated — `categorias` gains `subcategorias[]` and `icono`, `orden`, `activa` are formalized; `barrios` gains `territorio` and `tipo` is clarified. `id` documented as the Firestore slug for both collections.
- **Risk:** Enabling `resolveJsonModule` could expose subtle type widening on the imported JSON (TS infers readonly structural types from the literal). Mitigation: explicit `DirectorioOpciones` boundary type at the `LocalDirectorioOpcionesService` interface so downstream consumers never see the inferred literal type.
