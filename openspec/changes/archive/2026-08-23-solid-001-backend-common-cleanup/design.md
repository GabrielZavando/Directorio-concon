## Context

`make solid-lint` enforces the SOLID thresholds from `docs/backend-standards.md` (max 300 lines/file, cyclomatic complexity ≤10, cognitive complexity ≤10, max 5 params) via `templates/ci/eslintrc.backend.js` + `dependency-cruiser` + `madge`. The two shared HTTP infrastructure files predate this enforcement and violate it:

- `backend/src/common/filters/all-exceptions.filter.ts` — `catch()` is one large method with nested if/else (cognitive ~15, cyclomatic ~14); two `as any` on the `HttpException` response; a 11-branch Firebase message chain.
- `backend/src/common/interceptors/transform.interceptor.ts` — a single `map()` callback with 7 `any` occurrences, a switch on HTTP method, and inline pagination detection (cognitive ~26).

Separately, the template enables `plugin:import/recommended` (which turns on `import/no-unresolved`) but never configures `import/resolver`, so ESLint cannot resolve the `@/*`, `@/modules/*`, `@/common/*`, `@/config/*` aliases declared in `backend/tsconfig.json`. The signal is therefore noisy (false positives for every alias import), which masks and discourages fixing the real violations.

Both files are request-scoped (every inbound request passes through the interceptor; every error passes through the filter). Behavior is contractually fixed by `docs/api-spec.yml` (`Error` schema; the `{ success, statusCode, message, data, meta }` envelope), so the refactor must be behavior-preserving.

## Goals / Non-Goals

**Goals:**
- Make `make solid-lint` backend stage pass with zero errors (resolved aliases + compliant complexity/typing).
- Reach OCP/SRP-compliant structure (declarative maps + small methods) in the two files.
- Add a missing unit test for `AllExceptionsFilter`.
- Remove unused variables and untyped return in `logging.interceptor.ts` / `app.service.ts`.

**Non-Goals:**
- No API contract changes (response/error shapes stay as documented).
- No new cross-cutting logging infrastructure (e.g., `nest-winston`) — tracked separately as a follow-up change.
- No frontend changes (separate follow-up change).

## Decisions

### D1 — Fix the resolver first, in the same change
**Decision:** Add `settings: { 'import/resolver': { typescript: { project: './tsconfig.json' } } }` to `templates/ci/eslintrc.backend.js` and add `eslint-import-resolver-typescript` to `backend` devDependencies.
**Rationale:** Without resolver config, every alias import reports `import/no-unresolved`, so the linter output cannot be trusted and no refactor would be validated clearly. Doing it first gives a clean baseline so the subsequent refactors are verified against a correct signal.
**Alternatives considered:** (a) Disable `import/no-unresolved` globally — rejected, it is a useful guard. (b) Replace aliases with relative imports — rejected, the project standard uses aliases (`backend/tsconfig.json` paths).

### D2 — Declarative Firebase message map (OCP)
**Decision:** Replace the 11 `if (message.includes(...))` branches in `getFirebaseErrorMessage()` with a `private static readonly FIREBASE_MESSAGE_MAP: ReadonlyArray<[RegExp|string, string]>` and a single `find`/`reduce`.
**Rationale:** Adding a new Firebase error mapping becomes adding one tuple (OCP), and removes the complexity contribution of the long branch chain. Keeps `catch()` focused on control flow.

### D3 — Typed HttpException response (no `any`)
**Decision:** Introduce `interface HttpExceptionResponse { message: string | string[]; error?: string }` and a `isHttpExceptionResponse(value): value is HttpExceptionResponse` type guard; replace `(exceptionResponse as any).message` accesses.
**Rationale:** Eliminates the two `as any` casts (base-standards §1: no `any` without justification) and gives compile-time safety.

### D4 — Split `catch()` responsibilities (SRP)
**Decision:** Extract `buildErrorResponse(exception, status, message, error, request)` and `logIfServerError(status, request, exception)` as private methods.
**Rationale:** Reduces `catch()` to orchestration under the complexity ≤10 threshold; each helper has a single responsibility.

### D5 — Typed transform interceptor (OCP/SRP)
**Decision:** Introduce `interface ApiResponseMeta { timestamp; path; method; total?; page?; limit?; totalPages? }`; replace the `any` `meta` with `ApiResponseMeta`; add `isPaginatedResponse(data): data is PaginatedPayload<T>` type guard; replace the `switch (request.method)` with `private static readonly MESSAGES_BY_METHOD: Record<string, string>`.
**Rationale:** Removes 7 `any` casts, collapses the switch into a lookup (OCP), and isolates pagination detection behind a guard (SRP). Behavior preserved exactly.

### D6 — Test-first for the filter, expand for the interceptor
**Decision:** Add `all-exceptions.filter.spec.ts` (none exists) covering HttpException string, HttpException object, Firebase `auth/*` Error, unknown Error, and the exact response envelope. Extend the existing `transform.interceptor.spec.ts` for paginated/custom-message/already-wrapped cases before editing.
**Rationale:** TDD red→green per base-standards; protects the documented contract during refactor.

## Risks / Trade-offs

- **[Risk]** A refactor could subtly change the error envelope (e.g., field order, `meta` shape) and break frontend consumers. → Mitigation: contract tests assert the exact keys/values against `docs/api-spec.yml`; no field is renamed or removed.
- **[Risk]** `eslint-import-resolver-typescript` may emit new `no-unresolved` for genuinely unresolved aliases not yet covered. → Mitigation: after adding the resolver, run `make solid-lint` and fix only real misses; the resolver respects `tsconfig` paths so the project's aliases resolve.
- **[Trade-off]** Introducing small `interface`/`type guard` helpers slightly increases file size but keeps it well under the 300-line limit and improves clarity.

## Migration Plan

- No DB migration, no deploy-step change; purely build/lint-time.
- Rollback: revert the change commit; `make solid-lint` reverts to prior (red) state.
- CI: `.github/workflows/ci.yml` already invokes `make solid-lint`; this change turns it green.

## Open Questions

- None blocking. Follow-up decisions (elevating `@typescript-eslint/no-explicit-any` to `error`, adopting `nest-winston`, frontend lint gap) are tracked as separate changes per the improvement plan.
