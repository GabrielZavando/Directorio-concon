# Specification — lint-infra-alignment

## Purpose

Define what "lint passes" means for the backend after aligning the
`import/resolver` configuration and the local/CI lint command, and how to
verify parity between environments.

## Requirement 1 — No `import/no-unresolved` false positives

The system SHALL report **0 errors** for `import/no-unresolved` when running
the backend lint command locally, because `settings['import/resolver']`
correctly resolves `@/*` aliases from `backend/tsconfig.json`.

### Scenario: Local lint reports zero import/no-unresolved errors

- **WHEN** a contributor runs `cd backend && NODE_PATH=$(pwd)/node_modules ./node_modules/.bin/eslint -c ../templates/ci/eslintrc.backend.js 'src/**/*.ts'`
- **THEN** the output contains no lines matching `import/no-unresolved`
- **AND** the only errors remaining are the 10 real quality issues from
  `backend-lint-compliance` (unused vars, `any`, complexity, etc.)

## Requirement 2 — Local/CI parity

The system SHALL produce the same set of lint errors locally and in CI,
modulo environment-specific warnings (e.g. prettier formatting). Decision D2 =
B2 (backend-local eslint with NODE_PATH).

### Scenario: CI and local report identical error counts

- **WHEN** lint is run locally (backend/ with backend tsconfig + NODE_PATH)
  and in CI (via `make solid-lint` → updated Makefile target running eslint
  from `backend/`)
- **THEN** the error count and error rule distribution match
- **AND** no error class appears in one environment but not the other
  (excluding prettier/prettier warnings, which are non-blocking)

## Requirement 3 — Rollback safety

If the resolver configuration breaks resolution of previously-working imports,
the system SHALL allow rollback without losing the `import/no-unresolved`
safety net.

### Scenario: Rollback on resolver regression

- **WHEN** after applying D1, a previously-resolvable import becomes
  unresolved
- **THEN** the contributor can revert `templates/ci/eslintrc.backend.js` to
  the pre-change state and restore the previous lint behavior
- **AND** the change is marked as needing rework before re-application

## Requirement 4 — CI must load plugins

The CI lint step SHALL execute eslint from `backend/` (or with
`--resolve-plugins-relative-to` pointing at `backend/node_modules`) so that
`@typescript-eslint/*`, `sonarjs` and `import` plugins load successfully.
Running `npx eslint@8` from repo root without plugin resolution SHALL be
considered a failure.

### Scenario: CI lint loads plugins without error

- **WHEN** `make solid-lint` runs in CI
- **THEN** no "couldn't find the plugin" error is emitted
- **AND** the 10 real errors are reported (from `backend-lint-compliance`)
- **AND** 0 `import/no-unresolved` errors appear

## Definition of "lint passes in green"

- **0 errors** of any rule (excluding warnings).
- Warnings from `prettier/prettier` are acceptable only if the project
  explicitly accepts them; otherwise they count toward the error budget.
- `import/no-unresolved` must not appear in output at all.
- In this change, the gate remains in **red** until `backend-lint-compliance`
  resolves the 10 known real errors; this change only removes the false
  positives and the plugin-loading failure.

## Parity verification procedure

1. Run local lint: capture error count and per-rule breakdown.
2. Run CI lint (or reproduce CI command locally): capture error count and
   per-rule breakdown.
3. Compare: both must report the same 10 real errors, 0
   `import/no-unresolved` errors.
4. If counts differ, investigate resolver or tsconfig path mismatch.