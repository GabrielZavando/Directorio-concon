# Design — frontend-reusable-search-component

## Context

The `frontend-home-hero` capability shipped a Hero section with the search form embedded in the dumb `HomeHeroComponent` (Reactive Forms + `searchSubmit` output) and dummy MVP categorias/barrios hardcoded in the smart `HomePageComponent` (`CATEGORIAS_MVP` / `BARRIOS_MVP` with fake `cat-` / `b-` prefixed slugs). That change left two open debts:

1. The hero cannot be reused outside `/` — the form markup duplicates anywhere else we need the same search.
2. The dummy categories/barrios do not match the canonical Concón catalog and will drift when the backend `categorias` / `barrios` modules are implemented (they are NOT implemented yet — verified `backend/src/modules/categorias` and `backend/src/modules/barrios` do not exist; only commented imports in `app.module.ts`).

The same search behaviour is needed on `/directorio` (the placeholder today, with mapa / grilla views coming in a separate change). Duplicating form markup + dummy arrays across two pages violates SRP and DRY, and locking the frontend to fake `cat-` / `b-` ids would force a breaking refactor the day Firestore is wired.

Stakeholders: anonymous visitors (Flujo 2 — Descubrimiento) landing on `/`, plus future visitors reaching `/directorio` directly. Backend `categorias` / `barrios` modules owners — they will benefit from the canonical JSON seed as a head-start for `npm run seed`.

## Goals / Non-Goals

**Goals:**

- Extract the search form into a reusable **dumb** `SearchBarComponent` living in `shared/ui/search-bar/`, with `@Input() categorias` / `@Input() barrios` / `@Output() searchSubmit` of a typed `SearchCriteria`. Zero DI, zero data fetches — pure SRP / Smart-Dumb split.
- Add a **smart** `SearchBarContainerComponent` that injects a `DirectorioOpcionesPort` and streams categorias/barrios to the dumb component. Pages only embed this container to get a fully working search bar.
- Introduce a **DIP data-access layer** (`shared/data-access/`) so the future `RemoteDirectorioOpcionesService` calling `/api/v1/categorias` + `/api/v1/barrios` can drop in via DI swap, with graceful fallback to the local seed on network failure.
- Persist the canonical Concón categorias and barrios as **two JSON files** (`barrios.json`, `categorias.json`) bundled with the frontend, with `id` = Firestore slug (no `zona_xx` / `cat_xx` codes), `tipo` (`urbano` / `rural`), `territorio`, `icono` (Lucide), `orden`, `activa`, and `subcategorias[]` preserved for future use.
- DRY the query-params building via a **shared util** `buildQueryParams(criteria): Record<string, string>` used by both `/` (`HomePageComponent`) and `/directorio` (`PlaceholderDirectorioComponent`).
- Preserve the **buscador global**: a user can submit with `q` only and the URL becomes `/directorio?q=foo` (empty `categoriaId` / `barrioId` are omitted, not blank).
- Update `docs/data-model.md` to canonicalize the new fields (`subcategorias[]`, `territorio`, `icono`, `orden`, `activa`, `tipo`) and document `id` = Firestore slug for `categorias` and `barrios`.

**Non-Goals:**

- Implementing the backend `categorias` / `barrios` modules (separate post-MVP change). Only the frontend seed + DIP port + local implementation exist now.
- Implementing the real `/directorio` listing page (mapa / grilla) — separate change. This change only adds the search bar to the existing placeholder.
- Rendering subcategories in the search bar UI (F1) — subcategorias are preserved in the JSON seed for future advanced filters / panel admin but NOT rendered by the dumb `SearchBarComponent` (Decision F2 — see below).
- Rendering the Lucide `icono` of each category in the search bar `<select>` (deferred to a future change; the `icono` value is baked into the JSON seed now so the future UI can consume it).
- Adding the `RemoteDirectorioOpcionesService` — only the **contract** for it is documented here. The local service is the sole implementation shipped by this change.
- Touching `HeaderComponent`, `FooterComponent`, `app.component.{html,ts}`, routing, or `tailwind.config.js`.

## Decisions

### Decision 1 — Smart/Dumb split (SRP + DIP, mirrors `frontend-home-hero` Decision 1)

**Choice:** Two Angular standalone components inside `shared/ui/search-bar/`.

- `SearchBarComponent` (dumb, selector `app-search-bar`):
  - `@Input() categorias: readonly CategoryOption[] = []`
  - `@Input() barrios: readonly BarrioOption[] = []`
  - `@Output() searchSubmit = new EventEmitter<SearchCriteria>()`
  - Owns the `FormGroup<{ q, categoriaId, barrioId }>`, trims `q`, falls back to `''` for unselected selects, emits on submit.
  - Zero `inject()`, no `Router`, no `HttpClient`, no Firestore.
- `SearchBarContainerComponent` (smart, selector `app-search-bar-container`):
  - `inject(DIRECTORIO_OPCIONES_PORT)` → `opciones$: Observable<DirectorioOpciones>`.
  - Renders `<app-search-bar>` with `| async` and re-emits `searchSubmit` as a delegate `@Output()`.

**Why:** Same SRP / DIP reasoning as `frontend-home-hero` Decision 1. Pages embed only the container, the dumb component stays trivially testable, and the port boundary keeps the future remote swap mechanical (DI provider change in `app.config.ts`).

**Alternatives considered:**
- *Single smart component mixing data + form.* Rejected: harder to unit test and harder to reuse in storybook / future maps.
- *Smart container owning the form state too.* Rejected: the dumb would become a useless wrapper (form state belongs where the form is rendered).

### Decision 2 — DIP data-access layer (port + token + local impl)

**Choice:** Introduce a `shared/data-access/` folder with:

```ts
// directorio-opciones.types.ts
export interface DirectorioOpciones {
  readonly categorias: readonly CategoryOption[];
  readonly barrios: readonly BarrioOption[];
}

// directorio-opciones.port.ts
export interface DirectorioOpcionesPort {
  getOpciones(): Observable<DirectorioOpciones>;
}
export const DIRECTORIO_OPCIONES_PORT =
  new InjectionToken<DirectorioOpcionesPort>('DIRECTORIO_OPCIONES_PORT');

// local/local-directorio-opciones.service.ts
@Injectable({ providedIn: 'root' })
export class LocalDirectorioOpcionesService implements DirectorioOpcionesPort {
  getOpciones(): Observable<DirectorioOpciones> {
    return of({ categorias: CATEGORIAS_SEED, barrios: BARRIOS_SEED });
  }
}

// directorio-opciones.provider.ts
export function provideDirectorioOpciones(): Provider[] {
  return [
    { provide: DIRECTORIO_OPCIONES_PORT, useClass: LocalDirectorioOpcionesService },
  ];
}
```

`provideDirectorioOpciones()` is added to `app.config.ts` `providers` array.

**Why:** Honors `frontend-standards.md` DIP rule — *"Services must depend on interfaces abstractas (token inyectable), not implementaciones concretas."* The future `RemoteDirectorioOpcionesService` (HTTP-based, when backend `categorias` / `barrios` exist) only needs a sibling `http/` folder and a provider swap; the dumb component and the container stay untouched (OCP).

**Alternatives considered:**
- *Skip the port and import the JSON directly in the container.* Rejected: hardcodes the data source in the component — would force touching the container when the remote arrives.
- *Use a `@Injectable({ providedIn: 'root' })` concrete service without a port.* Rejected: harder to mock in tests, and replacement would require editing every consumer.

### Decision 3 — Canonical JSON seed with `id` = Firestore slug

**Choice:** Two JSON files in `shared/data-access/local/data/`:

- `barrios.json` — 13 entries. Each entry:
  ```json
  { "id": "higuerillas", "nombre": "Higuerillas", "descripcion": "...", "territorio": "Caleta Higuerillas, La Chacrilla, Higuerillas Norte y Sur", "tipo": "urbano", "coordenadas": null }
  ```
  `id` is the Firestore document id (= slug, no `zona_xx` code). Only `"zona-rural"` has `tipo: "rural"`; the other 12 are `urbano`. `territorio` (renamed from `territorio_que_abarca`) is metadata for future UI.

- `categorias.json` — 9 entries with a top-level `{ "categorias": [...] }` shape. Each entry:
  ```json
  {
    "id": "gastronomia",
    "nombre": "Gastronomía",
    "descripcion": "Restaurantes, cafeterías, bares y todo tipo de establecimientos de comida y bebida en Concón",
    "icono": "utensils",
    "orden": 1,
    "activa": true,
    "subcategorias": [
      { "slug": "restaurantes", "nombre": "Restaurantes", "descripcion": "Comida tradicional, marina, internacional" }
    ]
  }
  ```
  `id` is the Firestore slug (no `cat_xx` code). `icono` is the Lucide icon name in kebab-case. `orden` is inferred from the array position (1..9). `activa` is `true` for every entry. `subcategorias[]` (~95 across all categories) are preserved as metadata for future use.

**Why:** Aligning `id` with the Firestore slug now means the future backend seed and the frontend seed use the **same identity** for each category / barrio. Eliminating the `zona_xx` / `cat_xx` codes reduces the cognitive surface — the `id` is the slug is the query param value. `subcategorias` and `icono` are persisted now so the next change (advanced filters or panel admin UI) does not need a schema bump.

**Key normalization applied to the user-supplied JSON:**
- `descripción` → `descripcion` (no tilde, avoids encoding friction in TS / Firestore).
- `territorio_que_abarca` → `territorio` (shorter, cleaner key).
- Removed `zona_xx` and `cat_xx` codes (decision H2 — they are not the Firestore id; if a stable auxiliary code is needed in the future it can be added to `data-model.md` then).
- Added `tipo: "rural"` explicitly to the single `"zona-rural"` entry; the other 12 were tagged `tipo: "urbano"`.
- Added `icono` (one per category, inferred semantically): `utensils` (Gastronomía), `store` (Comercio), `tent` (Turismo y Recreación), `briefcase` (Servicios Profesionales), `car` (Movilidad y Transporte), `heart-pulse` (Salud y Bienestar), `graduation-cap` (Educación y Talleres), `building-2` (Instituciones y Organizaciones), `party-popper` (Eventos).
- Added `orden` 1..9 by array position, `activa: true` to all.

**Alternatives considered:**
- *Keep `zona_xx` / `cat_xx` as `id` and use slugs as a separate field.* Rejected: makes the URL carry opaque codes (`?barrioId=zona_05`) and forces a backend mapping.
- *Two JSON files merged into one (`directorio-opciones.json`).* Rejected: user explicitly requested two separate files for cleanness and future independent seed growth.

### Decision 4 — resolveJsonModule + static import (build-time bundling)

**Choice:** Enable `resolveJsonModule: true` in `frontend/tsconfig.app.json` and import the seeds statically inside `LocalDirectorioOpcionesService`:

```ts
import { categorias as categoriasSeed } from './data/categorias.json';
import barriosSeed from './data/barrios.json';
```

(The `categorias.json` uses a wrapping object `{ "categorias": [...] }`; the barrios file is a bare array — both shapes are inferred by TS as deeply readonly.)

**Why:** Types are inferred at compile time, the JSON is tree-shaken and bundled (no runtime `fetch` / no `assets/` copy needed), and there is no async loading state for the search bar to handle — the container resolves `opciones$` synchronously via `of(...)`.

**Risks:** TS infers very wide literal types from JSON literals (e.g. `string` becomes a union of all observed literal values, `null` narrows the type). To keep the public contract stable, the `LocalDirectorioOpcionesService` exposes a `DirectorioOpciones` boundary type at its interface, so consumers see `readonly CategoryOption[]` (with `icono: string`, not `icono: "utensils"`), never the inferred literal type. The mapping JSON → typed `DirectorioOpciones` is explicit in the service.

**Alternatives considered:**
- *Runtime `fetch('/assets/directorio-opciones.json')`.* Rejected: introduces async loading, requires the JSON to live under `public/assets/`, complicates error handling and SSR future.
- *Dynamic `import('./data/...' )`.* Rejected: same benefits as static import, but adds an unnecessary async hop for a small fixed seed.

### Decision 5 — Future remote fallback contract (documented, not enforced now)

**Choice:** The `LocalDirectorioOpcionesService` is the only implementation shipped by this change. The future `RemoteDirectorioOpcionesService` (when `categorias` / `barrios` backend modules exist) SHALL follow this contract:

```ts
// http/remote-directorio-opciones.service.ts (NOT implemented in this change)
@Injectable({ providedIn: 'root' })
export class RemoteDirectorioOpcionesService implements DirectorioOpcionesPort {
  getOpciones(): Observable<DirectorioOpciones> {
    return this.http.get<Categoria[]>('/api/v1/categorias').pipe(
      zipWith(this.http.get<Barrio[]>('/api/v1/barrios')),
      map(([categorias, barrios]) => ({ categorias, barrios })),
      catchError((err) => this.localDirectorioOpcionesService.getOpciones()), // graceful degradation
    );
  }
}
```

The fallback (Decision 2b — graceful degradation) is **documented** here and as a `// TODO:` comment in `directorio-opciones.port.ts`, but the `RemoteDirectorioOpcionesService` itself is NOT implemented in this change. The DI swap remains a one-line edit in `app.config.ts` when that future change ships.

**Why:** KISS — we only build what is needed now (local seed), but we design the contract so the future remote impl is mechanical and the failure mode is graceful (search bar works offline / on backend outage by falling back to the local seed).

**Alternatives considered:**
- *Build the remote impl + fallback now.* Rejected: speculative — would ship an HTTP path that calls non-existent endpoints. YAGNI.
- *Build the port token only after the remote exists.* Rejected: would force a refactor of the container when the remote arrives, when introducing the port now costs nothing.

### Decision 6 — DRY `buildQueryParams` util

**Choice:** Extract the `buildQueryParams(criteria: SearchCriteria): Record<string, string>` helper (which omits empty `q`, `categoriaId`, `barrioId`) from `HomePageComponent` into `shared/utils/query-params.util.ts`. Both `HomePageComponent` (`/`) and `PlaceholderDirectorioComponent` (`/directorio`) import it.

**Why:** The same logic was inline in `HomePageComponent` and will be needed in `PlaceholderDirectorioComponent`. Duplicating it would diverge (one omits `q`, the other doesn't) — extracting a pure util is the smallest unit of DRY that stays type-safe and unit-testable in isolation.

**Note on `queryParamsHandling: 'merge'`:** `HomePageComponent` uses `Router.navigate(['/directorio'], { queryParams })` (default merge — no existing params at `/`). `PlaceholderDirectorioComponent` uses `Router.navigate(['/directorio'], { queryParams, queryParamsHandling: 'merge' })` so the user can refine the search while preserving any other query params未来变化 (e.g., `?view=mapa` from a future routing concern).

**Alternatives considered:**
- *Duplicate `buildQueryParams` in both pages.* Rejected: violates DRY.
- *Put the helper inside `SearchBarContainerComponent` and call `Router.navigate` there.* Rejected: forces the container to know about routing, breaking the Smart/Dumb purity — the container should only delegate `searchSubmit`, never navigate.

### Decision 7 — Subcategorías: F2 (preserved in JSON, not in UI)

**Choice:** `subcategorias[]` are persisted in `categorias.json` and typed via `SubcategoriaOption` (`{ slug, nombre, descripcion? }`) but the dumb `SearchBarComponent` does NOT render a third `<select>` for them. The MVP search filters only by parent `categoriaId`.

**Why:** The user confirmed Decision F2 — the search-by-parent-category is the MVP surface; subcategories belong to a future advanced-filters / panel admin change. Persisting them now in the seed means that future change reads from the same JSON without a schema bump.

**Alternatives considered:**
- *F1 (render a third cascaded `<select>`).* Rejected: scope creep, UX complexity, larger spec.
- *F3 (drop subcategorias entirely).* Rejected: would force a re-seed and a `data-model.md` bump when the advanced filters change comes.

### Decision 8 —typescript file / folder layout

**Choice:**
```
frontend/src/app/
├── shared/
│   ├── ui/
│   │   └── search-bar/
│   │       ├── interfaces/
│   │       │   ├── category-option.interface.ts   (CategoryOption + SubcategoriaOption)
│   │       │   ├── barrio-option.interface.ts     (BarrioOption)
│   │       │   └── search-criteria.interface.ts   (SearchCriteria)
│   │       ├── search-bar.component.ts            (dumb)
│   │       ├── search-bar.component.html
│   │       ├── search-bar.component.css
│   │       ├── search-bar.component.spec.ts
│   │       ├── search-bar-container.component.ts  (smart)
│   │       └── search-bar-container.component.spec.ts
│   ├── data-access/
│   │   ├── directorio-opciones.port.ts            (interface + InjectionToken + future-fallback TODO)
│   │   ├── directorio-opciones.types.ts           (DirectorioOpciones boundary type)
│   │   ├── directorio-opciones.provider.ts        (provideDirectorioOpciones())
│   │   └── local/
│   │       ├── local-directorio-opciones.service.ts
│   │       ├── local-directorio-opciones.service.spec.ts
│   │       └── data/
│   │           ├── barrios.json
│   │           └── categorias.json
│   └── utils/
│       ├── query-params.util.ts
│       └── query-params.util.spec.ts
├── features/
│   ├── home/
│   │   ├── home-page.component.{ts,html,spec.ts}   (MOD)
│   │   └── hero/
│   │       └── home-hero.component.{ts,html,spec.ts} (MOD, delegate form)
│   └── directorio/
│       └── placeholder-directorio.component.{ts,spec.ts} (MOD, consume container)
└── app.config.ts                                  (MOD: provideDirectorioOpciones())
```

**Why:** All reusable code lives under `shared/` (UI, data-access, utils). Each interface lives in its own file inside `interfaces/` (Decision 1b confirmed by the user). The `data-access/local/` and (future) `data-access/http/` separation makes the DI-swap path physically obvious — a reviewer can see the future remote by looking at the folder next to `local/`. The `features/` folders only own page-level composition and call into `shared/`.

**Alternatives considered:**
- *Single `*.types.ts` with all interfaces inside `interfaces/`.* Rejected: user explicitly chose one file per interface (Decision 1b).
- *Put `query-params.util.ts` under `features/` instead of `shared/`.* Rejected: it is shared logic, not page-specific.

### Decision 9 — Search bar UI preserves hero visual contract

**Choice:** The dumb `SearchBarComponent` template mirrors the markup currently inside `HomeHeroComponent` (the `<form>` with `bg-white/20 backdrop-blur-md p-4 rounded-lg` container, `grid-cols-1 md:grid-cols-4`, the three labeled controls, and the `bg-secondary-container text-primary` submit button). It uses the same M3 tokens from `tailwind.config.js` — no new tokens, no hardcoded hex / spacing.

**Why:** The existing hero is the visual reference (`docs/home/code.html`). Externalizing the form must keep pixel parity so `/` looks unchanged. The hero itself keeps the overlay (the `[style]` binding with `panoramica-concon.jpg` + primary-tone gradient), the headline and the subtitle — it only loses the form markup, which now lives in `<app-search-bar-container>` placed where the form used to be.

**Alternatives considered:**
- *Restyle the search bar differently from the hero.* Rejected: regression risk, no user request.

## Risks / Trade-offs

- **[Risk] `resolveJsonModule` widens inferred types.** → Mitigation: the `DirectorioOpciones` boundary type in `directorio-opciones.types.ts` is the only type any consumer sees; the inferred literal type stays private inside `LocalDirectorioOpcionesService`.
- **[Risk] Enabling `resolveJsonModule` itself is harmless, but combined with `noPropertyAccessFromIndexSignature` (already true in `tsconfig.json`), the inferred JSON shapes could yield surprising type errors if the JSON has unexpected nullability.** → Mitigation: explicit cast to the boundary `DirectorioOpciones` type at the service boundary; spec validates that the JSON has exactly 13 barrios and 9 categorias with the expected fields.
- **[Risk] Future `RemoteDirectorioOpcionesService` does NOT exist yet, so the fallback contract is unverified.** → Mitigation: documented as a `// TODO:` comment in `directorio-opciones.port.ts` and as Decision 5 here. The day the remote ships, the test for the fallback should land in the same PR (will be added to that future change's spec).
- **[Risk] Removing the `cat-` / `b-` dummy ids from the hero is a breaking change of the existing `frontend-home-hero` spec.** → Mitigation: this change MODIFIES the `frontend-home-hero` capability (delta spec) so the archived scenario "home page renders hero with categories as input" with "Restaurantes" / "Hospedaje" is updated to the canonical values ("Gastronomía" / "Comercio"). Old ids (`cat-1`, `b-1`) are replaced by canonical slugs (`gastronomia`, `higuerillas`).
- **[Risk] The `subcategorias` (~95 entries) bloat the bundle.** → Mitigation: gzip compression at serving time reduces it to negligible size; a future change can move `subcategorias` to a lazy-loaded JSON chunk if bundle analysis shows it matters. Not a concern for MVP.
- **[Trade-off] The container uses `| async` so the search bar briefly absent before the synchronous observable resolves.** Acceptable: with `of(...)` the observable resolves synchronously in the same microtask, so there is no visible flash in practice. No skeleton/spinner is added (would be speculative; the future remote impl may add one).
- **[Trade-off] The future `/directorio` mapa / grilla pages are NOT implemented here — the placeholder only renders the search bar and updates URL params via `queryParamsHandling: 'merge'`.** Acceptable: keeps this change focused; the next change consumes the URL params the placeholder now produces.

## Migration Plan

A frontend-only additive change — no data migration, no API contract changes. Rollback is reverting to the previous commit; the OpenSpec archive step moves this change folder into `openspec/changes/archive/<date>-frontend-reusable-search-component/` and updates `openspec/specs/<capability>/spec.md` for both `frontend-reusable-search-component` (new) and `frontend-home-hero` (modified).

Sequence:
1. Enable `resolveJsonModule` + create the canonical JSON seeds.
2. Add the interfaces, port, types, provider, and `LocalDirectorioOpcionesService` (TDD red/green).
3. Add the dumb `SearchBarComponent` (TDD red/green).
4. Add the smart `SearchBarContainerComponent` (TDD red/green).
5. Add `buildQueryParams` util (TDD red/green).
6. Refactor `HomeHeroComponent` + `HomePageComponent` to delegate to the container and use the util.
7. Refactor `PlaceholderDirectorioComponent` to consume the container with `queryParamsHandling: 'merge'`.
8. Update `docs/data-model.md` (commit `docs:` separable inside the same PR).
9. Run `npm --prefix frontend run lint`, `npm --prefix frontend test` (≥ 80% coverage on new modules), `npm --prefix frontend run build`.
10. Archive via `openspec archive frontend-reusable-search-component`.

## Open Questions

- Should the future `/directorio` advanced filters (subcategorías) live in a separate `<select>` cascaded from the parent category, or in a panel/modal? Out of scope here; the seed already preserves `subcategorias[]` so the future change can choose without re-seeding.
- Should the eventual `RemoteDirectorioOpcionesService` cache its response (e.g. via `@angular/cdk` `TransferState` for an SSR future)? Out of scope; documented in Decision 5 as a future concern.
- The `PlaceholderDirectorioComponent` currently shows "Próximamente" text. After this change, will the user expect a visible list of current `q` / `categoriaId` / `barrioId` echoed from the URL for debug? Decision: keep the placeholder text only; URL is the source of truth and visible in the address bar. The mapa / grilla change will render the real results.
