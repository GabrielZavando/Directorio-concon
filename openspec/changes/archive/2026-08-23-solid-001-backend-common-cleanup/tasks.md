## 1. Linter resolver (tooling baseline)

- [x] 1.1 Add `settings['import/resolver'].typescript` (project: `./tsconfig.json`) to `templates/ci/eslintrc.backend.js`
- [x] 1.2 Add `eslint-import-resolver-typescript` to `backend/package.json` devDependencies and install
- [x] 1.3 Run `make solid-lint` (backend) and confirm `import/no-unresolved` for `@/*` aliases is gone (baseline clean) — record remaining real violations

## 2. AllExceptionsFilter (TDD)

- [x] 2.1 Write `backend/src/common/filters/all-exceptions.filter.spec.ts` (RED): cover HttpException string, HttpException object, Firebase `auth/*` Error, unknown non-Error; assert exact envelope fields
- [x] 2.2 Add `HttpExceptionResponse` interface + `isHttpExceptionResponse()` type guard in the filter (removes `as any`)
- [x] 2.3 Replace the 11-branch Firebase chain with `private static readonly FIREBASE_MESSAGE_MAP` lookup
- [x] 2.4 Extract `buildErrorResponse()` and `logIfServerError()` so `catch()` complexity ≤10
- [x] 2.5 Run `npm --prefix backend test` for the filter spec (GREEN) and `make solid-lint` (no complexity/any violations)

## 3. TransformInterceptor (TDD)

- [x] 3.1 Extend `backend/src/common/interceptors/transform.interceptor.spec.ts` (RED): paginated (items/results + total/totalCount + page/currentPage + limit/pageSize), already-wrapped `success` object, custom message, method-based message
- [x] 3.2 Introduce `ApiResponseMeta` interface and type `meta` (remove `any`); add `isPaginatedResponse()` type guard
- [x] 3.3 Replace `switch (request.method)` with `private static readonly MESSAGES_BY_METHOD: Record<string,string>`; split `map()` callback responsibilities
- [x] 3.4 Run interceptor spec (GREEN) and `make solid-lint` (no complexity/any violations)

## 4. Auxiliary cleanup

- [x] 4.1 Remove unused variable(s) in `backend/src/app.service.ts`
- [x] 4.2 Remove unused variable(s) in `backend/src/common/interceptors/logging.interceptor.ts` and type its `intercept()` return as `Observable<T>` (no `any`)

## 5. Verification

- [x] 5.1 Run `make solid-lint` scoped to the changed files — `all-exceptions.filter.ts`, `transform.interceptor.ts`, `logging.interceptor.ts`, `app.service.ts` each report **zero errors**. The remaining backend-wide violations (51 errors in `places`/`solicitudes`/`usuarios` modules) are pre-existing and out of scope; tracked in the follow-up change `solid-lint-backend-modules`.
- [x] 5.2 Run `npm --prefix backend test` — filter spec (7) + interceptor spec (10) green; confirm coverage of the two refactored files meets the 90% objective
- [x] 5.3 Confirm `docs/api-spec.yml` (`Error` schema / response envelope) is unchanged — no contract edits needed
