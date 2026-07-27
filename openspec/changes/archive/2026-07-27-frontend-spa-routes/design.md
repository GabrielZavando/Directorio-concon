# Design — frontend-spa-routes

## Context

The Angular 20 standalone frontend already has the global layout pieces in place:

- `AppComponent` (`app.component.html`) renders `<app-header />` + `<main class="min-h-screen bg-background"><router-outlet /></main>` + `<app-footer />` exactly once per page.
- `HeaderComponent` and `FooterComponent` are dumb shared components reused across every route.
- `app.routes.ts` already lazy-loads two routes via `loadComponent` — `/` (HomePageComponent) and `/directorio` (PlaceholderDirectorioComponent).
- `PlaceholderDirectorioComponent` embeds the shared `SearchBarContainerComponent` and navigates with `queryParamsHandling: 'merge'`; it is a stop-gap from the `frontend-home-hero` change.
- The Header currently renders 5 `navLinks` (Inicio, Directorio, Eventos, Contacto) + 1 `ctaLink` (Registrate), all with `href="#"`, plus a mobile slide-in panel whose anchors also use `href="#"`.
- The home hero (`HomeHeroComponent` + `HomePageComponent`) is the only consumer of the shared `SearchBarContainerComponent` today, and it emits `searchSubmit` with a `SearchCriteria` payload to `Router.navigate(['/directorio'], { queryParams: buildQueryParams(criteria) })`.

What is missing: SPA navigation. Clicking any header link does nothing (the URLs are all `"#"`), and only two of the five labeled destinations have actual routes. The user explicitly wants the classic SPA behaviour — the Header/Footer stay mounted and only the `<main>` content swaps as the route changes — and four labelled component skeletons (Directorio, Eventos, Contacto, Registrate) so navigation is visibly wired.

This change touches only the frontend. No backend, no Firebase, no new npm dependencies (Angular Router is already installed). The design system "Dunas y Océano" (canonical tokens in `docs/DESIGN.md` wired into `tailwind.config.js`) is already in place, so skeletons consume existing tokens.

## Goals / Non-Goals

**Goals:**
- Make every header nav anchor (desktop + mobile panel) and the logo perform an in-app SPA transition via `routerLink`.
- Add `routerLinkActive`-driven active styling so visitors see which page they are on.
- Introduce four lazy `loadComponent` routes for `/directorio`, `/eventos`, `/contacto`, `/registrate`.
- Provide four cheap skeleton page components (heading + "Próximamente") so navigation has a visible target.
- Replace the placeholder `PlaceholderDirectorioComponent` with a clean `DirectorioPageComponent` skeleton (the entire point of the placeholder was to prevent a silent 404 on `/directorio`; that need is now served by the real skeleton).
- Keep Header/Footer mounted across all navigations (already true via `AppComponent` + `<router-outlet>`; we just stop breaking that contract with `href="#"`).

**Non-Goals:**
- Implementing the real content of `Directorio`/`Eventos`/`Contacto`/`Registrate`. Each is explicitly a skeleton ("Próximamente"). Future OpenSpec changes will fill them in.
- Re-introducing the `SearchBarContainerComponent` into the `DirectorioPageComponent` skeleton. The shared search bar continues to live in `shared/ui/search-bar/` and is consumed by the home hero. A future "real directory listing" change will re-plug the search bar into the directory page (with its own filters, pagination, etc.). Embedding it now would lock us into a layout we may want to change.
- Touching `docs/api-spec.yml` or `docs/data-model.md`. This is a frontend-only, no-data change.
- Adding Angular Material or any new UI dependency.
- Modifying the mobile menu panel behaviour (slide-in, escape-to-close, body-scroll-lock). Those stay as-is; we only change what each panel link does on click.
- Re-architecting the global layout. `AppComponent` is already correct; we do not move Header/Footer in/out of routing.
- Touching the home page or the home hero. `HomePageComponent` and `HomeHeroComponent` keep their current navigation behaviour (the hero already navigates to `/directorio` with `queryParams`).

## Decisions

### Decision 1 — Use `routerLink` + `routerLinkActive` on the Header (NOT `(click)` + `Router.navigate`)

**Choice:** Replace every `<a [href]="link.href">` with `<a [routerLink]="link.href" routerLinkActive="...">` in `header.component.html`, and the logo `<a href="#">` with `<a routerLink="/">`. Import `RouterLink` and `RouterLinkActive` into `HeaderComponent`.

**Why over alternatives:**
- `routerLink` is the idiomatic Angular SPA primitive. It produces a real `<a href="...">` in the DOM for accessibility (right-click → open in new tab works) but intercepts left-clicks for an in-app transition. `(click) + Router.navigate` would discard the semantic anchor and break middle-click/right-click.
- `routerLinkActive` is built-in and handles the active-class binding for us, including edge cases (exact vs. partial match, query params). Rolling our own "active link" logic would be more code and more bugs.
- The current `navLinks` data is already typed (`readonly label: string; readonly href: string`), so `routerLink` accepts the same `href` strings — minimal churn to the component's data shape.

**Alternatives considered:**
- `(click)="navigate(link.href)"` + `Router.navigate` — rejected, breaks anchor semantics and middle/right-click.
- Keep `href="#"` and just register the routes — rejected, violates the explicit user requirement ("migrar a routerLink SPA").

### Decision 2 — `navLinks` and `ctaLink` carry real route strings

**Choice:** Update `HeaderComponent`'s `navLinks` collection to:

```
{ label: 'Inicio',     href: '/' }
{ label: 'Directorio', href: '/directorio' }
{ label: 'Eventos',    href: '/eventos' }
{ label: 'Contacto',   href: '/contacto' }
```

and `ctaLink` to `{ label: 'Registrate', href: '/registrate' }`.

**Why:**
- Keeping the property name `href` means `header.component.html` only needs the attribute change `[href]="..."` → `[routerLink]="..."`. The data shape is unchanged (no rename), so existing tests that rely on `navLinks[i].href` keep working, and the diff stays small.
- Renaming `href` → `route` would be more "honest" semantically but would expand the diff and risks breaking the archived `frontend-layout-base` spec ("renders all 5 nav links") and `frontend-logo-replace` conventions. We keep the field name.

**Alternatives considered:**
- Rename the field to `route` — rejected as churn without payoff in this change.

### Decision 3 — Active link styling: a small, semantic class string composed from existing tokens

**Choice:** Each desktop nav link uses:

```
[routerLink]="link.href"
routerLinkActive="text-primary font-semibold"
```

The mobile panel uses the same `routerLinkActive` value. The non-active hover/fallback styling (`text-on-surface-variant hover:text-primary`) stays in the static class list — `routerLinkActive` only adds a class when the link is active, it does not remove the static classes.

**Why:**
- `text-primary` and `font-semibold` already exist as M3 tokens / Tailwind utilities and were approved in the design references. We avoid inventing a new "active" color token.
- The CTA "Registrate" already has `bg-primary` styling; we deliberately do NOT apply `routerLinkActive` to the CTA so it stays visually a single "call-to-action" regardless of page (the page itself, when implemented, will own the registration UI; we should not turn the global CTA into a "you are here" indicator).

**Alternatives considered:**
- Apply `routerLinkActive` to the CTA too — rejected, confuses the visual model (a coloured CTA with active underline noise).
- Invent a new "active-nav" color token — rejected, no need.

### Decision 4 — Replace `PlaceholderDirectorioComponent` with `DirectorioPageComponent` skeleton (drop the embedded `SearchBarContainerComponent`)

**Choice:** Delete `placeholder-directorio.component.ts` and `placeholder-directorio.component.spec.ts`. Create `directorio-page.component.ts|html|css|spec.ts` with a minimal skeleton: heading "Directorio" + "Próximamente" + no embedded search bar.

**Why:**
- The placeholder was a temporary measure in the `frontend-home-hero` change expressly to prevent `Router.navigate(['/directorio'], ...)` from silently failing when the hero emitted `searchSubmit`. With the new `DirectorioPageComponent` skeleton, `/directorio` resolves to a real component — that need is served without the placeholder's secondary responsibility of hosting the search bar.
- Keeping the search bar inside the skeleton would force a layout decision (where exactly the search form sits on the directory page, how it interacts with the future listing filter state). The user-facing real directory listing is a future OpenSpec change; we keep this change tight by letting the skeleton be only a skeleton.
- The shared `SearchBarContainerComponent` still exists in `shared/ui/search-bar/` and is still used by the home hero. When the hero emits `searchSubmit`, `HomePageComponent` still calls `Router.navigate(['/directorio'], { queryParams: ... })`; the user lands on `/directorio?q=...` which renders the new `DirectorioPageComponent` skeleton. The skeleton simply does not consume `q` yet — that is the future change's job.

**Risk:** A visitor who searches from the hero lands on `/directorio?q=pizzeria` and sees only "Próximamente" — the URL carries filters that the skeleton ignores. The home hero shows the filter on its own URL before navigation, and the URL persists on `/directorio`, so no data is lost. Acceptable for a skeleton change and explicitly approved by the user ("migrar a DirectorioPageComponent definitivo" without the search bar).

**Alternatives considered:**
- Keep `PlaceholderDirectorioComponent` as the `/directorio` route target and only add the other three skeletons — rejected; the user explicitly chose to migrate to a `DirectorioPageComponent` and remove the placeholder.
- Create a `DirectorioPageComponent` that embeds the `SearchBarContainerComponent` (option 3 in the original question) — rejected by the user.

### Decision 5 — Skeleton component file layout mirrors `features/home/`

**Choice:** Each skeleton lives in `frontend/src/app/features/<name>/<name>-page.component.ts|html|css|spec.ts`, e.g. `features/eventos/eventos-page.component.ts`. Use a `-page` suffix so the file name reflects that these are page-level components (consistent with `home-page.component.ts`).

We use separate `templateUrl` / `styleUrl` per skeleton even though templates are tiny (3–4 lines each), because: (a) it matches the `home-page` and `header`/`footer` pattern in the codebase; (b) the project's ESLint max-300-lines-per-file rule and review workflow assume split templates; (c) future content for each page will land in the same files and split templates keep the diff small.

**Why not inline templates:**
- The codebase convention (`home-page`, `header`, `footer`) all use `templateUrl`. Inline templates would deviate from the established pattern.

**Alternatives considered:**
- Inline templates + styles (Angular's "minimal file" pattern) — rejected for consistency.
- Suffix `*.component.ts` (the original placeholder used `placeholder-directorio.component.ts`) — fine, but page-level components in this codebase (`home-page.component.ts`) use the `-page.component.ts` pattern. We follow the latter.

### Decision 6 — Tests use `RouterTestingModule` (or `provideRouter([])`) for the Header spec

**Choice:** Update `header.component.spec.ts` so the `TestBed` provides a router. With Angular 20 standalone, the cleanest option is `provideRouter([])` in `TestBed.configureTestingModule({ providers: [provideRouter([])] })` — no extra module needed. Use `RouterTestingHarness` (from `@angular/router/testing`) when the test needs to assert that the `routerLinkActive` class actually appears after a real navigation. For pure "the anchor has a `routerLink` attribute" assertions, `provideRouter([])` is enough.

**Why:**
- `RouterLink` and `RouterLinkActive` require an active `Router` to instantiate. Without a router provider, the `HeaderComponent` TestBed will fail to render directives that depend on `routerLink`.
- `provideRouter([])` is lightweight and avoids pulling `HttpClientTestingModule`/`RouterTestingModule` legacy imports.

**Alternatives considered:**
- `RouterTestingModule` — works, but the new `provideRouter` API is the Angular 20 idiom and matches the existing `app.config.ts` style (`provideRouter(routes)`).

### Decision 7 — Skeleton specs assert heading text + "Próximamente" presence (not CSS classes)

**Choice:** Each skeleton's spec asserts only: (a) the component renders, (b) the rendered DOM contains the exact heading text (`Directorio` / `Eventos` / `Contacto` / `Registrate`), and (c) the rendered DOM contains the substring "Próximamente" (any case). We deliberately do NOT assert Tailwind classes (`text-primary`, `bg-background` etc.) in the skeleton specs — those are design-token details that the design-system specs already cover and that the `frontend-spa-navigation` spec covers at the source-read level ("template contains no literal hex utility classes", "uses `bg-background`").

**Why:**
- Keeps skeleton specs tiny and resilient to template refactors.
- Avoids duplicating what the OpenSpec WHEN/THEN scenarios already mandate at the source level.

## Risks / Trade-offs

- **[Risk: visitor who searches from the hero lands on `/directorio?q=...` but the skeleton ignores `q`]** → Mitigation: the URL still carries `q` (the skeleton does not strip it), and a future "real directory listing" change will consume it. Acceptable for the skeleton change; explicitly approved by the user. The placeholder already had this same behaviour (it picked up `q` but did not actually filter either — it just re-rendered the search bar).
- **[Risk: deleting `PlaceholderDirectorioComponent` breaks an archived spec scenario that named `PlaceholderDirectorioComponent`]** → Mitigation: the archived `frontend-home-hero` spec scenario ("router has a directorio route") says "uses `loadComponent` to import a component whose visible content includes the word 'directorios'". The new `DirectorioPageComponent` skeleton contains the word "Directorio" — the scenario is still satisfied. We verified there is no scenario naming `PlaceholderDirectorioComponent` by grepping the specs directory.
- **[Risk: the header `routerLinkActive` class is verified only by source-read scenarios, not by a DOM test]** → Mitigation: Decision 6 mentions `RouterTestingHarness` for the active-class DOM test; the implementation task ("Update header.component.spec.ts") will include at least one test that exercises `routerLinkActive` against a real navigation, not only attribute assertions.
- **[Risk: mobile panel link closes the menu twice when combined with `routerLink`]** → Mitigation: keep the existing `(click)="closeMenu()"` on each mobile panel anchor; `routerLink` performs the navigation, and `closeMenu()` runs synchronously afterwards. The order is safe — Angular processes the click, then the bound click handler, then the router begins navigating. No double-trigger.
- **[Risk: `routerLink` with `[routerLink]` on the Inicio link pointing to `"/"` may activate when on any sub-route because Angular's default match is prefix] → Mitigation: use `routerLinkActive` with `[routerLinkActiveOptions]="{ exact: true }"` on the Inicio (`/`) link. The other links are URL-deep enough (`/directorio`, `/eventos`, `/contacto`, `/registrate`) that prefix match is fine, but for consistency and safety we set `exact: true` on the home link only.
- **[Trade-off: skeleton uses separate `templateUrl` + `styleUrl` even for tiny templates] → Adds two extra files per skeleton (12 new files total: 4 components × 3 files + 4 spec files + the optional 4 CSS). Worth it for consistency with the existing `home-page`/`header`/`footer` pattern and future content growth.

## Migration Plan

1. **Code first, no deploy step needed.** The change is frontend-only and adds no data. Once merged, the SPA navigation just works on the next `npm --prefix frontend run build && npm --prefix frontend start`.
2. **Rollback:** revert the change in git. No database migration, no env config, no deploy migration. The deleted placeholder files come back as part of the revert.
3. **No migration messaging needed for users** — the visible difference is: header links now navigate (previously they silently did nothing) and `/eventos`, `/contacto`, `/registrate` now resolve to a "Próximamente" page instead of 404.

## Open Questions

None. All decisions above were resolved during planning with the user:
- Ticket-id `frontend-spa-routes` — confirmed.
- Migrate `PlaceholderDirectorioComponent` → `DirectorioPageComponent` without the search bar — confirmed.
- Skeletons = heading + "Próximamente" only — confirmed.
- Header migrates `href="#"` → `routerLink` + `routerLinkActive` — confirmed.
- Solución B (new capability `frontend-spa-navigation` + delta with `## ADDED Requirements` on `frontend-layout-base`) — confirmed.
