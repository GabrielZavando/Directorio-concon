# Design — frontend-home-hero

## Context

The Directorio de Concón frontend (Angular 20 standalone, Tailwind CSS v3, "Dunas y Océano" M3 design tokens) currently renders only the shared `HeaderComponent` + `FooterComponent` plus a hardcoded placeholder paragraph (`Contenido pendiente`) inside `<main>`. The visual reference at `docs/home/code.html` lines 76–129 defines the Hero: an overlay on top of a beach background image, a headline + subtitle, and a 4-column search form (text + categoría + ubicación + submit).

The required background asset (`panoramica-concon.jpg`) already exists at `frontend/public/assets/`. Tailwind tokens (primary `#004370`, secondary-container `#fadeba`, surface containers, outline-variant, etc.) are already declared in `tailwind.config.js`. No routing exists yet in the Angular app — this change enables routing for the first time.

The backend `categorias` and `barrios` modules are not implemented (`backend/src/modules/` only contains `empresas`). The discovery API `GET /api/v1/empresas?q=&categoriaId=&barrioId=` already supports the filters. Until the catalog endpoints exist, the hero selects are fed by hardcoded MVP dummy data in the smart container.

Stakeholders: any anonymous visitor (Flujo 2 — Descubrimiento) reaching the home page.

## Goals / Non-Goals

**Goals:**

- Render the Hero section of `docs/home/code.html` (lines 76–129): overlay + image background, headline + subtitle, search form, "Buscar Ahora" button.
- Split the Hero into a **dumb presentational** `HomeHeroComponent` (no DI, no data fetches, no router) and a **smart container** `HomePageComponent` (owns dummy dummy categories/barrios and the Router), per `frontend-standards.md` SRP / Smart-Dumb split and DIP.
- Enable Angular routing for the first time: `/` → `HomePageComponent`, lazy-loaded, declared in a new `app.routes.ts`. Replace the placeholder paragraph in `app.component.html` with `<router-outlet>`.
- On submit, the smart container navigates to `/directorio` with `q`, `categoriaId`, `barrioId` as query params so the future directory page can read them (the directory page itself is out of scope).
- All styling uses M3 tokens from `tailwind.config.js` via utility classes — no hardcoded hex/spacing in component templates.
- Mobile-first responsive: 1-column grid below `md`, 4-column grid at `md+`.
- Accessible: search controls have associated `<label>` via `aria-labelledby`/`for`, button has visible text, focus rings using `focus:ring-primary`.
- Cover fallback: if the background image fails to load, the gradient overlay still renders (background-color + linear-gradient declared before the image — image fails → gradient remains).

**Non-Goals:**

- The `/directorio` route target page (content for the directory listing). Created in a future change.
- Backend `/api/v1/categorias` and `/api/v1/barrios` endpoints. Created in future changes; until then the hero uses hardcoded dummy data.
- Reading categories/barrios from Firestore via `@angular/fire` — explicitly deferred.
- Quick Links Icons section (`Restaurantes / Hoteles / Compras`) under the search form in `docs/home/code.html` lines 108–127 — separate islands under the form, out of scope of the pure Hero.
- The other home sections (`HowItWorks`, `ExploreCategories`, `FeaturedListings`, `Newsletter`) — out of scope.
- Changes to `HeaderComponent` or `FooterComponent` — they remain shared layout.
- Authentication / role guards — anonymous visitors land on `/` freely; no guard added.

## Decisions

### Decision 1 — Smart/Dumb split (SRP + DIP)

**Choice:** Two components.

- `HomeHeroComponent` (dumb): receives `categorias` and `barrios` as `@Input()`, emits `searchSubmit` with a typed `SearchCriteria` payload via `@Output()`. Zero `inject()`, zero data services, zero `Router`.
- `HomePageComponent` (smart): owns the dummy `categories` and `barrios` arrays, owns the `Router`, and on `(searchSubmit)` calls `router.navigate(['/directorio'], { queryParams })`.

**Why:** Matches `frontend-standards.md` SRP ("dumb components solo reciben inputs y emiten outputs — nunca inyectan data services") and DIP (smart depends on `Router` via DI, not via `new`). The hero stays trivially testable with a `TestHost` and the smart is testable with `RouterTestingModule`.

**Alternatives considered:**

- *Single component with `Router` injected inside the hero.* Rejected: breaks the Smart/Dumb rule and forces the hero to know about routing — harder to reuse in tests/storybook, mixes presentation with navigation.
- *Smart container owning the form state too.* Rejected: the smart would start owning input values, making the dumb a useless wrapper. Form-state stays inside the dumb via a typed `SearchCriteria` it builds from template refs / `FormGroup`.

### Decision 2 — Form structure: Reactive Forms

**Choice:** The dumb hero uses a small `ReactiveForm` (`FormGroup` with `q: string`, `categoriaId: string`, `barrioId: string`), declared with `@Input()`-style signals or `FormGroupDirective`. On submit it emits `form.value as SearchCriteria`.

**Why:** Aligns with the project stack mandating "Reactive Forms" (`docs/base-standards.md` §8.1). Type-safe and trivially testable: dispatch `fixture.componentInstance.form.setValue({...})` and dispatch a submit event.

**Alternatives considered:**

- *Template-driven forms with `ngModel`.* Rejected: project standard is Reactive Forms.

### Decision 3 — Hardcoded dummy categories and barrios

**Choice:** The smart `HomePageComponent` declares two readonly typed arrays:

```ts
interface CategoryOption { readonly id: string; readonly nombre: string; }
interface BarrioOption { readonly id: string; readonly nombre: string; }
```

with representative Concón MVP content (Restaurantes, Hospedaje, Servicios, Retail, Salud; Centro, Bosques, Montemar, La Boca, Reñaca Alto — values from `docs/base-standards.md` §8.3 seed inventory). The first `<option>` of each `<select>` is the placeholder ("Seleccionar categoría" / "Seleccionar ubicación") and emits an empty string id.

**Why:** Until the backend `categorias`/`barrios` modules exist there is no source of truth. Hardcoding in a single smart component makes the future swap mechanical — replace two arrays with an HTTP/Firestore call.

**Alternatives considered:**

- *Read from Firestore directly in the frontend.* Rejected: would require assuming a collection shape that the backend modules will own with their own DTOs. Couples the hero to a future contract prematurely.
- *Block this change until categorias/barrios backend exists.* Rejected: artificially enlarges scope; the hero is valuable standalone.

### Decision 4 — Enable Angular Router for the first time

**Choice:** Create `frontend/src/app/app.routes.ts` exporting `routes: Routes` with one entry:

```ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home-page.component').then(m => m.HomePageComponent) },
  { path: 'directorio', loadComponent: () => import('./features/home/placeholder-directorio.component').then(m => m.PlaceholderDirectorioComponent) },
];
```

Wait — the `/directorio` page is a Non-Goal. **Revised:** We will NOT register `/directorio` here (would force creating a stub). Instead, the smart container calls `router.navigate(['/directorio'], { queryParams })` and Angular will fall back to its default behavior for an unmatched route (no redirect configured → blank). To make this obvious and explicit, the smart container catches the navigation result and logs a structured `warn` if it fails. The directory page belongs to a separate change.

However: an unmatched route during dev with `provideRouter` may surface as an error. **Mitigation:** register a `path: 'directorio'` placeholder route that renders a minimal "Próximamente" HeadingPlaceholder component, owned by THIS change purely so navigation does not crash. The directory page rendering with the actual listing is the next change.

**Tradeoff:** Slightly exceeds the strict "Hero only" scope by including a 1-line placeholder route. The alternative (zero `/directorio` route → silent broken nav) is a worse UX during development.

**Alternatives considered:**

- *No `/directorio` route at all.* Rejected: the submit button silently does nothing in dev. Bad DX, hard to demo.
- *Create the full directory listing page.* Rejected: explosive scope creep, separate change.

### Decision 5 — Background image + overlay

**Choice:** Style the hero root with inline `style` binding (typed, no `any`):

```ts
// Hero component class
protected readonly heroStyle = {
  'background-image': `linear-gradient(rgba(0, 67, 112, 0.4), rgba(0, 67, 112, 0.6)), url('/assets/panoramica-concon.jpg')`,
  'background-size': 'cover',
  'background-position': 'center',
};
```

bound to the section's `[style]` in the template. The color `#004370` appears inline here only because Tailwind cannot compose image URIs with alpha in a utility, but the **value** is sourced from `tailwind.config.js → theme.extend.colors.primary` via a public `const HERO_OVERLAY_PRIMARY = '#004370'` in a shared tokens file (note: same value as `colors.primary`). The gradient stops `0.4` and `0.6` match the visual reference.

**Why:** Tailwind v3 cannot construct `linear-gradient(...) url(...)` from utilities without `bg-blend` tricks that hurt readability. Inline `[style]` binding on a typed readonly object is the cleanest TypeScript-safe approach and lets the image URL be a single source.

**Accessibility fallback:** The hero section also has `bg-primary` as a Tailwind class on the root, so if the inline `background-image` fails (image 404), the page still shows the primary blue, not a broken white page.

**Alternatives considered:**

- *Inline all background styling in a CSS file with a literal URL.* Rejected: forces escaping rules, harder to type.
- *Use Tailwind's `bg-[url('...')]` arbitrary value.* Rejected: arbitrary value strings get very long and try to encode the gradient + image which Tailwind's arbitrary value parser does not handle well.

### Decision 6 — TypeScript types

**Choice:** All types live in the dumb component file (or a small `hero.types.ts`). Naming:

```ts
export interface SearchCriteria {
  readonly q: string;
  readonly categoriaId: string;
  readonly barrioId: string;
}
export interface CategoryOption { readonly id: string; readonly nombre: string; }
export interface BarrioOption { readonly id: string; readonly nombre: string; }
```

No `any`. The smart container exports the same `CategoryOption` / `BarrioOption` (imported from the hero) — single source of truth, avoids accidental drift.

### Decision 7 — Routing module wiring

**Choice:** Add `provideRouter(routes)` to `app.config.ts` `providers` array (after Firebase providers). No `withInMemoryScrolling` / `withComponentInputBinding` — keep it minimal.

## Risks / Trade-offs

- **[Risk] First-time router enablement might clash with Firebase providers.** → Mitigation: enable `provideRouter` and run `npm --prefix frontend run build` + `ng test` as part of tasks; if errors surface, fix before considering the change done.
- **[Risk] Lazy `loadComponent` paths could break SSR-less build.** → Mitigation: Angular 20 standalone `loadComponent` works without SSR; the `frontend` app has no SSR (verified `app.config.ts` has no `provideServerRendering`).
- **[Risk] Hardcoded dummy `categorias`/`barrios` could drift from future backend contract.** → Mitigation: types (`CategoryOption`, `BarrioOption`) are minimal `{id, nombre}` shape; the future migration replaces two array literals with HTTP/Firestore observables. The hero contract is unchanged.
- **[Risk] Image `panoramica-concon.jpg` is ~185KB; on slow mobile networks the hero LCP is delayed.** → Mitigation: out of scope for THIS change (no `loading=lazy` because it IS the LCP candidate; further optimization like WebP/AVIF conversion is documented in `docs/frontend-standards.md` and will be tackled when design assets are finalized).
- **[Trade-off] Inline gradient color duplicates `primary` hex.** Acceptable because Tailwind cannot express gradient+image composition with utilities; value is sourced from a single const declared next to the hero.

## Migration Plan

No data migration — frontend-only additive change. Rollback is removing the new files and reverting `app.component.html`, `app.component.ts`, `app.config.ts`, `app.component.spec.ts` to their current state via git.

## Open Questions

- Exact wording and content of the hero headline/subtitle. The visual reference uses "Encuentra los Mejores Lugares" / "Desde dunas doradas hasta la brisa del océano: descubre restaurantes, hoteles y experiencias locales únicas." — assumed as-is for this change. If the client wants Concón-specific copy, edit the `headline`/`subtitle` constants in `HomeHeroComponent` during `/apply`.
- Whether the placeholder option for selects should be `"Seleccionar categoría"` (design) or `"Todas las categorías"` (more useful for "show all"). Defaulting to design value for THIS change; revisit when directory page is implemented.
