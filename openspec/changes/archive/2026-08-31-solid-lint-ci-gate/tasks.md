# Tasks — solid-lint-ci-gate

## 1. Makefile target split

- [x] 1.1 Add `solid-lint-backend` target (current backend body, unchanged
      semantics: ESLint thresholds + dependency-cruiser)
- [x] 1.2 Add `solid-lint-frontend` target (current frontend stage, unchanged,
      with the existing `angular.json` guard)
- [x] 1.3 Re-express `solid-lint` as an aggregate (`solid-lint-backend
      solid-lint-frontend`) and keep its `.PHONY` registration

## 2. Offline-safe toolchain

- [x] 2.1 In backend target, invoke ESLint with `./node_modules/.bin/eslint`
      and dependency-cruiser with `./node_modules/.bin/depcruise` (direct local
      binary; no npx = no accidental network fetch). Same for frontend target.
- [x] 2.2 Added `dependency-cruiser@^16.10.4` to `backend/package.json`
      devDependencies so the local `depcruise` binary exists.
- [x] 2.3 Sanity verified: with `backend/node_modules` present,
      `make solid-lint-backend` reports zero errors; temporarily hiding the
      local eslint binary made the target fail fast (Error 127, no network fetch).

## 3. CI workflow

- [x] 3.1 `.github/workflows/ci.yml` `solid-lint` job: now runs
      `make -C .. solid-lint-backend` from `backend/` working directory; removed
      `continue-on-error: true` (blocking).
- [x] 3.2 Added `solid-lint-frontend` job with `continue-on-error: true`
      running `make solid-lint-frontend`.
- [x] 3.3 `test` job now installs backend deps and runs `npm test` from
      `backend/` working directory (real Jest run, blocking).

## 4. Verification

- [x] 4.1 `make solid-lint-backend` — zero errors locally (210 modules,
      dependency-cruiser clean). `make solid-lint` aggregate works.
- [x] 4.2 `npm --prefix backend test` — 693/693 green (the job that CI `test`
      runs now).
- [ ] 4.3 Push and observe CI checks — to be done by user / on PR push.
- [x] 4.4 No API/data-model changes (this change touches no contracts).
