# Change Spec — frontend-home-hero (delta)

> Delta spec for the existing `frontend-home-hero` capability. The hero no longer owns its search form — `HomeHeroComponent` delegates to `<app-search-bar-container>` and `HomePageComponent` no longer hardcodes dummy `CATEGORIAS_MVP` / `BARRIOS_MVP` arrays; the search bar lives in `shared/ui/search-bar/` (new capability `frontend-reusable-search-component`). The hero keeps the overlay, headline, subtitle and responsive framing.

## MODIFIED Requirements

### Requirement: Home Hero renders Concón background image with semantic overlay

The `HomeHeroComponent` SHALL render a `<section class="app-hero">` that displays the public asset `panoramica-concon.jpg` with a semi-transparent overlay derived from the `primary` token of the design system, ensuring the hero remains legible regardless of image load failures. The `HomeHeroComponent` STILL does NOT inject `Router`, `HttpClient`, or any data service — its responsibility narrows to overlay + headline + subtitle + delegating the search form to the `<app-search-bar-container>` child.

#### Scenario: hero section renders the hero background root element

- **WHEN** the `HomeHeroComponent` is rendered
- **THEN** the host element is a `<section>` with attribute `data-purpose="hero-search"`
- **AND** the section has an inline `background-image` style containing the URL `/assets/panoramica-concon.jpg`
- **AND** the section has a Tailwind class `bg-primary` so that if the image fails to load the background remains visibly "Dunas y Océano" primary blue, not broken/white

#### Scenario: overlay covers the image with a primary-tone gradient

- **WHEN** the `HomeHeroComponent` is rendered
- **THEN** the inline `background-image` is a CSS declaration starting with `linear-gradient(` followed by `url('/assets/panoramica-concon.jpg')`
- **AND** the first gradient stop color is the canonical primary value `#004370` (matching `tailwind.config.js` `colors.primary`)

#### Scenario: hero renders the SearchBarContainerComponent inside its overlay

- **WHEN** the `HomeHeroComponent` is rendered in a TestBed that stubs the `DirectorioOpcionesPort` (so the container renders its child deterministically)
- **THEN** the rendered DOM contains an `<app-search-bar-container>` element inside the hero overlay container
- **AND** the `<app-search-bar-container>` is the element responsible for emitting `searchSubmit` events to the hero's own `searchSubmit` output

#### Scenario: hero re-emits searchSubmit from the SearchBarContainerComponent

- **WHEN** the inner `<app-search-bar-container>` emits `searchSubmit = { q: 'pizzería', categoriaId: 'gastronomia', barrioId: 'higuerillas' }` (using the canonical slugs)
- **THEN** the `HomeHeroComponent` `searchSubmit` output emits the same `SearchCriteria` payload exactly once

#### Scenario: hero does not own a FormGroup or @Input categorias/barrios

- **WHEN** `home-hero.component.ts` is read
- **THEN** the class does NOT declare `@Input() categorias`, `@Input() barrios`, nor a `FormGroup` / `FormControl` property
- **AND** the class declares `@Output() searchSubmit` which only re-emits values from the embedded `<app-search-bar-container>`

### Requirement: Home Hero reuses the "Dunas y Océano" design tokens and responsive framing

The `HomeHeroComponent` template SHALL continue to use only Tailwind utility classes derived from `tailwind.config.js` theme tokens and the type-safe inline background binding. No literal hex colors, fixed pixel spacing, or magic numbers SHALL appear in the component templates (other than the one inline `background-image` reference whose primary value is sourced from a named shared constant). The hero section SHALL remain responsive with `py-<N>` paired with `md:py-<M>` vertical padding scaling.

#### Scenario: hero template contains no literal hex colors in utility classes

- **WHEN** the `HomeHeroComponent` HTML template source is read
- **THEN** no `text-[#...]`, `bg-[#...]`, `border-[#...]` or similar arbitrary-value utility classes appear
- **AND** all color utility classes (e.g. `text-primary`, `bg-secondary-container`, `text-on-surface`) come from tokens defined in `tailwind.config.js`

#### Scenario: hero section has vertical padding that scales with viewport

- **WHEN** the `HomeHeroComponent` HTML template source is read
- **THEN** the hero section root has a Tailwind vertical padding utility of the form `py-<N>` paired with a `md:py-<M>` variant where `M > N`

### Requirement: HomePageComponent is a smart container owning the Router (not the categories)

The `HomePageComponent` SHALL be a smart container that owns the `Router`, embeds `<app-home-hero (searchSubmit)="onSearchSubmit($event)">`, and on `searchSubmit` calls `Router.navigate(['/directorio'], { queryParams: buildQueryParams(criteria) })` where `buildQueryParams` is imported from `shared/utils/query-params.util.ts`. It SHALL NOT declare hardcoded `CATEGORIAS_MVP` / `BARRIOS_MVP` arrays; the categories and barrios data ownership has been transferred to the `shared/data-access/` layer consumed by the `SearchBarContainerComponent`.

#### Scenario: home page renders the hero

- **WHEN** the `HomePageComponent` is rendered in a router test harness with the `DirectorioOpcionesPort` provider bound to the local impl
- **THEN** it renders an `<app-home-hero>` element
- **AND** the hero contains an `<app-search-bar-container>` whose categories and barrios come from the port (canonical Gastronomía / Higuerillas values are visible in the rendered selects, not the old dummy "Restaurantes" / "Centro")

#### Scenario: home page navigates to /directorio with query params on submit

- **WHEN** the `searchSubmit` output of `HomePageComponent`'s inner hero emits `{ q: 'pizzería', categoriaId: 'gastronomia', barrioId: 'higuerillas' }` (canonical slugs, not the old `cat-1` / `b-1`)
- **THEN** the smart container calls `Router.navigate` with first argument `['/directorio']`
- **AND** the second argument has `queryParams.q === 'pizzería'`
- **AND** the second argument has `queryParams.categoriaId === 'gastronomia'`
- **AND** the second argument has `queryParams.barrioId === 'higuerillas'`

#### Scenario: home page omits empty filters from query params

- **WHEN** the searchSubmit output of `HomePageComponent`'s inner hero emits `{ q: '', categoriaId: '', barrioId: 'higuerillas' }`
- **THEN** the navigation `queryParams` excludes the `q` and `categoriaId` keys (only `barrioId` is sent)
- **AND** `queryParams.barrioId === 'higuerillas'`

#### Scenario: home page imports buildQueryParams from shared utils

- **WHEN** `home-page.component.ts` imports are read
- **THEN** it imports `buildQueryParams` from `../../shared/utils/query-params.util` (or `'@app/shared/utils/query-params.util'` if an alias exists)
- **AND** the file does NOT declare a local `buildQueryParams` helper

#### Scenario: home page no longer declares hardcoded CATEGORIAS_MVP / BARRIOS_MVP

- **WHEN** `home-page.component.ts` source is read
- **THEN** the file does NOT contain any `CATEGORIAS_MVP` or `BARRIOS_MVP` constant
- **AND** it does NOT declare `readonly categorias` or `readonly barrios` fields
- **AND** it does NOT pass `[categorias]` or `[barrios]` to the hero in its template
