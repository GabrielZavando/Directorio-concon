# CI Standards — SOLID/POO Mechanical Thresholds

> This document maps the "Umbrales objetivos" declared in `docs/backend-standards.md`
> and `docs/frontend-standards.md` to the concrete linter rules in `templates/ci/`.

## Purpose

When `make solid-lint` (or the `solid-lint` job in CI) runs, it enforces the SOLID
thresholds mechanically. This file documents the mapping so reviewers can verify
that the configs implement the intended rules.

## Backend (NestJS) — `docs/backend-standards.md` → `templates/ci/eslintrc.backend.js`

| Umbral (docs/backend-standards.md) | Regla ESLint (templates/ci/eslintrc.backend.js) | Valor |
|---|---|---|
| max 300 líneas/archivo | `max-lines` | `300` (error, skipBlankLines/skipComments) |
| complejidad ciclomática ≤ 10 | `complexity` | `10` (error) |
| complejidad cognitiva ≤ 10 | `sonarjs/cognitive-complexity` | `10` (error) |
| max 3 parámetros en constructor | `max-params` | `3` (error) |
| profundidad herencia ≤ 2 | (no hay regla ESLint directa; se valida vía `dependency-cruiser` y revisión manual) | — |
| DIP: no imports de infra en domain/application | `dependency-cruiser` rules `no-infra-from-domain`, `no-orm-or-http-from-domain`, `no-application-importing-concrete-repository` | — |

### Dependency-cruiser rules (templates/ci/.dependency-cruiser.js)

| Regla | Qué previene | From / To |
|---|---|---|
| `no-infra-from-domain` | domain/ importa firebase-admin, @nestjs/axios, class-validator, class-transformer | from `^backend/src/modules/[^/]+/domain/` → to `(firebase-admin|@nestjs/axios|class-validator|class-transformer|@google-cloud/)` |
| `no-orm-or-http-from-domain` | domain/ importa ORM/HTTP/SDKs (typeorm, prisma, mongoose, reflect-metadata, rxjs) | from `^backend/src/modules/[^/]+/domain/` → to `(typeorm|@prisma/client|mongoose|@nestjs/mongoose|@nestjs/typeorm|@nestjs/prisma|reflect-metadata|rxjs)` |
| `no-application-importing-concrete-repository` | application/ importa directamente infrastructure/ (debe usar puertos de domain/) | from `^backend/src/modules/[^/]+/application/` → to `^backend/src/modules/[^/]+/infrastructure/` |
| `no-circular` | dependencias circulares entre módulos | global |
| `no-orphan-domain-files` | archivos en domain/ que nadie importa (warn) | from `^backend/src/modules/[^/]+/domain/` con `orphan: true` |

### Instantiation into `backend/.eslintrc.js`

The project already has a `backend/.eslintrc.js`. To inherit the SOLID thresholds,
merge the rules from `templates/ci/eslintrc.backend.js` into it. The `make solid-lint`
target runs ESLint directly against the template config, so it works even without
copying. For local `npm run lint` to include them, copy or merge:

```bash
# Option A: replace
cp templates/ci/eslintrc.backend.js backend/.eslintrc.js

# Option B: merge manually (recommended if you have custom rules)
# Edit backend/.eslintrc.js and add the rules from the template.
```

Also ensure `backend/package.json` has the required devDependencies (see `templates/ci/package.ci.json`).

## Frontend (Angular) — `docs/frontend-standards.md` → `templates/ci/eslintrc.frontend.js`

| Umbral (docs/frontend-standards.md) | Regla ESLint (templates/ci/eslintrc.frontend.js) | Valor |
|---|---|---|
| max 400 líneas/archivo | `max-lines` | `400` (error, skipBlankLines/skipComments) |
| max 4 parámetros | `max-params` | `4` (error) |
| complejidad ciclomática ≤ 10 | `complexity` | `10` (error) |
| complejidad cognitiva ≤ 10 | `sonarjs/cognitive-complexity` | `10` (error) |
| dumb components no inyectan data services | `@angular-eslint/no-input-rename` off; revisión manual en Fase 8 | — |

### Madge circular-dep detection (templates/ci/.madge.config.json)

Runs `madge --circular frontend/src --ts-config frontend/tsconfig.app.json` as part of `make solid-lint`
when `frontend/angular.json` exists.

### Instantiation into `frontend/.eslintrc.js`

The frontend may not have a `.eslintrc.js` yet. To enable local linting with SOLID thresholds:

```bash
cp templates/ci/eslintrc.frontend.js frontend/.eslintrc.js
```

Add the devDependencies from `templates/ci/package.ci.json` to `frontend/package.json`.

## How to run locally

```bash
# From repo root
make solid-lint

# Or directly
npx eslint -c templates/ci/eslintrc.backend.js backend/src/**/*.{ts,tsx}
npx dependency-cruiser backend/src --config templates/ci/.dependency-cruiser.js
# If Angular project exists:
npx eslint -c templates/ci/eslintrc.frontend.js frontend/src/**/*.ts
npx madge --circular frontend/src --ts-config frontend/tsconfig.app.json
```

## CI Integration

The job `solid-lint` in `.github/workflows/ci.yml` runs `make solid-lint` on every push/PR.
It is gated by `if: hashFiles('backend/package.json') != ''` so it only runs when the
backend package exists (monorepo-aware).

## Specboot Sync

`templates/ci/` is part of `update.sh` `SYNC_ITEMS`. When a new Specboot release is
published, running `bash update.sh --template /path/to/Specboot` will sync this folder
to the latest upstream. **NOTE:** the upstream `Makefile` does not have the monorepo
`npm --prefix backend` adaptation; after sync you must re-apply the monorepo adaptation
to `Makefile` (the caveat is documented in `update.sh`).