# Spec: Desktop Header (≥md breakpoint)

## Scenario: Desktop nav links are right-aligned

**Given** the viewport is ≥768px wide (md breakpoint)
**When** the header renders
**Then** the logo is on the left side
**And** the nav links + CTA button are on the right side
**And** the layout uses `flex justify-between items-center`

## Scenario: CTA button has primary styling

**Given** the viewport is ≥768px wide
**When** the header renders the "Registrate" CTA
**Then** the CTA element has classes `bg-primary text-white px-6 py-2.5 rounded-custom font-semibold transition-colors`
**And** the CTA has hover state `hover:bg-primary-container`
**And** the CTA is visually distinct from the plain text nav links

## Scenario: CTA label is "Registrate"

**Given** the header renders
**When** the CTA button is displayed
**Then** the visible text is "Registrate"

## Scenario: Desktop nav links are plain text

**Given** the viewport is ≥768px wide
**When** the header renders nav links (Inicio, Directorio, Eventos, Contacto)
**Then** each link has classes `text-on-surface-variant hover:text-primary px-3 py-2 text-sm font-medium transition`
**And** no link has a background color or button styling

## Scenario: Hamburger button is hidden on desktop

**Given** the viewport is ≥768px wide
**When** the header renders
**Then** the hamburger toggle button is not visible (hidden via `md:hidden`)
