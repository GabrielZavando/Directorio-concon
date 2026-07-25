## Context

The Angular 20 frontend currently renders "Directorio Concón" as plain text in two locations:
1. **Header navbar** (`header.component.html` line 4-6): `<a>` link with brand text styled with `text-primary font-headline font-bold text-2xl`.
2. **Footer brand column** (`footer.component.html` line 5-7): `<div>` with brand text styled with `text-on-surface font-headline font-bold text-xl`.

The project has a logo file `logo-transparente.webp` placed in `frontend/` (project root). Angular 20's `@angular/build` builder serves static assets from `public/` directory (configured in `angular.json` lines 21-26: `glob: "**/*", input: "public"`). No `assets` directory exists yet.

The copyright text "© {year} Directorio Concón. Todos los derechos reservados." in `footer.component.html` line 53 must remain as text (legal requirement, legibility).

## Goals / Non-Goals

**Goals:**
- Replace text brand name with logo image in header and footer for consistent visual branding.
- Create a well-organized `public/assets/` directory for frontend static images.
- Maintain WCAG accessibility (descriptive `alt` text, proper `<a>` labeling).
- Preserve existing M3 token styling and responsive behavior.

**Non-Goals:**
- Changing the footer copyright text (legal/legibility).
- Modifying `app.component.ts` title property (used for SEO/document title).
- Adding image optimization pipeline (WebP already optimized).
- Changing Angular's asset pipeline configuration (already works with `public/`).

## Decisions

### Decision 1: Asset location — `frontend/public/assets/` (not `src/assets/`)

**Choice:** Place images in `frontend/public/assets/`.

**Rationale:** Angular 20 with `@angular/build` natively serves everything in `public/` at the site root. The `angular.json` already has `glob: "**/*", input: "public"` configured. No configuration changes needed. This is the modern Angular convention (v17+).

**Alternatives considered:**
- `src/assets/`: Requires adding an explicit `assets` entry in `angular.json` (both build and test configs). More verbose, no benefit over `public/`.
- `frontend/assets/` (project root): Non-standard, requires custom `angular.json` config.

### Decision 2: Image attributes — `alt` descriptive + `height="40"` + Tailwind `h-10 w-auto`

**Choice:** `<img src="/assets/logo-transparente.webp" alt="Directorio Concón" height="40" class="h-10 w-auto" />`.

**Rationale:**
- `alt="Directorio Concón"`: WCAG-compliant, descriptive for screen readers.
- `height="40"`: HTML attribute preserves aspect ratio during load (prevents layout shift). 40px matches the previous `text-2xl` visual height.
- `h-10 w-auto`: Tailwind utility for consistent 40px height with auto width (maintains aspect ratio). Overrides any default image sizing.
- The `<a>` wrapper gets `aria-label="Directorio Concón - Inicio"` because the link no longer has visible text content.

**Alternatives considered:**
- `alt=""` (decorative): Less accessible. The logo IS the brand identifier, not decoration.
- Fixed `width="160" height="40"`: Less responsive, can't adapt to different screen sizes.

### Decision 3: Footer brand — same img, no background wrapper

**Choice:** Replace `<div>` text with `<img>` directly, no additional background or wrapper.

**Rationale:** The logo is transparent (`logo-transparente.webp`) and should render cleanly on the footer's `bg-surface-container-lowest` (white) background. If contrast issues appear during visual testing, a wrapper with `bg-primary` can be added post-MVP.

## Risks / Trade-offs

- **[Risk] Logo contrast on light footer background** → The logo file name suggests transparency. If the logo has light-colored elements that become invisible on white background, add a subtle `bg-primary/5` wrapper or `drop-shadow` during visual QA. Mitigation: visual inspection during Step 6 verification.
- **[Risk] Layout shift on image load** → The `height="40"` HTML attribute mitigates CLS (Cumulative Layout Shift). The `w-auto` ensures width adjusts proportionally. Mitigation: if CLS is measured as an issue, add explicit `width` after measuring actual logo dimensions.
- **[Trade-off] Footer copyright unchanged** → The copyright text still shows "Directorio Concón" as text. This is intentional (legal/legibility) but means the brand appears in two forms (image in brand column, text in copyright). Acceptable for MVP.
