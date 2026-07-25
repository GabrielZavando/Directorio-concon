# frontend-logo-assets Specification

## Purpose
The Angular frontend SHALL serve static image assets from a `public/assets/` directory, with the brand logo (`logo-transparente.webp`) accessible at `/assets/logo-transparente.webp` via Angular's `@angular/build` asset pipeline.

## Requirements

### Requirement: Frontend static asset directory for images

The frontend SHALL have a `public/assets/` directory containing static image files that are served from the site root via Angular's `@angular/build` asset pipeline.

#### Scenario: Logo image is accessible via URL

- **WHEN** the Angular app builds and serves
- **THEN** a `GET /assets/logo-transparente.webp` request returns the logo image file
- **AND** the response has a valid image content type

#### Scenario: Asset directory exists in project structure

- **WHEN** the frontend project is inspected
- **THEN** the directory `frontend/public/assets/` exists
- **AND** it contains `logo-transparente.webp`

### Requirement: Header renders brand logo image

The HeaderComponent SHALL render an `<img>` element for the brand logo instead of text, with descriptive alt text for accessibility and responsive sizing via Tailwind CSS.

#### Scenario: Header renders brand logo with descriptive alt

- **WHEN** the `HeaderComponent` renders in the DOM
- **THEN** an `<img>` element with `alt="Directorio Concón"` is present
- **AND** the `<img>` element has `src` containing `/assets/logo-transparente.webp`
- **AND** the `<img>` element has a CSS class matching `h-10`
- **AND** the `<img>` element has a CSS class matching `w-auto`

#### Scenario: Header logo is wrapped in accessible link

- **WHEN** the `HeaderComponent` renders in the DOM
- **THEN** the brand `<a>` element has an `aria-label` attribute containing "Directorio Concón"
- **AND** the `<a>` element contains an `<img>` child element

### Requirement: Footer renders brand logo image

The FooterComponent SHALL render an `<img>` element for the brand logo in the brand column, matching the header logo's accessibility and sizing.

#### Scenario: Footer renders brand logo with descriptive alt

- **WHEN** the `FooterComponent` renders in the DOM
- **THEN** an `<img>` element with `alt="Directorio Concón"` is present
- **AND** the `<img>` element has `src` containing `/assets/logo-transparente.webp`
- **AND** the `<img>` element has a CSS class matching `h-10`
