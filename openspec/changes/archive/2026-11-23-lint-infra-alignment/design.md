# Design — lint-infra-alignment

## Decisions

The following decisions were made during implementation. No further choice is
needed; the change is implemented and verified locally.

---

## D1 — How to resolve H1 (import/no-unresolved false positives)

**DECIDED: C3 — Hybrid resolver (node + TypeScript)**

Applied to `templates/ci/eslintrc.backend.js`:

```js
settings: {
  'import/resolver': {
    node: {},
    typescript: {
      project: ['./tsconfig.json', './tsconfig.test.json'],
      alwaysTryTypes: true,
    },
  },
},
```

**Why C3 over C1:** C1 (TypeScript-only resolver) does not resolve bare
node_modules imports like `firebase-admin/app`. C3 adds `node: {}` so both
`@/*` aliases (via TypeScript) and node_modules packages (via node resolver)
resolve correctly.

**Verification:** After applying C3, local lint went from 45 problems
(33 `import/no-unresolved`) to 12 problems (0 `import/no-unresolved`).
C1 was considered and rejected — it does not cover `firebase-admin/*` bare
imports.

---

## D2 — How to align lint between local and CI

**DECIDED: B2 — Backend-local eslint with NODE_PATH**

Applied to `Makefile` target `solid-lint`, NestJS branch:

```make
(cd "$$d" && NODE_PATH=$$(pwd)/node_modules ./node_modules/.bin/eslint \
  -c ../templates/ci/eslintrc.backend.js \
  --resolve-plugins-relative-to . \
  'src/**/*.{ts,tsx}');
exit_code=$$?; \
if [ $$exit_code -ne 0 ]; then \
  echo "    ✗ $${d} ESLint (NestJS) failed with exit $$exit_code"; \
  exit $$exit_code; \
fi; \
```

**Why B2 over B1/B3:** B1 (`npx eslint@8` from root) cannot load plugins
because `backend/node_modules` is not available from the repo root — CI was
failing with "couldn't find the plugin". B3 (document divergence) leaves the
gate unreliable. B2 makes CI execute the same command as local, using
`backend/node_modules` and `backend/tsconfig.json`.

**Verification:** `make solid-lint` now loads plugins correctly, reports
10 real errors + 2 warnings, 0 `import/no-unresolved`, and fails fast with
`✗ backend ESLint (NestJS) failed with exit 1`.

B1 and B3 were considered and rejected — B1 is broken at the plugin-loading
level; B3 does not provide parity.

---

## Root cause discovery

During implementation, investigation revealed that CI does **not** merely
"fail to report `import/no-unresolved`". CI fails earlier: `npx eslint@8`
run from the repo root cannot find `@typescript-eslint/eslint-plugin` because
there is no `node_modules` in the root and no `--resolve-plugins-relative-to`
pointing at `backend/node_modules`. This is the actual cause of CI lint
failures in PRs #24–26. T3 (B2) fixes this by making CI execute eslint from
`backend/` with `NODE_PATH` pointing at `backend/node_modules`. It is
blocking, not cosmetic.

---

## D3 — @typescript-eslint v6 vs TypeScript 5.7.2

**Accepted risk.**

`@typescript-eslint/parser` v6.21.0 supports TS `<5.4.0`; installed TS is
5.7.2. ESLint emits a version warning at startup.

**Impact:** Warning only; does not break lint execution or rule evaluation.

**Mitigation:** Accept the warning until a dedicated change upgrades
`@typescript-eslint` to v8 (which supports TS 5.x). Does not block this
change.

---

## Configuration files affected

| File | Change |
|------|--------|
| `templates/ci/eslintrc.backend.js` | Add `settings['import/resolver']` (D1, C3) |
| `Makefile` | Update `solid-lint` target NestJS branch (D2, B2) — `cd backend` + `NODE_PATH` + `--resolve-plugins-relative-to` |

No backend source files are modified by this change.