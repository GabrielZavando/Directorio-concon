# Tasks — lint-infra-alignment

## [x] T1 — Add `settings['import/resolver']` to eslintrc.backend.js (decision D1)

**Description:** Configure the TypeScript import resolver in
`templates/ci/eslintrc.backend.js` so `@/*` aliases resolve against
`backend/tsconfig.json`. Decision D1 = C3 (hybrid resolver: node + typescript).

**Done when:**
- `templates/ci/eslintrc.backend.js` contains a `settings` block with
  `import/resolver` pointing at `backend/tsconfig.json` and
  `tsconfig.test.json`.
- The file parses as valid JS/ESLint config.

**Evidence:** File diff shows added `settings` block. ESLint loads the config
without errors.

**Metric:** Before 45 problems (33 import/no-unresolved) → After 12 problems
(0 import/no-unresolved).

---

## [x] T2 — Verify locally that `import/no-unresolved` errors disappear (measurement)

**Description:** Run lint locally before and after T1 to quantify the
elimination of false-positive `import/no-unresolved` errors.

**Done when:**
- Before-T1 error count recorded: 45 problems, 33 import/no-unresolved.
- After-T1 error count recorded: 12 problems, 0 import/no-unresolved.
- Delta confirms ~33 `import/no-unresolved` errors eliminated.
- 10 real errors + 2 warnings persist (belong to `backend-lint-compliance`).

**Evidence:** Terminal output showing before/after counts (saved in
`/tmp/lint-before.txt` and `/tmp/lint-after.txt`).

---

## [x] T3 — Apply D2 decision (align local and CI lint command — B2)

**Description:** Implement B2 — backend-local eslint with NODE_PATH — on the
Makefile `solid-lint` target NestJS branch only. Frontend/Astro/Python branches
untouched. `.github/workflows/ci.yml` untouched (CI runs `make ci` →
`solid-lint` → the updated Makefile target).

**Done when:**
- Makefile `solid-lint` target NestJS branch replaced `npx eslint@8 -c ...`
  from root with `(cd "$$d" && NODE_PATH=$$(pwd)/node_modules
  ./node_modules/.bin/eslint -c ../templates/ci/eslintrc.backend.js
  --resolve-plugins-relative-to . 'src/**/*.{ts,tsx}')`.
- Fail-fast block added: exits with the eslint exit code and prints
  `✗ <d> ESLint (NestJS) failed with exit <code>`.
- `make solid-lint` executes the new command, loads plugins correctly,
  reports 10 real errors + 2 warnings, 0 `import/no-unresolved`.
- Frontend/Astro/Python branches NOT modified (out of scope).

**Evidence:** `git diff Makefile` shows only the NestJS branch changed.
`make -n solid-lint` shows valid syntax. `make solid-lint` confirms plugins
load and reports the 10 real errors.

---

## [x] T4 — Push to branch and verify CI reproduces baseline

**Description:** Push `chore/lint-infra-alignment` and confirm CI reports
the same 10 real errors, 0 `import/no-unresolved`.

**Done when:**
- CI pipeline passes lint step with expected error set.
- CI output matches local output (parity confirmed).

**Evidence:** PR #30 merged into master (commit 256f841). CI ran `solid-lint` and
reported the 10 real errors (complexity, unused vars, no-duplicate-string,
max-lines) with `import/no-unresolved` at 0. Plugin loading confirmed
(`@typescript-eslint/eslint-plugin` resolved via `backend/node_modules`).

---

## [x] T5 — Document local/CI parity in the PR

**Description:** Add a section to the pull request describing the lint
command used locally and in CI, the baseline error counts, and the parity
verification result.

**Done when:**
- PR description includes parity evidence.
- Future contributors can reproduce both lint paths.

**Evidence:** PR #30 body includes section "Impact (before → after)" with
metrics table (Total problems 45→12, Errors 43→10, import/no-unresolved
33→0, CI loads plugins ❌→✅). Parity documented for future contributors.

## Follow-ups (out of scope)

- **frontend-lint-infra-alignment** — Angular and Astro branches of `solid-lint`
  still use `npx eslint@8` from repo root. Same fix pattern (B2) applies.
  Separate change. Tracked in proposal.md.
- **@typescript-eslint v6 → v8** — TS 5.7.2 outside v6's supported range.
  Warning only. Separate change.
- **specboot.sh per-change validation** — after PR #26, only `--ci` global
  validation exists. Per-change validation needs to be restored or replaced.
  Separate concern.
