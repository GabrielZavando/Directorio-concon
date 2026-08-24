## Why

The backend accumulated 51 pre-existing SOLID-lint errors that were only
fixed retroactively (changes `solid-001-backend-common-cleanup` and
`solid-lint-backend-modules`) because the CI gate exists but is **not enforced**:
the `solid-lint` job in `.github/workflows/ci.yml` runs with
`continue-on-error: true`, and the `lint`/`test`/`build` jobs are **vacuous**
(STACK detection at repo root finds no `package.json`, so `npm run lint` /
`npm test` / `npm run build` are no-ops). Additionally the Makefile `solid-lint`
target invokes `npx eslint`/`npx madge` without `--no-install`, which can fetch
an unpinned ESLint (observed: eslint@10 auto-installed, which breaks
`--resolve-plugins-relative-to`) when devDependencies are missing.

## What Changes

- Make the backend SOLID lint gate **blocking** in CI (remove
  `continue-on-error: true` for the backend stage).
- Split `make solid-lint` into `make solid-lint-backend` (blocking-capable) and
  `make solid-lint-frontend` (separate job, stays non-blocking until the
  frontend workspace has lint devDependencies).
- Pin the toolchain invocation: `npx --no-install` (or local
  `node_modules/.bin`) so missing local deps fail fast instead of fetching an
  arbitrary ESLint version from the network.
- Make the CI `test` job actually run backend tests (`cd backend && npm test`),
  so the refactor safety net gates PRs.
- No changes to backend runtime behavior, REST contracts, or business logic.

## Capabilities

### New Capabilities
- `ci-solid-gate`: CI enforcement of backend SOLID thresholds (ESLint,
  dependency-cruiser) as a blocking PR gate, with a pinned, offline-safe
  toolchain invocation and a real backend test job in CI.

### Modified Capabilities

## Impact

- `.github/workflows/ci.yml` — solid-lint job becomes blocking; test job runs
  backend tests; new frontend solid-lint job (non-blocking).
- `Makefile` — new `solid-lint-backend` / `solid-lint-frontend` targets;
  `solid-lint` becomes an aggregate; `npx --no-install` added.
- No changes to `docs/api-spec.yml` or `docs/data-model.md`.
