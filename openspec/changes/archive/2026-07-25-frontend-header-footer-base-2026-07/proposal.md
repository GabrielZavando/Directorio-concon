# Proposal — frontend-header-footer-base-2026-07

## Why

The Angular frontend has the default CLI scaffold (`app.component.html` is the "Hello, frontend" placeholder) but zero UI infrastructure. Three blockers prevent any visual work from starting:

1. **No design system in the build pipeline**: `docs/DESIGN.md` declares the "Dunas y Océano" token system (Ocean Blue `#004370`, Sand Beige `#fadeba`, Montserrat/Inter typography, 4-level ambient shadows), yet `frontend/tailwind.config.js` and `frontend/postcss.config.js` do not exist. `docs/frontend-standards.md` mandates that every Angular component consumes these tokens — but the config to wire them into Tailwind is missing.

2. **No shared layout components**: Header and Footer are the first visual pieces any visitor encounters. Without them, every screen stands alone. The four reference designs (`docs/home/`, `docs/login/`, `docs/mapa/`, `docs/perfil/code.html`) each define their own header/footer variations, but none has been translated into Angular components. The profile variant (`docs/perfil/code.html`) uses the canonical M3 tokens and is the most complete reference for a "base" layout.

3. **Missing UI dependencies**: `lucide-angular` (iconography) is required by `docs/frontend-standards.md` for consistency with `categorias.icono` in `docs/data-model.md`, but is not installed. `ngx-skeleton-loader` is also missing but is not needed yet (no loading states in header/footer).

The result: the frontend cannot render a single pixel of branded UI. This change fixes all three blockers in one focused scope.

## What Changes

### A. Tailwind CSS v3 + design system wiring

- Install `tailwindcss@^3`, `postcss`, `autoprefixer` as devDependencies in `frontend/`.
- Create `frontend/postcss.config.js` with `tailwindcss` and `autoprefixer` plugins.
- Create `frontend/tailwind.config.js` extending `theme.extend` with tokens from `docs/DESIGN.md`:
  - `colors`: `primary`, `primary-container`, `on-primary`, `secondary`, `on-secondary-container`, `tertiary`, `surface-container-lowest`, `outline-variant`, `on-surface`, `on-surface-variant`, `background`, `on-background`.
  - `fontFamily`: `headline` (Montserrat), `sans` (Inter).
  - `borderRadius`: `sm`, `DEFAULT`, `md`, `lg`, `xl`, `full`.
  - `boxShadow`: levels 1–3 with the tinted `rgba(0, 91, 150, 0.08)` ambient shadow.
  - `content`: `["./src/**/*.{html,ts}"]`.
- Add `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@600;700&display=swap');` and `@tailwind base; @tailwind components; @tailwind utilities;` to `frontend/src/styles.css`.
- Verify: `npm --prefix frontend run build` succeeds.

### B. Header (dumb component)

- Create `frontend/src/app/layout/header/` with `header.component.ts`, `header.component.html`, `header.component.css`, `header.component.spec.ts`.
- `header.component.ts`: standalone, `ChangeDetectionStrategy.OnPush`, declares internal typed constant `navLinks: NavLink[]` with the 5 items: Inicio, Directorio, Eventos, Contacto, Registrate. No `@Input`, no `inject()`.
- `header.component.html`: `header.sticky.top-0.z-50.bg-surface-container-lowest.border-b.border-outline-variant`. Inner `<nav class="max-w-7xl mx-auto px-4 md:px-10 py-4 flex items-center justify-between">`:
  - Left: circular badge "D" (`bg-secondary text-primary rounded-full w-10 h-10 flex items-center justify-center font-headline font-bold`) + text "Directorio Con Con" (`font-headline font-bold text-xl text-primary`).
  - Right (desktop, `hidden md:flex`): 5 nav links from `navLinks`, each `text-on-surface/70 hover:text-primary font-medium transition-colors`.
- `header.component.spec.ts`: tests that "Directorio Con Con" renders and all 5 link texts are present in the DOM.

### C. Footer (dumb component)

- Create `frontend/src/app/layout/footer/` with `footer.component.ts`, `footer.component.html`, `footer.component.css`, `footer.component.spec.ts`.
- `footer.component.ts`: standalone, `OnPush`, declares internal typed constants `footerColumns: FooterColumn[]` (4 columns: Nosotros, Directorio, Soporte, Síguenos) and `year = new Date().getFullYear()`. Uses `lucide-angular` icons for social links.
- `footer.component.html`: `footer.bg-surface-container-lowest.border-t.border-outline-variant`. Grid `max-w-7xl mx-auto px-4 md:px-10 grid grid-cols-1 md:grid-cols-4 gap-8 pt-12 pb-8`:
  - Column 1: "D" badge + brand text + short description + 2 social icons (lucide `Facebook`, `Twitter`).
  - Columns 2–4: section title + `@for` list of links.
  - Copyright bar: `© {{ year }} Directorio Con Con. Todos los derechos reservados.` — `border-t border-outline-variant pt-6 text-center text-sm text-on-surface-variant`.
- `footer.component.spec.ts`: tests presence of "Todos los derechos reservados", the 4 column titles, and 2 social icons.

### D. Wire into AppComponent

- Replace `app.component.html` placeholder with: `<app-header /><main class="min-h-screen bg-background">Contenido pendiente</main><app-footer />`.
- Import `HeaderComponent` and `FooterComponent` in `app.component.ts` `imports` array.
- Update `app.component.spec.ts` to validate the layout renders both header and footer.

### E. Install lucide-angular

- Install `lucide-angular` in `frontend/`.
- Import `LucideIconModule` in `FooterComponent` (only footer uses icons for social links).

## Impact

- **Non-breaking**: no backend changes; no Firebase changes; no routing changes.
- **Build**: Tailwind postcss processing adds ~1-2s to `ng build`.
- **Bundle size**: lucide-angular is tree-shakable; only 2 icons imported (Facebook, Twitter) → negligible.
- **Future unblocks**: this change enables all subsequent UI work (home, login, mapa, perfil screens) to use the canonical tokens and shared layout.
- **ISP compliance**: header has 0 `@Input`s (navLinks is internal constant); footer has 0 `@Input`s (footerColumns + year are internal). Both under 5 inputs.

## Non-goals

- **Routing**: `href="#"` placeholders only. `provideRouter` + `routerLink` in a separate `frontend-routing` change.
- **Mobile hamburger toggle**: CSS-only responsive hiding (`hidden md:flex`). No JS menu toggle — that's a separate UX task.
- **Auth-reactive header**: no "Ingresar" vs avatar state. Comes with `auth` module.
- **Logo image**: placeholder "D" badge. Actual logo design is a separate branding task.
- **Home/login/mapa/perfil screens**: only header + footer here. Full screens are separate changes.
- **Angular Material**: reserved for admin panel only.
- **ngx-skeleton-loader**: not needed until loading states appear.
- **`docs/data-model.md` / `docs/api-spec.yml`**: not modified (no domain changes).
- **Backend**: entirely untouched.
