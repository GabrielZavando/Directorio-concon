# Documentation Standards

## Principios

- La documentación se actualiza junto con el código, no después
- El README del proyecto debe funcionar como onboarding completo para un dev nuevo
- Los comentarios en código explican el **por qué**, no el qué (el qué lo dice el código)
- Las specs (OpenSpec) son la fuente de verdad antes de implementar

## Estructura de READMEs

Cada servicio o módulo relevante debe tener un README con:

1. Descripción en una línea (qué hace)
2. Requisitos y dependencias
3. Setup en 3 pasos o menos
4. Variables de entorno requeridas
5. Comandos clave (dev, test, build, deploy)
6. Arquitectura resumida si es complejo

## API Documentation

- OpenAPI 3.0 en `docs/api-spec.yml`
- Cada endpoint documentado: descripción, params, request body, responses (incluyendo errores)
- Actualizar el spec antes de implementar cambios en la API (SDD)
- Ejemplos reales en el spec, no placeholders

## Data Model

- `docs/data-model.md` documenta todas las entidades del dominio
- Incluir: campos, tipos, relaciones, índices, constraints
- Mantener sincronizado con migraciones de base de datos

## Comentarios en código

```typescript
// BIEN: explica por qué
// El timeout es 5s porque el proveedor externo tiene latencia alta en peak hours
const PAYMENT_TIMEOUT_MS = 5000;

// MAL: repite lo que dice el código
// Set timeout to 5000
const PAYMENT_TIMEOUT_MS = 5000;
```

## Commits y PRs

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Un commit = un cambio lógico
- PR description: qué cambia, por qué, cómo probar, screenshots si hay UI
