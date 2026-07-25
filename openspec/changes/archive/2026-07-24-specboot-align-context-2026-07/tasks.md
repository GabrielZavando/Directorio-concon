# Tasks — specboot-align-context-2026-07

> Una task a la vez. TDD cuando aplica (este cambio es docs + tooling: TDD aplica solo a `tests/solid-templates-test.sh`).
> Cambio docs + tooling ONLY: NO se toca código en `backend/src/modules/empresas/`.

## Change Summary

Alineación con `Specboot@main` (Ticket 4: SOLID mecánico + Fase 8 auditoría) + enriquecimiento del contexto Section 8 + design system canónico "Dunas y Océano" (originado en Stitch). El refactor de `empresas` a Clean Architecture queda fuera de este cambio (cambio separado `empresas-clean-arch-refactor-2026-07`).

---

## Fase 1 — Contexto Section 8 (contexto primero)

### Task 1.1 — Reescribir docs/base-standards.md Section 8
- [x] Section 8 "Contexto del proyecto":
  - Stack completo actualizado (Node.js 22 + NestJS **11.x** + TypeScript 5 + Firebase + Angular 20 + `@angular/fire` 20 + Firebase Web SDK 11 + TailwindCSS v3 + Angular Material solo panel admin futuro + `@angular/google-maps` + `ngx-skeleton-loader` + `lucide-angular` + Design system "Dunas y Océano" canónico en `docs/DESIGN.md`).
  - 3 usuarios: Visitante anónimo, Empresario (rol `empresa`), Admin del directorio (rol `admin`). Sin Reviewer.
  - 3 flujos de negocio: (1) Registro de empresa (signup → POST /empresas → solicitud pendiente → admin aprueba), (2) Descubrimiento (visitante filtra por cat/barrio/q → ficha por slug → mapa interactivo), (3) Gestión de catálogo (admin mantiene cat+barrios, seed vía `npm run seed`).
  - Roadmap de módulos: MVP (auth → usuarios → categorías → barrios → solicitudes → frontend con 4 pantallas) vs Post-MVP (planes, suscripciones, pagos, recursos-digitales, chat-empresarial, reviews, ai, analytics).
  - Panel admin + Angular Material: cambio futuro fuera de este cambio.
- [x] Preservar Section 8.1 (`.github/instructions/`) sin cambios.
- Priority: High
- Layer: Docs (Context)

### Task 1.2 — Actualizar docs/frontend-standards.md stack UI
- [x] Stack UI definitivo: TailwindCSS v3 + Angular Material (solo panel admin futuro) + `@angular/google-maps` + `ngx-skeleton-loader` + `lucide-angular`.
- [x] Mantener secciones "Convenciones" y apuntar a `.github/instructions/frontend-instructions.md` (no se modifica).
- Priority: High
- Layer: Docs (Frontend)

---

## Fase 1.5 — Design system "Dunas y Océano" canónico

### Task 1.5.1 — Consolidar docs/DESIGN.md
- [x] Mover `docs/home/DESIGN.md` a `docs/DESIGN.md` (contenido idéntico — single canonical 157 líneas con YAML front-matter + "Dunas y Océano" semantic description).
- [x] Eliminar los 3 `DESIGN.md` duplicados: `docs/login/DESIGN.md`, `docs/mapa/DESIGN.md`, `docs/perfil/DESIGN.md`.
- [x] Conservar los 4 `code.html` + 4 `screen.jpg` como per-screen reference assets en `docs/{home,login,mapa,perfil}/`.
- Priority: High
- Layer: Docs (Design)

### Task 1.5.2 — Referenciar docs/DESIGN.md en docs/frontend-standards.md
- [x] Nueva sección "Sistema de diseño — Dunas y Océano":
  - Link a `docs/DESIGN.md` como única fuente canónica de tokens.
  - Regla DIP/frontend: ningún componente Angular puede hardcoded hex/spacing; todo debe salir de `docs/DESIGN.md`.
  - Regla Tailwind: `frontend/tailwind.config.js` extiende `theme.extend.colors|fontFamily|borderRadius|boxShadow` con tokens de `docs/DESIGN.md` (Ocean Blue `#004370`, Sand Beige `#fadeba`, Pine Green `#1d4a19`, Sunset Orange accent; Montserrat headings, Inter body; radii `sm 0.25rem` / `DEFAULT 0.5rem` / `md 0.75rem` / `lg 1rem` / `xl 1.5rem`; 4-level ambient shadows).
  - Regla Angular Material (solo panel admin futuro): custom theme mapea `$palette-primary` desde Ocean Blue de `docs/DESIGN.md`.
- Priority: High
- Layer: Docs (Frontend)

### Task 1.5.3 — Actualizar ai-specs/README.md Customization table (design system + tooling rows)
- [x] Añadir 3 filas a la Customization table: `docs/ci-standards.md`, `templates/ci/`, `docs/DESIGN.md` (con descripciones específicas).
- Priority: High
- Layer: Docs (Ref)

### Task 1.5.4 — Actualizar specboot.sh validation rules
- [x] `REQUIRED_FILES` añade `docs/DESIGN.md` (fallo si falta).
- [x] `EXAMPLE_FILES` añade los 8 archivos per-screen: `docs/{home,login,mapa,perfil}/code.html` y `docs/{home,login,mapa,perfil}/screen.jpg` (warning si falta, no fallo).
- Priority: High
- Layer: Tooling

### Task 1.5.5 — .gitignore excludes
- [x] Añadir `*.map` (source maps si Stitch los trae).
- [x] Añadir `backend/coverage/` (verificado en `git status`, estaba untracked).
- Priority: Low
- Layer: Tooling

---

## Fase 2 — Specboot tooling sync

### Task 2.1 — Crear templates/ci/ (7 archivos adaptados al monorepo)
- [x] `templates/ci/eslintrc.backend.js` — `max-lines 300`, `complexity 10`, `sonarjs/cognitive-complexity 10`, `parserOptions.project: "./backend/tsconfig.json"`, `import/no-cycle` depth 10.
- [x] `templates/ci/eslintrc.frontend.js` — `max-lines 400`, `@angular-eslint` rules, `parserOptions.project` para `frontend/tsconfig.app.json`.
- [x] `templates/ci/eslintrc.astro.js` — `max-lines warn 400`, `eslint-plugin-astro` (referencia, no se usa hoy).
- [x] `templates/ci/.dependency-cruiser.js` — `tsConfig.fileName: "backend/tsconfig.json"`, reglas `no-infra-from-domain`, `no-orm-or-http-from-domain`, `no-application-importing-concrete-repository`, `from.path` regex `^backend/src/modules/[^/]+/(domain|application)/`. Prohibidos en domain: `firebase-admin`, `@nestjs/axios`, `class-validator`, `class-transformer`.
- [x] `templates/ci/.madge.config.json` — `frontend/tsconfig.app.json` para circular-dep Angular.
- [x] `templates/ci/package.ci.json` — snapshot de devDependencies (eslint, eslint-plugin-sonarjs, @angular-eslint/*, dependency-cruiser, madge, eslint-plugin-astro, @typescript-eslint/*).
- [x] `templates/ci/README.md` — mapeo thresholds-docs ↔ configs + instantación monorepo (`cp` + merge).
- Priority: High
- Layer: Tooling

### Task 2.2 — Crear docs/ci-standards.md
- [x] Documenta cómo los "Umbrales objetivos" de `docs/backend-standards.md` (max 300 líneas, complexity ≤10, max 3 constructor params, inheritance depth ≤2) mapean a `templates/ci/eslintrc.backend.js` y a `templates/ci/.dependency-cruiser.js`.
- [x] Documenta el flujo de instantación: cómo mergear `templates/ci/eslintrc.backend.js` en `backend/.eslintrc.js` ya existente, cómo instanciaridad `frontend/.eslintrc.js`.
- Priority: High
- Layer: Docs (CI)

### Task 2.3 — Crear tests/solid-templates-test.sh
- [x] TDD: escribir el test que valida que los 7 archivos de `templates/ci/` son válidos JS/JSON y contienen las reglas esperadas (thresholds en ESLint, reglas en dependency-cruiser, tsConfig paths monorepo).
- [x] `chmod +x tests/solid-templates-test.sh`.
- [x] `bash tests/solid-templates-test.sh` pasa en verde.
- Priority: High
- Layer: Tooling (Tests)

### Task 2.4 — Actualizar Makefile (añadir solid-lint + .PHONY)
- [x] Añadir target `solid-lint` con gate `[ -f backend/package.json ] && [ -d backend/src ]` (no `package.json`/`src` en raíz).
- [x] Para backend: `npx eslint -c templates/ci/eslintrc.backend.js backend/src/**/*.{ts,tsx}`.
- [x] Para Angular: `[ -f frontend/angular.json ]` → `npx eslint -c templates/ci/eslintrc.frontend.js frontend/src/**/*.ts && npx madge --circular frontend/src --ts-config frontend/tsconfig.app.json`.
- [x] Para dependency-cruiser: `npx dependency-cruiser backend/src --config templates/ci/.dependency-cruiser.js`.
- [x] Actualizar `.PHONY` añadiendo `solid-lint`.
- [x] Preservar `audit` con su `continue-on-error` adaptación local.
- Priority: High
- Layer: Tooling (CI)

### Task 2.5 — Actualizar .github/workflows/ci.yml (job solid-lint)
- [x] Insertar job `solid-lint` entre `build` y `security-audit`.
- [x] Gate: `if: hashFiles('backend/package.json') != ''` (no `package.json` en raíz).
- [x] Steps: checkout, setup-node, `make install`, `make solid-lint`.
- [x] Mantener `continue-on-error: true` en `security-audit` (intencional, firebase-admin transitive vulns).
- Priority: High
- Layer: CI

### Task 2.6 — Actualizar update.sh (SYNC_ITEMS añade templates + caveat)
- [x] `SYNC_ITEMS` cambia a: `(ai-specs AGENTS.md specboot.sh check-refs.sh Makefile templates)`.
- [x] Comentario caveat cerca de `SYNC_ITEMS` advirtiendo que el upstream `Makefile` no tiene la adaptación monorepo y que un sync ciego sobrescribe.
- Priority: Medium
- Layer: Tooling

### Task 2.7 — .gitignore completar
- [x] Añadir `backend/coverage/` (verificado untracked en `git status`).
- [x] Añadir `*.map` (mismo commit que Task 1.5.5 si hizo en la misma fase).
- Priority: Low
- Layer: Tooling

---

## Fase 3 — SOLID docs (genéricos + personalización)

### Task 3.1 — Corregir rutas relativas y añadir Section 9 en docs/base-standards.md
- [x] Section 3: cambiar `[Backend Standards](docs/backend-standards.md)` → `[Backend Standards](backend-standards.md)` (sibling). Mismo para `frontend-standards.md` y `documentation-standards.md`.
- [x] Añadir nueva "Section 9. Principios de Diseño No Negociables" después de Section 8, declarando SOLID + composition-over-inheritance como rector del proyecto, apuntando a las secciones detalladas en `docs/backend-standards.md` y `docs/frontend-standards.md`.
- Priority: High
- Layer: Docs (Standards)

### Task 3.2 — Añadir SOLID envelope + capas Clean en docs/backend-standards.md
- [x] Añadir nueva H2 "Principios de Diseño — Backend (NestJS)" entre "Logging y errores" y "Stack específico del proyecto":
  - Sub-sección "Estructura de carpetas obligatoria por módulo de negocio" (`domain/`, `application/`, `infrastructure/`) + regla DIP no imports de TypeORM/Prisma/Mongoose/`@nestjs/axios`/HTTP/SDKs en domain/application.
  - Sub-secciones SRP, OCP, LSP (contract specs `*.contract.spec.ts`), ISP (interfaces ≤5 métodos), DIP reinforcement.
  - "Umbrales objetivos (medibles por linters en CI)": max 300 líneas/archivo, cyclomatic complexity ≤10, max 3 constructor params, inheritance depth ≤2.
- [x] Reescribir "Estructura de módulos (NestJS)" actual (en "Stack específico del proyecto"): cambiar de `src/modules/<nombre>/{controller,service,dto,entities}` → `src/modules/<nombre>/{domain,application,infrastructure}`. Nota: `empresas` se alineará en el cambio `empresas-clean-arch-refactor-2026-07`.
- [x] Mantener todo lo demás (Firebase, Auth/roles, Tests, Lint/build).
- Priority: High
- Layer: Docs (Backend)

### Task 3.3 — Añadir SOLID Frontend Angular + Astro en docs/frontend-standards.md
- [x] Añadir nueva H2 "Principios de Diseño — Frontend (Angular)" con sub-secciones: SRP (smart vs dumb — dumb NO inyecta data services), DIP (no `new HttpClient()`), ISP (selectors específicos, no todo `Store<AppState>`), Umbrales (`max-lines 400` por `.ts`, inline template >60-80 lines → extract).
- [x] Añadir nueva H2 "Principios de Diseño — Astro" con SRP component-level y "frontmatter sin lógica de negocio no trivial". Referencia-only (no Astro hoy).
- [x] Mantener proyecto-specific "Convenciones" apuntando a `.github/instructions/frontend-instructions.md`.
- Priority: High
- Layer: Docs (Frontend)

---

## Fase 4 — Skills alineación 8 fases

### Task 4.1 — Sustituir ai-specs/skills/code-auditing/SKILL.md por versión 8 fases
- [x] Sustituir `SKILL.md` local (7 fases, 74 líneas) por la versión upstream (8 fases con Fase 8 "SOLID/POO — Lente Architect").
- [x] Fase 8 incluye checklists por stack: NestJS/Backend (DIP imports from firebase-admin/class-validator/@nestjs/axios, SRP @Injectable mixing data+business+formatting, OCP growing if/else/switch, ISP interfaces >5 métodos, SRP >300 lines / complexity >10), Angular (dumb component injecting data service, component mixing presentation+business), Astro (frontmatter with non-trivial business logic).
- [x] Fase 8 con formato de output obligatorio: `[Principio violado] — [Archivo:línea] / Qué se observa / Por qué viola / Refactor sugerido`.
- [x] Actualizar línea de descripción: "auditoría sistemática de calidad de código en 8 fases".
- Priority: High
- Layer: ai-specs (Skills)

### Task 4.2 — Actualizar wording 7→8 phases en opencode.json
- [x] `adversarial-review.template`: "Run the 7-phase audit" → "Run the 8-phase audit".
- [x] `adversarial-review.description`: "Systematic 7-phase code quality audit" → "Systematic 8-phase code quality audit".
- [x] **NO** añadir campo `"model"` (queda agnóstico).
- Priority: High
- Layer: Config

### Task 4.3 — Actualizar AGENTS.md (skill table + command table)
- [x] Fila skill `code-auditing`: append "(incluye lente Architect/SOLID-POO)" a su trigger.
- [x] Tabla de comandos `/adversarial-review`: "Systematic 7-phase code quality audit" → "Systematic 8-phase code quality audit (incluye lente Architect/SOLID por stack)".
- Priority: High
- Layer: Config (AGENTS)

### Task 4.4 — Actualizar ai-specs/README.md (desc 8 phases + phases + tree + Customization table)
- [x] Code Auditing description: "7-phase" → "8-phase".
- [x] Phases line: añade "SOLID/POO (lente Architect)".
- [x] Structure tree: añade referencia a `../templates/ci/` (Reference CI configs).
- [x] Customization table: 3 filas nuevas (`docs/ci-standards.md`, `templates/ci/`, `docs/DESIGN.md`). Task 1.5.3 cubre las fila de DESIGN.md.
- Priority: High
- Layer: ai-specs (Refs)

---

## Fase 5 — Validación

### Task 5.1 — specboot.sh --ci pasa
- [x] `bash specboot.sh --ci` exit 0 (con `docs/DESIGN.md` en `REQUIRED_FILES` y los 8 per-screen assets en `EXAMPLE_FILES`).
- Priority: High
- Layer: Validation

### Task 5.2 — check-refs.sh pasa
- [x] `bash check-refs.sh` exit 0 — verificar que ningún `{file:...}` en `opencode.json` y `SKILL.md` se rompió tras mover DESIGN.md.
- Priority: High
- Layer: Validation

### Task 5.3 — tests/solid-templates-test.sh pasa
- [x] `bash tests/solid-templates-test.sh` exit 0 — valida que los 7 archivos de `templates/ci/` son válidos.
- Priority: High
- Layer: Validation

### Task 5.4 — make solid-lint pasa con empresas flat
- [x] `make solid-lint` corre ESLint thresholds sobre `backend/src/` — con `empresas` en flat module, se reportan **0** violaciones de dependency-cruiser (no hay `domain/` folder) — ESLint thresholds se aplican a archivos existentes.
- [x] Esperado: 0 violaciones de dependency-cruiser, ESLint thresholds reporta hallazgos existentes (max-lines, complexity, max-params, no-explicit-any) — baseline técnico.
- Priority: High
- Layer: Validation

### Task 5.5 — make lint/test/build pasan
- [x] `make lint` en verde (NestJS lint sobre backend).
- [x] `make test` en verde (44 tests: empresas + firebase + config + app).
- [x] `make build` en verde (NestJS build backend).
- [x] Verificar que NO se tocó código de `empresas`, los 44 tests siguen pasando sin modificaciones.
- Priority: High
- Layer: Validation

### Task 5.6 — /adversarial-review corre las 8 fases
- [x] `/adversarial-review` con el nuevo SKILL.md 8 fases — reporta hallazgos SOLID/POO si encuentra en el diff.
- [x] Fase 8 Lente Architect checkout: no se espera encontrar DIP en `empresas` flat module (no hay `domain/`); Fase 8 reporta "no aplica para este change (empresas flat — refactor en cambio separado)".
- Priority: Medium
- Layer: Audit

### Task 5.7 — /verify + commits granulares
- [x] `/verify specboot-align-context-2026-07` — todos los escenarios en `specs/*.md` cubiertos (43/43).
- [x] Commits granulares (uno por fase lógica): `docs(context)`, `docs(design)`, `chore(tooling)`, `docs(solid)`, `chore(skills)`.
- Priority: High
- Layer: Validation

---

## Guidelines

1. **One task at a time.** No batching.
2. **TDD where applicable**: only `tests/solid-templates-test.sh` is testable en este cambio (es docs + tooling).
3. **Marcar `[ ]` → `[x]`** inmediatamente al completar cada task.
4. **Si cambia API/data-model/DESIGN.md**: actualizar docs antes de `/archive`. En este cambio son los `docs/*` los que se modifican, no hay cambios en API/data-model.
5. **No tocar `backend/src/modules/empresas/`**: queda intocado hasta el cambio `empresas-clean-arch-refactor-2026-07`.
6. **`docs/deploy-standards.md`**: no se modifica (update.sh no lo sincroniza).
7. **`openspec/specs/*.md` y `openspec/changes/archive/*.md`**: no se tocan.
8. Si algo se vuelve ambiguo al aplicar, **pausar y preguntar** antes de asumir.
