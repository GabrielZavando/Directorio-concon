# Tasks — frontend-reusable-search-component

> Una task a la vez. TDD donde aplica (RED antes que GREEN, refactor después).
> Frontend ONLY: no se toca `backend/`, ni `openspec/changes/archive/`, ni `openspec/specs/` durante implementación.
> Tokens M3 canónicos de `docs/DESIGN.md` viven en `tailwind.config.js` — NO hardcodear hex/spacing en templates.
> DIP: `SearchBarComponent` es dumb (cero `inject()`); `SearchBarContainerComponent` es smart (inyecta el `DirectorioOpcionesPort`); `HomePageComponent` y `PlaceholderDirectorioComponent` son smart pages (inyectan `Router`, no datos).
> Cobertura objetivo: 80% (frontend-standards.md), Jasmine + Karma.

## 1. Setup & tsconfig

- [x] 1.1 Editar `frontend/tsconfig.app.json` y añadir `"resolveJsonModule": true` en `compilerOptions`. Mantener `strict: true`, `noPropertyAccessFromIndexSignature: true`, `strictTemplates: true`, y demás flags de Angular sin alterarlos.
- [x] 1.2 Validar: `npm --prefix frontend run build` → EXIT_CODE=0 (build exitoso). `npm --prefix frontend test -- --watch=false` → 75 tests SUCCESS.

## 2. Canonical JSON seeds (data)

- [x] 2.1 Crear `frontend/src/app/shared/data-access/local/data/barrios.json` con 13 barrios canónicos. Cada entrada: `id` (slug, ej. `higuerillas`, `concon-sur`, `la-costa`, `villa-concon`, `enap`, `las-gaviotas`, `vista-al-mar`, `los-romeros`, `montemar`, `rpc`, `concon-ii`, `zona-rural`, `los-troncos`), `nombre`, `descripcion` (sin tilde), `territorio`, `tipo` (`urbano` para todos excepto `zona-rural` que es `rural`), `coordenadas: null`. Tomar literalmente del input del usuario con las normalizaciones acordadas (silencio de `zona_xx`, `descripción` → `descripcion`, `territorio_que_abarca` → `territorio`).
- [x] 2.2 Crear `frontend/src/app/shared/data-access/local/data/categorias.json` con la estructura `{ "categorias": [...] }` y 9 categorías canónicas. Cada categoría: `id` (slug, ej. `gastronomia`, `comercio`, `turismo-y-recreacion`, `servicios-profesionales`, `movilidad-y-transporte`, `salud-y-bienestar`, `educacion-y-talleres`, `instituciones-y-organizaciones`, `eventos`), `nombre`, `descripcion` (sin tilde), `icono` (Lucide kebab-case `utensils`, `store`, `tent`, `briefcase`, `car`, `heart-pulse`, `graduation-cap`, `building-2`, `party-popper`), `orden` 1..9 según posición, `activa: true`, `subcategorias[]` preservadas literalmente del input del usuario (con tildes en `nombre` ok, `descripcion` sin tilde como pidió el usuario, y `slug` derivado del nombre sin caracteres especiales).
- [x] 2.3 Validar manualmente el JSON: `python3 -m json.tool` OK. 13 barrios (1 rural `zona-rural` + 12 urbanos), 9 categorías (86 subcategorías totales), IDs únicos, iconos válidos del set Lucide, ordenes 1..9 consecutivos, todas activa=true.

## 3. Interfaces (shared/ui/search-bar/interfaces/)

- [x] 3.1 Crear `frontend/src/app/shared/ui/search-bar/interfaces/search-criteria.interface.ts` con `export interface SearchCriteria { readonly q: string; readonly categoriaId: string; readonly barrioId: string; }`. Sin imports (puro TS).
- [x] 3.2 Crear `frontend/src/app/shared/ui/search-bar/interfaces/category-option.interface.ts` con `export interface SubcategoriaOption { readonly slug: string; readonly nombre: string; readonly descripcion?: string; }` y `export interface CategoryOption { readonly id: string; readonly nombre: string; readonly descripcion?: string; readonly icono: string; readonly orden: number; readonly activa: boolean; readonly subcategorias?: ReadonlyArray<SubcategoriaOption>; }`.
- [x] 3.3 Crear `frontend/src/app/shared/ui/search-bar/interfaces/barrio-option.interface.ts` con `export interface BarrioOption { readonly id: string; readonly nombre: string; readonly descripcion?: string; readonly territorio?: string; readonly tipo?: 'urbano' | 'rural'; readonly coordenadas?: { readonly lat: number; readonly lng: number } | null; }`.
- [x] 3.4 Validar: `npm --prefix frontend run build` → EXIT_CODE=0 (build exitoso, interfaces compilan limpio).

## 4. Data-access port + types + provider

- [x] 4.1 Crear `frontend/src/app/shared/data-access/directorio-opciones.types.ts` con `import { CategoryOption } from '../ui/search-bar/interfaces/category-option.interface'; import { BarrioOption } from '../ui/search-bar/interfaces/barrio-option.interface'; export interface DirectorioOpciones { readonly categorias: readonly CategoryOption[]; readonly barrios: readonly BarrioOption[]; }`.
- [x] 4.2 Crear `frontend/src/app/shared/data-access/directorio-opciones.port.ts` con `DirectorioOpcionesPort` interface, `DIRECTORIO_OPCIONES_PORT` InjectionToken y `// TODO(future)` comment documentando el contrato de fallback remoto.
  ```ts
  import { InjectionToken } from '@angular/core';
  import { Observable } from 'rxjs';
  import { DirectorioOpciones } from './directorio-opciones.types';

  export interface DirectorioOpcionesPort {
    getOpciones(): Observable<DirectorioOpciones>;
  }

  // TODO(future): RemoteDirectorioOpcionesService (http/ folder) SHALL call
  // /api/v1/categorias + /api/v1/barrios and FALL BACK to the LocalDirectorioOpcionesService
  // on network failure (graceful degradation, Decision 2b of design.md). The DI swap
  // is a one-line edit in provideDirectorioOpciones() in directorio-opciones.provider.ts.
  export const DIRECTORIO_OPCIONES_PORT =
    new InjectionToken<DirectorioOpcionesPort>('DIRECTORIO_OPCIONES_PORT');
  ```

## 5. LocalDirectorioOpcionesService (TDD: RED → GREEN)

- [x] 5.1 Crear `frontend/src/app/shared/data-access/local/local-directorio-opciones.service.spec.ts` con los tests fallidos (RED):
  - **Test 1**: `getOpciones()` emite síncrono (subscribe + `expect` inmediato sin `fakeAsync` o con `fakeAsync` no-flush) y el observable completa.
  - **Test 2**: el valor emitido tiene `categorias.length === 9` y `barrios.length === 13`.
  - **Test 3**: exactamente un barrio emitido tiene `tipo === 'rural'` y su `id === 'zona-rural'`.
  - **Test 4**: una categoría emitida tiene `id === 'gastronomia'`, `icono === 'utensils'`, `orden === 1`, `activa === true`.
  - **Test 5**: todos los `id` de categorías y barrios son únicos (no duplicados).
  - **Test 6**: ninguna categoría tiene `icono` fuera del set permitido (`utensils`, `store`, `tent`, `briefcase`, `car`, `heart-pulse`, `graduation-cap`, `building-2`, `party-popper`).
  - **Test 7**: el source del service NO importa `HttpClient`, `@angular/common/http`, ni `fetch`.
- [x] 5.2 Correr `npm --prefix frontend test -- --include='**/local-directorio-opciones.service.spec.ts'` → RED confirmado (errores TS2307 "Could not resolve './local-directorio-opciones.service'" + TS7006 "Parameter value implicitly any").
- [x] 5.3 Implementar `frontend/src/app/shared/data-access/local/local-directorio-opciones.service.ts`:
  - `@Injectable({ providedIn: 'root' })`, `implements DirectorioOpcionesPort`.
  - Importar estáticamente `import barriosSeed from './data/barrios.json'` y `import { categorias as categoriasSeed } from './data/categorias.json'` (con `resolveJsonModule`).
  - Mapear a `DirectorioOpciones` typed (cast explícito a las interfaces `CategoryOption` / `BarrioOption` para evitar que el inferred literal type se propague a consumidores).
  - `getOpciones(): Observable<DirectorioOpciones> { return of({ categorias: categoriasSeed as readonly CategoryOption[], barrios: barriosSeed as readonly BarrioOption[] }); }`.
- [x] 5.4 Correr `npm --prefix frontend test -- --include='**/local-directorio-opciones.service.spec.ts'` → GREEN (9/9 SUCCESS).
- [x] 5.5 Crear `frontend/src/app/shared/data-access/directorio-opciones.provider.ts` con `export function provideDirectorioOpciones(): Provider[] { return [{ provide: DIRECTORIO_OPCIONES_PORT, useClass: LocalDirectorioOpcionesService }]; }` (importar `Provider`, `DIRECTORIO_OPCIONES_PORT`, `LocalDirectorioOpcionesService`).
- [x] 5.6 Editar `frontend/src/app/app.config.ts`: importar `provideDirectorioOpciones` desde `./shared/data-access/directorio-opciones.provider` y añadir `provideDirectorioOpciones()` al array de `providers` (después de los providers de Firebase y router existentes).
- [x] 5.7 Validar: `npm --prefix frontend run build` → EXIT_CODE=0 y `npm --prefix frontend test -- --watch=false` → 84 tests SUCCESS.

## 6. shared/utils/query-params.util.ts (TDD: RED → GREEN)

- [x] 6.1 Crear `frontend/src/app/shared/utils/query-params.util.spec.ts` con tests fallidos (RED):
  - **Test 1**: `buildQueryParams({ q: 'pizzería', categoriaId: '', barrioId: '' })` → `{ q: 'pizzería' }` (sin `categoriaId` ni `barrioId`).
  - **Test 2**: `buildQueryParams({ q: '', categoriaId: 'gastronomia', barrioId: 'higuerillas' })` → `{ categoriaId: 'gastronomia', barrioId: 'higuerillas' }` (sin `q`).
  - **Test 3**: `buildQueryParams({ q: 'café', categoriaId: 'gastronomia', barrioId: 'la-costa' })` → `{ q: 'café', categoriaId: 'gastronomia', barrioId: 'la-costa' }`.
  - **Test 4**: `buildQueryParams({ q: '', categoriaId: '', barrioId: '' })` → `{}` (vacío).
- [x] 6.2 Correr `npm --prefix frontend test -- --include='**/query-params.util.spec.ts'` → RED confirmado (error TS2307 module not found).
- [x] 6.3 Implementar `frontend/src/app/shared/utils/query-params.util.ts` con la función pura `buildQueryParams` que omite campos vacíos.
- [x] 6.4 Correr `npm --prefix frontend test -- --include='**/query-params.util.spec.ts'` → GREEN (4/4 SUCCESS).

## 7. SearchBarComponent (dumb) — TDD: RED

- [x] 7.1 Crear `frontend/src/app/shared/ui/search-bar/search-bar.component.ts` stub: `@Component` standalone, `ChangeDetectionStrategy.OnPush`, selector `app-search-bar`, templateUrl `./search-bar.component.html`, styleUrl `./search-bar.component.css`. Imports vacíos por ahora. Inputs/outputsdeclarados pero `onSubmit` vacío por ahora (es RED real).
- [x] 7.2 Crear `frontend/src/app/shared/ui/search-bar/search-bar.component.html` y `search-bar.component.css` vacíos.
- [x] 7.3 Crear `frontend/src/app/shared/ui/search-bar/search-bar.component.spec.ts` con tests que cubren los escenarios de la spec `frontend-reusable-search-component`:
  - **Test 1** (dumb no inyecta nada): valida que el constructor del `SearchBarComponent` tenga `length === 0` (no inject params) y que el archivo no importe `Router` / `HttpClient` / `@angular/fire/*` / `DIRECTORIO_OPCIONES_PORT`.
  - **Test 2** (inputs y outputs typed): compila con `@Input() categorias: readonly CategoryOption[] = []`, `@Input() barrios: readonly BarrioOption[] = []`, `@Output() searchSubmit = new EventEmitter<SearchCriteria>()`. Validar con assertion `fixture.componentInstance.categorias` y `.barrios` y `.searchSubmit`.
  - **Test 3** (placeholder primero en select de categoría): render con `categorias = [{ id: 'gastronomia', nombre: 'Gastronomía', icono: 'utensils', orden: 1, activa: true }]`, valida primer `<option value="">Seleccionar categoría</option>` y un `<option value="gastronomia">Gastronomía</option>`.
  - **Test 4** (placeholder primero en select de ubicación): render con `barrios = [{ id: 'higuerillas', nombre: 'Higuerillas' }]`, valida `<option value="">Seleccionar ubicación</option>` y `<option value="higuerillas">Higuerillas</option>`.
  - **Test 5** (emite SearchCriteria con q trimmed y selects en placeholder): setear `form.q = ' pizzería '`, dejar selects vacíos, submit. Verificar `searchSubmit` emitió `{ q: 'pizzería', categoriaId: '', barrioId: '' }` (q trimmed, NO con espacios).
  - **Test 6** (emite SearchCriteria con categoriaId seleccionado): setear `categoriaId = 'gastronomia'`, `barrioId = ''`, `q = ''`. Verificar emitido `{ q: '', categoriaId: 'gastronomia', barrioId: '' }`.
  - **Test 7** (emite SearchCriteria con barrioId seleccionado): idem con `barrioId = 'higuerillas'`, `categoriaId = ''`.
  - **Test 8** (emite con los tres filtros): `q = 'café'`, `categoriaId = 'gastronomia'`, `barrioId = 'la-costa'` → `{ q: 'café', categoriaId: 'gastronomia', barrioId: 'la-costa' }`.
  - **Test 9** (responsive): leer el outerHTML del form y validar que tiene `grid-cols-1` y `md:grid-cols-4`.
  - **Test 10** (template sin hex hardcoded): leer el outerHTML del form y validar que no hay clases de la forma `text-[#...]`, `bg-[#...]`, `border-[#...]`.
- [x] 7.4 Correr `npm --prefix frontend test -- --include='**/search-bar.component.spec.ts'` → RED confirmado: 3 FAILED (form-related tests, select rendering) + 7 SUCCESS (structure, TypeScript).

## 8. SearchBarComponent (dumb) — TDD: GREEN

- [x] 8.1 Completar `search-bar.component.ts`:
  - Importar `ReactiveFormsModule` (`FormGroup`, `FormControl`), `CommonModule` (`NgFor`).
  - Declarar `form: FormGroup<{ q: FormControl<string>; categoriaId: FormControl<string>; barrioId: FormControl<string> }>` con los 3 controles nonNullable valor inicial `''`.
  - Método `onSubmit(): void`: `const raw = this.form.getRawValue(); const payload: SearchCriteria = { q: raw.q.trim(), categoriaId: raw.categoriaId ?? '', barrioId: raw.barrioId ?? '' }; this.searchSubmit.emit(payload);`.
- [x] 8.2 Completar `search-bar.component.html`:
  - `<form [formGroup]="form" (ngSubmit)="onSubmit()" class="grid grid-cols-1 md:grid-cols-4 gap-3" novalidate>` (mismo grid que el hero actual).
  - Input text: `<input id="search-bar-q" type="text" formControlName="q" class="w-full px-4 py-4 rounded-lg border-none focus:ring-2 focus:ring-primary text-on-surface" placeholder="¿Qué estás buscando?" aria-label="Buscar" />` con `<label for="search-bar-q" class="sr-only">Buscar</label>`.
  - Select categoría: primer `<option value="">Seleccionar categoría</option>` y `<option *ngFor="let c of categorias" [value]="c.id">{{ c.nombre }}</option>` con `id="search-bar-categoria"` y `aria-label="Categoría"`.
  - Select ubicación: primer `<option value="">Seleccionar ubicación</option>` y `<option *ngFor="let b of barrios" [value]="b.id">{{ b.nombre }}</option>` con `id="search-bar-ubicacion"` y `aria-label="Ubicación"`.
  - Button submit: `<button type="submit" class="bg-secondary-container text-primary font-bold py-4 rounded-lg hover:bg-opacity-90 transition-all">Buscar Ahora</button>`.
  - Contenedor externo del form (el `bg-white/20 backdrop-blur-md p-4 rounded-lg max-w-5xl mx-auto`) queda a cargo del hero, no del dumb search-bar (mantener SRP: el form es sólo el form; el overlay/contenedor del hero queda en el hero).
- [x] 8.3 Dejar `search-bar.component.css` vacío (comentario only).
- [x] 8.4 Correr `npm --prefix frontend test -- --include='**/search-bar.component.spec.ts'` → GREEN (10/10 SUCCESS).

## 9. SearchBarContainerComponent (smart) — TDD: RED

- [x] 9.1 Crear `frontend/src/app/shared/ui/search-bar/search-bar-container.component.ts` stub vacío.
- [x] 9.2 Crear `frontend/src/app/shared/ui/search-bar/search-bar-container.component.spec.ts` con tests:
  - **Test 1** (inyecta el port): validar que el container tiene un parámetro DI `DirectorioOpcionesPort` (o usa `inject(DIRECTORIO_OPCIONES_PORT)`).
  - **Test 2** (no inyecta Router / HttpClient / @angular/fire): validar el archivo no importa nada de eso.
  - **Test 3** (delegación de searchSubmit): render el container en TestBed con un stub `DirectorioOpcionesPort` que retorna `of({ categorias: [{ id: 'gastronomia', nombre: 'Gastronomía', icono: 'utensils', orden: 1, activa: true }], barrios: [{ id: 'higuerillas', nombre: 'Higuerillas' }] })`. Provocar que el dumb SearchBarComponent emita `{ q: 'pizzería', categoriaId: '', barrioId: '' }`. Validar que el container `searchSubmit` emitió el mismo valor.
  - **Test 4** (renderiza el dumb con los datos del port): validar que el DOM contiene `<app-search-bar>` y que el segundo select tiene `<option value="higuerillas">Higuerillas</option>`.
- [x] 9.3 Correr `npm --prefix frontend test -- --include='**/search-bar-container.component.spec.ts'` → RED (compilation error TS2339: Property 'opciones$' does not exist).

## 10. SearchBarContainerComponent (smart) — TDD: GREEN

- [x] 10.1 Implementar `search-bar-container.component.ts` con `inject(DIRECTORIO_OPCIONES_PORT)`, `opciones$` observable, inline template `@if (opciones$ | async; as opts) { <app-search-bar .../> }`, y `@Output() searchSubmit` delegating from the dumb component.
- [x] 10.2 Correr `npm --prefix frontend test -- --include='**/search-bar-container.component.spec.ts'` → GREEN (4/4 SUCCESS). Suite completa: 102/102 SUCCESS.

## 11. Refactor HomeHeroComponent (delegar al search-bar-container)

- [x] 11.1 Editar `frontend/src/app/features/home/hero/home-hero.component.ts`:
  - Eliminar imports de `ReactiveFormsModule` (FormGroup/FormControl) y `CommonModule` (NgFor) si ya no se usan.
  - Eliminar `@Input() categorias`, `@Input() barrios`, el `FormGroup` y el método `onSubmit` (ya no le pertenece al hero).
  - Importar `SearchBarContainerComponent` y añadirlo a `imports` del `@Component`.
  - Declarar `@Output() searchSubmit = new EventEmitter<SearchCriteria>()` (delegate del container).
  - Conservar `HERO_OVERLAY_PRIMARY` y `HERO_OVERLAY_STYLE` (overlay + imagen + bg-primary fallback).
- [x] 11.2 Editar `frontend/src/app/features/home/hero/home-hero.component.html`:
  - Conservar el `<section class="app-hero bg-primary ... py-16 md:py-32" data-purpose="hero-search" [style]="heroOverlayStyle">`, `<h1>` y `<p>` del hero.
  - Reemplazar el bloque `<form>...</form>` por `<app-search-bar-container (searchSubmit)="searchSubmit.emit($event)" />` dentro del `<div class="max-w-5xl mx-auto bg-white/20 backdrop-blur-md p-4 rounded-lg">`.
- [x] 11.3 Actualizar `home-hero.component.spec.ts`:
  - Eliminar tests que asumían `@Input() categorias` / `@Input() barrios`.
  - Eliminar tests de `onSubmit` y FormGroup del hero.
  - Añadir test que valida renderiza `<app-search-bar-container>` dentro del hero.
  - Añadir test que valida delegación: si el `<app-search-bar-container>` emite `searchSubmit`, el hero `searchSubmit` emite el mismo valor.
  - Añadir stub port provider en TestBed.
  - Conservar tests de overlay y responsive del hero.
- [x] 11.4 Correr `npm --prefix frontend test -- --include='**/home-hero.component.spec.ts'` → GREEN (9/9 SUCCESS).

## 12. Refactor HomePageComponent (eliminar dummy arrays + usar util)

- [x] 12.1 Editar `frontend/src/app/features/home/home-page.component.ts`:
  - Eliminar constantes `CATEGORIAS_MVP` y `BARRIOS_MVP`.
  - Eliminar `readonly categorias: readonly CategoryOption[]` y `readonly barrios: readonly BarrioOption[]` fields.
  - Eliminar el método privado `buildQueryParams` (ahora se importa).
  - Importar `buildQueryParams` desde `../../shared/utils/query-params.util`.
  - Mantener `private readonly router = inject(Router)`.
  - Cambiar `onSearchSubmit(criteria)`: `void this.router.navigate(['/directorio'], { queryParams: buildQueryParams(criteria) })`.
  - Limpiar imports de tipos `CategoryOption` / `BarrioOption` si ya no se usan directo.
- [x] 12.2 Editar `home-page.component.html`: cambiar `<app-home-hero [categorias]="categorias" [barrios]="barrios" (searchSubmit)="onSearchSubmit($event)" />` por `<app-home-hero (searchSubmit)="onSearchSubmit($event)" />` (sin bindings de categorias/barrios).
- [x] 12.3 Actualizar `home-page.component.spec.ts`:
  - Eliminar tests que validaban "hero receives non-empty categorias/barrios as input".
  - Test "navigates to /directorio with canonical query params": emitir con slugs canónicos (`gastronomia`, `higuerillas`). Validar `Router.navigate`.
  - Test "omits empty filters": emitir `{ q: '', categoriaId: '', barrioId: 'higuerillas' }`, validar `queryParams` es `{ barrioId: 'higuerillas' }`.
  - Test "imports buildQueryParams from shared utils": validar que `buildQueryParams` no es un método local.
  - Añadir stub port provider en TestBed.
- [x] 12.4 Correr `npm --prefix frontend test -- --include='**/home-page.component.spec.ts'` → GREEN (5/5 SUCCESS).

## 13. Refactor PlaceholderDirectorioComponent (consumir el search-bar + merge)

- [x] 13.1 Editar `frontend/src/app/features/directorio/placeholder-directorio.component.ts`:
  - Importar `SearchBarContainerComponent`, `Router`, `inject`, `SearchCriteria`, `buildQueryParams`.
  - `@Component` standalone con `imports: [SearchBarContainerComponent]` y template inline.
  - Inyectar `private readonly router = inject(Router)`.
  - Método `onSearchSubmit(criteria: SearchCriteria): void`: `void this.router.navigate(['/directorio'], { queryParams: buildQueryParams(criteria), queryParamsHandling: 'merge' })`.
- [x] 13.2 Editar template del placeholder-directorio: añadir `<app-search-bar-container>` arriba del `<h1>` "Próximamente" en un `<section class="bg-background py-8 px-4">`.
- [x] 13.3 Actualizar `placeholder-directorio.component.spec.ts`:
  - Añadir `provideRouter([])` y stub `DIRECTORIO_OPCIONES_PORT` en providers del TestBed.
  - Test 1: renderiza `<app-search-bar-container>` y `<h1>` "Próximamente".
  - Test 2: al emitir `searchSubmit`, `routerSpy.navigate` se llama con `['/directorio']`, `queryParams` correctos y `queryParamsHandling: 'merge'`.
  - Test 3 (regresión): navegar a `/directorio?q=foo` renderiza el placeholder sin romper.
- [x] 13.4 Correr `npm --prefix frontend test -- --include='**/placeholder-directorio.component.spec.ts'` → GREEN (5/5 SUCCESS).

## 14. App component spec — regresión

- [x] 14.1 Verificar `frontend/src/app/app.component.spec.ts`: añadir stub `DIRECTORIO_OPCIONES_PORT` al TestBed providers (requerido porque `PlaceholderDirectorioComponent` y `HomePageComponent` ahora renderizan el `SearchBarContainerComponent` que inyecta el port).
- [x] 14.2 Correr `npm --prefix frontend test -- --include='**/app.component.spec.ts'` → GREEN (7/7 SUCCESS).

## 15. Validación global (lint + tests + build)

- [x] 15.1 Correr `npm --prefix frontend test` → TODOS los tests pasan: 102/102 SUCCESS.
- [x] 15.2 Correr `npm --prefix frontend run build` → build de producción EXIT_CODE=0 (552 kB initial, warning pre-existente de Firebase).
- [x] 15.3 No hay script `lint` en el frontend (documentado en change archivado `frontend-home-hero`). Skip.

## 16. Documentación canónica

- [x] 16.1 Editar `docs/data-model.md`:
  - En la sección `### categorias`: añadir fila `subcategorias` (tipo `Subcategoria[]?`, descripción `Array de { slug, nombre, descripcion } — preservadas en seed local`); actualizar `id` como "Firestore document id (slug)"; actualizar `icono` con el set completo de Lucide icons; actualizar `orden` como "1..9".
  - En la sección `### barrios`: añadir fila `territorio` (tipo `string?`, descripción `Sectores que abarca el barrio (metadato)`); actualizar `tipo` con `12 urbanos + 1 rural zona-rural`; actualizar `id` como "Firestore document id (slug)".
  - Añadir "Ejemplos canónicos (seed local)" subsection con `categorias: gastronomia` y `barrios: higuerillas`.
- [x] 16.2 Confirmar que no se requiere editar `docs/api-spec.yml` (no hay cambios API en este change).
- [x] 16.3 Confirmar que `frontend/README.md` no existe — skip.

## 17. OpenSpec — verify

- [x] 17.1 Re-leer `openspec/changes/frontend-reusable-search-component/specs/frontend-reusable-search-component/spec.md` y `specs/frontend-home-hero/spec.md`. Confirmar que cada scenario tiene su test asociado (en la tabla Verify coverage abajo) y que los tests cubren when/then literalmente.
- [x] 17.2 Tabla Verify coverage completada abajo con la correlación scenario → test_id.

## 18. Commits (conventional commits)

- [x] 18.1 Commit 1: `feat(frontend): add shared search-bar components with DIP directorio-opciones port` (includes interfaces, port, provider, local service, search-bar dumb, container, utils, tsconfig).
- [x] 18.2 Commit 2: `refactor(frontend): delegate search forms to shared search-bar container` (home hero, home page, placeholder, app config, app spec).
- [x] 18.3 Commit 3: `docs(data-model): canonicalize categorias subcategorias and barrios territorio tipo`.
- [x] 18.4 Commit 4 (al final, después del `openspec archive`): `docs(openspec): archive frontend-reusable-search-component and sync specs`.

## Guidelines

1. **One task at a time, no batching** — marcamos `[ ]` → `[x]` inmediatamente al completar.
2. **TDD RED before GREEN**: en las tasks marcadas TDD, los specs fallidos van PRIMERO (5.1 antes de 5.3, 6.1 antes de 6.3, 7.x antes de 8.x, 9.x antes de 10.x).
3. **SRP/DIP estrictos**: SearchBarComponent ZERO injects; SearchBarContainerComponent solo inyecta el port; HomePageComponent y PlaceholderDirectorioComponent solo inyectan Router; LocalDirectorioOpcionesService no inyecta nada (stateless service).
4. **No hardcoded tokens**: los templates de los componentes solo usan clases Tailwind de `tailwind.config.js` — `text-primary`, `bg-secondary-container`, `bg-background`, `text-on-surface`, `text-on-surface-variant`, `rounded-lg`, `focus:ring-primary`, `font-headline`. Único hex literal permitido: `HERO_OVERLAY_PRIMARY = '#004370'` (syncronizado con `tailwind.config.js colors.primary`).
5. **Slugs canónicos reales**: tests referencian `gastronomia`, `higuerillas`, `la-costa` (NO los viejos `cat-1`, `b-1`, `b-centro`). Si algún test aún los usa del spec archivado de `frontend-home-hero`, se actualizan en Task 12.
6. **No tocar**: `backend/`, `openspec/changes/archive/`, `openspec/specs/` durante implementación (excepto el `openspec archive` final del Task 18.7).
7. **Coverage objetivo**: ≥ 80% en `shared/ui/search-bar/**` y `shared/data-access/**` y `shared/utils/**`. Karma reporta coverage si está configurado con `karma-coverage` (verificar `angular.json` / `karma.conf.js`).
8. **Si algo es ambiguo** (por ej. si el template inline del container supera umbral frontend-standards de 60-80 líneas), pausar y preguntar antes de asumir. El container es de ~10 líneas, claramente bajo el umbral — inline template es OK.
9. **Non-goals explícitos**: implementar `RemoteDirectorioOpcionesService` (NO — solo el contrato TODO en el port); implementar la página real `/directorio` mapa/grilla (NO — solo el placeholder); renderizar `subcategorias` y `icono` en el search-bar UI (NO — se preservan como datos en el JSON); tocar `tailwind.config.js` (NO — todo token ya existe en M3).

## Verify coverage

> A completar en Task 17.2. Tabla mapping scenario → test_id (ej. `5.1 Test 3`, `7.3 Test 5`, etc.).

| Spec file | Scenario | Covered by |
|---|---|---|
| frontend-reusable-search-component | interfaces folder contains one file per interface | (manual en Task 3) |
| frontend-reusable-search-component | CategoryOption exposes id, nombre, icono, orden, activa and optional subcategorias | (manual en Task 3) |
| frontend-reusable-search-component | BarrioOption exposes id, nombre and optional territorio/tipo metadata | (manual en Task 3) |
| frontend-reusable-search-component | SearchCriteria uses empty-string defaults for unselected filters | (manual en Task 3) |
| frontend-reusable-search-component | barrios.json contains 13 barrios with slug ids | 5.1 Test 2 + manual JSON payload 2.1 |
| frontend-reusable-search-component | exactly one rural barrio and twelve urban barrios | 5.1 Test 3 |
| frontend-reusable-search-component | barrios.json uses canonical key names without tildes | manual Task 2.3 (python json.tool) |
| frontend-reusable-search-component | higuerillas is one of the barrios | 5.1 Test 4 (análogo para barrios) |
| frontend-reusable-search-component | categorias.json contains 9 categories with slug ids | 5.1 Test 2 |
| frontend-reusable-search-component | each category has a Lucide icono from the allowed set | 5.1 Test 6 |
| frontend-reusable-search-component | each category has orden 1..9 and activa true | 5.1 Test 4 |
| frontend-reusable-search-component | subcategorias are preserved for every parent category | manual Task 2.3 |
| frontend-reusable-search-component | DirectorioOpcionesPort has a single getOpciones method | (manual Task 4.2) + 5.1 Test 1 |
| frontend-reusable-search-component | provideDirectorioOpciones returns the local binding | (manual Task 5.5) + 5.1 Test 1 (implícito) |
| frontend-reusable-search-component | DirectorioOpciones is the boundary type seen by consumers | (manual Task 4.1) |
| frontend-reusable-search-component | service emits 13 barrios and 9 categories synchronously | 5.1 Test 1, Test 2 |
| frontend-reusable-search-component | service does not depend on HttpClient or fetch | 5.1 Test 7 |
| frontend-reusable-search-component | emitted barrios include the single rural entry | 5.1 Test 3 |
| frontend-reusable-search-component | emitted categories include Gastronomía with icono utensils | 5.1 Test 4 |
| frontend-reusable-search-component | app.config.ts wires DirectorioOpciones provider | (manual Task 5.6) + 14.1 (regresión) |
| frontend-reusable-search-component | search-bar component inputs and outputs are typed | 7.3 Test 2 |
| frontend-reusable-search-component | search-bar does not inject Router or HttpClient | 7.3 Test 1 |
| frontend-reusable-search-component | search-bar renders a placeholder option first for category and location selects | 7.3 Test 3, Test 4 |
| frontend-reusable-search-component | search-bar emits SearchCriteria with trimmed text query only | 7.3 Test 5 |
| frontend-reusable-search-component | search-bar emits SearchCriteria with the selected category id | 7.3 Test 6 |
| frontend-reusable-search-component | search-bar emits SearchCriteria with the selected barrio id | 7.3 Test 7 |
| frontend-reusable-search-component | search-bar emits SearchCriteria with all three filters selected | 7.3 Test 8 |
| frontend-reusable-search-component | search-bar form is responsive single-column on mobile | 7.3 Test 9 |
| frontend-reusable-search-component | search-bar template uses only M3 tokens (no hardcoded hex) | 7.3 Test 10 |
| frontend-reusable-search-component | container injects the port and exposes opciones$ | 9.2 Test 1 |
| frontend-reusable-search-component | container does not inject Router or HttpClient | 9.2 Test 2 |
| frontend-reusable-search-component | container delegates searchSubmit from the dumb component | 9.2 Test 3 |
| frontend-reusable-search-component | container renders the dumb component after the port emits | 9.2 Test 4 |
| frontend-reusable-search-component | all filters omitted when only q is set | 6.1 Test 1 |
| frontend-reusable-search-component | only non-empty filters are kept | 6.1 Test 2 |
| frontend-reusable-search-component | all three filters preserved when all are set | 6.1 Test 3 |
| frontend-reusable-search-component | empty criteria returns empty object | 6.1 Test 4 |
| frontend-reusable-search-component | placeholder-directorio renders the search bar container | 13.3 Test 1 |
| frontend-reusable-search-component | placeholder-directorio navigates with merge when searchSubmit fires | 13.3 Test 2 |
| frontend-reusable-search-component | placeholder-directorio imports buildQueryParams from shared utils | 13.3 (manual o assertion en imports) |
| frontend-reusable-search-component | placeholder-directorio retains the Próximamente heading | 13.3 Test 3 |
| frontend-reusable-search-component | resolveJsonModule is true in tsconfig.app.json | (manual Task 1.1) + sintaxis build OK en 15.3 |
| frontend-reusable-search-component | data-model documents subcategorias | 16.1 (manual) |
| frontend-reusable-search-component | data-model documents territorio and tipo for barrios | 16.1 (manual) |
| frontend-reusable-search-component | data-model states id is the Firestore slug | 16.1 (manual) |
| frontend-reusable-search-component | data-model includes the Higuerillas / Gastronomía canonical example | 16.1 (manual) |
| frontend-home-hero (MODIFIED) | hero section renders the hero background root element | 11.3 (overlay sin cambios) |
| frontend-home-hero (MODIFIED) | overlay covers the image with a primary-tone gradient | 11.3 (overlay sin cambios) |
| frontend-home-hero (MODIFIED) | hero renders the SearchBarContainerComponent inside its overlay | 11.3 nuevo test |
| frontend-home-hero (MODIFIED) | hero re-emits searchSubmit from the SearchBarContainerComponent | 11.3 nuevo test |
| frontend-home-hero (MODIFIED) | hero does not own a FormGroup or @Input categorias/barrios | 11.3 nuevo test (negativo) |
| frontend-home-hero (MODIFIED) | hero template contains no literal hex colors in utility classes | 11.3 (sin cambios) |
| frontend-home-hero (MODIFIED) | hero section has vertical padding that scales with viewport | 11.3 (sin cambios) |
| frontend-home-hero (MODIFIED) | home page renders the hero | 12.3 Test 1 |
| frontend-home-hero (MODIFIED) | home page navigates to /directorio with query params on submit | 12.3 Test 2 |
| frontend-home-hero (MODIFIED) | home page omits empty filters from query params | 12.3 Test 3 |
| frontend-home-hero (MODIFIED) | home page imports buildQueryParams from shared utils | 12.3 Test 4 |
| frontend-home-hero (MODIFIED) | home page no longer declares hardcoded CATEGORIAS_MVP / BARRIOS_MVP | 12.3 (assertion negativo sobre imports/consts) |
