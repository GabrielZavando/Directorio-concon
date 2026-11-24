# Proposal — lint-infra-alignment

## Problem

The backend ESLint configuration at `templates/ci/eslintrc.backend.js` activates
`plugin:import/recommended` (which includes `import/no-unresolved`) but does not
configure `settings['import/resolver']` to resolve TypeScript path aliases
(`@/*`, `@/modules/*`, `@/common/*`, `@/config/*`) declared in
`backend/tsconfig.json`.

Additionally, the CI lint step runs `npx eslint@8` from the repo root
(Makefile target `solid-lint`, line 145) without `--resolve-plugins-relative-to`
and without `backend/node_modules` available. This causes ESLint to fail with
"couldn't find the plugin @typescript-eslint/eslint-plugin" before any rule is
evaluated. The gate has been broken before PR #23.

Real measurements (local, `backend/`):

| Metric | Before T1 | After T1+T3 |
|--------|-----------|-------------|
| Total problems | 45 | 12 |
| Errors | 43 | 10 |
| Warnings | 2 | 2 |
| `import/no-unresolved` | 33 | 0 |

## Why it matters

- False positives (~33 `import/no-unresolved`) hide the 10 real errors, making
  it impossible to distinguish signal from noise.
- CI fails before linting even starts (missing plugins), so the gate is red
  regardless of code quality.
- The baseline is unstable: local and CI measure different things, so a change
  that passes CI may fail locally (and vice versa).
- Future changes (e.g. `backend-lint-compliance`) cannot be validated against a
  reliable baseline until this divergence is resolved.

## Scope (INCLUDES)

| Item | Description |
|------|-------------|
| **A** | Configure `settings['import/resolver']` in `templates/ci/eslintrc.backend.js` using hybrid resolver C3 (decided and applied). |
| **B** | Align the lint command between local and CI using B2 — backend-local eslint with `NODE_PATH` (decided and applied). |
| **C** | Verify locally that the ~33 `import/no-unresolved` errors disappear after A (quantitative before/after evidence). |
| **D** | Verify that CI reproduces the same baseline of 10 real errors after B (pending — T4). |

## Follow-ups (out of this change)

- **backend-lint-compliance**: the 10 remaining real errors (unused vars,
  `any`, complexity, no-duplicate-string, max-lines) belong to a separate change.
- **frontend-lint-infra-alignment**: solid-lint frontend/astro branches keep
  the same `npx eslint@8 from root` pattern and remain broken — separate change.
- **upgrade @typescript-eslint v6 → v8**: TS 5.7 support — separate change.

## Acceptance criteria (measurable)

1. `eslint -c templates/ci/eslintrc.backend.js 'backend/src/**/*.ts'` reports
   **0 `import/no-unresolved` errors** locally.
2. CI lint step executes eslint from `backend/` (or with
   `--resolve-plugins-relative-to` pointing at `backend/node_modules`) so
   plugins load successfully — **no "couldn't find the plugin" error**.
3. Local lint error count (excluding `import/no-unresolved`) equals CI lint
   error count (parity): **10 real errors in both environments**.
4. The 10 real errors remain visible and are not masked by `import/no-unresolved`
   noise.
5. Both local and CI commands are documented and reproducible.

## Success signal

The change is complete when a contributor can run lint locally and in CI and
see the same set of errors — only the 10 real quality issues from
`backend-lint-compliance`, no `import/no-unresolved` false positives, and no
plugin-loading failure in CI.