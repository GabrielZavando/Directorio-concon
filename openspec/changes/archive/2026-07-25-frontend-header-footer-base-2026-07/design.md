# Design — frontend-header-footer-base-2026-07

## Design tokens source

All tokens come from `docs/DESIGN.md` (canonical "Dunas y Océano" YAML front-matter). No hex values or spacing constants appear hardcoded in component markup — everything flows through `tailwind.config.js` → Tailwind utility classes.

The reference implementation to match is `docs/perfil/code.html` (profile screen), which uses the canonical M3 token names. `docs/home/code.html` uses generic Tailwind tokens (`text-gray-600`, `bg-primary`) and is intentionally NOT followed — it predates the canonical design system.

## Tailwind config — token mapping

`frontend/tailwind.config.js` extends `theme.extend` (never `theme` directly) with:

### colors (M3 token → hex from DESIGN.md)

```
primary:              '#004370'   // Ocean Blue — brand buttons, nav, headings
primary-container:    '#005b96'   // Darker blue — button hover states
on-primary:           '#ffffff'   // White text on primary
secondary:            '#6f5b3f'   // Sand Beige text variant
secondary-container:  '#fadeba'   // Sand Beige — chip backgrounds
on-secondary-container: '#756144' // Dark beige text
tertiary:             '#1d4a19'   // Pine Green — status indicators
tertiary-container:   '#35622e'   // Darker green
on-tertiary-container: '#a8dc9b'  // Light green text
surface:              '#f7f9fb'   // Page background alias
surface-container-lowest: '#ffffff' // Card & header background
surface-container-low: '#f2f4f6'    // Subtle card alt
surface-container:    '#eceef0'   // Input backgrounds
surface-container-high: '#e6e8ea'  // Hover on secondary elements
surface-dim:          '#d8dadc'   // Disabled / dimmed
on-surface:           '#191c1e'   // Primary text color
on-surface-variant:   '#414750'   // Secondary / muted text
outline:              '#717781'   // Borders — subtle dividers
outline-variant:      '#c1c7d1'   // Lighter borders — card edges
error:                '#ba1a1a'   // Error state
background:           '#f7f9fb'   // Page background
```

### fontFamily

```
headline: ['Montserrat', 'sans-serif']   // Titles, brand name
sans:     ['Inter', 'sans-serif']        // Body, nav, labels
```

### borderRadius (from DESIGN.md "Shapes")

```
sm:       '0.25rem'   // Badges, small elements
DEFAULT:  '0.25rem'   // Base radius (perfil code.html)
lg:       '0.5rem'    // Buttons, inputs
xl:       '0.75rem'   // Cards, containers
full:     '9999px'    // Pill shapes
custom:   '0.5rem'    // Alias for lg — matches perfil code.html
```

### boxShadow (ambient shadows with tint)

```
sm:    '0 1px 2px rgba(0, 0, 0, 0.05)'
DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'
md:    '0 4px 6px -1px rgba(0, 91, 150, 0.08), 0 2px 4px -2px rgba(0, 91, 150, 0.06)'
lg:    '0 10px 15px -3px rgba(0, 91, 150, 0.08), 0 4px 6px -4px rgba(0, 91, 150, 0.06)'
```

### content

```
["./src/**/*.{html,ts}"]
```

## Component architecture

### Folder structure

```
frontend/src/app/layout/
├── header/
│   ├── header.component.ts
│   ├── header.component.html
│   ├── header.component.css
│   └── header.component.spec.ts
└── footer/
    ├── footer.component.ts
    ├── footer.component.html
    ├── footer.component.css
    └── footer.component.spec.ts
```

`layout/` is the shared layout layer. Not a feature module — just a structural grouping for reusable dumb components that live outside any feature.

### Dumb component rules (ISP + SRP)

Both components follow the dumb/presentational contract from `docs/frontend-standards.md`:

- **No data service injection**: zero `inject()` calls. No `HttpClient`, no Firestore, no stores.
- **No `@Input` / `@Output`**: nav links and footer columns are internal typed constants. Inputs will be added in a future change when routing and auth are wired.
- **`ChangeDetectionStrategy.OnPush`**: no zone.js re-rendering — these components are static.
- **≤ 5 inputs**: confirmed — 0 `@Input`s on both.

### NavLink type (header)

```typescript
interface NavLink {
  readonly label: string;
  readonly href: string;
}
```

### FooterColumn type (footer)

```typescript
interface FooterLink {
  readonly label: string;
  readonly href: string;
}

interface FooterColumn {
  readonly title: string;
  readonly links: readonly FooterLink[];
}
```

## Header specification

**Source reference**: `docs/perfil/code.html` lines 115–133 (Navigation block).

### Visual structure

```
┌──────────────────────────────────────────────────────────────┐
│ [D badge] Directorio Con Con        Inicio Directorio ... Registrate │
└──────────────────────────────────────────────────────────────┘
```

### Token mapping (from perfil reference)

| Element | Tailwind classes |
|---|---|
| `<header>` | `bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-50` |
| `<nav>` | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center` |
| Brand "D" badge | `w-10 h-10 bg-secondary text-primary rounded-full flex items-center justify-center font-headline font-bold text-xl` |
| Brand text | `text-primary font-headline font-bold text-2xl tracking-tight` |
| Nav link | `text-on-surface-variant hover:text-primary px-3 py-2 text-sm font-medium transition` |
| Nav container | `hidden md:flex items-center space-x-4` |
| Mobile hamburger | `md:hidden` — hidden button placeholder, no JS handler |

### Desktop vs Mobile

- **Desktop (≥768px)**: all 5 links visible.
- **Mobile (<768px)**: nav links hidden via `hidden md:flex`. Logo + brand visible. No hamburger menu toggle implemented (out of scope — CSS only).

## Footer specification

**Source reference**: `docs/perfil/code.html` lines 385–429 (Footer block), adapted to 4-column layout.

### Visual structure

```
┌──────────────────────────────────────────────────────────────┐
│ [D badge] Directorio Con Con                                 │
│ Brief description text                       │
│ [FB icon] [TW icon]                        │
│                                    │
│ Nosotros        Directorio        Soporte        Síguenos  │
│ Sobre Nosotros  Explorar          Contacto        [FB] [TW] │
│ Contacto        Categorías        FAQ                      │
│ Equipo          Destacados        Privacidad               │
│ Valores         Listados          Términos                 │
│                                                    │
│ ───────────────────────────────────────────────── │
│ © 2026 Directorio Con Con. Todos los derechos reservados.  │
└──────────────────────────────────────────────────────────────┘
```

### Token mapping (from perfil reference)

| Element | Tailwind classes |
|---|---|
| `<footer>` | `bg-surface-container-lowest border-t border-outline-variant` |
| Grid container | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 pt-12 pb-8` |
| Column title | `text-on-surface font-headline font-bold text-lg mb-4` |
| Column link | `text-on-surface-variant hover:text-primary text-sm font-medium transition block py-1` |
| Brand text (col 1) | `text-on-surface font-headline font-bold text-xl` |
| Description (col 1) | `text-on-surface-variant text-sm leading-relaxed mb-4` |
| Social icons | `lucide-angular` `Facebook`, `Twitter` — `w-5 h-5 text-on-surface-variant hover:text-primary transition` |
| Copyright bar | `border-t border-outline-variant pt-6 text-center text-sm text-on-surface-variant` |

### Footer columns data

| Column | Title | Links |
|---|---|---|
| 1 (Brand) | — | "D" badge + brand text + description + social icons |
| 2 | Nosotros | Sobre Nosotros, Contacto, Equipo, Valores |
| 3 | Directorio | Explorar, Categorías, Destacados, Listados |
| 4 | Soporte | Contacto, FAQ, Privacidad, Términos |

### Copyright year

`new Date().getFullYear()` — computed as a getter or class field. No `@Input`.

## Icon strategy

`@lucide/angular` is the project's icon library (`docs/frontend-standards.md`). For this change, only the footer imports `LucideIconModule` with two icons: `Facebook`, `Twitter`. The header uses no icons (nav links only).

The `@lucide/angular` icons must be consistent with the `categorias.icono` values in `docs/data-model.md` (e.g., `UtensilsCrossed`, `Building`, `Store`, etc.) — but no category icons appear in header/footer, so no conflict.

> **Note**: the npm package was renamed from `lucide-angular` (deprecated) to `@lucide/angular`.

## Test strategy

### Unit tests (Jasmine + Karma)

| Component | Test | Validates |
|---|---|---|
| Header | renders brand text | `fixture.nativeElement.textContent` contains "Directorio Con Con" |
| Header | renders all 5 nav links | each of "Inicio", "Directorio", "Eventos", "Contacto", "Registrate" present |
| Footer | renders copyright | "Todos los derechos reservados" present |
| Footer | renders 4 column titles | "Nosotros", "Directorio", "Soporte", "Síguenos" present |
| Footer | renders current year | `getFullYear()` value present in DOM |
| App layout | renders header and footer | both `<app-header>` and `<app-footer>` rendered |

All tests use `TestBed.configureTestingModule({ imports: [ComponentUnderTest] })` (standalone components — no `declarations`).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Google Fonts CDN load in dev | Acceptable for MVP; self-hosted fonts are a post-MVP optimization |
| `tailwind.config.js` token drift from `docs/DESIGN.md` | `specboot.sh` can validate `primary` token in future change |
| Mobile nav links hidden with no hamburger | Out of scope; will be addressed when routing is added |
| "Directorio Con Con" vs "Directorio Concón" naming | Clarified during `/apply` first task; plan documents both variants |
