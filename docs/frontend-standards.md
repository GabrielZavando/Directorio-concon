# Frontend Standards

> Personalizar este archivo con el stack frontend real del proyecto.

## Componentes

- Un componente = una responsabilidad
- Props tipadas explícitamente, sin `any`
- Estados locales para UI, stores globales para dominio
- Componentes presentacionales separados de contenedores con lógica
- Nombres de componentes en PascalCase, archivos igual

## UI/UX

- Accesibilidad: ARIA labels en elementos interactivos
- Estados de carga, error y vacío siempre implementados
- Formularios con validación client-side y feedback de error visible
- Mobile-first, diseño responsivo obligatorio
- Nunca mostrar datos parciales al usuario

## Gestión de estado

- Estado local (`useState`, `ref`) para estado de UI temporal
- Estado global para datos compartidos entre rutas
- No duplicar estado: single source of truth
- Side effects en hooks/composables, nunca directamente en componentes

## Testing frontend

- Unit tests para lógica de componentes y hooks
- Integration tests para flujos de usuario
- Snapshots solo para componentes puramente visuales estables
- Cobertura mínima: 80%

## Performance

- Lazy loading de rutas y componentes pesados
- Imágenes optimizadas con formatos modernos (WebP, AVIF)
- No bloquear el main thread con cálculos síncronos pesados
- Bundle size monitoreado en CI

## Principios de Diseño — Frontend (Angular)

### SRP (Single Responsibility)

- **Smart (container) vs Dumb (presentational)**: dumb components solo reciben inputs y emiten outputs — **nunca** inyectan data services (`HttpClient`, Firestore, stores). Si un componente necesita datos → smart wrapper.
- Un componente = una responsabilidad. Si mezcla presentación + lógica de negocio → separar.

### DIP (Dependency Inversion)

- Nunca instanciar `HttpClient` directamente con `new`. Usar DI de Angular (`inject(HttpClient)`).
- Services deben depender de interfaces abstractas (token inyectable), no de implementaciones concretas.

### ISP (Interface Segregation)

- Selectors específicos (`selectEmpresas`, `selectCategorias`) en lugar de un solo `Store<AppState>` monolítico.
- Inputs de componentes: ≤ 5 inputs por componente. Si crece, dividir en sub-componentes.

### Umbrales (CI)

| Métrica | Umbral | Config CI |
|---|---|---|
| `max-lines` por archivo | 400 | `templates/ci/eslintrc.frontend.js` |
| Inline template | >60–80 líneas → extraer a archivo separado | Review manual |
| Component inputs | ≤5 | Review manual |

## Principios de Diseño — Astro

> **Referencia-only**: Astro no se usa actualmente en el proyecto. Aplica si se adopta en el futuro.

- **SRP a nivel componente**: cada componente `.astro` tiene una responsabilidad de UI.
- **Frontmatter sin lógica de negocio no trivial**: el script del frontmatter solo debe hacer fetch de datos y pasar props. La lógica de presentación va en el template.
- **Islands para interactividad**: cualquier componente interactivo (JS client-side) se aísla con `client:*` directives.

## Stack específico del proyecto

```
Framework: Angular 20 standalone (lazy loading, OnPush change detection)
BaaS:       Firebase Web SDK 11 + @angular/fire 20 (mismo proyecto Firebase que el backend)
CSS/UI:     TailwindCSS v3 (public site, utility-first, tokens from docs/DESIGN.md)
            Angular Material (panel admin ONLY — futuro, fuera de MVP)
State:      RxJS + Angular Services
Forms:      Reactive Forms
Maps:       @angular/google-maps (vista mapa interactivo)
Skeletons:  ngx-skeleton-loader (estados de carga)
Icons:      lucide-angular (consistente con categorias.icono de data-model.md)
Build:      Angular CLI / esbuild (@angular/build)
Tests:      Jasmine + Karma (objetivo 80% cobertura)
Deploy:     TBD (VPS Nginx o Firebase Hosting, decisión futura)
Design:     "Dunas y Océano" — ver docs/DESIGN.md (canónico) + docs/{home,login,mapa,perfil}/ (referencias)
```

### Sistema de diseño — "Dunas y Océano" (canónico)

Fuente canónica: [`docs/DESIGN.md`](DESIGN.md). Originado en Stitch (referencias por pantalla en `docs/{home,login,mapa,perfil}/code.html` + `.screen.jpg`).

**Reglas obligatorias para todos los componentes Angular del sitio público:**

1. **No hardcodear tokens**: ningún componente Angular puede tener valores hex de color, espaciado, radio o sombra en literals. TODO debe salir de `docs/DESIGN.md` (consumido vía `tailwind.config.js` o vía CSS custom properties derivadas del front-matter YAML).
2. **TailwindCSS v3**: `frontend/tailwind.config.js` debe extender `theme.extend.colors|fontFamily|borderRadius|boxShadow` con los tokens de `docs/DESIGN.md`:
   - `colors.primary` = `#004370` (Ocean Blue), `colors.secondary` = `#fadeba` (Sand Beige), `colors.tertiary` = `#1d4a19` (Pine Green), accent Sunset Orange derivado de `rgba(0, 67, 112, ...)`.
   - `fontFamily.headline` = `['Montserrat', 'sans-serif']`, `fontFamily.sans` = `['Inter', 'sans-serif']`.
   - `borderRadius`: `sm 0.25rem`, `DEFAULT 0.5rem`, `md 0.75rem`, `lg 1rem`, `xl 1.5rem`.
   - `boxShadow`: nivel 0 flat, nivel 1 low static cards, nivel 2 medium hover, nivel 3 high modales/sticky (usar tint `rgba(0, 91, 150, 0.08)` — ver Elevation & Depth en `docs/DESIGN.md`).
3. **Angular Material (solo panel admin futuro)**: custom theme debe mapear `$palette-primary` desde Ocean Blue (`#004370`) de `docs/DESIGN.md`. El sitio público NO usa Angular Material.
4. **Breakpoints**: газда `mobile (<768px)`, `tablet (768-1023px)`, `desktop (1024+px)` declarados en `docs/DESIGN.md` Layout & Spacing. Tailwind `screens` debe alinearse a estos.
5. **Tipografía**: títulos con Montserrat, cuerpo y UI labels con Inter. Las escalas `headline-xl|lg|lg-mobile|md`, `body-lg|md`, `label-md|sm` están definidas en el YAML de `docs/DESIGN.md`.
6. **Iconografía**: `lucide-angular`. Debe ser consistente con los valores de `categorias.icono` declarados en `docs/data-model.md`.
7. **Estados de carga**: `ngx-skeleton-loader` configurado con el radio y color del token `surface-container-low` de `docs/DESIGN.md`.
8. **Accesibilidad**: contrastes AAA en labels (especialmente para uso outdoor en luz solar costera, ver `docs/DESIGN.md` Typography).

### Convenciones (ver `.github/instructions/frontend-instructions.md`)

- Componentes kebab-case + sufijo: `empresa-card.component.ts`.
- Smart (container) vs Dumb (presentational) components.
- Usar `async` pipe y evitar nested subscribe.
- Consume `https://api.directorio-concon.com/api` (backend en VPS Docker).
