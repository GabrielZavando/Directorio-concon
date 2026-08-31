# AI Specs — Agency Zavando

> Central index of AI agents, skills, and examples for Spec-Driven Development.

## Structure

```
ai-specs/
├── README.md              ← This file
├── agents/
│   ├── backend-developer.md
│   ├── frontend-developer.md
│   └── build-agent.md
├── skills/
│   ├── enrich-us/
│   ├── commit/
│   ├── code-auditing/
│   ├── using-git-worktrees/
│   ├── deploy/            ← NEW
│   └── onboarding/        ← NEW
├── examples/
│   ├── scenarios-example.md     ← NEW
│   ├── requirements-example.md   ← NEW
│   ├── ticket-ejemplo.md         ← NEW
│   └── tasks.md                  ← Improved
└── ../templates/ci/             ← Reference CI configs (Ticket 4) — instantiated, not run, in the Metadoc template
```

---

## Agents

> Architecture: agent *definitions* live in `.opencode/agents/*.md` (loaded by OpenCode
> with frontmatter `mode`/`permission`). Their *role content* is written once in
> `ai-specs/agents/*.md` and injected via ``file:...``. This avoids duplicating the
> role text and keeps the per-task context load minimal.

### Native agents (`.opencode/agents/`)

- **plan** (`plan.md`) — generates OpenSpec specs from a ticket (`/plan-change`).
- **build** (`build.md`) — full-stack implementation agent; reads `tasks.md`, implements one task at a time following TDD. Dispatches to `backend`/`frontend` subagents by domain.
- **verify** (`verify.md`) — runs tests and checks traceability (read-only).
- **archive** (`archive.md`) — closes the SDD change and stages for commit.
- **reviewer** (`reviewer.md`) — adversarial red-team audit (`/adversarial-review`).

### Subagents (wired via ``file:...``, dispatched by `build`)

- **backend** (`backend.md` → `ai-specs/agents/backend-developer.md`) — backend tasks (NestJS/API/DB).
- **frontend** (`frontend.md` → `ai-specs/agents/frontend-developer.md`) — frontend tasks (Angular/Astro).

### Role content (`ai-specs/agents/`)

- **Build Agent** (`build-agent.md`): full-stack implementation agent.
- **Backend Developer** (`backend-developer.md`): backend specialist; applied via the `backend` subagent.
- **Frontend Developer** (`frontend-developer.md`): frontend specialist; applied via the `frontend` subagent.
- **Plan / Verify / Archive Agents**: role content for the native agents above.

> Note: `README.md` at repo root lists the *native + subagent* set. Keep both in sync
> when adding an agent.

## Skills

### Code Auditing (`skills/code-auditing/SKILL.md`)

Systematic 8-phase code quality audit.

**Phases:** Security → Types → Performance → Dead code → Best practices → Tests → OpenSpec alignment → SOLID/POO (lente Architect)

**Use case:** `/adversarial-review` before archiving a change (incluye chequeo SOLID/POO específico por stack).

### Commit & PR (`skills/commit/SKILL.md`)

Conventional commits and pull request creation.

**Use case:** `/commit` at the end of the SDD cycle.

### Deploy (`skills/deploy/SKILL.md`) — NEW

Release workflow, version bump, Docker build, rollback.

**Use case:** Before deploying to staging/production.

### Enrich User Story (`skills/enrich-us/SKILL.md`)

Refine vague tickets into actionable user stories with Gherkin criteria.

**Use case:** `/enrich-us` before `/plan-change`.

### Onboarding (`skills/onboarding/SKILL.md`) — NEW

Setup guide for new developers joining the project.

**Use case:** First day for new team members.

### Using Git Worktrees (`skills/using-git-worktrees/SKILL.md`)

Isolated workspace per feature using Git worktrees.

**Use case:** `/plan-change` for parallel feature development.

---

## Examples (OpenSpec Templates)

### `examples/scenarios-example.md`

Gherkin-format acceptance scenarios for a "User Registration" feature.

### `examples/requirements-example.md`

Functional requirements linked to scenarios.

### `examples/ticket-ejemplo.md`

Sample ticket enriched with context, edge cases, and DoD.

### `examples/tasks.md`

Task list format for OpenSpec changes.

---

## How to Use

1. **New project:** Copy this template, run `bash specboot.sh --init`, personalize `docs/`
2. **SDD workflow:** Start with `/enrich-us` or `/plan-change`
3. **Code review:** Use `/adversarial-review` before archiving
4. **Deploy:** Follow `skills/deploy/SKILL.md` for releases

## Customization

| File | What to customize |
|------|------------------|
| `docs/base-standards.md` | Section 8: stack, architecture, domain |
| `docs/backend-standards.md` | Stack: runtime, framework, ORM, DB |
| `docs/frontend-standards.md` | Stack: framework, CSS, build tool |
| `docs/deploy-standards.md` | Deploy flow: environments, versioning, Docker, rollback |
| `docs/ci-standards.md` | SOLID/POO mechanical thresholds + instantiation of `templates/ci/` (Ticket 4) |
| `docs/api/api-spec.yml` | Real API endpoints |
| `docs/data-model/data-model.md` | Domain entities |
| `templates/ci/` | ESLint + dependency-cruiser configs instantiated per project (see `docs/ci-standards.md`) |
| `opencode.json` | Model selection |

---

## Notes

- **Source of truth:** `docs/` files, not memory
- **TDD mandatory:** Write failing test before code
- **One task at a time:** Never skip ahead
- **English in code:** Spanish in docs for client