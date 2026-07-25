# spec — Specboot upstream alignment (tooling)

## Requirement: The project shall include the templates/ci/ SOLID enforcement tooling, adapted to the monorepo

### Scenario: templates/ci/ contains the seven expected files

- **WHEN** a reader lists `templates/ci/`
- **THEN** the seven files `eslintrc.backend.js`, `eslintrc.frontend.js`, `eslintrc.astro.js`, `.dependency-cruiser.js`, `.madge.config.json`, `package.ci.json`, `README.md` are present.

### Scenario: backend eslint config enforces the agreed thresholds

- **WHEN** `templates/ci/eslintrc.backend.js` is parsed
- **THEN** it declares `max-lines: ["error", 300]`, `complexity: ["error", 10]`, `sonarjs/cognitive-complexity: ["error", 10]`, `parserOptions.project` pointing at `./backend/tsconfig.json`, and `import/no-cycle` enabled.

### Scenario: dependency-cruiser enforces DIP and is configured for the monorepo backend layout

- **WHEN** `templates/ci/.dependency-cruiser.js` is parsed
- **THEN** it declares rules `no-infra-from-domain`, `no-orm-or-http-from-domain`, and `no-application-importing-concrete-repository` with `from.path` regexes matching `^backend/src/modules/[^/]+/(domain|application)/`, and `tsConfig.fileName` pointing at `backend/tsconfig.json`.

### Scenario: madge config points to the Angular frontend

- **WHEN** `templates/ci/.madge.config.json` is parsed
- **THEN** it references `frontend/tsconfig.app.json` for TypeScript circular-dependency detection.

## Requirement: docs/ci-standards.md shall document the threshold-to-config mapping

### Scenario: docs/ci-standards.md exists and maps thresholds to linter configs

- **WHEN** a reader loads `docs/ci-standards.md`
- **THEN** it documents how the "Umbrales objetivos" sub-section of `docs/backend-standards.md` (max 300 lines, cyclomatic complexity ≤10, max 3 constructor params, inheritance depth ≤2) maps to the concrete ESLint rules in `templates/ci/eslintrc.backend.js` and the DIP rule in `templates/ci/.dependency-cruiser.js`, and how to instantiate the templates into `backend/.eslintrc.js` and `frontend/.eslintrc.js`.

## Requirement: The Makefile shall expose a solid-lint target adapted to the monorepo

### Scenario: make solid-lint runs ESLint and dependency-cruiser for the backend

- **WHEN** a developer runs `make solid-lint`
- **THEN** if `backend/package.json` and `backend/src/` exist, ESLint is invoked with `templates/ci/eslintrc.backend.js` over `backend/src/**/*.{ts,tsx}`, madge is invoked for the frontend (if `frontend/angular.json` exists), and dependency-cruiser is invoked with `templates/ci/.dependency-cruiser.js` over `backend/src`.

### Scenario: make solid-lint skips silently when no backend exists

- **WHEN** `backend/package.json` doesn't exist
- **THEN** `make solid-lint` prints an informational message and does not fail.

### Scenario: Makefile .PHONY includes solid-lint

- **WHEN** a developer inspects the Makefile
- **THEN** the `.PHONY` declaration lists `solid-lint` alongside the existing `help install lint test build audit commitlint refs`.

### Scenario: existing npm --prefix backend adaptation is preserved

- **WHEN** a developer runs `make lint` or `make test` or `make build`
- **THEN** the target continues to invoke `npm --prefix backend run lint|test|build` exactly as before, i.e., this change does not modify the stack detection or the existing targets.

## Requirement: ci.yml shall run solid-lint on every push/PR

### Scenario: ci.yml has a solid-lint job gated by backend/package.json

- **WHEN** a developer reads `.github/workflows/ci.yml`
- **THEN** a job named `solid-lint` exists, positioned between `build` and `security-audit`, gated by `if: hashFiles('backend/package.json') != ''`, that runs `make solid-lint` after `make install`.

### Scenario: security-audit preserves the continue-on-error override

- **WHEN** a developer reads the `security-audit` job
- **THEN** it still has `continue-on-error: true` and the explanatory comment about firebase-admin transitive vulnerabilities is preserved.

## Requirement: update.sh SYNC_ITEMS shall include templates

### Scenario: update.sh SYNC_ITEMS includes templates

- **WHEN** a developer reads `update.sh`
- **THEN** the `SYNC_ITEMS` array includes `templates` together with `ai-specs AGENTS.md specboot.sh check-refs.sh Makefile`.

### Scenario: update.sh comments warn about Makefile monorepo adaptation

- **WHEN** a developer reads `update.sh`
- **THEN** there is an explanatory comment near `SYNC_ITEMS` warning that the upstream `Makefile` lacks the local `npm --prefix backend` adaptation and that running `update.sh --template <upstream>` blind will overwrite the monorepo adaptation, requiring manual re-application.
