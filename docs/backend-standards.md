# Backend Standards

> Personalizar este archivo con el stack backend real del proyecto.

## API Development

- RESTful o GraphQL según arquitectura del proyecto
- Versioning explícito en la URL: `/api/v1/`
- Respuestas consistentes: `{ data, error, meta }`
- HTTP status codes correctos (200, 201, 400, 401, 403, 404, 422, 500)
- Validación de inputs en la capa de presentación
- Nunca exponer stacktraces en producción

## Base de datos

- Migraciones versionadas y reversibles
- Nunca modificar migraciones ya ejecutadas en producción
- Índices en campos usados en WHERE frecuentes
- Transacciones para operaciones multi-tabla
- Nombres de tablas en plural, snake_case, inglés

## Testing backend

- Unit tests para lógica de dominio y servicios
- Integration tests para repositorios y adapters
- E2E tests para flujos críticos de negocio
- Mocks solo para servicios externos (no para el propio código)
- Cobertura mínima: 90%

## Seguridad

- Nunca loguear datos sensibles (passwords, tokens, PII)
- Sanitizar todos los inputs antes de persistir
- Rate limiting en endpoints públicos
- CORS configurado explícitamente
- Variables de entorno para credenciales, nunca hardcodeadas

## Logging y errores

- Structured logging (JSON) con nivel: debug/info/warn/error
- Errors con contexto: qué ocurrió, dónde, con qué datos
- Health check endpoint: `/health`

## Principios de Diseño — Backend (NestJS)

SOLID es el rector del backend. Cada módulo de negocio se organiza en **Clean Architecture por feature** con capas obligatorias.

### Estructura de carpetas obligatoria por módulo

```
backend/src/modules/<feature>/
├── domain/           ← Entidades, value objects, interfaces de repositorio (puro TS, sin framework)
│   ├── <feature>.entity.ts
│   └── <feature>-repository.interface.ts
├── application/      ← Casos de uso / services (orquestan domain + infrastructure via interfaces)
│   └── <feature>.service.ts
└── infrastructure/   ← Implementaciones concretas (Firestore adapter, Firebase Auth, HTTP clients)
    └── <feature>.firestore.adapter.ts
```

- **DIP (Dependency Inversion)**: `domain/` y `application/` **nunca** importan de infraestructura concreta (`firebase-admin`, `@nestjs/axios`, `class-validator`, `class-transformer`). Solo importan interfaces definidas en `domain/`.
- Los controllers viven en `infrastructure/` o directamente en la raíz del módulo (`<feature>.controller.ts`), dependiendo de la complejidad.

### SRP (Single Responsibility)

- Un servicio = una responsabilidad de negocio. Si mezcla data access + business logic + formatting → separar.
- Un archivo ≤ 300 líneas (ver `templates/ci/eslintrc.backend.js`).

### OCP (Open/Closed)

- Preferir estrategias/polimorfismo sobre switch/if-else crecientes.
- `sonarjs/no-collapsible-if` y `complexity ≤ 10` como guardrails.

### LSP (Liskov Substitution)

- Interfaces de contratos con `*.contract.spec.ts` que validan que cualquier implementación cumple el contrato.

### ISP (Interface Segregation)

- Interfaces de repositorio ≤ 5 métodos. Si crece, dividir en interfaces más específicas.

### Umbrales objetivos (CI)

| Métrica | Umbral | Config CI |
|---|---|---|
| `max-lines` por archivo | 300 | `templates/ci/eslintrc.backend.js` |
| Cyclomatic complexity | ≤10 | `complexity` rule |
| Cognitive complexity | ≤10 | `sonarjs/cognitive-complexity` rule |
| `max-params` por función | ≤3 | `max-params` rule |
| `max-depth` | ≤4 | `max-depth` rule |
| Inheritance depth | ≤2 | `madge` (circular-dep) + review manual |
| DIP (no infra imports en domain/application) | 0 violaciones | `templates/ci/.dependency-cruiser.js` |

## Stack específico del proyecto

```
Runtime: Node.js 22 (>=20.19)
Framework: NestJS 11 (modular, REST)
Lenguaje: TypeScript 5
BaaS: Firebase
  - Firestore  : base de datos NoSQL (colecciones: places, categorias, barrios, usuarios, solicitudes)
  - Auth       : Firebase Authentication (tokens JWT verificados con Admin SDK)
  - Storage    : logos/imágenes de places
Cache: Redis (opcional, fallback a memoria)
Validación: class-validator + class-transformer (ValidationPipe global whitelist+forbidNonWhitelisted)
Docs: Swagger/OpenAPI (solo dev, /api/docs)
Rate limiting: @nestjs/throttler (short/medium/long)
Logging: Winston + nest-winston (JSON estructurado)
Tests: Jest + Supertest (unit + e2e)
Commits: Conventional Commits (commitlint)
```

### Estructura de módulos (NestJS)

Cada feature en `src/modules/<nombre>/`:
- `<nombre>.module.ts`, `<nombre>.controller.ts`
- `domain/` (`<nombre>.entity.ts`, `<nombre>-repository.interface.ts`)
- `application/` (`<nombre>.service.ts`)
- `infrastructure/` (`<nombre>.firestore.adapter.ts`, `dto/`)
- Tests: `<nombre>.service.spec.ts`, `<nombre>.controller.spec.ts`

### Firebase / Firestore

- Siempre verificar existencia de documentos antes de acceder.
- Usar transacciones para operaciones atómicas.
- Paginación con cursors (no offset).
- Crear índices compuestos ANTES de deployar queries (ver `.github/instructions/database-instructions.md`).
- Índices requeridos: places(categoriaId), places(barrioId), places(status+destacado+createdAt), places(slug único), categorias(slug único), barrios(slug único), usuarios(email único).

### Autenticación y roles

- Guard JWT verifica `idToken` Firebase (`admin.auth().verifyIdToken`).
- Roles: `admin` (CRUD total + aprobar), `empresa` (CRUD propia), `usuario` (solo lectura pública).
- No loguear tokens ni PII. CORS explícito por entorno.

### Testing

- Unit tests para servicios (mock de `FirebaseService`).
- E2E solo en endpoints críticos (auth, places).
- Cobertura mínima objetivo: 90%.

### Lint / build

- `npm --prefix backend run lint`, `npm --prefix backend run build` (`nest build`).
- `npm --prefix backend test`.
