# templates/ci/ — SOLID enforcement configs (Ticket 4)

This folder contains the canonical ESLint + dependency-cruiser configs that enforce the
SOLID thresholds declared in `docs/backend-standards.md` and `docs/frontend-standards.md`.

## Files

| File | Target stack | Threshold |
|---|---|---|
| `eslintrc.backend.js` | NestJS backend (`backend/src/`) | `max-lines 300`, `complexity 10`, `sonarjs/cognitive-complexity 10`, `import/no-cycle |
| `eslintrc.frontend.js` | Angular frontend (`frontend/src/`) | `max-lines 400`, `@angular-eslint/*` rules, `complexity 10` |
| `eslintrc.astro.js` | Astro (reference only — not used today) | `max-lines warn 400`, `astro/*` rules |
| `.dependency-cruiser.js` | Backend DIP enforcement | Rules `no-infra-from-domain`, `no-orm-or-http-from-domain`, `no-application-importing-concrete-repository` against `backend/src/modules/<feature>/{domain,application,infrastructure}/` |
| `.madge.config.json` | Angular circular-dep detection | `circular: true` against `frontend/tsconfig.app.json` |
| `package.ci.json` | devDependencies snapshot | Versions of eslint, eslint-plugin-sonarjs, @angular-eslint/*, dependency-cruiser, madge, eslint-plugin-astro, @typescript-eslint/* |
| `README.md` | This document | Threshold ↔ docs mapping + instantiation steps |

## Monorepo adaptation

This project is a monorepo: backend lives under `backend/`, frontend under `frontend/`.
All configs in this folder are **already adapted** to point to the monorepo layout:

- `eslintrc.backend.js` → `parserOptions.project: './tsconfig.json'` (relative to CWD when invoked from `backend/`)
- `eslintrc.frontend.js` → `parserOptions.project: './frontend/tsconfig.app.json'`
- `.dependency-cruiser.js` → `tsConfig.fileName: 'backend/tsconfig.json'` + `from.path` regexes use `^backend/src/modules/...`
- `.madge.config.json` → `tsConfig: 'frontend/tsconfig.app.json'` + `rootDir: 'frontend/src'`

## How to instantiate into the project

The standalone `make solid-lint` target invokes these configs directly via `npx eslint -c
templates/ci/eslintrc.backend.js ...` — there is **no need** to copy them into `backend/`
or `frontend/` for the CI to enforce SOLID. However, you can also instantiate a copy into
the packages' own `.eslintrc.js` so that local `npm run lint` respects the same thresholds:

```bash
# Backend
cp templates/ci/eslintrc.backend.js backend/.eslintrc.js
# Frontend (new file)
cp templates/ci/eslintrc.frontend.js frontend/.eslintrc.js
# CI deps (merge devDependencies into backend/package.json or frontend/package.json as needed)
jq '.devDependencies' templates/ci/package.ci.json  # paste into the corresponding package.json
```

When you instantiate, **do not** delete the `templates/ci/` folder — `make solid-lint` and
the `solid-lint` job in `.github/workflows/ci.yml` still reference it.

## Threshold ↔ docs mapping

See `docs/ci-standards.md` for the canonical mapping between the "Umbrales objetivos"
sub-sections in `docs/backend-standards.md` / `docs/frontend-standards.md` and the
concrete ESLint rules in this folder.

## Specboot sync

`templates/` is in `update.sh` `SYNC_ITEMS` so running
`bash update.sh --template /path/to/Specboot` will sync this folder to the latest upstream.
