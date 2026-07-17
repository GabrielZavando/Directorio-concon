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

## Stack específico del proyecto

```
Framework: Angular 17+ (standalone components, lazy loading)
CSS: TailwindCSS + Angular Material (opcional)
Build: Angular CLI / esbuild
Maps: Google Maps API + @angular/google-maps
State: RxJS + Angular Services, OnPush change detection
Forms: Reactive Forms
Tests: Jest (spec) — objetivo 80% cobertura
Deploy: VPS (mismo host) servido por Nginx/Caddy; futuro módulo en monorepo
```

### Convenciones (ver `.github/instructions/frontend-instructions.md`)

- Componentes kebab-case + sufijo: `empresa-card.component.ts`.
- Smart (container) vs Dumb (presentational) components.
- Usar `async` pipe y evitar nested subscribe.
- Consume `https://api.directorio-concon.com/api` (backend en VPS Docker).
