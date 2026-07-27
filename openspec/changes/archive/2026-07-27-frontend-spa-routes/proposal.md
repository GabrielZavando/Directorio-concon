# Proposal — frontend-spa-routes

## Why

The Angular frontend already renders shared Header/Footer globally via `AppComponent` with a `<router-outlet>` between them, but navigation is dead: every `navLinks` entry (`Inicio`, `Directorio`, `Eventos`, `Contacto`, `Registrate`) and the logo anchor use `href="#"`, producing full-page no-ops instead of SPA transitions. Only two routes exist (`/` and `/directorio` placeholder), so visitors cannot reach `Eventos`, `Contacto`, or the `Registrate` page at all. This change unlocks the SPA navigation model that the layout was built for and the design references (`docs/{home,login,mapa,perfil}/code.html`) imply, so that clicking any header link — or the logo — swaps only the `<main>` content without remounting Header/Footer.

## What Changes

- **Migrate Header anchors from `href="#"` to `routerLink`** (desktop + mobile panel) and add `routerLinkActive` for the active link styling. Import `RouterLink` and `RouterLinkActive` from `@angular/router` in `HeaderComponent`.
- **Replace `PlaceholderDirectorioComponent` with a definitive `DirectorioPageComponent`** skeleton (heading + "Próximamente"). The previously embedded `<app-search-bar-container>` is removed from the skeleton — search logic stays exclusively in the shared `SearchBarContainerComponent` (used by the home hero), and will be re-plugged into the real directory listing in a future change. Delete `placeholder-directorio.component.ts` and its spec.
- **Create three skeleton page components** under `frontend/src/app/features/`: `EventosPageComponent`, `ContactoPageComponent`, `RegistratePageComponent`. Each renders only a heading with its name and a "Próximamente" message, using M3 design tokens (`font-headline`, `text-primary`, `bg-background`). No business logic, no DI, no forms.
- **Register four lazy `loadComponent` routes** in `frontend/src/app/app.routes.ts`: `directorio` → `DirectorioPageComponent`, `eventos` → `EventosPageComponent`, `contacto` → `ContactoPageComponent`, `registrate` → `RegistratePageComponent`. The `/` route (`HomePageComponent`) is unchanged.
- **Update `navLinks` and `ctaLink` collections** in `HeaderComponent` so each link carries its real SPA route (`/`, `/directorio`, `/eventos`, `/contacto`, `/registrate`) instead of `'#'`.
- The shared Header/Footer from `AppComponent` keep being rendered exactly once per page (already wired). No layout re-architecture: only `<main>` content swaps per route.

## Capabilities

### New Capabilities
- `frontend-spa-navigation`: Angular SPA routing for the four skeleton pages (`directorios`/`eventos`/`contacto`/`registrate`) plus the home route, with the Header using `routerLink`/`routerLinkActive` and a shared layout (Header/Footer) that does NOT remount between routes.

### Modified Capabilities
- `frontend-layout-base`: the Header now navigates via the Angular router (`routerLink`) instead of `href="#"`, exposing active-link styling (`routerLinkActive`). Existing scenarios about "5 nav links visible" and "M3 tokens on `<header>`" remain valid; a new requirement concerning SPA navigation is added under `## ADDED Requirements` in the delta.

## Impact

- **Affected code (frontend)**:
  - `frontend/src/app/layout/header/header.component.ts` — `navLinks`/`ctaLink` carry real routes; import `RouterLink`, `RouterLinkActive`.
  - `frontend/src/app/layout/header/header.component.html` — `[href]` → `[routerLink]`, add `routerLinkActive`; logo `<a href="#">` → `<a routerLink="/">`.
  - `frontend/src/app/layout/header/header.component.spec.ts` — assertions now expect `routerLink` attributes (and an `href` fallback) and an `aria-label` on the logo link to `/`. TestBed must provide `RouterTestingModule` / `provideRouter([])` since `routerLink` needs a router.
  - `frontend/src/app/app.routes.ts` — three new lazy routes; the `directorio` route now loads `DirectorioPageComponent` instead of `PlaceholderDirectorioComponent`.
  - **New files**:
    - `frontend/src/app/features/directorio/directorio-page.component.ts|html|css|spec.ts`
    - `frontend/src/app/features/eventos/eventos-page.component.ts|html|css|spec.ts`
    - `frontend/src/app/features/contacto/contacto-page.component.ts|html|css|spec.ts`
    - `frontend/src/app/features/registrate/registrate-page.component.ts|html|css|spec.ts`
  - **Deleted files**:
    - `frontend/src/app/features/directorio/placeholder-directorio.component.ts`
    - `frontend/src/app/features/directorio/placeholder-directorio.component.spec.ts`
- **Backend / Firebase**: no impact. No new data, no API changes.
- **Dependencies**: zero new packages — `@angular/router` is already installed.
- **Docs**: none updated in this change (`docs/api-spec.yml` and `docs/data-model.md` untouched — pure frontend routing/UI).
- **Tests**: each new component gets a Jasmine spec asserting its heading text ("Directorio" / "Eventos" / "Contacto" / "Registrate") and the "Próximamente" wording. Header spec is updated to a router-aware TestBed.
