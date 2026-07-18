# Requirements — Empresas CRUD (empresas-crud)

## Functional Requirements

- **FR-1**: El sistema debe permitir crear una empresa vía `POST /api/v1/empresas`.
- **FR-2**: Toda empresa nueva se crea con `status: 'pendiente'` y genera una `solicitud` de tipo `registro`.
- **FR-3**: El `slug` se deriva del nombre y debe ser único; si colisiona, retornar `409`.
- **FR-4**: El sistema debe listar empresas con filtros (`categoriaId`, `barrioId`, `q`, `status`) y paginación por cursor.
- **FR-5**: El sistema debe obtener una empresa por `id` y por `slug`.
- **FR-6**: El sistema debe actualizar una empresa (`PUT`) con campos parciales.
- **FR-7**: El sistema debe eliminar una empresa (`DELETE`).
- **FR-8**: Validación de entrada con `class-validator` (ValidationPipe global ya configurado).

## Non-Functional Requirements

- **NFR-1**: Cobertura de tests del servicio y controller (objetivo ≥ 90%).
- **NFR-2**: Sin `any` en el código de dominio; tipado completo.
- **NFR-3**: Reutiliza `FirebaseService` (Firestore) ya existente; no inicializa Firebase de nuevo.
- **NFR-4**: Respuestas consistentes con el formato del `TransformInterceptor` (envuelto en `data`).
- **NFR-5**: No exponer errores internos en producción (ya cubierto por `AllExceptionsFilter`).

## Constraints

- Firestore no tiene full-text search: el filtro `q` se resuelve por prefijo de nombre o se delega (en esta fase: filtro por nombre con `>=`/`<=` o en memoria sobre el lote).
- Paginación por cursor (no offset) según convenciones del proyecto.

## Out of Scope (esta fase)

- Autenticación/roles estricta por endpoint (se hace en módulo Auth).
- Indexación de búsqueda semántica (fase IA).
- Upload de logos a Storage (se hace en módulo posterior).
