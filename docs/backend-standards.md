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

## Stack específico del proyecto

```
Runtime: Node.js 22 (>=20.19)
Framework: NestJS 10 (modular, REST)
Lenguaje: TypeScript 5
BaaS: Firebase
  - Firestore  : base de datos NoSQL (colecciones: empresas, categorias, barrios, usuarios, solicitudes)
  - Auth       : Firebase Authentication (tokens JWT verificados con Admin SDK)
  - Storage    : logos/imágenes de empresas
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
- `<nombre>.module.ts`, `<nombre>.controller.ts`, `<nombre>.service.ts`
- `dto/` (`create-<nombre>.dto.ts`, `update-<nombre>.dto.ts`)
- `entities/` (`<nombre>.entity.ts`)
- Tests: `<nombre>.service.spec.ts`, `<nombre>.controller.spec.ts`

### Firebase / Firestore

- Siempre verificar existencia de documentos antes de acceder.
- Usar transacciones para operaciones atómicas.
- Paginación con cursors (no offset).
- Crear índices compuestos ANTES de deployar queries (ver `.github/instructions/database-instructions.md`).
- Índices requeridos: empresas(categoriaId), empresas(barrioId), empresas(status+destacado+createdAt), empresas(slug único), categorias(slug único), barrios(slug único), usuarios(email único).

### Autenticación y roles

- Guard JWT verifica `idToken` Firebase (`admin.auth().verifyIdToken`).
- Roles: `admin` (CRUD total + aprobar), `empresa` (CRUD propia), `usuario` (solo lectura pública).
- No loguear tokens ni PII. CORS explícito por entorno.

### Testing

- Unit tests para servicios (mock de `FirebaseService`).
- E2E solo en endpoints críticos (auth, empresas).
- Cobertura mínima objetivo: 90%.

### Lint / build

- `npm --prefix backend run lint`, `npm --prefix backend run build` (`nest build`).
- `npm --prefix backend test`.
