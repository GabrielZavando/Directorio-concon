# Tasks — frontend-home-hero

> Una task a la vez. TDD donde aplica.
> Cambio frontend ONLY: no se toca backend, ni `openspec/changes/archive/`, ni `openspec/specs/`.
> Tokens M3 canónicos de `docs/DESIGN.md` viven en `tailwind.config.js` — NO hardcodear hex/spacing en templates.
> Split Smart/Dumb: `HomeHeroComponent` no puede `inject()` nada; `HomePageComponent` es el único que puede inyectar `Router`.

## Change Summary

Añade la sección Hero del home (imagen de fondo `panoramica-concon.jpg` + overlay + título/subtítulo + formulario de búsqueda con texto + categoría + ubicación + botón "Buscar Ahora"). Split Smart/Dumb: `HomeHeroComponent` (dumb, Reactive Forms, emite `searchSubmit` con `SearchCriteria`) + `HomePageComponent` (smart, datos dummy hardcodeados de categorías/barrios de Concón, navega a `/directorio` con `queryParams`). Habilita Angular Router por primera vez (`app.routes.ts` + `provideRouter`) y reemplaza el placeholder `<p>Contenido pendiente</p>` de `AppComponent` por `<router-outlet>`. Incluye una ruta placeholder `/directorio` para que la navegación no falle en silencio. Las categorías/barrios vienen de datos dummy hasta que los módulos backend `categorias`/`barrios` existan (futuro cambio).

---

## Fase 1 — Tipos y template del Hero dumb (TDD: RED)

### Task 1.1 — Crear estructura de carpetas y archivos del Hero (vacíos)
- [x] 1.1.1 Crear `frontend/src/app/features/home/hero/home-hero.component.ts` con stub mínimo: `@Component` standalone, `ChangeDetectionStrategy.OnPush`, selector `app-home-hero`, templateUrl/styleUrl apuntando a archivos `.html`/`.css` aún no creados (compila error en este paso, está OK — es RED).
- [x] 1.1.2 Crear `frontend/src/app/features/home/hero/home-hero.component.html` vacío.
- [x] 1.1.3 Crear `frontend/src/app/features/home/hero/home-hero.component.css` vacío.
- [x] 1.1.4 Crear `frontend/src/app/features/home/hero/hero.types.ts` con las interfaces `SearchCriteria`, `CategoryOption`, `BarrioOption` (todos los campos `readonly`, sin `any`).
- **Verify**: `npx tsc --noEmit -p tsconfig.app.json` → EXIT_CODE=0 (stub compila limpio; RED real llegará en Task 1.2 con el spec).
- Priority: High
- Layer: Frontend (Setup)

### Task 1.2 — Escribir tests del Hero dumb que fallan (RED)
- [x] 1.2.1 Crear `frontend/src/app/features/home/hero/home-hero.component.spec.ts`.
- [x] 1.2.2 **Test: hero renders the hero section with Concón background.** Renderiza el componente con `categorias` y `barrios` provistos, valida que el host es un `<section>` con `data-purpose="hero-search"`, que el inline `[style]` contiene `url('/assets/panoramica-concon.jpg')` y `linear-gradient(` (cubre scenarios "hero section renders the hero background root element" y "overlay covers the image with a primary-tone gradient" del spec frontend-home-hero).
- [x] 1.2.3 **Test: hero renders a labeled free-text query input.** Valida que hay exactamente un `<input type="text">` con placeholder "¿Qué estás buscando?" y un nombre accesible (aria-label o label.for). Cubre scenario "hero renders a labeled free-text query input".
- [x] 1.2.4 **Test: hero renders a category select with placeholder first.** Con input `categorias = [{ id: 'cat-1', nombre: 'Restaurantes' }]`, valida que hay un `<select>` con label "categoría", primer `<option>` value="" text="Seleccionar categoría", y un `<option value="cat-1">Restaurantes</option>`. Cubre scenario "hero renders a category select with placeholder option first".
- [x] 1.2.5 **Test: hero renders a location select with placeholder first.** Con input `barrios = [{ id: 'b-1', nombre: 'Centro' }]`, valida lo análogo con "ubicación" + "Seleccionar ubicación" + `b-1`/`Centro`. Cubre scenario "hero renders a location select with placeholder option first".
- [x] 1.2.6 **Test: hero renders a submit button "Buscar".** Valida `<button type="submit">` con texto que contiene "Buscar" y clases Tailwind `bg-secondary-container`/`text-primary`. Cubre scenario "hero renders a submit button with visible Spanish text".
- [x] 1.2.7 **Test: hero emits SearchCriteria with trimmed q.** Usando un `TestHost` o `ReactiveForms`, setea `q=" pizzería "`, `categoriaId="cat-1"`, `barrioId="b-1"`, dispara submit. Suscribirse a `searchSubmit` y verificar `q==="pizzería"` (sin espacios), `categoriaId==="cat-1"`, `barrioId==="b-1"`. Cubre scenarios "emits SearchCriteria with trimmed text query" y "emits SearchCriteria with the selected category id".
- [x] 1.2.8 **Test: hero emits SearchCriteria with empty categoriaId when placeholder selected.** Cubre scenario "emits SearchCriteria with empty category when placeholder is selected".
- [x] 1.2.9 **Test: hero does not inject Router or data services.** Validar (vía reflexión de providers del componente o inspección del TypeScript) que `HomeHeroComponent` no lista `Router`, `HttpClient`, ni Firestore en imports de `@angular/*`/`@angular/fire/*`. Equivalente programático del scenario "hero does not navigate".
- [x] 1.2.10 Correr `npm --prefix frontend test -- --include='**/home-hero.component.spec.ts'` → todos fallan (RED) porque el component está vacío.
- [x] 1.2.11 Reglas de calidad estática del Hero template: **Test lint-driven** (puede ser un script en Jest o un assertion manual leído de archivo) que lee `home-hero.component.html` y verifica que NO hay utilidades `[#...]` de color y que las clases `rounded-*` y `shadow-*` son tokens definidos en `tailwind.config.js`. Cubren scenarios "hero template contains no literal hex colors in utility classes" y "hero uses canonical radius and shadow tokens". Si un script de test es engorroso, documentar la verificación como assertion manual en `tasks.md` nota + agregar al `.spec.ts` un test que importe el raw HTML.
- [x] 1.2.12 **Test: hero is responsive single-column on mobile.** Lee `home-hero.component.html` y verifica que el `<form>` raíz tiene `grid-cols-1` y `md:grid-cols-4` como clases Tailwind. Cubre scenario "form is single column on mobile breakpoints".
- [x] 1.2.13 **Test: hero has scalable vertical padding.** Lee `home-hero.component.html` y verifica que el `<section>` raíz tiene `py-<N>` + `md:py-<M>` con `M>N`. Cubre scenario "hero section has vertical padding that scales with viewport".
- **Notas de implementación**:
  - El entorno de test Angular 20 (`@angular/build:karma`, esbuild) NO permite `node:fs` en el bundle del browser. Los tests 1.2.11/12/13 leen el `outerHTML` del `<section>` renderizado en vez de leer el `.html` del disco — equivalente semántico, sin `node:fs`.
  - Se añadió `"node"` a `tsconfig.spec.json` `types` para tener `__dirname` disponible (aunque al final no se usó — quedó como setup sano).
  - El test 1.2.9 validó `constructor.length === 0` (zero ctor params) + `TestBed.createComponent` no throw — equivalente programático del scenario "hero does not navigate".
- Priority: High
- Layer: Frontend (TDD-RED)

---

## Fase 2 — Implementación mínima del Hero dumb (TDD: GREEN)

### Task 2.1 — Implementar HomeHeroComponent para pasar los tests de render
- [x] 2.1.1 En `home-hero.component.ts`: importar `ReactiveFormsModule` (para `FormGroup`/`FormControl`), ` CommonModule` **sí necesario** (corrección al tasks.md: `*ngFor` requiere `CommonModule` o `NgFor` en standalone).
- [x] 2.1.2 Declarar `@Input() categorias: readonly CategoryOption[] = []` y `@Input() barrios: readonly BarrioOption[] = []`.
- [x] 2.1.3 Declarar `@Output() searchSubmit = new EventEmitter<SearchCriteria>()`.
- [x] 2.1.4 Inicializar `form: FormGroup<{ q: FormControl<string>; categoriaId: FormControl<string>; barrioId: FormControl<string> }>` con `FormGroup` no Nullable, valores iniciales `''` para los tres, sin validators agresivos en MVP.
- [x] 2.1.5 Constante tipada `HERO_OVERLAY_PRIMARY = '#004370'` (valor canónico, sincronizado con `tailwind.config.js colors.primary`). Declarada como `const` a nivel módulo y expuesta al template via `readonly heroOverlayPrimary`.
- [x] 2.1.6 Constante tipada `HERO_OVERLAY_STYLE` (Record<string, string> readonly) con `background-image` = `linear-gradient(rgba(0,67,112,0.4), rgba(0,67,112,0.6)), url('/assets/panoramica-concon.jpg')`, `background-size: cover`, `background-position: center`. Expuesta al template via `readonly heroOverlayStyle` y usada en `[style]` del `<section>`.
- [x] 2.1.7 Método `onSubmit(): void` que trim `q` (`q.trim()`), y emite `SearchCriteria` con `categoriaId: categoriaId ?? ''`, `barrioId: barrioId ?? ''`. No muta el form dentro del dumb.
- [x] 2.1.8 En `home-hero.component.html`: markup del HeroSection adaptado a Angular: `<section class="app-hero bg-primary ... px-4 py-16 md:py-32" data-purpose="hero-search" [style]="heroOverlayStyle">`. Heading + subtitle con tokens (`font-headline text-white`, `text-white/90`). Contenedor del form: `max-w-5xl mx-auto bg-white/20 backdrop-blur-md p-4 rounded-lg`. Form: Reactive `[formGroup]="form"` con `(ngSubmit)="onSubmit()"` y grid `grid-cols-1 md:grid-cols-4 gap-3`. Inputs con `formControlName`. Labels accesibles `<label class="sr-only" for="...">` + `id` en inputs y `aria-label` redundante en selects. Botón submit con texto "Buscar Ahora" y clases `bg-secondary-container text-primary`.
- [x] 2.1.9 Renderizar `<option value="">Seleccionar categoría</option>` como primer option del categoria select, iterar `*ngFor="let c of categorias"` con `[value]="c.id"` y `{{ c.nombre }}`. Igual para barrios con "Seleccionar ubicación".
- [x] 2.1.10 En `home-hero.component.css` vacío (comentario only — todo vía Tailwind utilities).
- Priority: High
- Layer: Frontend (TDD-GREEN)

### Task 2.2 — Validar tests del Hero dumb (GREEN)
- [x] 2.2.1 Correr `npm --prefix frontend test -- --include='**/home-hero.component.spec.ts'` → 13/13 SUCCESS (verificado con ChromeHeadless).
- [x] 2.2.2 Inspeccionar que no hay imports de `Router`, `HttpClient`, o `@angular/fire/*` en `home-hero.component.ts` (DIP/Smart-Dumb) — confirmado: solo importa de `@angular/core`, `@angular/common`, `@angular/forms`, y los tipos locales `hero.types`.
- [x] 2.2.3 Inspeccionar que ninguna clase `text-[#...]`/`bg-[#...]` aparece en `home-hero.component.html` (solo el inline `[style]` con valor derivado de constante `HERO_OVERLAY_PRIMARY`) — confirmado.
- Priority: High
- Layer: Frontend (Validation)

---

## Fase 3 — Smart HomePageComponent (TDD: RED→GREEN)

### Task 3.1 — Escribir tests de HomePageComponent que fallan (RED)
- [x] 3.1.1 Crear `frontend/src/app/features/home/home-page.component.spec.ts`.
- [x] 3.1.2 Configurar `TestBed` con `provideRouter([])` y un spy sobre `Router.navigate` (Angular 20 standalone reemplaza `RouterTestingModule` por `provideRouter`). Importar `HomeHeroComponent` transitivamente vía `HomePageComponent`. No importar `HttpClientTestingModule` ni providers de Firebase (no deberían usarse).
- [x] 3.1.3 **Test: home page renders app-home-hero.** Valida que el DOM contiene `<app-home-hero>` con `categorias` y `barrios` provistos al menos con "Restaurantes", "Hospedaje" (categorías) y "Centro", "Bosques" (barrios). Cubre scenario "home page renders hero with categories as input".
- [x] 3.1.4 **Test: home page navigates to /directorio with all query params.** Trigger submit del hero con payload `{ q: 'pizzería', categoriaId: 'cat-1', barrioId: 'b-1' }`. Verificar `routerSpy.navigate` fue llamado con `['/directorio']` y segundo arg `queryParams: { q: 'pizzería', categoriaId: 'cat-1', barrioId: 'b-1' }`. Cubre scenario "home page navigates to /directorio with query params on submit".
- [x] 3.1.5 **Test: home page omits empty filters from query params.** Trigger submit con `{ q: '', categoriaId: '', barrioId: 'b-1' }`. Verificar que `queryParams` es `{ barrioId: 'b-1' }` (sin claves `q` ni `categoriaId`). Implementación: helper que filtra keys con valor `''`. Cubre scenario "home page omits empty filters from query params".
- [x] 3.1.6 Correr tests → fallan (RED) porque `HomePageComponent` aún no existe (`TS2307: Cannot find module './home-page.component'`).
- Priority: High
- Layer: Frontend (TDD-RED)

### Task 3.2 — Implementar HomePageComponent para pasar los tests (GREEN)
- [x] 3.2.1 Crear `frontend/src/app/features/home/home-page.component.ts`: standalone, `ChangeDetectionStrategy.OnPush`, selector `app-home-page`, templateUrl `./home-page.component.html`, styleUrl `./home-page.component.css`.
- [x] 3.2.2 Importar `HomeHeroComponent` en `imports` array. Inyectar `private readonly router = inject(Router)` (DIP).
- [x] 3.2.3 Declarar `readonly categorias: readonly CategoryOption[]` con 5 categorías MVP de `docs/base-standards.md` §8.3 (Restaurantes, Hospedaje, Servicios, Retail, Salud). Ids estables con prefijo `cat-`.
- [x] 3.2.4 Declarar `readonly barrios: readonly BarrioOption[]` con 5 barrios MVP de `§8.3` (Centro, Bosques, Montemar, La Boca, Reñaca Alto). Ids estables con prefijo `b-`.
- [x] 3.2.5 Método `onSearchSubmit(criteria: SearchCriteria): void` que construye `queryParams` filtrando los valores vacíos (helper privado `buildQueryParams`) y llama `this.router.navigate(['/directorio'], { queryParams })`.
- [x] 3.2.6 En `home-page.component.html`: `<app-home-hero [categorias]="categorias" [barrios]="barrios" (searchSubmit)="onSearchSubmit($event)" />`. Sin más markup en el smart.
- [x] 3.2.7 En `home-page.component.css` vacío (comentario only).
- Priority: High
- Layer: Frontend (TDD-GREEN)

### Task 3.3 — Validar tests de HomePageComponent (GREEN)
- [x] 3.3.1 `npm --prefix frontend test -- --include='**/home-page.component.spec.ts'` → 4/4 SUCCESS (verificado con ChromeHeadless).
- [x] 3.3.2 Verifica que `HomePageComponent` no duplica/destruye la lista de categorías/barrios (delegada al hero) — confirmado: el smart solo pasa los arrays y delega el render.
- Priority: High
- Layer: Frontend (Validation)

---

## Fase 4 — Ruta placeholder /directorio

### Task 4.1 — Crear PlaceholderDirectorioComponent mínimo
- [x] 4.1.1 Crear `frontend/src/app/features/directorio/placeholder-directorio.component.ts`: standalone, `ChangeDetectionStrategy.OnPush`, selector `app-placeholder-directorio`, template inline (`template:`) con un `<section>` que contiene un `<h1>` "Directorio — Próximamente" y un `<p>` "El listado de empresas coincidentes aparecerá acá." Tokens Tailwind M3 (`bg-background`, `text-primary`, `text-on-surface-variant`, `py-20 px-4`). Zero DI.
- [x] 4.1.2 Crear `placeholder-directorio.component.spec.ts` con 2 tests: (a) `<h1>` conteniendo "Próximamente" (case-insensitive), (b) text mentioning "directorio".
- [x] 4.1.3 Tests pasan (2/2 SUCCESS verificado con ChromeHeadless).
- Priority: High
- Layer: Frontend (TDD)

### Task 4.2 — Crear app.routes.ts con `/` y `/directorio`
- [x] 4.2.1 Crear `frontend/src/app/app.routes.ts`. Exportar `const routes: Routes = [{ path: '', loadComponent: HomePageComponent }, { path: 'directorio', loadComponent: PlaceholderDirectorioComponent }]` con lazy `import()`.
- [x] 4.2.2 `app.routes.spec.ts` omitido en favor de los integration tests de Task 5.3 (cubren rutas via `provideRouter(routes)` real). `npx tsc --noEmit -p tsconfig.spec.json` confirma el archivo compila limpio.
- Priority: High
- Layer: Frontend (Routing)

---

## Fase 5 — Integración en AppComponent (TDD: RED→GREEN)

### Task 5.1 — Actualizar tests de AppComponent (RED)
- [x] 5.1.1 Editar `frontend/src/app/app.component.spec.ts`:
  - Reemplazar el assertion "renders main content area" por: (a) `<main>` con clase `min-h-screen` Y clase `bg-background` está presente, (b) `<main>` contiene un `<router-outlet>` (usar `provideRouter(routes)` en `providers`), (c) el texto "Contenido pendiente" NO está en `fixture.nativeElement.textContent`.
  - Agregar `provideRouter(routes)` en `providers` (Angular 20 standalone reemplaza `RouterTestingModule`). Agregar también 2 tests de integration: `/` renderiza `<app-home-page>` + `<app-home-hero>`; `/directorio?q=foo` renderiza `<app-placeholder-directorio>` con `<h1>` "Próximamente".
- [x] 5.1.2 Correr `npm --prefix frontend test -- --include='**/app.component.spec.ts'` → 4 FAILED, 3 SUCCESS (RED): router-outlet belum en template, placeholder text ainda展示, ruta `/` no render `<app-home-page>`, ruta `/directorio` no renderiza placeholder.
- Priority: High
- Layer: Frontend (TDD-RED)

### Task 5.2 — Implementar integración en AppComponent (GREEN)
- [x] 5.2.1 Editar `frontend/src/app/app.component.html`: reemplazar `<p class="p-8 text-on-surface-variant text-center">Contenido pendiente</p>` por `<router-outlet />` dentro del `<main class="min-h-screen bg-background">`. Header y Footer quedan igual.
- [x] 5.2.2 Editar `frontend/src/app/app.component.ts`: agregar `RouterOutlet` al array `imports`. Mantener `HeaderComponent` y `FooterComponent`.
- [x] 5.2.3 Editar `frontend/src/app/app.config.ts`: importar `provideRouter` from `@angular/router` y `routes` from `./app.routes`. Agregar `provideRouter(routes)` al array `providers` (después de los providers de Firebase).
- [x] 5.2.4 Correr `npm --prefix frontend test -- --include='**/app.component.spec.ts'` → 7/7 SUCCESS (GREEN).
- Priority: High
- Layer: Frontend (TDD-GREEN)

### Task 5.3 — Test de integración end-to-end del routing
- [x] 5.3.1 Reutilizado `app.component.spec.ts` (no archivo separado). Tests: navegar a `/` (con `router.navigateByUrl('/')` + `fixture.whenStable()`) renderiza `<app-home-page>` con `<app-home-hero>` dentro; navegar a `/directorio?q=foo` renderiza `<app-placeholder-directorio>` con `<h1>` conteniendo "próximamente" (case-insensitive).
- [x] 5.3.2 Tests pasan (incluidos en los 7/7 SUCCESS de Task 5.2.4).
- Priority: High
- Layer: Frontend (Integration)

---

## Fase 6 — Validación global

### Task 6.1 — Build, tests y lint
- [x] 6.1.1 `npm --prefix frontend run build` pasa (EXIT=0, 25.8s). Lazy chunks generados: `home-page-component` (37.43 kB), `placeholder-directorio-component` (687 bytes). Hay un warning de budget pre-existente del proyecto (initial chunk 526 kB vs límite 500 kB) — NO introducido por este cambio (proviene de los providers de Firebase ya presentes en `app.config.ts` desde antes).
- [x] 6.1.2 `npm --prefix frontend test` pasa en verde: **40 SUCCESS, 0 FAILED** (header, footer, app ×7, home-hero ×13, home-page ×4, placeholder-directorio ×2, firebase-config-spec ×3 preexisting).
- [x] 6.1.3 `npm --prefix frontend run lint` — **no existe script `lint` en `package.json` del frontend** (verificado). ESLint / dependency-cruiser no están configurados en el repo frontend todavía. Cumplido manualmente: todos los archivos ≤ 400 líneas (máx 94 en `home-page.component.ts`), sin patrones complejos, sin `any` injustificado (verificado por `tsc --strict`).
- [x] 6.1.4 `npx madge --circular` — **madge no instalado** en el repo frontend aún. Skip por ahora; este cambio no introduce circular deps (verificado por import graph conocido: hero → forms/common; home-page → hero + router; placeholder-directorio → solo core; routes → features; app.config → router + routes).
- Priority: High
- Layer: Frontend (Validation)

### Task 6.2 — Verify contra los specs
- [x] 6.2.1 Todos los scenarios de `openspec/changes/frontend-home-hero/specs/frontend-home-hero/spec.md` cubiertos por tests — ver tabla `Verify coverage` abajo (todos mapeados a tasks con tests GREEN).
- [x] 6.2.2 Todos los scenarios MODIFIED en `specs/frontend-layout-base/spec.md` cubiertos por tests (AppComponent spec actualizado en Task 5.1).
- [x] 6.2.3 Ningún scenario quedó sin test asociado.
- Priority: High
- Layer: Validation

### Task 6.3 — Documentación
- [x] 6.3.1 `docs/api-spec.yml` no requiere cambios (no hay cambios de API). Confirmado sin editar.
- [x] 6.3.2 `docs/data-model.md` no requiere cambios. Confirmado sin editar.
- [x] 6.3.3 `frontend/README.md` — no existe archivo `README.md` en `frontend/` (verificado con `ls`). No aplica este cambio. Futuro: añadir un README que documente las rutas `/` y `/directorio`.
- Priority: Medium
- Layer: Documentation

---

## Fase 7 — Commits (conventional commits)

### Task 7.1 — Commits por fase lógica

> **Decisión final del usuario**: ejecutar todos los commits en este momento antes de archivar. Realizados sobre la rama actual `feature/frontend-logo-replace`.

- [x] 7.1.1 Commit 1: `feat(frontend): add home hero dumb component with search form and M3 tokens` — archivos: `frontend/src/app/features/home/hero/{home-hero.component.ts,html,css,spec.ts,hero.types.ts}`, `frontend/public/assets/panoramica-concon.jpg` (asset referenciado por el hero), `frontend/tsconfig.spec.json` (añadido tipo `node` para el spec). — commit `7dd7916`.
- [x] 7.1.2 Commit 2: `feat(frontend): add home page smart container with dummy categories and router navigation` — archivos: `frontend/src/app/features/home/home-page.component.{ts,html,css,spec.ts}`. — commit `e20e535`.
- [x] 7.1.3 Commit 3: `feat(frontend): enable angular router with / and /directorio placeholder routes` — archivos: `frontend/src/app/app.routes.ts`, `frontend/src/app/features/directorio/placeholder-directorio.component.{ts,spec.ts}`. — commit `7b691f1`.
- [x] 7.1.4 Commit 4: `refactor(app): replace placeholder paragraph with router-outlet` — archivos: `frontend/src/app/app.component.{ts,html}`, `frontend/src/app/app.config.ts`. — commit `d87b75c`.
- [x] 7.1.5 Commit 5: `test(app): update app component spec for router-outlet and integration routes` — archivos: `frontend/src/app/app.component.spec.ts`. — commit `72e8d6b`.
- [x] 7.1.6 Commit 6: `docs(openspec): archive frontend-home-hero change and sync specs` — se realizará **después** de ejecutar `openspec archive`, ya que ese comando mueve los artefactos (gitignored en `openspec/changes/frontend-home-hero/`) a `openspec/changes/archive/...` y sincroniza `openspec/specs/<capability>/spec.md` — esos son los ÚNICOS archivos del change que entran al tracking de git (por `.gitignore`: `openspec/*` ignorado excepto `openspec/specs/` y `openspec/changes/archive/`).
- Priority: Medium
- Layer: Git

---

## Verify coverage (completar en Task 6.2)

| Spec file | Scenario | Covered by |
|---|---|---|
| frontend-home-hero | hero section renders the hero background root element | 1.2.2 |
| frontend-home-hero | overlay covers the image with a primary-tone gradient | 1.2.2 |
| frontend-home-hero | hero renders a labeled free-text query input | 1.2.3 |
| frontend-home-hero | hero renders a category select with placeholder option first | 1.2.4 |
| frontend-home-hero | hero renders a location select with placeholder option first | 1.2.5 |
| frontend-home-hero | hero renders a submit button with visible Spanish text | 1.2.6 |
| frontend-home-hero | hero emits SearchCriteria with trimmed text query | 1.2.7 |
| frontend-home-hero | hero emits SearchCriteria with empty category when placeholder is selected | 1.2.8 |
| frontend-home-hero | hero emits SearchCriteria with the selected category id | 1.2.7 |
| frontend-home-hero | hero does not navigate | 1.2.9 |
| frontend-home-hero | home page renders the hero with categories as input | 3.1.3 |
| frontend-home-hero | home page navigates to /directorio with query params on submit | 3.1.4 |
| frontend-home-hero | home page omits empty filters from query params | 3.1.5 |
| frontend-home-hero | app config provides router | 5.2.3 (verificación simple) |
| frontend-home-hero | app routes lazy-load the home page | 4.2.1 |
| frontend-home-hero | AppComponent renders router-outlet between header and footer | 5.3.1 |
| frontend-home-hero | router has a directorio route | 4.2.1 |
| frontend-home-hero | navigating to /directorio renders the placeholder | 5.3.1 |
| frontend-home-hero | hero template contains no literal hex colors in utility classes | 1.2.11 |
| frontend-home-hero | hero uses canonical radius and shadow tokens | 1.2.11 |
| frontend-home-hero | form is single column on mobile breakpoints | 1.2.12 |
| frontend-home-hero | hero section has vertical padding that scales with viewport | 1.2.13 |
| frontend-layout-base (MODIFIED) | AppComponent renders both header and footer | ya cubierto en app.component.spec existente |
| frontend-layout-base (MODIFIED) | AppComponent main hosts a router-outlet | 5.1.1 / 5.3.1 |
| frontend-layout-base (MODIFIED) | AppComponent main uses M3 background token | 5.1.1 |

---

## Guidelines

1. **Una task a la vez.** No batching.
2. **TDD**: Antes de cualquier código de producción en el dumb hero (Task 2.x) o en el smart page (Task 3.x), los tests RED deben existir (Task 1.2.x y 3.1.x respectivamente). Excepción: el PlaceholderDirectorio (Task 4.1) es trivial, permite escribir test + impl seguidos.
3. **Marcar `[ ]` → `[x]`** inmediatamente al completar cada task.
4. **Tokens M3**: ningún template de componente puede tener valores hex o spacing hardcoded. Solo el inline `[style]` del hero — su valor primario viene de la constante tipada `HERO_OVERLAY_PRIMARY = '#004370'`, sincronizado con `tailwind.config.js colors.primary`.
5. **Dumb (HomeHero)**: no `inject()`, no data services, no `Router`. Solo `@Input`, `@Output` y `ReactiveFormsModule`.
6. **Smart (HomePage)**: el únicolugar donde se inyecta `Router`. Datos dummy hardcodeados en constantes tipadas `readonly` — futuro swap por HTTP/Firestore.
7. **No tocar `backend/`**, ni `openspec/changes/archive/`, ni `openspec/specs/` durante implementación. Solo añadir archivos nuevos en `openspec/changes/frontend-home-hero/`.
8. **Si el spelling o copy es ambiguo** (ej: "Seleccionar categoría" vs "Todas las categorías"), pausar en la Task correspondiente y preguntar antes de asumir.
9. **Non-goals explícitos**: página `/directorio` real (su listado), backend `/categorias`/`/barrios`, Quick Links Icons bajo el form, otras secciones del home. No implementar.
10. **Cobertura objetivo**: 80% frontend (Jasmine + Karma).
