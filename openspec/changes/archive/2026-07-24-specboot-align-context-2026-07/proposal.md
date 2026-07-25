# Proposal — specboot-align-context-2026-07

## Why

The project is behind `Specboot@main` on three structural improvements:

1. **Ticket 4 — SOLID mechanical enforcement in CI**: `templates/ci/` (ESLint thresholds for NestJS/Angular/Astro, `dependency-cruiser` DIP rules, `madge` for Angular circular deps), `docs/ci-standards.md` to map thresholds to docs, `tests/solid-templates-test.sh` meta-validation, `Makefile` `solid-lint` target and `.github/workflows/ci.yml` `solid-lint` job. None of these are present in the project today, so CI can only validate lint/build/test, not architectural invariants.
2. **8-phase code auditing**: upstream Specboot added a Fase 8 "SOLID/POO — Lente Architect" to `ai-specs/skills/code-auditing/SKILL.md` with per-stack checklists and mandatory output format. Local `code-auditing/SKILL.md` is still 7-phase. `opencode.json`, `AGENTS.md`, and `ai-specs/README.md` still say "7-phase".
3. **SOLID envelopes in standards docs**: upstream added Section 9 "Principios de Diseño No Negociables" to `base-standards.md`, "Principios de Diseño — Backend (NestJS)" to `backend-standards.md`, and "Principios de Diseño — Frontend (Angular)" + "Principios de Diseño — Astro" to `frontend-standards.md`. None of these are present locally — `backend-standards.md` declares the flat NestJS modular layout without a SOLID envelope.

On top of the Specboot alignment, the project context in `docs/base-standards.md` Section 8 is out of date: it still references "NestJS 10" despite `package.json` already using `^11.1.28`, it doesn't mention the Stitch design system, frontend UI stack is incomplete, user personas and business flows are not written down, and MVP vs post-MVP module roadmap is implicit.

## What Changes

This change is **docs + tooling only**. No production code is modified (the `empresas` module in `backend/src/modules/empresas/` is not touched; its refactor to Clean Architecture will be a separate change `empresas-clean-arch-refactor-2026-07`).

### A. Specboot upstream alignment (tooling)

- **Create `templates/ci/`** (7 files) adapted to the monorepo:
  - `eslintrc.backend.js`, `eslintrc.frontend.js`, `eslintrc.astro.js` (ESLint thresholds: `max-lines 300/400/400`, `complexity 10`, `sonarjs/cognitive-complexity 10`).
  - `.dependency-cruiser.js` (DIP rules `no-infra-from-domain`, `no-orm-or-http-from-domain`, `no-application-importing-concrete-repository`; `tsConfig` pointing at `backend/tsconfig.json`).
  - `.madge.config.json` (Angular circular-dep detection against `frontend/tsconfig.app.json`).
  - `package.ci.json` (snapshot of devDeps), `README.md` (threshold mapping + monorepo instantation).
- **Create `docs/ci-standards.md`** — maps `docs/backend-standards.md`/`docs/frontend-standards.md` thresholds to the `templates/ci/` configs.
- **Create `tests/solid-templates-test.sh`** — meta-validation of the SOLID templates.
- **Update `Makefile`** — add target `solid-lint` gated on `backend/package.json` + `backend/src/`, with paths adapted to the monorepo. Preserve existing `npm --prefix backend` adaptation. Update `.PHONY`.
- **Update `.github/workflows/ci.yml`** — add a `solid-lint` job between `build` and `security-audit`, gated by `hashFiles('backend/package.json') != ''`. Preserve the local `continue-on-error: true` on `security-audit` (intentional, firebase-admin transitive vulns).
- **Update `update.sh`** — add `templates` to `SYNC_ITEMS` so the upstream sync tool pulls `templates/ci/`. Add a caveat comment about Makefile monorepo adaptation (don't blindly overwrite).
- **Update `.gitignore`** — add `backend/coverage/` (currently untracked) and `*.map` (in case Stitch exports include source maps).

### B. SOLID envelopes in standards docs

- **`docs/base-standards.md`**:
  - Fix Section 3 relative paths: `[Backend Standards](backend-standards.md)` (sibling, not `docs/backend-standards.md`).
  - Add new **Section 9 "Principios de Diseño No Negociables"** declaring SOLID as the project-level rector principle, pointing readers to the sections in `backend-standards.md` / `frontend-standards.md`.
- **`docs/backend-standards.md`**:
  - Add new H2 **"Principios de Diseño — Backend (NestJS)"** between "Logging y errores" and "Stack específico del proyecto". Sub-sections: carpetas obligatorias `domain`/`application`/`infrastructure` per feature; SRP, OCP, LSP (contract specs), ISP (interfaces ≤5 métodos), DIP reinforcement; **Umbrales objetivos medibles por linters en CI**: max 300 lines/file, cyclomatic ≤10, max 3 constructor params, inheritance depth ≤2.
  - Rewrite the local "Estructura de módulos (NestJS)" sub-section from flat `modules/<nombre>/{controller,service,dto,entities}` → `modules/<nombre>/{domain,application,infrastructure}`. Note: `empresas` will follow this pattern after the separate refactor change.
- **`docs/frontend-standards.md`**:
  - Add new **"Principios de Diseño — Frontend (Angular)"** (SRP smart/dumb — dumb components may not inject data services; DIP no `new HttpClient()`; ISP specific selectors; Umbrales `max-lines 400` per `.ts`, inline template >60-80 lines → extract).
  - Add new **"Principios de Diseño — Astro"** (frontmatter without non-trivial business logic). Reference only — Astro not used today.
  - Update stack UI: TailwindCSS v3 + Angular Material (solely for the panel admin, future change) + `@angular/google-maps` + `ngx-skeleton-loader` + `lucide-angular`.

### C. Context enrichment — Section 8 of `docs/base-standards.md`

Rewrite Section 8 (preserve it as Section 8 — do not renumber). New content:

- **Stack completo actualizado** (Backend: Node.js 22 + NestJS 11.x + TypeScript 5; BaaS: Firebase; Frontend: Angular 20 standalone + @angular/fire 20 + Firebase Web SDK 11; UI: TailwindCSS v3 + Angular Material solo panel admin + @angular/google-maps + ngx-skeleton-loader + lucide-angular; Design system: "Dunas y Océano" — `docs/DESIGN.md`; Cache, tests, OpenAPI, ESLint+dependency-cruiser+madge; Deploy VPS Docker, frontend deploy TBD; SDD: Specboot + OpenSpec).
- **Usuarios/personas** (3): Visitante anónimo, Empresario (rol `empresa`), Admin del directorio (rol `admin`). Explicitly NOT include `reviewer` (post-MVP).
- **Flujos de negocio** (3):
  1. Registro de empresa: empresario se registra en Firebase Auth (rol `empresa`) → `POST /api/v1/empresas` (genera `solicitud` pendiente + `empresa` pendiente) → admin aprueba `solicitud` → empresa pasa a `status: aprobado`.
  2. Descubrimiento: visitante anónimo navega home (`docs/home/code.html`) → filtra por categoría/barrio (`/api/v1/empresas?q=&categoriaId=&barrioId=`) → abre ficha por `slug` → ve mapa interactivo.
  3. Gestión de catálogo: admin mantiene `categorias` y `barrios` vía CRUD admin; seed fijo al iniciar (`npm run seed`).
- **Roadmap de módulos**:
  - **MVP**: auth → usuarios → categorías → barrios → solicitudes → frontend (4 pantallas: home/listado, ficha empresa = `docs/perfil/code.html`, vista mapa = `docs/mapa/code.html`, auth signup/login = `docs/login/code.html`).
  - **Post-MVP** (módulos comentados en `app.module.ts`, referenciados pero no en scope): planes, suscripciones, pagos, recursos-digitales, chat-empresarial, reviews, ai, analytics.
  - **Panel admin + Angular Material UI**: cambio futuro fuera de este cambio.
- Section 8.1 (references to `.github/instructions/`) preserved.

### D. Design system "Dunas y Océano" (Stitch-originated) as canonical

The user already provides Stitch exports in `docs/home/`, `docs/login/`, `docs/mapa/`, `docs/perfil/` — each folder has `code.html` (TailwindCSS v3 with inline config), `DESIGN.md` (157 lines, front-matter YAML with tokens + "Dunas y Océano" semantic description), and `screen.jpg` (compressed screenshots). All four `DESIGN.md` are identical (Stitch generates design system at project level, not per screen).

Tasks:

- **Create canonical `docs/DESIGN.md`** consolidating the design system. Content = `docs/home/DESIGN.md` (single source of truth with YAML front-matter + semantic description of "Dunas y Océano": Ocean Blue primary `#004370`, Sand Beige secondary `#fadeba`, Pine Green tertiary `#1d4a19`, Sunset Orange accent; Montserrat headlines + Inter body; radii scale; 4-level ambient shadows; fluid grid 1280/1024/768/<767 with 24px/24px/16px gutters; 8px spacing scale).
- **Delete the 3 duplicate `DESIGN.md`** in `docs/login/`, `docs/mapa/`, `docs/perfil/`. Keep their `code.html` and `screen.jpg` as per-screen reference assets.
- **Reference `docs/DESIGN.md` in `docs/frontend-standards.md`**: new "Sistema de diseño — Dunas y Océano" sub-section. Rules:
  - All Angular components must consume design tokens from `docs/DESIGN.md`; no hardcoded hex/spacing.
  - `frontend/tailwind.config.js` extends `theme.extend.colors|fontFamily|borderRadius|boxShadow` with tokens from `docs/DESIGN.md`.
  - Angular Material custom theme (future, only for panel admin) must map `$palette-primary` from Ocean Blue.
- **Reference `docs/DESIGN.md` in Section 8 of `docs/base-standards.md`** (already covered by task C above).
- **Add `docs/DESIGN.md` to `specboot.sh` `REQUIRED_FILES`** (canonical file).
- **Add per-screen reference assets (`code.html`, `screen.jpg`) to `specboot.sh` `EXAMPLE_FILES`** (warn if missing, not fail).
- **Add `docs/DESIGN.md` row to `ai-specs/README.md` `Customization` table**.
- **Add `templates/ci/` row and `docs/ci-standards.md` row to `ai-specs/README.md` `Customization` table** (part of B alignment).

### E. Skills alignment 8 phases

- **Replace `ai-specs/skills/code-auditing/SKILL.md`** with the upstream version: 8 phases (Fase 1 Security, Fase 2 Types, Fase 3 Performance, Fase 4 Dead code, Fase 5 Best practices, Fase 6 Tests, Fase 7 OpenSpec Alignment, Fase 8 SOLID/POO — Lente Architect). Fase 8 must include concrete checklists per stack (NestJS/Backend: DIP violations imports in `domain`/`application` from TypeORM/Prisma/Mongoose/`@nestjs/axios`, SRP `@Injectable()` mixing data + business + formatting, DIP `new` inside constructors, OCP growing `if/else`/`switch`, ISP interfaces >5 methods, SRP >300 lines or complexity >10) + Angular (dumb component injecting data service; component mixing presentation + business logic) + Astro (frontmatter with non-trivial business logic). Mandatory output format per Fase 8 finding: `[Principio violado] — [Archivo:línea] / Qué se observa / Por qué viola / Refactor sugerido`.
- **Update wording "7-phase" → "8-phase"** in:
  - `opencode.json` `adversarial-review.template` ("Run the 7-phase audit" → "Run the 8-phase audit") and `.description` ("Systematic 7-phase code quality audit" → "Systematic 8-phase code quality audit").
  - `AGENTS.md`: skill table row `code-auditing` (append "(incluye lente Architect/SOLID-POO)") and command table row `/adversarial-review` (append "(incluye lente Architect/SOLID por stack)").
  - `ai-specs/README.md`: description (7→8 phases), phases list (add "SOLID/POO (lente Architect)"), structure tree (mention new templates folder reference), Customization table (3 new rows: `docs/ci-standards.md`, `templates/ci/`, `docs/DESIGN.md`).
- **Do NOT add `model` to `opencode.json`** — stays model-agnostic per upstream README and user decision.

## Impact

- **Non-breaking**: docs only + new tooling that runs in CI. No production code modified. Existing 25 tests of `empresas` continue passing because `empresas` is left in the flat module layout (the dependency-cruiser `from.path` rule `^backend/src/modules/[^/]+/domain/` won't match a non-existent `domain/` folder → 0 violations expected).
- **CI**: new `solid-lint` job will run on every PR/push. Add ~30s to CI.
- **Repo size**: ~682KB of new screenshots in `docs/<pantalla>/screen.jpg` (already added by user). `docs/DESIGN.md` ~7.5KB. `templates/ci/` ~20KB. Total: under 1MB additions.
- **OpenSpec impact**: none — no touched specs, no broken `{file:...}` references (verified via `check-refs.sh`).
- **Future unblocks**: this change sets up the architectural rule for `empresas` and all subsequent NestJS modules (categorias, barrios, auth, usuarios, solicitudes) to follow Clean Architecture; the `empresas-clean-arch-refactor-2026-07` change implements it for `empresas` as the reference.

## Non-goals

- Refactoring `empresas` to Clean Architecture — separate change.
- Implementing any new NestJS module (categorias, barrios, auth, etc.) — separate changes per the MVP roadmap.
- Panel admin UI and Angular Material theme — future change out of MVP scope.
- Modifying `docs/deploy-standards.md` — already personalized for VPS/Docker and `update.sh` skips `docs/`.
- Modifying `docs/data-model.md` or `docs/api-spec.yml` — no domain changes in this change.
- `.github/instructions/*.md` — project-specific, preserved.
- Existing `openspec/specs/*.md` and `openspec/changes/archive/*.md` — preserved.
