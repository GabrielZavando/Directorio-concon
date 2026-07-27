# frontend-layout-base Specification (delta — frontend-spa-routes)

> Delta spec for the existing `frontend-layout-base` capability. The shared Header is still rendered once globally by `AppComponent`, still uses M3 design tokens, and still shows the same five nav links ("Inicio", "Directorio", "Eventos", "Contacto") plus the "Registrate" CTA. The change introduced by `frontend-spa-routes` is that the Header now navigates via the Angular router instead of `href="#"`, and the currently active route is highlighted with `routerLinkActive`. All pre-existing requirements ("Tailwind CSS design-system configuration", "Mobile menu", "Canonical site Footer", "App layout integration", and the existing "Canonical site Header" requirement with its scenarios) remain valid and are NOT modified. The single new requirement below is ADDED to the capability.

## ADDED Requirements

### Requirement: SPA navigation via routerLink on the shared Header

The shared `HeaderComponent` SHALL navigate between SPA routes using `routerLink` (not `href="#"`) for every `navLinks` entry and the `Registrate` CTA, and SHALL apply `routerLinkActive` on the active link so the visitor can see which page they are on. The brand logo anchor SHALL use `routerLink="/"`. Because `HeaderComponent` is rendered exactly once by `AppComponent` and the `<main>` hosts a `<router-outlet>`, navigating between routes SHALL NOT remount the Header or the Footer. The `RouterLink` and `RouterLinkActive` directives SHALL be imported into `HeaderComponent` from `@angular/router`.

#### Scenario: every nav link uses routerLink, not href="#"

- **WHEN** the `HeaderComponent` renders in a router-aware TestBed
- **THEN** every element in the desktop nav links block has an attribute `routerLink` (Angular renders it as `ng-reflect-router-link`, or as the resolved `href` matching the route path)
- **AND** NO element in the desktop nav links block has `href="#"`
- **AND** the "Registrate" CTA element has an attribute `routerLink`
- **AND** the brand logo anchor has `routerLink="/"` (resolved `href` is `/` or empty, NOT `#`)

#### Scenario: nav links point to the canonical SPA routes

- **WHEN** the `HeaderComponent` renders
- **THEN** the "Inicio" link points to `/`
- **AND** the "Directorio" link points to `/directorio`
- **AND** the "Eventos" link points to `/eventos`
- **AND** the "Contacto" link points to `/contacto`
- **AND** the "Registrate" CTA points to `/registrate`

#### Scenario: active link is highlighted with routerLinkActive

- **WHEN** the router's active URL is `/directorio`
- **THEN** the "Directorio" nav link element has the `routerLinkActive`-applied active class (Angular sets the class declared in `routerLinkActive="..."` on the matching link)
- **AND** the other nav links do NOT carry that active class
- **AND** the same active-style behavior applies for every other route (`/`, `/eventos`, `/contacto`, `/registrate`)

#### Scenario: mobile panel links also navigate via routerLink

- **WHEN** the viewport is `<768px` and the mobile menu panel is open
- **THEN** every anchor inside the mobile panel has an attribute `routerLink`
- **AND** clicking a panel link closes the menu (`closeMenu()` is still called) and performs an SPA transition (no full page reload)

#### Scenario: Header imports RouterLink and RouterLinkActive

- **WHEN** `header.component.ts` is read
- **THEN** its `imports` array contains `RouterLink`
- **AND** its `imports` array contains `RouterLinkActive`
- **AND** both are imported from `@angular/router`

#### Scenario: navigations do not remount Header or Footer

- **WHEN** the router navigates from `/` to `/directorio` (or any other supported route) inside a router test harness with `AppComponent` as the host
- **THEN** the `<app-header>` element present before navigation is the SAME element after navigation (Angular does not destroy/recreate it)
- **AND** the `<app-footer>` element present before navigation is the SAME element after navigation
- **AND** only the content inside `<main><router-outlet /></main>` changes
