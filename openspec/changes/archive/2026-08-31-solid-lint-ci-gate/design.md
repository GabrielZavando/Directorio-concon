## Context

`.github/workflows/ci.yml` already defines a `solid-lint` job, but it is
ineffective for gating:

1. `continue-on-error: true` makes the job informational only — a PR can
   introduce SOLID violations and stay green.
2. `lint` / `test` / `build` jobs are vacuous at the monorepo root: there is no
   root `package.json`, so the Makefile STACK is `unknown` and those targets
   print a notice instead of running anything.
3. `make solid-lint` runs `cd backend && npx eslint ...` **without**
   `--no-install`. When a `node_modules` is incomplete (observed in the
   frontend workspace), npx silently installs the latest eslint (v10), whose
   CLI removed `--resolve-plugins-relative-to`, breaking the run and producing
   false "environment" failures.
4. The frontend stage inside the same target couples backend gating to a
   workspace that has no ESLint/madge devDependencies yet.

## Goals / Non-Goals

**Goals:**
- Backend SOLID lint is a **blocking** PR gate in CI.
- Toolchain invocation is offline-safe: missing local devDeps fail fast with a
  clear message; no network fetch of arbitrary versions.
- Backend test suite runs in CI as a blocking job (safety net for refactors).
- Frontend stage is decoupled: visible but not blocking until its lint deps land.

**Non-Goals:**
- Adding ESLint/madge devDependencies to the frontend workspace (deferred to
  the frontend MVP change).
- Frontend gate enforcement.
- Any reduction of thresholds (no rule weakening).

## Decisions

### D1 — Split Makefile targets
Add `solid-lint-backend` and `solid-lint-frontend` targets; keep `solid-lint`
as an aggregate that runs both. The backend target is self-contained (ESLint +
dependency-cruiser); the frontend target keeps the existing `angular.json`
guard so it is skipped when the workspace isn't configured.
**Rationale:** CI can gate the backend job without being coupled to the
frontend workspace state. Local `make solid-lint` keeps working unchanged.

### D2 — Pin invocation, not versions-in-template
Use `npx --no-install eslint` and `npx --no-install dependency-cruiser
--config` (equivalently `./node_modules/.bin/eslint`) in the Makefile.
**Rationale:** versions are already pinned by `backend/package-lock.json`;
the bug surfaced because npx *fetches* when the binary is absent.
`--no-install` converts the silent wrong-version fetch into a clear failure
("npm ERR! could not determine executable to run" → fix = `npm ci`).

### D3 — Blocking gate at the CI job level
In `ci.yml`: remove `continue-on-error: true` from the backend solid stage;
split into two steps: `run: make solid-lint-backend` (blocking) and keep a
new `solid-lint-frontend` job with `continue-on-error: true`.
**Rationale:** gate semantics live in CI config (visible in PR checks page),
not in the Makefile, so local dev isn't affected.

### D4 — Backend test job runs the real suite
Change the `test` job to `run: cd backend && npm install --legacy-peer-deps && npm test`
(backend has no CI npm ci lockfile quirks documented; keeps parity with local).
**Rationale:** the test job currently runs nothing; the refactor batch that
triggered this change was only validated locally. A green CI must mean tests ran.

## Risks / Trade-offs

- **[Risk]** Making the gate blocking may surface latent violations on other
  branches. → Mitigation: just verified main is at 0 errors; merge this change
  first and rebase others.
- **[Risk]** `npm install --legacy-peer-deps` in CI may be slower than `npm ci`.
  → Mitigation: the backend lockfile is sync'd; if `npm ci` works in CI we can
  switch (task notes both options; default to `npm ci` with fallback).
- **[Trade-off]** Frontend job stays non-blocking → frontend SOLID violations
  won't fail a PR yet. Accepted: the workspace lacks lint deps; enforcing now
  would block all PRs. Tracked as follow-up when frontend MVP lands.
