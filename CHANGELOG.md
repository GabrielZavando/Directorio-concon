# Changelog

All notable changes to Specboot are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Migrate from manually-synced Specboot template to the `@gabrielzavando/specboot@0.1.2` npm package** (feature/specboot-npm-migration):
  - Framework assets (`AGENTS.md`, `opencode.json`, `Makefile`, `specboot.sh`, `check-refs.sh`, `ai-specs/`, `.opencode/`, `templates/ci/`, workflows) now come from the published package via `specboot init` + `specboot update`; future updates use `npx specboot update` instead of manual sync. `.specboot.json` declares services (`backend`, `frontend`), stack (`node`), `extraStandards` and `layers`.
  - Docs restructured to the canonical layout: `docs/api-spec.yml` → `docs/api/api-spec.yml`, `docs/data-model.md` → `docs/data-model/data-model.md`; project context (formerly §8 of `docs/base-standards.md`) extracted to project-owned `docs/project/{stack,domain,client}.md`. All live references updated (26 files: backend code comments, OpenSpec specs, docs, README).
  - New SDD cycle: tag-based standards loading matrix (`[backend]`, `[frontend]`, `[api]`, …), subagents `backend`/`frontend` dispatched by `/apply`, new commands (`/show-spec-working`, `/explain`, rewritten `/verify` and `/archive`), legacy `opsx-*` commands removed.
  - Root `package.json` created: `@gabrielzavando/specboot` declared as `optionalDependencies` (CI has no GitHub Packages auth → skipped gracefully; locally install with token in `~/.npmrc`), plus SOLID tooling devDeps from `templates/ci/package.ci.json` and a root tooling-only `tsconfig.json` consumed by the framework's ESLint/dependency-cruiser configs. Root `package.json` `version` must stay in lockstep with `.specboot.json` `frameworkVersion` (validate-specboot.sh fallback resolution; documented in `docs/project/stack.md`).
  - CI adaptations: frontend `test` script now `ng test --watch=false --browsers=ChromeHeadless`; `frontend/.npmrc` with `legacy-peer-deps=true` (@angular/fire peer conflicts); framework `Makefile` adopted (intocable, parametrized by `.specboot.json`); `release.yml` not adopted (framework maintainer tooling without repository guard).
  - Legacy artifacts removed: `update.sh`, framework self-tests (`tests/{check-refs,update,solid-templates}-test.sh`), root `.env.example` (generic placeholder; backend keeps its real one), `.github/{instructions,prompts,skills}/`, `.github/copilot-instructions.md`. `PLAN_IMPLEMENTACION.md` and project tests (`tests/*.spec.mjs`) preserved.
  - OpenCode provider config (Omniroute) moved to the developer's global `~/.config/opencode/opencode.jsonc`; project `opencode.json` stays model-agnostic per framework contract.

### Changed
- **Sync Specboot tooling to upstream `GabrielZavando/Specboot@main`** (chore/specboot-sync): refreshed `ai-specs/` (added `agents/plan-agent.md`, `skills/plan-change/`, `reference/commits.md`, `examples/enrich-us-auth-reset.md`), `AGENTS.md`, `specboot.sh`, `check-refs.sh`, `templates/ci/` (added `.madge.config.json`, `README.md`, `package.ci.json`), `docs/ci-standards.md` (canonical Ticket 4 version) and `.env.example`. `Makefile.solid-lint` kept monorepo-aware (backend/frontend) over the upstream generic Metadoc version. `opencode.json` aligned `plan-change` to `{file:ai-specs/skills/plan-change/SKILL.md}` and JSON syntax fixed. `tests/solid-templates-test.sh` assertions updated to the new quoted ESLint keys and generic madge config.
- **Template is OpenCode-only**: removed `.claude/` and `.cursor/` symlinks; no Claude Code or Cursor configuration is generated. Agent/skill artifacts live in `ai-specs/` and are consumed by OpenCode via `{file:...}` references in `opencode.json` (base-standards.md §6, README FAQ).
- `specboot.sh`: dropped symlink creation and the Windows copy fallback; `--init`/`--ci` now only validate structure, placeholders, JSON and referential integrity.
- Removed `tests/specboot-symlink-test.sh` (tested the removed symlink behavior).
- README: corrected clone URL, OpenSpec badge (`new change`), clarified `model` is optional, and replaced the Cursor/Claude FAQ with an OpenCode-only note.
- CI: `build` job upload tolerates a missing `dist/` (`if-no-files-found: warn`) so the template repo passes CI without a build artifact.
- `deploy.yml`: jobs are guarded by `hashFiles('Dockerfile') != ''` so tag pushes on the template (no Dockerfile) do not attempt a Node/Docker deploy.
- `AGENTS.md`: restored the skill trigger table (name + trigger) that was replaced by a pointer to `ai-specs/README.md`. Since `AGENTS.md` is the file auto-loaded via `instructions[]` and `ai-specs/README.md` is not, the pointer left the auto-load matching mechanism with nothing to match against.
- `check-refs.sh`: added a guard that fails if any `ai-specs/skills/*/` folder is not mentioned in `AGENTS.md`, to catch this class of drift automatically.

## [0.1.0] - 2026-07-16

### Added
- SDD template: `AGENTS.md`, `opencode.json` y agentes (`plan`, `build`, `reviewer`).
- Estándares base y por área: `docs/base-standards.md`, `backend-`, `frontend-`, `documentation-`.
- Skills reutilizables en `ai-specs/skills/` (enrich-us, commit, code-auditing, using-git-worktrees, deploy, onboarding).
- `specboot.sh`: setup (`--init`) y validación (`--ci`) con lista única de archivos requeridos y symlinks.
- `check-refs.sh`: validación de integridad referencial de tokens `{file:...}` en `opencode.json` y `SKILL.md`.
- `Makefile` stack-agnostic que expone `install/lint/test/build/audit/commitlint/refs`.
- `update.sh`: sincroniza el tooling del template a proyectos existentes sin tocar `docs/`, y `--bump` para releases semver.
- `CHANGELOG.md` y versionado por git tags (`vX.Y.Z`).
