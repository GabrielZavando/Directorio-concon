# spec — Design system "Dunas y Océano"

## Requirement: The project shall have a single canonical DESIGN.md as the source of truth for visual design tokens

### Scenario: docs/DESIGN.md is the canonical design system file

- **WHEN** a reader looks for the design system
- **THEN** `docs/DESIGN.md` exists at the canonical location (sibling to `docs/api-spec.yml`, `docs/data-model.md`, `docs/base-standards.md`) and contains the YAML front-matter with `colors`, `typography`, `rounded`, and `spacing` tokens plus the semantic description "Dunas y Océano" (Ocean Blue primary `#004370`, Sand Beige secondary `#fadeba`, Pine Green tertiary `#1d4a19`, Sunset Orange accent; Montserrat headlines; Inter body; radii scale; 4-level ambient shadows; 8px spacing rhythm; fluid grid 1280/1024/768/<767 with 24px/24px/16px gutters).

### Scenario: Per-screen reference assets are kept but design system is not duplicated

- **WHEN** a reader looks into `docs/{home,login,mapa,perfil}/`
- **THEN** each folder contains `code.html` (Tailwind v3 export from Stitch with inline `tailwind.config` matching the tokens) and `screen.jpg` (compressed JPEG screenshot), and **no** `DESIGN.md` (the design system is consolidated at `docs/DESIGN.md`).

## Requirement: docs/DESIGN.md shall be referenced and enforced from docs/frontend-standards.md

### Scenario: frontend-standards.md has a "Sistema de diseño — Dunas y Océano" section

- **WHEN** a frontend developer loads `docs/frontend-standards.md`
- **THEN** there is a "Sistema de diseño — Dunas y Océano" sub-section that links to `docs/DESIGN.md` as the canonical token source, declares a hard rule that no Angular component may hardcode hex/spacing (all values must come from `docs/DESIGN.md`), declares that `frontend/tailwind.config.js` extends `theme.extend.colors|fontFamily|borderRadius|boxShadow` with tokens from `docs/DESIGN.md`, and declares that Angular Material's custom theme (future, only for the panel admin) must map `$palette-primary` from `docs/DESIGN.md`'s Ocean Blue.

## Requirement: docs/DESIGN.md shall be declared canónica across the Specboot ecosystem of the project

### Scenario: docs/DESIGN.md appears in specboot.sh REQUIRED_FILES

- **WHEN** `bash specboot.sh --ci` runs
- **THEN** `docs/DESIGN.md` is checked as a `REQUIRED_FILE` (failure if missing).

### Scenario: per-screen code.html and screen.jpg are tracked as optional EXAMPLE_FILES

- **WHEN** `bash specboot.sh --ci` runs and any of `docs/home/code.html`, `docs/login/code.html`, `docs/mapa/code.html`, `docs/perfil/code.html`, `docs/home/screen.jpg`, `docs/login/screen.jpg`, `docs/mapa/screen.jpg`, `docs/perfil/screen.jpg` is missing
- **THEN** a warning is emitted (not a failure).

### Scenario: docs/DESIGN.md appears in ai-specs/README.md Customization table

- **WHEN** a reader loads `ai-specs/README.md`
- **THEN** the `Customization` table contains a row for `docs/DESIGN.md` titled "Sistema de diseño Dunas y Océano (originado Stitch)".

### Scenario: docs/base-standards.md Section 8 references the design system

- **WHEN** a reader loads `docs/base-standards.md` Section 8
- **THEN** the design system "Dunas y Océano" is named and `docs/DESIGN.md` is cited as the canonical source.
