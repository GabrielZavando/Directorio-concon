# frontend-home-hero Specification

## Purpose

The home page (`/`) of the Directorio de Empresas de Concón SHALL present a Hero section with a background image of Concón and a search form (free-text query + category select + location select + submit button), giving anonymous visitors an obvious entry point into the discovery flow (Flujo 2 — Descubrimiento). The Hero is split as a dumb presentational `HomeHeroComponent` (no DI) and a smart `HomePageComponent` that owns dummy categories/barrios and routes the submit to `/directorio` with query params.

## ADDED Requirements

### Requirement: Home Hero renders Concón background image with semantic overlay

The `HomeHeroComponent` SHALL render a `<section class="app-hero">` that displays the public asset `panoramica-concon.jpg` with a semi-transparent overlay derived from the `primary` token of the design system, ensuring the hero remains legible regardless of image load failures.

#### Scenario: hero section renders the hero background root element

- **WHEN** the `HomeHeroComponent` is rendered with default inputs (non-empty `categorias` and `barrios` arrays)
- **THEN** the host element is a `<section>` with attribute `data-purpose="hero-search"`
- **AND** the section has an inline `background-image` style containing the URL `/assets/panoramica-concon.jpg`
- **AND** the section has a Tailwind class `bg-primary` so that if the image fails to load the background remains visibly "Dunas y Océano" primary blue, not broken/white

#### Scenario: overlay covers the image with a primary-tone gradient

- **WHEN** the `HomeHeroComponent` is rendered
- **THEN** the inline `background-image` is a CSS declaration starting with `linear-gradient(` followed by `url('/assets/panoramica-concon.jpg')`
- **AND** the first gradient stop color is the canonical primary value `#004370` (matching `tailwind.config.js` `colors.primary`)

### Requirement: Home Hero renders a search form with three inputs and a submit button

The `HomeHeroComponent` SHALL render a `<form>` containing exactly one text input, one category `<select>`, one location `<select>` and one submit `<button>`, all labelled for assistive tech, matching the visual reference.

#### Scenario: hero renders a labeled free-text query input

- **WHEN** the `HomeHeroComponent` is rendered
- **THEN** a single `<input type="text">` is present inside the hero `<form>`
- **AND** the input has an accessible name (either `aria-label` set to a Spanish label like "Buscar" OR an associated `<label>` via `for`/`id`)
- **AND** the input has the placeholder text "¿Qué estás buscando?"

#### Scenario: hero renders a category select with placeholder option first

- **WHEN** the `HomeHeroComponent` is rendered with input `categorias = [{ id: 'cat-1', nombre: 'Restaurantes' }]`
- **THEN** the hero contains a `<select>` with id pointing to a label containing "categoría"
- **AND** the first `<option>` inside that select has empty string value and text "Seleccionar categoría"
- **AND** a subsequent `<option>` has value `cat-1` and text `Restaurantes`

#### Scenario: hero renders a location select with placeholder option first

- **WHEN** the `HomeHeroComponent` is rendered with input `barrios = [{ id: 'b-1', nombre: 'Centro' }]`
- **THEN** the hero contains a second `<select>` with id pointing to a label containing "ubicación"
- **AND** the first `<option>` inside that select has empty string value and text "Seleccionar ubicación"
- **AND** a subsequent `<option>` has value `b-1` and text `Centro`

#### Scenario: hero renders a submit button with visible Spanish text

- **WHEN** the `HomeHeroComponent` is rendered
- **THEN** a `<button type="submit">` is present inside the hero `<form>`
- **AND** its visible text contains the phrase "Buscar"
- **AND** the button has Tailwind classes derived from design tokens (background `bg-secondary-container`, text using `text-primary`)

### Requirement: Hero emits a typed SearchCriteria on form submit (dumb contract)

The `HomeHeroComponent` SHALL expose a `@Output() searchSubmit` that, when the user submits the form, emits an object of shape `{ q: string; categoriaId: string; barrioId: string }`. It SHALL NOT call any `Router` or service directly — that responsibility belongs to the smart container.

#### Scenario: hero emits SearchCriteria with trimmed text query

- **WHEN** the test host sets `form.q` to `" pizzería "` and dispatches the form's `ngSubmit` (or a native submit event)
- **THEN** the `searchSubmit` output has emitted exactly one event of shape `{ q: 'pizzería', categoriaId: <selected value>, barrioId: <selected value> }`
- **AND** `q` is the trimmed value `"pizzería"` (no leading/trailing whitespace)

#### Scenario: hero emits SearchCriteria with empty category when placeholder is selected

- **WHEN** the category `<select>` is left on its placeholder option and the form is submitted
- **THEN** the emitted `SearchCriteria.categoriaId` is the empty string

#### Scenario: hero emits SearchCriteria with the selected category id

- **WHEN** the category `<select>` is set to the option with `value="cat-1"` and the form is submitted
- **THEN** the emitted `SearchCriteria.categoriaId` equals `"cat-1"`

#### Scenario: hero does not navigate

- **WHEN** the `HomeHeroComponent` is inspected for dependencies via its constructor signature or `inject()` usage
- **THEN** there is no reference to `Router`, `HttpClient`, Firestore, or any data-fetching service

### Requirement: HomePageComponent is a smart container owning categories, barrios and the Router

The `HomePageComponent` SHALL be a smart container that owns a hardcoded dummy list of Concón categories and barrios (read-only typed arrays), passes them as `@Input()` to the dumb hero, and on `searchSubmit` calls `Router.navigate(['/directorio'], { queryParams: { q, categoriaId, barrioId } })`.

#### Scenario: home page renders the hero with categories as input

- **WHEN** the `HomePageComponent` is rendered in a router test harness
- **THEN** it renders an `<app-home-hero>` element
- **AND** the hero receives a non-empty `categorias` array of `CategoryOption` objects containing at least "Restaurantes" and "Hospedaje" (Concón MVP categories)
- **AND** the hero receives a non-empty `barrios` array of `BarrioOption` objects containing at least "Centro" and "Bosques" (Concón MVP barrios)

#### Scenario: home page navigates to /directorio with query params on submit

- **WHEN** the hero inside `HomePageComponent` emits `searchSubmit = { q: 'pizzería', categoriaId: 'cat-1', barrioId: 'b-1' }`
- **THEN** the smart container calls `Router.navigate` with first argument `['/directorio']`
- **AND** the second argument has `queryParams.q === 'pizzería'`
- **AND** the second argument has `queryParams.categoriaId === 'cat-1'`
- **AND** the second argument has `queryParams.barrioId === 'b-1'`

#### Scenario: home page omits empty filters from query params

- **WHEN** the hero emits `searchSubmit = { q: '', categoriaId: '', barrioId: 'b-1' }`
- **THEN** the navigation `queryParams` excludes the `q` and `categoriaId` keys (only `barrioId` is sent)
- **AND** `queryParams.barrioId === 'b-1'`

### Requirement: Angular routing enabled with `/` lazy-loading the HomePageComponent

The frontend SHALL introduce `app.routes.ts` with a `/` route that lazy-loads `HomePageComponent` via `loadComponent`, and the `AppComponent` SHALL render a Header, a `<main>` containing `<router-outlet>`, and a Footer.

#### Scenario: app config provides router

- **WHEN** `frontend/src/app/app.config.ts` is read
- **THEN** its `providers` array includes a `provideRouter(routes)` call importing from `@angular/router`

#### Scenario: app routes lazy-load the home page

- **WHEN** `frontend/src/app/app.routes.ts` is read
- **THEN** it exports a `routes` array containing an entry with `path: ''`
- **AND** that entry uses `loadComponent` returning a dynamic `import()` of `./features/home/home-page.component`
- **AND** the imported symbol is `HomePageComponent`
- **AND** there is no explicit `redirectTo` on the root path

#### Scenario: AppComponent renders router-outlet between header and footer

- **WHEN** the `AppComponent` template is rendered in a router test harness with the default route
- **THEN** an `<app-header>` element is present
- **AND** an `<app-footer>` element is present
- **AND** a `<main>` element is present and contains a `<router-outlet>`
- **AND** the placeholder paragraph text "Contenido pendiente" is NO LONGER present
- **AND** the `<app-home-hero>` element is visible inside the rendered `HomePageComponent`

### Requirement: `/directorio` placeholder route prevents silent navigation failure

The router SHALL register a `path: 'directorio'` route whose component renders a minimal placeholder indicating the directory listing is forthcoming, so that pressing "Buscar Ahora" does not silently fail during the gap between this change and the future directory listing change.

#### Scenario: router has a directorio route

- **WHEN** `frontend/src/app/app.routes.ts` is read
- **THEN** the `routes` array contains an entry with `path: 'directorio'`
- **AND** that entry uses `loadComponent` to import a component whose visible content includes the word "directorio"

#### Scenario: navigating to /directorio renders the placeholder

- **WHEN** the router test harness navigates to `/directorio?q=pizzeria`
- **THEN** the rendered component contains visible Spanish text containing the phrase "Próximamente" OR "próximamente"
- **AND** the URL retains the `q` query param in the location

### Requirement: Home Hero uses M3 design tokens exclusively; no hardcoded colors/spacing

The `HomeHeroComponent` template SHALL use only Tailwind utility classes derived from `tailwind.config.js` theme tokens and the type-safe inline background binding. No literal hex colors, fixed pixel spacing, or magic numbers SHALL appear in the component templates (other than the one inline `background-image` reference whose primary value is sourced from a named shared constant).

#### Scenario: hero template contains no literal hex colors in utility classes

- **WHEN** the `HomeHeroComponent` HTML template source is read
- **THEN** no `text-[#...]`, `bg-[#...]`, `border-[#...]` or similar arbitrary-value utility classes appear
- **AND** all color utility classes (e.g. `text-primary`, `bg-secondary-container`, `text-on-surface`) come from tokens defined in `tailwind.config.js`

#### Scenario: hero uses canonical radius and shadow tokens

- **WHEN** the `HomeHeroComponent` HTML template source is read
- **THEN** the form container uses a Tailwind rounded utility (e.g. `rounded-lg` or `rounded-custom`) declared in `tailwind.config.js.borderRadius`
- **AND** the inputs/select use a rounded utility derived from the same config
- **AND** if a shadow is applied, it uses `shadow-md` or `shadow-lg` declared in `tailwind.config.js.boxShadow`

### Requirement: Home Hero is responsive (mobile-first)

The `HomeHeroComponent` SHALL be responsive: the search form grid renders as a single column on phones and as a 4-column grid on tablets and up.

#### Scenario: form is single column on mobile breakpoints

- **WHEN** the `HomeHeroComponent` HTML template source is read
- **THEN** the form root has a Tailwind grid utility containing `grid-cols-1` for the mobile default
- **AND** the same element has a `md:` variant utility enforcing `md:grid-cols-4`

#### Scenario: hero section has vertical padding that scales with viewport

- **WHEN** the `HomeHeroComponent` HTML template source is read
- **THEN** the hero section root has a Tailwind vertical padding utility of the form `py-<N>` paired with a `md:py-<M>` variant where `M > N`
