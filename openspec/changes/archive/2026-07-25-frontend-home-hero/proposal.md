## Why

The home page (`/`) of the Directorio de Empresas de Concón only renders the shared Header and Footer plus a placeholder `<p>Contenido pendiente</p>`. The visual reference in `docs/home/code.html` defines a Hero section with a background image, overlay gradient, title/subtitle and a 4-column search form (free-text query + category select + location select + submit button). Without it, visitors landing on the home page have no way to start discovering businesses, which is the central user flow (Flujo 2 — Descubrimiento, visitante anónimo) of the MVP.

The required background image already exists at `frontend/public/assets/panoramica-concon.jpg`, the API spec already supports `GET /api/v1/empresas?q=&categoriaId=&barrioId=` for the discovery endpoint, and the Tailwind config + design tokens ("Dunas y Océano", M3) are already wired. The Hero however does not yet exist in the Angular app, so visitors cannot perform a search from the home page.

## What Changes

- Add a **dumb** `HomeHeroComponent` (presentational only) that renders the hero section of `docs/home/code.html`: background-image overlay using `/assets/panoramica-concon.jpg`, headline + subtitle, a search form with one text input, one category `<select>`, one location `<select>` and a "Buscar Ahora" submit button. All using M3 tokens from `tailwind.config.js` — no hardcoded hex/spacing.
- Add a **smart** `HomePageComponent` (container) that owns: (a) the hardcoded dummy lists of categories and barrios passed as `@Input()` to the hero, and (b) receives the form submit from the hero and navigates to `/directorio` with `q`, `categoriaId`, `barrioId` as query params.
- Enable Angular routing for the first time in the frontend: add `app.routes.ts` with the `/` route lazy-loading `HomePageComponent`, and wire `provideRouter(routes)` in `app.config.ts`.
- Replace the placeholder `<p>Contenido pendiente</p>` in `app.component.html` with `<router-outlet>` so the Header and Footer remain framing the routed content.
- Categories and barrios in the hero selects are **MVP dummy data** hardcoded in `HomePageComponent` — they are NOT fetched from Firestore/HTTP until the backend `categorias` and `barrios` modules are implemented (out of scope).

## Capabilities

### New Capabilities

- `frontend-home-hero`: Hero section of the home page, with background image overlay, headline/subtitle, and a search form (free-text + category select + location select + submit button) that emits a `SearchCriteria` to the smart container.

### Modified Capabilities

- `frontend-layout-base`: The AppComponent layout is modified to host routed content (`<router-outlet>`) instead of the hardcoded placeholder paragraph. The Header and Footer remain unchanged; only the `<main>` content area delegates to the router.

## Impact

- **Frontend code**:
  - New: `frontend/src/app/features/home/hero/home-hero.component.{ts,html,css,spec.ts}` (dumb).
  - New: `frontend/src/app/features/home/home-page.component.{ts,html,css,spec.ts}` (smart).
  - New: `frontend/src/app/app.routes.ts`.
  - Modified: `frontend/src/app/app.component.html` (placeholder `<p>` → `<router-outlet>`), `app.component.ts` (imports), `app.component.spec.ts` (assert `<router-outlet>` instead of placeholder text), `app.config.ts` (add `provideRouter`).
- **Backend code**: None. No API changes. `categorias` and `barrios` modules stay out of scope (post this change).
- **Design system**: No changes to `tailwind.config.js` or `docs/DESIGN.md` — they already expose every M3 token needed (`primary`, `primary-container`, `secondary-container`, `surface-container-lowest`, `on-surface`, `on-surface-variant`, `outline-variant`, `font-headline`, custom radii, shadows).
- **Dependencies**: None added. Angular Router ships with `@angular/router` (already part of Angular 20 standalone).
- **Public API**: No `/api` impact. The `/directorio` route used by the submit navigation is created in a future change — pressing "Buscar Ahora" lands on a not-yet-implemented route (explicitly a Non-Goal of this change).
- **Risk**: First router enablement in this Angular app. Must verify `provideRouter` + lazy `loadComponent` works with the existing Firebase providers in `app.config.ts`.
