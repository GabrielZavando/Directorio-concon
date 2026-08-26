## Why

`make solid-lint` now runs against the backend and surfaces real SOLID violations in the common HTTP infrastructure (`AllExceptionsFilter`, `TransformInterceptor`): cognitive complexity 15 / cyclomatic 14 (max 10) and multiple `any` casts in `all-exceptions.filter.ts`; cognitive complexity 26 + 7 `any` in `transform.interceptor.ts`. Additionally, the template `eslintrc.backend.js` does not declare the TypeScript import resolver, so `import/no-unresolved` false-positives on the project's `@/*` aliases, masking the real signal. These files are shared by every request and must meet the project's non-negotiable SOLID thresholds from `docs/backend-standards.md`.

## What Changes

- Add the TypeScript `import/resolver` settings to `templates/ci/eslintrc.backend.js` (and `eslint-import-resolver-typescript` devDependency) so the `@/*` aliases from `backend/tsconfig.json` resolve and `import/no-unresolved` stops emitting false positives.
- Refactor `backend/src/common/filters/all-exceptions.filter.ts` to:
  - Replace the 11-branch Firebase message chain with a declarative `FIREBASE_MESSAGE_MAP` lookup (OCP).
  - Replace `as any` casts on `HttpException` response with a typed `HttpExceptionResponse` interface + type guard.
  - Split `catch()` into `buildErrorResponse()` and a logging helper so each method stays ≤10 complexity.
- Refactor `backend/src/common/interceptors/transform.interceptor.ts` to:
  - Replace the `any`-typed `meta` and switch statement with a typed `ApiResponseMeta`, a `MESSAGES_BY_METHOD: Record<string,string>` lookup, and an `isPaginatedResponse()` type guard.
  - Keep the existing Test-first contract scenarios.
- Remove unused variables in `backend/src/app.service.ts` and `backend/src/common/interceptors/logging.interceptor.ts`; type the latter's `Observable<any>` as a generic.
- Add a missing `all-exceptions.filter.spec.ts` covering the three exception branches and the documented response shape.

No API behavior changes: the JSON error/response contracts in `docs/api-spec.yml` (`Error` schema) remain identical.

## Capabilities

### New Capabilities
- `backend-common-cleanup`: Non-functional requirement that the shared HTTP infrastructure (`AllExceptionsFilter`, `TransformInterceptor`) complies with the project's SOLID thresholds (complexity ≤10, no `any`, correctly typed responses) and that the SOLID linter resolves the `@/*` aliases — without altering the documented API response contracts.

### Modified Capabilities
<!-- None — this is an internal cleanup; the `api-contract` behavior is preserved. -->

## Impact

- **Code**: `backend/src/common/filters/all-exceptions.filter.ts`, `backend/src/common/interceptors/transform.interceptor.ts`, `backend/src/common/interceptors/logging.interceptor.ts`, `backend/src/app.service.ts`.
- **Tooling**: `templates/ci/eslintrc.backend.js` (+ new devDependency in `backend/package.json`).
- **CI**: `.github/workflows/ci.yml` runs `make solid-lint`; fixing the resolver and the two files makes the backend stage pass cleanly.
- **API**: No breaking changes; response shapes unchanged (verified against `docs/api-spec.yml`).
