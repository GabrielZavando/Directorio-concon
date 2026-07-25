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

The frontend SHALL render a sticky header component using M3 design tokens, displaying the brand logo image and the five navigation links as defined by the user.

#### Scenario: Header renders brand logo and all 5 nav links

- **WHEN** the `HeaderComponent` renders in the DOM
- **THEN** an `<img>` element with `alt="Directorio Concón"` is visible
- **AND** the `<img>` element has `src` containing `/assets/logo-transparente.webp`
- **AND** the text "Inicio" is visible as a nav link
- **AND** the text "Directorio" is visible as a nav link
- **AND** the text "Eventos" is visible as a nav link
- **AND** the text "Contacto" is visible as a nav link
- **AND** the text "Registrate" is visible as a nav link

#### Scenario: Header uses M3 surface-container-lowest and outline-variant tokens

- **WHEN** the `HeaderComponent` renders in the DOM
- **THEN** the root `<header>` element has a CSS class matching `bg-surface-container-lowest`
- **AND** the root `<header>` element has a CSS class matching `border-outline-variant`
- **AND** the root `<header>` element has a CSS class matching `sticky`

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

