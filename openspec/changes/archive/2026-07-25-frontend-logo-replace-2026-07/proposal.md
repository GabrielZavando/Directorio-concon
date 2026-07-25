## Why

The brand identity of "Directorio Concón" is currently rendered as plain text in the header navbar and footer brand column. The project has a logo image (`logo-transparente.webp`) that should be used instead to establish consistent visual branding across all public-facing screens. This is a foundational UI improvement that strengthens brand recognition before additional screens are built.

## What Changes

- Create `frontend/public/assets/` directory and move `logo-transparente.webp` into it (served from `/assets/` via Angular 20's native `public/` asset pipeline).
- Replace the text "Directorio Concón" in `header.component.html` with an `<img>` element pointing to the logo, using `alt="Directorio Concón"` for accessibility and `h-10 w-auto` for responsive sizing.
- Replace the text "Directorio Concón" in `footer.component.html` brand column with the same `<img>` element.
- Update `header.component.spec.ts` to verify the logo `<img>` is rendered instead of checking for text content.
- Add a new test in `footer.component.spec.ts` to verify the logo `<img>` is rendered in the footer brand column.
- The copyright text "© {year} Directorio Concón. Todos los derechos reservados." in the footer remains unchanged (legal/legibility).

## Capabilities

### New Capabilities

- `frontend-logo-assets`: Static asset management for frontend images — covers the creation of `public/assets/`, placement of `logo-transparente.webp`, and Angular's asset pipeline serving behavior.

### Modified Capabilities

- `frontend-layout-base`: The Header requirement "Header renders brand text" changes to "Header renders brand logo image". The scenario verifying `textContent` to contain "Directorio Con Con" changes to verifying an `<img>` element with `alt="Directorio Concón"` and `src="/assets/logo-transparente.webp"`. The Footer requirement "Footer renders 4 column titles and copyright" is unchanged, but a new scenario for "Footer renders brand logo image" is added.

## Impact

- **Frontend components**: `header.component.html`, `footer.component.html`
- **Frontend tests**: `header.component.spec.ts`, `footer.component.spec.ts`
- **Static assets**: New directory `frontend/public/assets/` with `logo-transparente.webp`
- **No API changes**: This is a pure frontend visual change.
- **No data model changes**: No new entities or fields.
- **No breaking changes**: The logo replaces text visually but maintains the same `<a href="#">` link behavior and accessibility.
