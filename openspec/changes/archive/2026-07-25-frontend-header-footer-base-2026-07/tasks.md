# Tasks — frontend-header-footer-base-2026-07

> Una task a la vez. TDD donde aplica.
> Cambio frontend ONLY: no se toca backend.
> Tokens canónicos de `docs/DESIGN.md` (M3 "Dunas y Océano"). No hardcodear hex/spacing.
> Branding: "Directorio Con Con" (confirmar spelling exacto durante Task 2.1).

## Change Summary

Sienta la base visual del frontend Angular: instala TailwindCSS v3 + lucide-angular, configura el tailwind.config.js con tokens M3 de DESIGN.md, crea Header y Footer como dumb components presentacionales (sin routing, sin auth), y los integra en AppComponent. Reemplaza el placeholder de Angular CLI.

---

## Fase 1 — Setup UI stack

### Task 1.1 — Instalar dependencias UI en frontend
- [x] `npm --prefix frontend install tailwindcss@^3 postcss autoprefixer --save-dev --legacy-peer-deps`
- [x] `npm --prefix frontend install @lucide/angular --save --legacy-peer-deps` (paquete renombrado desde `lucide-angular` deprecado)
- [x] Verificar que `frontend/package.json` tiene las nuevas deps: `tailwindcss` + `postcss` + `autoprefixer` en devDependencies, `@lucide/angular` en dependencies.
- Priority: High
- Layer: Frontend (Setup)

### Task 1.2 — Crear postcss.config.js
- [x] Crear `frontend/postcss.config.js` con plugins `tailwindcss` y `autoprefixer`.
- Priority: High
- Layer: Frontend (Setup)

### Task 1.3 — Crear tailwind.config.js con tokens de DESIGN.md
- [x] Crear `frontend/tailwind.config.js` con `content: ["./src/**/*.{html,ts}"]`.
- [x] Extender `theme.extend.colors` con tokens M3: `primary`, `primary-container`, `on-primary`, `secondary`, `secondary-container`, `on-secondary-container`, `tertiary`, `tertiary-container`, `on-tertiary-container`, `surface-container-lowest`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-dim`, `on-surface`, `on-surface-variant`, `outline`, `outline-variant`, `error`, `background`.
- [x] Extender `theme.extend.fontFamily`: `headline: ['Montserrat', 'sans-serif']`, `sans: ['Inter', 'sans-serif']`.
- [x] Extender `theme.extend.borderRadius`: `sm: '0.25rem'`, `DEFAULT: '0.25rem'`, `lg: '0.5rem'`, `xl: '0.75rem'`, `full: '9999px'`, `custom: '0.5rem'`.
- [x] Extender `theme.extend.boxShadow`: `sm`, `DEFAULT`, `md`, `lg` con tint `rgba(0, 91, 150, 0.08)` (ambient shadow).
- Priority: High
- Layer: Frontend (Config)

### Task 1.4 — Configurar estilos globales con Tailwind + fuentes
- [x] Reemplazar contenido de `frontend/src/styles.css` con Google Fonts import + `@tailwind base/components/utilities`.
- [x] Verificar que `frontend/src/index.html` tiene `<html lang="es">` y título "Directorio Con Con".
- Priority: High
- Layer: Frontend (Styles)

### Task 1.5 — Validar build con Tailwind
- [x] `npm --prefix frontend run build` pasa — Tailwind procesa sin error, styles.css = 20.45 kB.
- Priority: High
- Layer: Frontend (Validation)

---

## Fase 2 — Header (TDD)

### Task 2.1 — Escribir test del Header que falla
- [x] Crear `frontend/src/app/layout/header/header.component.spec.ts`.
- [x] Test: "renders brand text" — valida que `fixture.nativeElement.textContent` contiene "Directorio Concón".
- [x] Test: "renders all 5 nav links" — valida que "Inicio", "Directorio", "Eventos", "Contacto", "Registrate" están en el DOM.
- [x] `ng test` falla — `Cannot find module './header.component'` (componente no existe aún).
- [x] **Confirmado spelling**: "Directorio Concón" (una palabra, con tilde).
- Priority: High
- Layer: Frontend (TDD)

### Task 2.2 — Crear componente Header (minimal para pasar tests)
- [x] Crear `frontend/src/app/layout/header/header.component.ts`:
  - Standalone, `ChangeDetectionStrategy.OnPush`.
  - Constante interna `navLinks: readonly NavLink[]` con los 5 items (label + href="#").
  - Interface `NavLink { readonly label: string; readonly href: string; }`.
  - 0 `@Input`, 0 `@Output`, 0 `inject()`.
- [x] Crear `frontend/src/app/layout/header/header.component.html` con markup Tailwind M3 tokens (bg-surface-container-lowest, border-outline-variant, text-primary, font-headline, text-on-surface-variant).
- [x] Crear `frontend/src/app/layout/header/header.component.css` (empty).
- Priority: High
- Layer: Frontend (TDD)

### Task 2.3 — Validar tests del Header
- [x] `ng test --include='**/header.component.spec.ts'` pasa en verde — 3/3 SUCCESS.
- [x] Verificar que los tokens M3 se usan correctamente: `bg-surface-container-lowest` ✅, `border-outline-variant` ✅, `text-primary` ✅, `text-on-surface-variant` ✅, `font-headline` ✅.
- Priority: High
- Layer: Frontend (Validation)

---

## Fase 3 — Footer (TDD)

### Task 3.1 — Escribir test del Footer que falla
- [x] Crear `frontend/src/app/layout/footer/footer.component.spec.ts`.
- [x] Test: "renders copyright" — valida que "Todos los derechos reservados" está en el DOM.
- [x] Test: "renders 4 column titles" — valida que "Nosotros", "Directorio", "Soporte", "Síguenos" están en el DOM.
- [x] Test: "renders current year" — valida que `new Date().getFullYear().toString()` está en el DOM.
- [x] `ng test` falla — `Cannot find module './footer.component'` (componente no existe aún).
- Priority: High
- Layer: Frontend (TDD)

### Task 3.2 — Crear componente Footer (minimal para pasar tests)
- [x] Crear `frontend/src/app/layout/footer/footer.component.ts`:
  - Standalone, `ChangeDetectionStrategy.OnPush`.
  - Constante interna `footerColumns: readonly FooterColumn[]` con 4 columnas.
  - Constante `year = new Date().getFullYear()`.
  - Interfaces: `FooterLink { readonly label: string; readonly href: string; }`, `FooterColumn { readonly title: string; readonly links: readonly FooterLink[]; }`.
  - 0 `@Input`, 0 `@Output`, 0 `inject()`.
- [x] Crear `frontend/src/app/layout/footer/footer.component.html` con markup Tailwind M3 tokens (ver design.md).
- [x] Crear `frontend/src/app/layout/footer/footer.component.css` (vacío).
- [x] Importar `LucideShare2`, `LucideGlobe` de `@lucide/angular` (componentes standalone, no modules).
- Priority: High
- Layer: Frontend (TDD)

### Task 3.3 — Validar tests del Footer
- [x] `ng test` pasa en verde — 11/11 SUCCESS (footer + header + other).
- [x] Verificar que los tokens M3 se usan correctamente: `bg-surface-container-lowest`, `border-outline-variant`, `text-on-surface`, `text-on-surface-variant`, `hover:text-primary`, `font-headline`.
- Priority: High
- Layer: Frontend (Validation)

---

## Fase 4 — Integración en AppComponent

### Task 4.1 — Limpiar placeholder y reemplazar por layout
- [x] Eliminar el contenido placeholder de `frontend/src/app/app.component.html` y reemplazar con:
  ```html
  <app-header />
  <main class="min-h-screen bg-background">
    <p class="p-8 text-on-surface-variant text-center">Contenido pendiente</p>
  </main>
  <app-footer />
  ```
- [x] Importar `HeaderComponent` y `FooterComponent` en `app.component.ts` `imports` array.
- [x] Limpiar `app.component.ts`: cambiar `title` a `'Directorio Concón'`, agregar `standalone: true` y `ChangeDetectionStrategy.OnPush`.
- [x] Limpiar `frontend/src/app/app.component.css` (ya estaba vacío).
- Priority: High
- Layer: Frontend (Integration)

### Task 4.2 — Actualizar test de AppComponent
- [x] Actualizar `frontend/src/app/app.component.spec.ts`:
  - Test: "renders header" — valida que `<app-header>` está en el DOM. ✅
  - Test: "renders footer" — valida que `<app-footer>` está en el DOM. ✅
  - Test: "renders main content area" — valida que `<main>` con clase `min-h-screen` existe. ✅
- Priority: High
- Layer: Frontend (TDD)

### Task 4.3 — Validar build y tests completos
- [x] `npm --prefix frontend run build` pasa — 416.16 kB initial total.
- [x] `ng test` todos pasan en verde — 13/13 SUCCESS.
- Priority: High
- Layer: Frontend (Validation)

---

## Fase 5 — Validación y cierre

### Task 5.1 — Solid lint
- [x] `npx madge --circular frontend/src --ts-config frontend/tsconfig.app.json` — sin circular deps.
- [x] Verificar que ningún archivo supera 400 líneas (máx: tailwind.config.js = 64 líneas).
- Priority: High
- Layer: Frontend (Lint)

### Task 5.2 — Verify
- [x] Verificación manual de escenarios de `specs/frontend-layout-base/spec.md` — todos cubiertos.
- [x] Deviations documentadas: (1) iconos Share2/Globe en vez de Facebook/Twitter (lucide removed brand icons), (2) brand spelling "Directorio Concón" (confirmado con tilde en Task 2.1).
- Priority: High
- Layer: Validation

### Task 5.3 — Commits
- [x] Commit 1: `chore(frontend): install tailwindcss, postcss, autoprefixer, @lucide/angular`
- [x] Commit 2: `feat(frontend): add header component with M3 tokens`
- [x] Commit 3: `feat(frontend): add footer component with M3 tokens and lucide icons`
- [x] Commit 4: `refactor(app): wire header and footer into AppComponent`
- Priority: High
- Layer: Git

---

## Guidelines

1. **One task at a time.** No batching.
2. **TDD**: Task 2.1 and 3.1 write the failing tests FIRST. No production code before the test exists.
3. **Marcar `[ ]` → `[x]`** inmediatamente al completar cada task.
4. **Tokens M3**: ningún componente puede tener valores hex o spacing hardcoded. Todo sale de `tailwind.config.js` → classes.
5. **Dumb components**: no `inject()`, no data services. Solo markup + constantes tipadas internas.
6. **Si el spelling del nombre es ambiguo** (Con Con vs Concón), pausar en Task 2.1 y preguntar antes de asumir.
7. **No tocar `backend/`**, ni `openspec/changes/archive/`, ni `openspec/specs/`.
8. Si algo es ambiguo al aplicar, **pausar y preguntar** antes de asumir.
