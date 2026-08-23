## ADDED Requirements

### Requirement: SOLID-compliant exception filter
The `AllExceptionsFilter` SHALL keep cognitive complexity and cyclomatic complexity at or below 10 per method, and SHALL NOT use `any` casts. It MUST preserve the documented error response envelope (`success`, `statusCode`, `error`, `message`, `timestamp`, `path`, `method`) defined in `docs/api-spec.yml`.

#### Scenario: HttpException with string response
- **WHEN** an `HttpException` whose `getResponse()` returns a string is thrown
- **THEN** the filter responds with `statusCode` equal to the exception status, `message` equal to the string, and `error` equal to the exception constructor name, preserving all envelope fields.

#### Scenario: HttpException with object response
- **WHEN** an `HttpException` whose `getResponse()` returns an object with `message` and `error` is thrown
- **THEN** the filter responds with `message` and `error` taken from that object (typed via a type guard, no `any`), and `success: false`.

#### Scenario: Firebase / unknown Error
- **WHEN** a non-HttpException `Error` with a Firebase error message (e.g., `auth/id-token-expired`) is thrown
- **THEN** the filter maps it to a friendly Spanish message via the declarative `FIREBASE_MESSAGE_MAP`, sets `statusCode: 500`, and logs the full error.

#### Scenario: Unknown non-Error payload
- **WHEN** a thrown value is neither an `HttpException` nor an `Error`
- **THEN** the filter responds with `statusCode: 500`, `message: "Error interno del servidor"`, and logs a JSON-stringified representation.

#### Scenario: Complexity and typing thresholds
- **WHEN** `make solid-lint` runs against `backend/src/common/filters/all-exceptions.filter.ts`
- **THEN** ESLint reports zero `complexity`/`sonarjs/cognitive-complexity`/`no-explicit-any` violations.

### Requirement: SOLID-compliant transform interceptor
The `TransformInterceptor` SHALL keep complexity at or below 10 and SHALL NOT use `any`. It MUST preserve the `{ success, statusCode, message, data, meta }` envelope, correctly detect paginated payloads (keys `items`/`results`/`data` + `total`/`totalCount`, `page`/`currentPage`, `limit`/`pageSize`), and set the success message based on HTTP method — all without changing observable output.

#### Scenario: Paginated payload normalization
- **WHEN** a handler returns `{ items: [...], total: 42, page: 2, limit: 10 }`
- **THEN** the interceptor returns `{ success: true, statusCode, data: [...], meta: { timestamp, path, method, total: 42, page: 2, limit: 10, totalPages: 5 } }`.

#### Scenario: Simple payload pass-through
- **WHEN** a handler returns a non-paginated object
- **THEN** the interceptor returns `{ success: true, data: <object>, meta: { timestamp, path, method } }`.

#### Scenario: Already-wrapped response passes through
- **WHEN** a handler returns an object already containing a `success` boolean
- **THEN** the interceptor returns that object unchanged.

#### Scenario: Method-based success message
- **WHEN** the request method is `POST`
- **THEN** the response `message` is the POST-specific string resolved from `MESSAGES_BY_METHOD` (no switch statement); same mapping applies for PUT/PATCH/DELETE/GET.

#### Scenario: Complexity and typing thresholds
- **WHEN** `make solid-lint` runs against `backend/src/common/interceptors/transform.interceptor.ts`
- **THEN** ESLint reports zero `complexity`/`sonarjs/cognitive-complexity`/`no-explicit-any` violations.

### Requirement: SOLID linter resolves project aliases
The backend ESLint template (`templates/ci/eslintrc.backend.js`) SHALL configure `import/resolver` to the TypeScript resolver pointed at `backend/tsconfig.json` so that `@/*`, `@/modules/*`, `@/common/*`, and `@/config/*` imports resolve. `import/no-unresolved` MUST report only genuinely unresolved modules.

#### Scenario: Alias imports do not false-positive
- **WHEN** `make solid-lint` runs against the backend
- **THEN** `import/no-unresolved` is not reported for any import using the `@/*` alias family defined in `backend/tsconfig.json`.

#### Scenario: Genuinely missing module still flagged
- **WHEN** a source file imports a path that does not exist and is not an alias
- **THEN** `import/no-unresolved` reports the import as unresolved.

### Requirement: Clean auxiliary files
`backend/src/app.service.ts` and `backend/src/common/interceptors/logging.interceptor.ts` SHALL contain no unused variables and the interceptor SHALL return a typed `Observable` (no `any`).

#### Scenario: No unused variables
- **WHEN** `make solid-lint` runs after the change
- **THEN** ESLint reports zero `no-unused-vars` violations in `app.service.ts` and `logging.interceptor.ts`.

#### Scenario: Typed logging interceptor return
- **WHEN** `logging.interceptor.ts` is compiled
- **THEN** the `intercept()` method returns `Observable<T>` (or a concrete typed `Observable`), not `Observable<any>`.
