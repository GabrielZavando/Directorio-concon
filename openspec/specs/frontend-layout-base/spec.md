# frontend-layout-base Specification

## Purpose
The Angular frontend SHALL have a configured Tailwind CSS pipeline consuming the canonical "Dunas y Océano" design tokens from `docs/DESIGN.md`, and SHALL render shared Header and Footer dumb components that form the visual foundation for all public-facing screens.
## Requirements
### Requirement: Tailwind CSS design-system configuration

The frontend build pipeline SHALL consume Tailwind CSS v3 with all design tokens from `docs/DESIGN.md` wired into the Tailwind config, enabling every component to use M3 token utility classes.

#### Scenario: tailwind.config.js exposes all canonical color tokens

- **WHEN** `frontend/tailwind.config.js` is imported
- **THEN** it contains `theme.extend.colors.primary` equal to `'#004370'`
- **AND** it contains `theme.extend.colors.secondary-container` equal to `'#fadeba'`
- **AND** it contains `theme.extend.colors.surface-container-lowest` equal to `'#ffffff'`
- **AND** it contains `theme.extend.colors.outline-variant` equal to `'#c1c7d1'`
- **AND** it contains `theme.extend.colors.on-surface` equal to `'#191c1e'`
- **AND** it contains `theme.extend.colors.on-surface-variant` equal to `'#414750'`
- **AND** it contains `theme.extend.colors.background` equal to `'#f7f9fb'`

#### Scenario: Global stylesheet applies Tailwind layers and Google Fonts

- **WHEN** the Angular app builds with `frontend/src/styles.css`
- **THEN** `styles.css` contains `@tailwind base`, `@tailwind components`, and `@tailwind utilities`
- **AND** `styles.css` imports Montserrat and Inter via Google Fonts CDN

### Requirement: Canonical site Header

The frontend SHALL render a sticky header component using M3 design tokens, displaying the brand logo image, navigation links, and a styled CTA button.

#### Scenario: Header renders brand logo and all 5 nav links

- **WHEN** the `HeaderComponent` renders in the DOM
- **THEN** an `<img>` element with `alt="Directorio Concón"` is visible
- **AND** the `<img>` element has `src` containing `/assets/logo-transparente.webp`
- **AND** the text "Inicio" is visible as a nav link
- **AND** the text "Directorio" is visible as a nav link
- **AND** the text "Eventos" is visible as a nav link
- **AND** the text "Contacto" is visible as a nav link
- **AND** the text "Registrate" is visible as a CTA button

#### Scenario: Header uses M3 surface-container-lowest and outline-variant tokens

- **WHEN** the `HeaderComponent` renders in the DOM
- **THEN** the root `<header>` element has a CSS class matching `bg-surface-container-lowest`
- **AND** the root `<header>` element has a CSS class matching `border-outline-variant`
- **AND** the root `<header>` element has a CSS class matching `sticky`

#### Scenario: Desktop nav links are right-aligned

- **WHEN** the viewport is ≥768px wide (md breakpoint)
- **THEN** the logo is on the left side
- **AND** the nav links + CTA button are on the right side
- **AND** the layout uses `flex justify-between items-center`

#### Scenario: CTA button has primary styling

- **WHEN** the viewport is ≥768px wide
- **THEN** the "Registrate" CTA element has classes `bg-primary text-white px-6 py-2.5 rounded-custom font-semibold transition-colors`
- **AND** the CTA has hover state `hover:bg-primary-container`
- **AND** the CTA is visually distinct from the plain text nav links

#### Scenario: Desktop nav links are plain text

- **WHEN** the viewport is ≥768px wide
- **THEN** each nav link (Inicio, Directorio, Eventos, Contacto) has classes `text-on-surface-variant hover:text-primary px-3 py-2 text-sm font-medium transition`
- **AND** no nav link has a background color or button styling

#### Scenario: Hamburger button is hidden on desktop

- **WHEN** the viewport is ≥768px wide
- **THEN** the hamburger toggle button is not visible (hidden via `md:hidden`)

### Requirement: Mobile menu

The header SHALL provide a responsive mobile menu that slides in from the right on viewports below the md breakpoint (768px), with animated hamburger icon crossfade, keyboard dismissal, and accessible ARIA attributes.

#### Scenario: Mobile menu is hidden by default

- **WHEN** the viewport is <768px wide
- **THEN** the nav links block is hidden (not rendered inline)
- **AND** a hamburger toggle button is visible
- **AND** the hamburger button has `aria-expanded="false"`
- **AND** the hamburger button has an accessible `aria-label` (e.g., "Toggle menu")

#### Scenario: Hamburger button shows Menu icon when menu is closed

- **WHEN** the viewport is <768px wide and the mobile menu is closed
- **THEN** the lucide `Menu` icon is displayed in the hamburger button
- **AND** the `X` icon is not visible

#### Scenario: Toggle opens the mobile menu

- **WHEN** the viewport is <768px wide and the user clicks the hamburger button
- **THEN** `aria-expanded` changes to `"true"`
- **AND** the menu panel becomes visible
- **AND** the panel slides in from the right side
- **AND** the panel has width 85% of the viewport
- **AND** the panel has height `calc(100vh - 4rem)` (below the header)
- **AND** the panel is positioned `fixed top:4rem right-0`
- **AND** the panel has `z-index` above the header

#### Scenario: Panel slide-in animation

- **WHEN** the user clicks the hamburger button to open
- **THEN** the panel animates from `translateX(100%)` to `translateX(0)`
- **AND** the animation duration is 300ms
- **AND** the animation easing is `ease-out`

#### Scenario: Hamburger icon crossfades to X

- **WHEN** the user clicks the hamburger button to open
- **THEN** the `Menu` icon fades out and the `X` icon fades in
- **AND** the crossfade duration is 300ms (same as panel animation)

#### Scenario: Toggle closes the mobile menu

- **WHEN** the viewport is <768px wide and the menu is open and the user clicks the hamburger button (showing X icon)
- **THEN** `aria-expanded` changes to `"false"`
- **AND** the panel animates from `translateX(0)` to `translateX(100%)`
- **AND** the animation duration is 300ms
- **AND** the `X` icon crossfades back to the `Menu` icon

#### Scenario: Close menu by pressing Escape

- **WHEN** the mobile menu is open and the user presses the Escape key
- **THEN** the menu closes (same animation as toggle close)

#### Scenario: Close menu by clicking a link

- **WHEN** the mobile menu is open and the user clicks any navigation link inside the panel
- **THEN** the menu closes (same animation as toggle close)

#### Scenario: Mobile menu accessibility attributes

- **WHEN** the mobile menu is open
- **THEN** the panel has `role="dialog"`
- **AND** the panel has `aria-modal="true"`
- **AND** the hamburger button has `aria-controls` pointing to the panel ID

### Requirement: Canonical site Footer

The footer SHALL render a brand logo image, four link columns, social icons via lucide-angular, and a dynamic copyright year, all using M3 design tokens.

#### Scenario: Footer renders brand logo and 4 column titles

- **WHEN** the `FooterComponent` renders in the DOM
- **THEN** an `<img>` element with `alt="Directorio Concón"` is present
- **AND** the `<img>` element has `src` containing `/assets/logo-transparente.webp`
- **AND** the text "Nosotros" is visible as a column title
- **AND** the text "Directorio" is visible as a column title
- **AND** the text "Soporte" is visible as a column title
- **AND** the text "Síguenos" is visible as a column title
- **AND** the text "Todos los derechos reservados" is visible in the copyright bar

#### Scenario: Footer renders the current year dynamically

- **WHEN** the `FooterComponent` renders on any date
- **THEN** the copyright bar contains the 4-digit year matching `new Date().getFullYear()`

#### Scenario: Footer uses M3 tokens and @lucide/angular social icons

- **WHEN** the `FooterComponent` renders in the DOM
- **THEN** the root `<footer>` element has a CSS class matching `bg-surface-container-lowest`
- **AND** the root `<footer>` element has a CSS class matching `border-outline-variant`
- **AND** at least 2 `@lucide/angular` icon elements are present (Facebook, Twitter)

### Requirement: App layout integration

The AppComponent SHALL compose Header, a routed `<main>` content area hosting `<router-outlet>`, and Footer into a vertical page layout, using M3 design tokens. The previously hardcoded placeholder paragraph inside `<main>` SHALL be removed in favor of routing.

#### Scenario: AppComponent renders both header and footer

- **WHEN** the `AppComponent` renders in the DOM
- **THEN** an `<app-header>` element is present
- **AND** an `<app-footer>` element is present
- **AND** a `<main>` element is present between header and footer

#### Scenario: AppComponent main hosts a router-outlet

- **WHEN** the `AppComponent` template is rendered in a router test harness
- **THEN** the `<main>` element contains a `<router-outlet>`
- **AND** the previously present placeholder paragraph with text "Contenido pendiente" is NO LONGER in the DOM
- **AND** a routed child component (the home page) renders inside the `<router-outlet>` for the default route

#### Scenario: AppComponent main uses M3 background token

- **WHEN** the `AppComponent` template source is read
- **THEN** the `<main>` element has a Tailwind class `bg-background` (M3 token defined in `tailwind.config.js`)
- **AND** it has a Tailwind class `min-h-screen` for minimum height

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

