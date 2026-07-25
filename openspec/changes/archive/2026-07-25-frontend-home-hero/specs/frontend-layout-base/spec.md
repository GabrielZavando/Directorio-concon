# frontend-layout-base Specification (delta — frontend-home-hero)

## MODIFIED Requirements

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
