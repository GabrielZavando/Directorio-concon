## ADDED Requirements

### Requirement: Backend SOLID gates block merges

Every pull request touching the backend SHALL run the backend SOLID checks
(ESLint thresholds: complexity ≤10, cognitive complexity ≤10, max 300 lines,
no explicit `any`, no unused vars, no duplicated strings, `import/namespace`;
plus dependency-cruiser) as a **blocking** CI job.

#### Scenario: PR with a SOLID violation fails
- **WHEN** a PR introduces a backend file that exceeds a `templates/ci/eslintrc.backend.js` threshold
- **THEN** the CI `solid-lint` job exits non-zero and the PR check is red

#### Scenario: Clean PR passes the gate
- **WHEN** a PR's backend code passes `make solid-lint-backend` locally
- **THEN** the CI `solid-lint` job reports success

### Requirement: Toolchain invocation is offline-safe

The Makefile solid-lint targets SHALL NOT allow `npx` to install a package from
the network when a local binary is absent (the observed failure: eslint v10
auto-installed and broke `--resolve-plugins-relative-to`).

#### Scenario: Missing local devDependency fails fast
- **WHEN** a solid-lint target runs in a workspace where the required local
  binary (`eslint`, `dependency-cruiser`, `madge`) is not installed
- **THEN** the command fails immediately with npx's "could not determine
  executable to run" style error, without downloading any package

#### Scenario: Pinned local versions are used
- **WHEN** `make solid-lint-backend` runs with `backend/node_modules` installed
- **THEN** the ESLint version used is the one pinned by
  `backend/package-lock.json`

### Requirement: Backend and frontend lint stages are decoupled

The backend gate SHALL NOT depend on the frontend workspace state. The frontend
stage SHALL run as a separate CI job that is informational
(`continue-on-error: true`) until the frontend workspace declares lint
devDependencies.

#### Scenario: Frontend workspace not lint-ready
- **WHEN** the frontend workspace lacks ESLint/madge devDependencies
- **THEN** the backend solid-lint CI job still reports accurate status and the
  frontend job reports skipped/failed-non-blocking

#### Scenario: Local aggregate unchanged
- **WHEN** a developer runs `make solid-lint` locally
- **THEN** both backend and frontend stages run (frontend still guarded by
  `test -f frontend/angular.json`)

### Requirement: Backend tests gate merges in CI

The CI `test` job SHALL execute the real backend Jest suite (not a no-op), so a
red suite blocks a PR.

#### Scenario: Failing backend test fails the CI test job
- **WHEN** a PR makes any backend test fail
- **THEN** the CI `test` job exits non-zero

#### Scenario: Green suite
- **WHEN** the backend suite passes locally (`npm --prefix backend test`)
- **THEN** the CI `test` job reports success
