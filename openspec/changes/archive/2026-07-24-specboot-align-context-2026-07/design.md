# Design — specboot-align-context-2026-07

This change is mostly mechanical (sync tooling + docs). The design decisions worth recording are the ones that weren't obvious and required choosing between alternatives.

## 1. Monorepo adaptation of `templates/ci/`

### Decision
The upstream Specboot templates assume a single-package layout (`./package.json`, `./src/`, `./tsconfig.json`). The local project is a monorepo (`backend/`, `frontend/`). Adapting them verbatim would:
- Make `dependency-cruiser` look for `./tsconfig.json` (doesn't exist).
- Make ESLint `parserOptions.project` look at the wrong path.
- Make the `make solid-lint` target check `[ -f package.json ]` (false at repo root) and skip silently.

We adapt **all** paths in the templates, Makefile, and `ci.yml` to point at `backend/` (for backend) or `frontend/` (for Angular), keeping the upstream rule semantics intact.

### Files affected
- `templates/ci/eslintrc.backend.js` → `parserOptions.project: "./backend/tsconfig.json"`.
- `templates/ci/.dependency-cruiser.js` → `tsConfig.fileName: "backend/tsconfig.json"`. `from.path` regexes: `^backend/src/modules/[^/]+/(domain|application)/` (instead of `^src/(domain|application)/`).
- `templates/ci/.madge.config.json` → points at `frontend/tsconfig.app.json`.
- `Makefile` `solid-lint` target → gate `[ -f backend/package.json ] && [ -d backend/src ]`; runs `npx eslint -c templates/ci/eslintrc.backend.js backend/src/**/*.{ts,tsx}`.
- `.github/workflows/ci.yml` `solid-lint` job → `if: hashFiles('backend/package.json') != ''`.

### Why not a generic "find package.json anywhere" approach
We considered making `make solid-lint` autodiscover packages via `find . -name package.json -not -path "*/node_modules/*"`. Rejected: it makes the target non-deterministic across dev/CI machines and would require careful `node_modules` exclusions. The monorepo layout is stable, so explicit `backend/` paths are clear and deterministic.

## 2. `empresas` staying flat during this change

### Decision
`empresas` is NOT moved to Clean Architecture in this change. The new SOLID docs in `docs/backend-standards.md` declare the clean layout as canonical, but `empresas` will continue to use the flat `modules/empresas/{controller,service,dto,entities}` layout until the separate change `empresas-clean-arch-refactor-2026-07` runs.

### Why this is acceptable
- `dependency-cruiser` rules use `from.path` regex `^backend/src/modules/[^/]+/(domain|application)/`. Since `empresas` has no `domain/` or `application/` folder, the rule simply doesn't match → 0 violations reported. The CI doesn't fail.
- ESLint thresholds (`max-lines 300`, `complexity 10`) apply regardless of folder layout, so they still enforce SRP on the existing flat files.
- This is documented in `docs/backend-standards.md` "Estructura de módulos (NestJS)" section with a note: `empresas` will follow this pattern after the refactor change.

### Why not refactor `empresas` inline
Keeping the refactor separate gives you:
- One, atomic, reviewable commit per concern.
- The 25 passing tests don't need a "save point" at every docs commit.
- The architectural envelope docs can land first; future NestJS modules can already adopt Clean Architecture before `empresas` is refactored (low risk since `empresas` is just one feature).

## 3. `docs/DESIGN.md` consolidation

### Decision
The user provided Stitch exports in `docs/home/`, `docs/login/`, `docs/mapa/`, `docs/perfil/`. Each folder contains an identical `DESIGN.md` (Stitch generates the design system at project level, not per screen). The four `DESIGN.md` files have identical content (YAML front-matter with all tokens + the "Dunas y Océano" semantic description).

We consolidate into a **single canonical** `docs/DESIGN.md` (sibling to `docs/api-spec.yml`, `docs/data-model.md`, `docs/backend-standards.md`).
We **delete** the 3 duplicate `DESIGN.md` (in `docs/login/`, `docs/mapa/`, `docs/perfil/`) and keep all 4 `code.html` + `screen.jpg` as per-screen reference assets.

### Structure after this change
```
docs/
├── DESIGN.md                       ← canonical design system (tokens YAML + semantic)
├── home/
│   ├── code.html                   ← Tailwind v3 export from Stitch (mobile + desktop inferred from one screen)
│   └── screen.jpg                  ← visual reference of the home screen
├── login/
│   ├── code.html
│   └── screen.jpg
├── mapa/
│   ├── code.html
│   └── screen.jpg
└── perfil/
    ├── code.html
    └── screen.jpg
```

### Why at `docs/DESIGN.md` and not `frontend/DESIGN.md`
Specboot convention is `docs/` as the only canonical source for cross-cutting standards. `api-spec.yml`, `data-model.md`, `base-standards.md` all live there. Putting `DESIGN.md` at `docs/` makes it natural to reference from `ai-specs/README.md` Customization table and `specboot.sh` REQUIRED_FILES, consistent with how the other canonical docs are treated. Frontend developers reach it via relative link; we don't duplicate.

### Why keep `code.html` per screen
The four `code.html` are not identical (each is a different screen implementation with its own Tailwind utility classes, layout, component composition). They are reference assets, not design tokens. Agents reading the design system may want to see how a token was applied in a specific screen (e.g. how the Ocean Blue primary was used in the home hero vs the login submit button). Keeping per-screen `code.html` makes `docs/DESIGN.md` self-evidencing.

### Why keep `screen.jpg` per screen
Visual reference for adversarial reviews and future code-auditing Fase 8 SOLID checks (e.g. "does this Angular component match the layout principle in `docs/DESIGN.md` Section 5?"). The user already compressed to `.jpg` (total ~682KB).

## 4. Naming convention: "Dunas y Océano" as project identity

### Decision
Adopt "Dunas y Océano" as the canonical name of the design system in `docs/base-standards.md` Section 8 and `docs/frontend-standards.md`. Stitch named the design system after the geography of Concón (dunes + Pacific Ocean). The four color tokens carry the semantic naming: Primary "Deep Ocean Blue", Secondary "Sand Beige", Tertiary "Pine Green", Accent "Sunset Orange".

### Why
- Connects the project to its local context (tourism + coastal town of Concón).
- Makes the design system memorable for future PR reviews ("does this match Dunas y Océano?").
- Stitch already provided the semantic description; using the upstream name avoids inventing a competing label.

## 5. TailwindCSS + Angular Material split (no Angular Material for public site)

### Decision
Update `docs/frontend-standards.md` stack UI to:
- **TailwindCSS v3** → public site (home, ficha empresa, vista mapa, auth), 100% of public-facing UI.
- **Angular Material** → **only** for the panel admin (future change, not in this change's scope).

The Stitch exports are entirely Tailwind v3 (with inline `tailwind.config` matching the project tokens in `docs/DESIGN.md`). Angular Material would impose its own theme and components, clashing with the Tokens-driven Tailwind approach.

### Implication
- For the public site, ALL components are built with Tailwind utility classes + standalone Angular components, no Material dependency.
- `frontend/package.json` will eventually add `@angular/material` when the panel admin is implemented (separate change). For now, no install needed.
- `tailwind.config.js` in `frontend/` will extend with the tokens from `docs/DESIGN.md` when the actual Angular app scaffold starts consuming them (not in this change — this change only documents the rule).

## 6. `opencode.json` model stays undefined

### Decision
Even though we touch `opencode.json` for the wording 7→8 phases, we do NOT add a `"model"` field. OpenCode uses the session's active model. This is per upstream README and user decision ("Dejarlo agnóstico").

## 7. `update.sh` Makefile caveat

### Decision
Update `update.sh` `SYNC_ITEMS` to add `templates`. Add a comment block warning that the upstream `Makefile` lacks the local `npm --prefix backend` adaptation — so anyone running `update.sh --template <upstream>` blind would cave the local monorepo Makefile. The comment makes this risk explicit; the script does not auto-resolve it (the user is expected to re-apply monorepo adaptation when syncing).

## 8. `specboot.sh` validation rules

### Decision
- Add `docs/DESIGN.md` to `REQUIRED_FILES` (failure if missing). It's now canonical for the project.
- Add the 8 per-screen reference assets (4 `code.html` + 4 `screen.jpg` across `docs/{home,login,mapa,perfil}/`) to `EXAMPLE_FILES` (warn if missing, not fail). Reason: these are reference-grade, not strictly required for the project to function. A future project may have a different design system with no per-screen HTML export.

## 9. No changes to existing OpenSpec specs

### Decision
Existing specs in `openspec/specs/` (`backend-env-align`, `firebase-credentials-file`, `firebase-optional-init`, `frontend-firebase-init`) are out-of-scope and remain as-is. The `firebase-optional-init` spec interprets `FIREBASE_ENABLED=false` strictly (without service account, Firebase disabled). Our change doesn't touch any Firebase behavior, so no conflict.

## 10. Order of execution within this change

### Decision
Implement tasks in this order:
1. **Phase 1** — Section 8 rewrite (context first, so all other changes are made with correct context loaded).
2. **Phase 1.5** — Design system canonical `docs/DESIGN.md` + references + specboot.sh rules.
3. **Phase 2** — Tooling sync (`templates/ci/`, `ci-standards.md`, `solid-templates-test.sh`, Makefile, ci.yml, `update.sh`, `.gitignore`).
4. **Phase 3** — SOLID docs (Section 9 base, backend SOLID NestJS, frontend SOLID Angular + Astro).
5. **Phase 4** — Skills 8 phases (code-auditing SKILL.md, wording in opencode.json + AGENTS.md + ai-specs/README.md).
6. **Phase 5** — Validation (specboot.sh --ci, check-refs, solid-templates-test, make solid-lint, make test/build, /adversarial-review, /verify).

### Why this order
- Context first ensures the docs and tooling decisions are made with the right stack/users/flows in mind.
- Design system before SOLID docs so the frontend-standards can cleanly reference both `docs/DESIGN.md` and "Principios de Diseño — Frontend (Angular)" without rewrites.
- Tooling before skills so the 8-phase audit skill can already reference `docs/ci-standards.md` and `templates/ci/` if needed.
- Validation last catches any broken `{file:...}` references introduced during 1-4 before commit.
