## MODIFIED Requirements

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
