# frontend-spa-navigation Specification

## Purpose
TBD - created by archiving change frontend-spa-routes. Update Purpose after archive.
## Requirements
### Requirement: Four skeleton pages are lazy-loaded SPA routes

The Angular router SHALL register four routes — `/directorio`, `/eventos`, `/contacto`, `/registrate` — each using `loadComponent` with a dynamic `import()` of its corresponding skeleton page component. The `/` route (HomePageComponent) SHALL remain unchanged (no `redirectTo` on the root path). All four skeleton components SHALL be standalone `OnPush` components that do NOT inject any data service (no `FirebaseService`, no `HttpClient`): only `Router` is allowed when a future change needs it (none of the current skeletons need it).

#### Scenario: app.routes.ts registers the directorio route

- **WHEN** `frontend/src/app/app.routes.ts` is read
- **THEN** the `routes` array contains an entry with `path: 'directorio'`
- **AND** that entry uses `loadComponent` returning a dynamic `import()` of `./features/directorio/directorio-page.component`
- **AND** the imported symbol is `DirectorioPageComponent`

#### Scenario: app.routes.ts registers the eventos route

- **WHEN** `frontend/src/app/app.routes.ts` is read
- **THEN** the `routes` array contains an entry with `path: 'eventos'`
- **AND** that entry uses `loadComponent` returning a dynamic `import()` of `./features/eventos/eventos-page.component`
- **AND** the imported symbol is `EventosPageComponent`

#### Scenario: app.routes.ts registers the contacto route

- **WHEN** `frontend/src/app/app.routes.ts` is read
- **THEN** the `routes` array contains an entry with `path: 'contacto'`
- **AND** that entry uses `loadComponent` returning a dynamic `import()` of `./features/contacto/contacto-page.component`
- **AND** the imported symbol is `ContactoPageComponent`

#### Scenario: app.routes.ts registers the registrate route

- **WHEN** `frontend/src/app/app.routes.ts` is read
- **THEN** the `routes` array contains an entry with `path: 'registrate'`
- **AND** that entry uses `loadComponent` returning a dynamic `import()` of `./features/registrate/registrate-page.component`
- **AND** the imported symbol is `RegistratePageComponent`

#### Scenario: root route is unchanged

- **WHEN** `frontend/src/app/app.routes.ts` is read
- **THEN** the entry with `path: ''` still `loadComponent`-imports `./features/home/home-page.component` returning `HomePageComponent`
- **AND** there is NO `redirectTo` on the root path
- **AND** the entry for `path: 'directorio'` does NOT reference `PlaceholderDirectorioComponent` anymore

#### Scenario: navigating to /directorio renders the DirectorioPageComponent skeleton

- **WHEN** a router test harness navigates to `/directorio`
- **THEN** the routed component contains a visible heading whose text is exactly "Directorio"
- **AND** the rendered DOM contains the Spanish word "Próximamente" (any case, with or without accent)
- **AND** the rendered DOM does NOT contain an `<app-search-bar-container>` element (search is removed from the skeleton)
- **AND** the `<app-placeholder-directorio>` selector is NOT present anywhere

#### Scenario: navigating to /eventos renders the EventosPageComponent skeleton

- **WHEN** a router test harness navigates to `/eventos`
- **THEN** the routed component contains a visible heading whose text is exactly "Eventos"
- **AND** the rendered DOM contains the Spanish word "Próximamente"

#### Scenario: navigating to /contacto renders the ContactoPageComponent skeleton

- **WHEN** a router test harness navigates to `/contacto`
- **THEN** the routed component contains a visible heading whose text is exactly "Contacto"
- **AND** the rendered DOM contains the Spanish word "Próximamente"

#### Scenario: navigating to /registrate renders the RegistratePageComponent skeleton

- **WHEN** a router test harness navigates to `/registrate`
- **THEN** the routed component contains a visible heading whose text is exactly "Registrate"
- **AND** the rendered DOM contains the Spanish word "Próximamente"

### Requirement: PlaceholderDirectorioComponent is removed

The previous `PlaceholderDirectorioComponent` (which embedded the `<app-search-bar-container>`) SHALL be replaced by the new `DirectorioPageComponent` skeleton. The files `frontend/src/app/features/directorio/placeholder-directorio.component.ts` and `frontend/src/app/features/directorio/placeholder-directorio.component.spec.ts` SHALL be deleted, and NO other file in the frontend SHALL import from them.

#### Scenario: the placeholder component files are gone

- **WHEN** the file `frontend/src/app/features/directorio/placeholder-directorio.component.ts` is checked for existence
- **THEN** it does NOT exist
- **AND** the file `frontend/src/app/features/directorio/placeholder-directorio.component.spec.ts` does NOT exist

#### Scenario: no stale import to the placeholder remains

- **WHEN** the frontend codebase is grepped for `PlaceholderDirectorioComponent` or `placeholder-directorio.component`
- **THEN** there are ZERO matches in `frontend/src/**` (test files, route files, module files, etc.)

### Requirement: Skeleton pages are presentational and use the Dunas y Océano design tokens

Each skeleton component (`DirectorioPageComponent`, `EventosPageComponent`, `ContactoPageComponent`, `RegistratePageComponent`) SHALL be a standalone `OnPush` component with NO `@Input`, NO `@Output`, and NO injected business service (no `FirebaseService`, no `HttpClient`). The template of each skeleton SHALL use only Tailwind utility classes derived from `tailwind.config.js` theme tokens (no literal hex colors in utility classes) and SHALL be visually consistent with the home page framing (`bg-background`, `container max-w-* mx-auto`, vertical padding paired with a `md:` variant).

#### Scenario: skeleton component is dumb (no DI, no inputs/outputs)

- **WHEN** each of `directorio-page.component.ts`, `eventos-page.component.ts`, `contacto-page.component.ts`, `registrate-page.component.ts` is read
- **THEN** the class declaration is decorated with `@Component` with `standalone: true` and `changeDetection: ChangeDetectionStrategy.OnPush`
- **AND** the class does NOT declare any `@Input()` or `@Output()` property
- **AND** the class does NOT call `inject(FirebaseService)`, `inject(HttpClient)`, or any data-access service
- **AND** the class does NOT import `SearchBarContainerComponent` (the directorio skeleton does not embed it)

#### Scenario: skeleton template contains no literal hex utility classes

- **WHEN** the HTML templates of the four skeleton components are read
- **THEN** no `text-[#...]`, `bg-[#...]`, `border-[#...]` or similar arbitrary-value utility classes appear
- **AND** all color utility classes (e.g. `text-primary`, `bg-background`, `text-on-surface-variant`) come from tokens defined in `tailwind.config.js`

#### Scenario: skeleton template uses M3 background token and responsive framing

- **WHEN** the HTML templates of the four skeleton components are read
- **THEN** the root section has a Tailwind `bg-background` class
- **AND** the content wrapper has a `container max-w-*` and `mx-auto`
- **AND** the root section has a vertical padding utility of the form `py-<N>` paired with a `md:py-<M>` variant where `M > N`
- **AND** the heading uses the `font-headline` Tailwind family and the `text-primary` color token

