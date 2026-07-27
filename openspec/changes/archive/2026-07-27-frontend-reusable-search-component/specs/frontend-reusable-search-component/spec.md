# Change Spec — frontend-reusable-search-component

> New capability: a reusable search bar (dumb + smart + DIP port) plus the canonical Concón categorias / barrios JSON seed and the shared `buildQueryParams` util.

## ADDED Requirements

### Requirement: Shared `interfaces/` folder exposes typed contracts for the search bar

The module `shared/ui/search-bar/interfaces/` SHALL expose three TS interfaces in separate files: `SearchCriteria` (in `search-criteria.interface.ts`), `CategoryOption` + `SubcategoriaOption` (in `category-option.interface.ts`), and `BarrioOption` (in `barrio-option.interface.ts`). Every field SHALL be `readonly`, no `any` SHALL appear, and the `id` of `CategoryOption` / `BarrioOption` SHALL be typed as the Firestore slug string.

#### Scenario: interfaces folder contains one file per interface

- **WHEN** the directory `frontend/src/app/shared/ui/search-bar/interfaces/` is inspected
- **THEN** it contains exactly the files `category-option.interface.ts`, `barrio-option.interface.ts`, and `search-criteria.interface.ts`
- **AND** no other `*.interface.ts` or `*.types.ts` file exists in that folder

#### Scenario: CategoryOption exposes id, nombre, icono, orden, activa and optional subcategorias

- **WHEN** `category-option.interface.ts` is read
- **THEN** it exports `interface CategoryOption` with `readonly id: string`, `readonly nombre: string`, `readonly icono: string`, `readonly orden: number`, `readonly activa: boolean`
- **AND** optional fields `readonly descripcion?: string` and `readonly subcategorias?: ReadonlyArray<SubcategoriaOption>`
- **AND** it also exports `interface SubcategoriaOption` with `readonly slug: string`, `readonly nombre: string`, and optional `readonly descripcion?: string`

#### Scenario: BarrioOption exposes id, nombre and optional territorio/tipo metadata

- **WHEN** `barrio-option.interface.ts` is read
- **THEN** it exports `interface BarrioOption` with `readonly id: string`, `readonly nombre: string`
- **AND** optional fields `readonly descripcion?: string`, `readonly territorio?: string`, `readonly tipo?: 'urbano' | 'rural'`, and `readonly coordenadas?: { lat: number; lng: number } | null`

#### Scenario: SearchCriteria uses empty-string defaults for unselected filters

- **WHEN** `search-criteria.interface.ts` is read
- **THEN** it exports `interface SearchCriteria` with `readonly q: string`, `readonly categoriaId: string`, and `readonly barrioId: string`
- **AND** there is no `any` field anywhere in the three interface files

### Requirement: Canonical Concón barrios JSON seed is bundled in the frontend

The file `frontend/src/app/shared/data-access/local/data/barrios.json` SHALL exist and contain exactly 13 barrios covering Concón. Each entry's `id` SHALL be the Firestore slug (no `zona_xx` code), every `nombre` SHALL be present, and the file SHALL use `descripcion` (no tilde) for the description field and `territorio` (not `territorio_que_abarca`) for the territory metadata. Exactly one barrio SHALL have `tipo: "rural"`; the remaining 12 SHALL have `tipo: "urbano"`. `coordenadas` SHALL be `null` for every entry in this seed.

#### Scenario: barrios.json contains 13 barrios with slug ids

- **WHEN** `barrios.json` is parsed
- **THEN** it is a JSON array of exactly 13 objects
- **AND** every object has an `id` field matching the kebab-case slug of its `nombre` (no `zona_` prefix)
- **AND** no two entries share the same `id`

#### Scenario: exactly one rural barrio and twelve urban barrios

- **WHEN** `barrios.json` is parsed
- **THEN** exactly one entry has `tipo: "rural"`
- **AND** that entry's `id` is `zona-rural`
- **AND** the remaining 12 entries have `tipo: "urbano"`

#### Scenario: barrios.json uses canonical key names without tildes

- **WHEN** `barrios.json` is parsed
- **THEN** every entry has keys `id`, `nombre`, `descripcion`, `territorio`, `tipo`, and `coordenadas`
- **AND** no entry has a key named `descripción` (with tilde) or `territorio_que_abarca`

#### Scenario: higuerillas is one of the barrios

- **WHEN** `barrios.json` is parsed
- **THEN** one of the entries has `id: "higuerillas"` and `nombre: "Higuerillas"`
- **AND** that entry has `tipo: "urbano"` and a non-empty `descripcion` and `territorio`

### Requirement: Canonical Concón categorias JSON seed is bundled in the frontend

The file `frontend/src/app/shared/data-access/local/data/categorias.json` SHALL exist, expose a top-level `{ "categorias": [...] }` object, and contain exactly 9 categorias. Each categoria's `id` SHALL be the Firestore slug (no `cat_xx` code), `icono` SHALL be a Lucide icon name in kebab-case drawn from the set `utensils`, `store`, `tent`, `briefcase`, `car`, `heart-pulse`, `graduation-cap`, `building-2`, `party-popper`, `orden` SHALL be the position 1..9, and `activa` SHALL be `true` for every entry. `subcategorias[]` SHALL be preserved for each parent categoria with at least 6 subcategorias each.

#### Scenario: categorias.json contains 9 categories with slug ids

- **WHEN** `categorias.json` is parsed
- **THEN** it is a JSON object with a top-level `categorias` array of exactly 9 objects
- **AND** every object has an `id` field matching the kebab-case slug of its `nombre` (no `cat_` prefix)
- **AND** no two entries share the same `id`

#### Scenario: each category has a Lucide icono from the allowed set

- **WHEN** `categorias.json` is parsed
- **THEN** every entry has an `icono` field whose value is one of: `utensils`, `store`, `tent`, `briefcase`, `car`, `heart-pulse`, `graduation-cap`, `building-2`, `party-popper`
- **AND** the mapping is bijective enough to render Gastronomía with `utensils`, Comercio with `store`, Turismo y Recreación with `tent`, Servicios Profesionales with `briefcase`, Movilidad y Transporte with `car`, Salud y Bienestar with `heart-pulse`, Educación y Talleres with `graduation-cap`, Instituciones y Organizaciones with `building-2`, Eventos with `party-popper`

#### Scenario: each category has orden 1..9 and activa true

- **WHEN** `categorias.json` is parsed
- **THEN** every entry has `orden` as a number in `1..9` and the orders are distinct (no duplicates)
- **AND** every entry has `activa: true`

#### Scenario: subcategorias are preserved for every parent category

- **WHEN** `categorias.json` is parsed
- **THEN** every one of the 9 categories has a non-empty `subcategorias` array
- **AND** each subcategoria has `slug`, `nombre`, and `descripcion` (no tilde) fields
- **AND** no two subcategorias within the same parent share the same `slug`

### Requirement: DIP data-access layer exposes a DirectorioOpciones port

The module `shared/data-access/` SHALL expose (a) a `DirectorioOpciones` boundary type combining `readonly categorias: readonly CategoryOption[]` and `readonly barrios: readonly BarrioOption[]`, (b) a `DirectorioOpcionesPort` interface with a single `getOpciones(): Observable<DirectorioOpciones>` method, (c) an `InjectionToken<DIRECTORIO_OPCIONES_PORT>` named `DIRECTORIO_OPCIONES_PORT`, and (d) a `provideDirectorioOpciones()` helper returning a `Provider[]` binding the local implementation to the token. A `// TODO:` comment in the port file SHALL document the future remote fallback contract described in design.md.

#### Scenario: DirectorioOpcionesPort has a single getOpciones method

- **WHEN** `directorio-opciones.port.ts` is read
- **THEN** it exports `interface DirectorioOpcionesPort { getOpciones(): Observable<DirectorioOpciones>; }`
- **AND** it exports `const DIRECTORIO_OPCIONES_PORT: InjectionToken<DirectorioOpcionesPort>`
- **AND** the file contains a `// TODO:` comment mentioning the future `RemoteDirectorioOpcionesService` and its graceful fallback to the local service on network failure

#### Scenario: provideDirectorioOpciones returns the local binding

- **WHEN** `directorio-opciones.provider.ts` is read
- **THEN** it exports `function provideDirectorioOpciones(): Provider[]`
- **AND** the returned array contains exactly one `{ provide: DIRECTORIO_OPCIONES_PORT, useClass: LocalDirectorioOpcionesService }`

#### Scenario: DirectorioOpciones is the boundary type seen by consumers

- **WHEN** `directorio-opciones.types.ts` is read
- **THEN** it exports `interface DirectorioOpciones` with `readonly categorias: readonly CategoryOption[]` and `readonly barrios: readonly BarrioOption[]`
- **AND** no other file in `shared/data-access/` exposes a different `DirectorioOpciones` type

### Requirement: LocalDirectorioOpcionesService reads the JSON seeds and emits synchronously

The `LocalDirectorioOpcionesService` (in `shared/data-access/local/`) SHALL implement `DirectorioOpcionesPort`, statically import the two bundled JSON files via `resolveJsonModule`, map them into `DirectorioOpciones` typed as `CategoryOption[]` and `BarrioOption[]`, and return `of(directorioOpciones)` (a synchronous Observable). It SHALL NOT use `fetch`, `HttpClient`, or any async loader.

#### Scenario: service emits 13 barrios and 9 categories synchronously

- **WHEN** `LocalDirectorioOpcionesService.getOpciones()` is subscribed to in a test
- **THEN** the observable emits exactly one value of type `DirectorioOpciones`
- **AND** the emitted value has `barrios.length === 13` and `categorias.length === 9`
- **AND** the emission is synchronous (the value is available in the same microtask as the subscribe call, validated via a synchronous `expect` after `service.getOpciones().subscribe(...)`)

#### Scenario: service does not depend on HttpClient or fetch

- **WHEN** `local-directorio-opciones.service.ts` imports are read
- **THEN** there is no import of `HttpClient`, `@angular/common/http`, or any `fetch` polyfill

#### Scenario: emitted barrios include the single rural entry

- **WHEN** the emitted `DirectorioOpciones.barrios` is inspected
- **THEN** exactly one entry has `tipo === 'rural'`
- **AND** that entry's `id` is `zona-rural`

#### Scenario: emitted categories include Gastronomía with icono utensils

- **WHEN** the emitted `DirectorioOpciones.categorias` is inspected
- **THEN** one entry has `id === 'gastronomia'`
- **AND** its `icono` is `utensils`
- **AND** its `orden` is `1` and its `activa` is `true`

### Requirement: app.config.ts wires DirecorioOpciones provider

The `app.config.ts` `providers` array SHALL include a `provideDirectorioOpciones()` call so the `DirectorioOpcionesPort` token is bound globally for `SearchBarContainerComponent` injection.

#### Scenario: provideDirectorioOpciones is registered

- **WHEN** `app.config.ts` is read
- **THEN** its `providers` array contains a `provideDirectorioOpciones()` call
- **AND** the import statement originates from `./shared/data-access/directorio-opciones.provider`

### Requirement: SearchBarComponent is a dumb presentational form

The `SearchBarComponent` (selector `app-search-bar`, in `shared/ui/search-bar/`) SHALL be a standalone Angular component with `ChangeDetectionStrategy.OnPush` exposing `@Input() categorias: readonly CategoryOption[]`, `@Input() barrios: readonly BarrioOption[]`, and `@Output() searchSubmit = new EventEmitter<SearchCriteria>()`. It SHALL own a `FormGroup<{ q, categoriaId, barrioId }>` (all `FormControl<string>` non-nullable, initial value `''`). Its template SHALL render a `<form [formGroup]="form" (ngSubmit)="onSubmit()">` with exactly one text input, one category `<select>`, one location `<select>` and a submit `<button>` — the same M3 tokens as `frontend-home-hero` (`bg-secondary-container`, `text-primary`, `rounded-lg`, `focus:ring-primary`), responsive `grid-cols-1 md:grid-cols-4`. It SHALL NOT inject `Router`, `HttpClient`, or any data service.

#### Scenario: search-bar component inputs and outputs are typed

- **WHEN** `search-bar.component.ts` is read
- **THEN** it declares `@Input() categorias: readonly CategoryOption[] = []`
- **AND** it declares `@Input() barrios: readonly BarrioOption[] = []`
- **AND** it declares `@Output() searchSubmit = new EventEmitter<SearchCriteria>()`
- **AND** no other inputs or outputs are declared

#### Scenario: search-bar does not inject Router or HttpClient

- **WHEN** the constructor parameters and `inject()` calls of `SearchBarComponent` are inspected
- **THEN** there is no reference to `Router`, `HttpClient`, `@angular/fire/*`, or `DIRECTORIO_OPCIONES_PORT`

#### Scenario: search-bar renders a placeholder option first for category and location selects

- **WHEN** `SearchBarComponent` is rendered with `categorias = [{ id: 'gastronomia', nombre: 'Gastronomía', icono: 'utensils', orden: 1, activa: true }]` and `barrios = [{ id: 'higuerillas', nombre: 'Higuerillas' }]`
- **THEN** the category `<select>` has a first `<option value="">Seleccionar categoría</option>`
- **AND** a subsequent `<option value="gastronomia">Gastronomía</option>` is present
- **AND** the location `<select>` has a first `<option value="">Seleccionar ubicación</option>`
- **AND** a subsequent `<option value="higuerillas">Higuerillas</option>` is present

#### Scenario: search-bar emits SearchCriteria with trimmed text query only

- **WHEN** the test host sets `form.q` to `" pizzería "` and leaves both selects on their placeholder, then dispatches `ngSubmit`
- **THEN** the `searchSubmit` output has emitted exactly one event of shape `{ q: 'pizzería', categoriaId: '', barrioId: '' }`
- **AND** `q` is the trimmed value `"pizzería"` (no leading/trailing whitespace)

#### Scenario: search-bar emits SearchCriteria with the selected category id

- **WHEN** the category `<select>` is set to the option with `value="gastronomia"` and the form is submitted (placeholder location selected)
- **THEN** the emitted `SearchCriteria.categoriaId` equals `"gastronomia"`
- **AND** `SearchCriteria.barrioId` equals `''`

#### Scenario: search-bar emits SearchCriteria with the selected barrio id

- **WHEN** the location `<select>` is set to the option with `value="higuerillas"` and the form is submitted (placeholder category selected)
- **THEN** the emitted `SearchCriteria.barrioId` equals `"higuerillas"`
- **AND** `SearchCriteria.categoriaId` equals `''`

#### Scenario: search-bar emits SearchCriteria with all three filters selected

- **WHEN** the test host sets `q="café"`, `categoriaId="gastronomia"`, `barrioId="la-costa"` and submits the form
- **THEN** the emitted `SearchCriteria` equals `{ q: 'café', categoriaId: 'gastronomia', barrioId: 'la-costa' }`

#### Scenario: search-bar form is responsive single-column on mobile

- **WHEN** the `SearchBarComponent` template source is read
- **THEN** the form root has Tailwind utilities `grid-cols-1` and `md:grid-cols-4`

#### Scenario: search-bar template uses only M3 tokens (no hardcoded hex)

- **WHEN** the `SearchBarComponent` HTML template source is read
- **THEN** no `text-[#...]`, `bg-[#...]`, `border-[#...]` or similar arbitrary-value utility classes appear
- **AND** all color utility classes (e.g. `text-primary`, `bg-secondary-container`) come from tokens defined in `tailwind.config.js`

### Requirement: SearchBarContainerComponent is a smart container that wires the port to the dumb component

The `SearchBarContainerComponent` (selector `app-search-bar-container`, in `shared/ui/search-bar/`) SHALL be a standalone Angular component with `ChangeDetectionStrategy.OnPush`. It SHALL inject the `DIRECTORIO_OPCIONES_PORT` token via `inject(...)`, call `getOpciones()` to obtain `opciones$: Observable<DirectorioOpciones>`, render `<app-search-bar>` with `| async`-bound inputs, and re-emit the dumb `searchSubmit` as a delegate `@Output()` of the same name. It SHALL NOT inject `Router` or `HttpClient`.

#### Scenario: container injects the port and exposes opciones$

- **WHEN** `search-bar-container.component.ts` is read
- **THEN** it injects `DirectorioOpcionesPort` via `inject(DIRECTORIO_OPCIONES_PORT)`
- **AND** it exposes an `opciones$: Observable<DirectorioOpciones>` field initialized from `port.getOpciones()`
- **AND** it declares `@Output() searchSubmit = new EventEmitter<SearchCriteria>()`

#### Scenario: container does not inject Router or HttpClient

- **WHEN** the constructor parameters and `inject()` calls of `SearchBarContainerComponent` are inspected
- **THEN** there is no reference to `Router`, `HttpClient`, or `@angular/fire/*`

#### Scenario: container delegates searchSubmit from the dumb component

- **WHEN** the `SearchBarContainerComponent` template is read
- **THEN** it contains an `<app-search-bar>` element with `[categorias]` bound to the emitted categorias, `[barrios]` bound to the emitted barrios, and `(searchSubmit)` bound to a handler that re-emits to the container's own `searchSubmit` output

#### Scenario: container renders the dumb component after the port emits

- **WHEN** the container is rendered in a TestBed with a stub `DirectorioOpcionesPort` returning `of({ categorias: [...], barrios: [...] })`
- **THEN** the rendered DOM contains `<app-search-bar>` with the stubbed categorias visible in the second `<select>` and the stubbed barrios in the third `<select>`
- **AND** the stub port is the only provider bound to `DIRECTORIO_OPCIONES_PORT` (the local impl is overridden in the test)

### Requirement: shared `buildQueryParams` util omits empty filters

The `shared/utils/query-params.util.ts` SHALL export a pure function `buildQueryParams(criteria: SearchCriteria): Record<string, string>` that returns an object containing only the `q`, `categoriaId`, or `barrioId` keys whose values are non-empty strings. The function SHALL be type-safe (no `any`), pure (no side effects), and exported from a barrel-free single file so both `/` and `/directorio` import it directly.

#### Scenario: all filters omitted when only q is set

- **WHEN** `buildQueryParams({ q: 'pizzería', categoriaId: '', barrioId: '' })` is called
- **THEN** the returned object is `{ q: 'pizzería' }`
- **AND** it does NOT contain keys `categoriaId` or `barrioId`

#### Scenario: only non-empty filters are kept

- **WHEN** `buildQueryParams({ q: '', categoriaId: 'gastronomia', barrioId: 'higuerillas' })` is called
- **THEN** the returned object is `{ categoriaId: 'gastronomia', barrioId: 'higuerillas' }`
- **AND** it does NOT contain the `q` key

#### Scenario: all three filters preserved when all are set

- **WHEN** `buildQueryParams({ q: 'café', categoriaId: 'gastronomia', barrioId: 'la-costa' })` is called
- **THEN** the returned object has exactly the keys `q`, `categoriaId`, `barrioId` with the given values

#### Scenario: empty criteria returns empty object

- **WHEN** `buildQueryParams({ q: '', categoriaId: '', barrioId: '' })` is called
- **THEN** the returned object is `{}` (no keys)

### Requirement: PlaceholderDirectorioComponent consumes the search bar and merges query params

The `PlaceholderDirectorioComponent` (in `features/directorio/`) SHALL render `<app-search-bar-container (searchSubmit)="onSearchSubmit($event)">` above its existing "Próximamente" placeholder, inject `Router` via DI, and on `(searchSubmit)` call `Router.navigate(['/directorio'], { queryParams: buildQueryParams(criteria), queryParamsHandling: 'merge' })`. It SHALL import `buildQueryParams` from `shared/utils/query-params.util.ts` (no duplicated logic).

#### Scenario: placeholder-directorio renders the search bar container

- **WHEN** `PlaceholderDirectorioComponent` is rendered in a TestBed
- **THEN** the rendered DOM contains an `<app-search-bar-container>` element

#### Scenario: placeholder-directorio navigates with merge when searchSubmit fires

- **WHEN** the rendered `<app-search-bar-container>` emits `searchSubmit = { q: 'pizzería', categoriaId: '', barrioId: '' }` and a `Router` spy is configured
- **THEN** `routerSpy.navigate` is called with first argument `['/directorio']`
- **AND** the second argument has `queryParams` deep-equal to `{ q: 'pizzería' }`
- **AND** the second argument has `queryParamsHandling` equal to `'merge'`

#### Scenario: placeholder-directorio imports buildQueryParams from shared utils

- **WHEN** `placeholder-directorio.component.ts` imports are read
- **THEN** it imports `buildQueryParams` from `./../../shared/utils/query-params.util` (or `'@app/shared/utils/query-params.util'` if an alias exists)
- **AND** the file does NOT declare a local `buildQueryParams` helper

#### Scenario: placeholder-directorio retains the Próximamente heading

- **WHEN** `PlaceholderDirectorioComponent` is rendered at `/directorio?q=foo`
- **THEN** the rendered DOM still contains an `<h1>` whose text contains "Próximamente" (case-insensitive)
- **AND** the URL retains the `q` query param in the location

### Requirement: tsconfig json module support is enabled

The `frontend/tsconfig.app.json` SHALL have `resolveJsonModule: true` in `compilerOptions` so the `LocalDirectorioOpcionesService` can statically `import` the bundled JSON seeds as typed objects. The existing `strict`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, `strictTemplates`, and other strict flags SHALL remain unchanged.

#### Scenario: resolveJsonModule is true in tsconfig.app.json

- **WHEN** `frontend/tsconfig.app.json` is parsed
- **THEN** its `compilerOptions.resolveJsonModule` is `true`
- **AND** `compilerOptions.strict` remains `true`
- **AND** `angularCompilerOptions.strictTemplates` remains `true`

### Requirement: docs/data-model.md is updated to canonicalize categorias and barrios

The `docs/data-model.md` SHALL document (a) `categorias.id` as the Firestore slug, (b) the new `subcategorias[]` field with its `{ slug, nombre, descripcion }` substructure, (c) the `icono` (Lucide), `orden`, and `activa` fields, (d) `barrios.id` as the Firestore slug, and (e) the new `territorio` field plus the `tipo` (`urbano` / `rural`) field. A canonical example ("Higuerillas" barrio, "Gastronomía" categoria) SHALL appear in the file.

#### Scenario: data-model documents subcategorias

- **WHEN** `docs/data-model.md` is read
- **THEN** the `categorias` section contains a row for `subcategorias` documenting it as an array of `{ slug, nombre, descripcion }`

#### Scenario: data-model documents territorio and tipo for barrios

- **WHEN** `docs/data-model.md` is read
- **THEN** the `barrios` section contains a row for `territorio` (string, metadata of the sectors covered)
- **AND** it documents `tipo` with allowed values `urbano` | `rural`

#### Scenario: data-model states id is the Firestore slug

- **WHEN** `docs/data-model.md` is read
- **THEN** for both `categorias` and `barrios` the `id` row documents that `id` is the Firestore document id (the slug, not a zona_xx/cat_xx code)

#### Scenario: data-model includes the Higuerillas / Gastronomía canonical example

- **WHEN** `docs/data-model.md` is read
- **THEN** the file references `id: higuerillas` as an example for `barrios`
- **AND** it references `id: gastronomia` as an example for `categorias`
