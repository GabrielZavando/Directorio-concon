# Zavando Specboot — Agent Instructions

This file is read automatically by OpenCode.

## Context to load

Always read these files before starting any work:

- `docs/base-standards.md` — core principles, single source of truth
- `docs/backend-standards.md` — for any backend task
- `docs/frontend-standards.md` — for any frontend task
- `docs/deploy-standards.md` — for any deploy/release task
- `docs/documentation-standards.md` — for docs, API spec, or data model changes
- `docs/api-spec.yml` — API contracts (update before implementing API changes)
- `docs/data-model.md` — domain entities and database conventions

For implementation, adopt the relevant agent role:
- Backend work → `ai-specs/agents/backend-developer.md`
- Frontend work → `ai-specs/agents/frontend-developer.md`

## Skills

Skills live in `ai-specs/skills/`. When a request matches one of the triggers below, load and follow the corresponding `SKILL.md` automatically before continuing.

| Skill | Trigger |
|---|---|
| `enrich-us` | Refine a vague ticket into a user story before `/plan-change` |
| `code-auditing` | Run before archiving a change, or via `/adversarial-review` (incluye lente Architect/SOLID-POO) |
| `commit` | End of the SDD cycle, via `/commit` |
| `using-git-worktrees` | Parallel feature work during `/plan-change` |
| `deploy` | Release to staging/production, via `/deploy` |
| `onboarding` | A new developer is starting on the project |

For extended detail (phases, full descriptions, examples) see [`ai-specs/README.md`](ai-specs/README.md) — that file is for humans and is not auto-loaded, so it can go deeper than this table without duplicating what agents need at request time.

## Custom commands (OpenCode)

The following custom commands are defined in `opencode.json` for the SDD workflow:

| Command | Description |
|---------|-------------|
| `/enrich-us TICKET-ID` | Enrich a vague user story before planning |
| `/plan-change TICKET-ID` | Generate OpenSpec specs and tasks from a ticket |
| `/apply TICKET-ID` | Implement tasks from OpenSpec artifacts (TDD) |
| `/verify TICKET-ID` | Validate implementation against OpenSpec scenarios |
| `/adversarial-review` | Systematic 8-phase code quality audit (incluye lente Architect/SOLID por stack) |
| `/archive TICKET-ID` | Archive OpenSpec artifacts for the completed change |
| `/commit` | Create conventional commits and pull request |
| `/deploy` | Release: version bump, build, deploy, smoke tests, rollback |

## Non-negotiable rules

1. One task at a time. Never skip ahead.
2. Write the failing test first. Never write production code before a failing test exists.
3. All code fully typed. No `any` without explicit justification.
4. If a fix or change appears after `/apply` and before `/archive`: update OpenSpec artifacts first, then code. Never code-only fixes.
5. If anything is ambiguous in the specs, ask before assuming.
6. Documentation is the source of truth — specs before code, always.
