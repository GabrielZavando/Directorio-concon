# Changelog

All notable changes to Specboot are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
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
