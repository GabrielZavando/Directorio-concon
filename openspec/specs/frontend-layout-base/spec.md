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

The frontend SHALL render a sticky header component using M3 design tokens, displaying the brand name and the five navigation links as defined by the user.

#### Scenario: Header renders brand text and all 5 nav links

- **WHEN** the `HeaderComponent` renders in the DOM
- **THEN** the text "Directorio Con Con" is visible (or the confirmed spelling)
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

The footer SHALL render four link columns, social icons via lucide-angular, and a dynamic copyright year, all using M3 design tokens.

#### Scenario: Footer renders 4 column titles and copyright

- **WHEN** the `FooterComponent` renders in the DOM
- **THEN** the text "Nosotros" is visible as a column title
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

The AppComponent SHALL compose Header, main content, and Footer into a vertical page layout.

#### Scenario: AppComponent renders both header and footer

- **WHEN** the `AppComponent` renders in the DOM
- **THEN** an `<app-header>` element is present
- **AND** an `<app-footer>` element is present
- **AND** a `<main>` element is present between header and footer
