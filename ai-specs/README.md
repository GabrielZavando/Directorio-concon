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
└── examples/
    ├── scenarios-example.md     ← NEW
    ├── requirements-example.md   ← NEW
    ├── ticket-ejemplo.md         ← NEW
    └── tasks.md                  ← Improved
```

---

## Agents

### Build Agent (`agents/build-agent.md`)

Full-stack implementation agent. Reads `tasks.md` and implements one task at a time following TDD.

**Use case:** Executed by `/apply` in the SDD workflow.

### Backend Developer (`agents/backend-developer.md`)

Backend specialist. Applies `docs/backend-standards.md` and maintains `docs/api-spec.yml`.

**Use case:** Backend-only tasks.

### Frontend Developer (`agents/frontend-developer.md`)

Frontend specialist. Applies `docs/frontend-standards.md` and ensures accessibility.

**Use case:** Frontend-only tasks.

---

## Skills

### Code Auditing (`skills/code-auditing/SKILL.md`)

Systematic 7-phase code quality audit.

**Phases:** Security → Types → Performance → Dead code → Best practices → Tests → OpenSpec alignment

**Use case:** `/adversarial-review` before archiving a change.

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
| `docs/api-spec.yml` | Real API endpoints |
| `docs/data-model.md` | Domain entities |
| `opencode.json` | Model selection |

---

## Notes

- **Source of truth:** `docs/` files, not memory
- **TDD mandatory:** Write failing test before code
- **One task at a time:** Never skip ahead
- **English in code:** Spanish in docs for client