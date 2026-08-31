# Zavando Specboot — Agent Instructions

> **Bridge file.** This file is the framework-injected interface for AI agents.
> It is **not** a copy of the project context: that context lives in `docs/`.
> The framework replaces this file via `specboot update` without losing the
> project context, because the bridge does not hardcode it. See
> [Nota de puente](#nota-de-puente) at the end of this file.
>
> Loaded automatically by OpenCode via `opencode.json` `instructions[]`.

## 1. Carga base (intocable)

These two files are always loaded on every task and are part of the framework's
**intocable** frontier (see [docs/framework-contract.md](docs/framework-contract.md)):

- `AGENTS.md` — this file (the bridge).
- `docs/base-standards.md` — the framework's principles (SDD / TDD / SOLID,
  conventional commits, language rules, etc.). It is **intocable**:
  `specboot update` replaces it; the dev does not edit it.

> If anything in `docs/base-standards.md` looks wrong, propose the change via
> the framework's own SDD flow (dogfooding), do not edit it locally.

## 2. Carga dinámica

The rest of the context is **resolved by the active task**, not enumerated here.
Follow this rule strictly: **read only what the current task needs; never read
"just in case"**.

### 2.1 Tag-based loading matrix

If the task carries a `[tag]`, load the corresponding standards automatically:

| Tag | Files to load |
| --- | --- |
| `[backend]` | `docs/backend-standards.md`, `docs/data-model/data-model.md` |
| `[frontend]` | `docs/frontend-standards.md` |
| `[api]` | `docs/api/api-spec.yml`, `docs/backend-standards.md` |
| `[docs]` | `docs/documentation-standards.md` |
| `[deploy]` | `docs/deploy-standards.md` (via the `deploy` skill) |
| `[fullstack]` | backend + frontend rows above |

If the task has no tag, infer the most likely tag from the ticket title and
ask the user to confirm before loading any standard. **No leas estos archivos
"por si acaso": si la tarea actual no los necesita, no los cargues.**

### 2.2 Project context (docs/project/*) — conditional load

The project's own context files live in `docs/project/` and are project-owned
(they may or may not exist in a fresh project):

- `docs/project/domain.md` — business domain.
- `docs/project/stack.md` — technical stack.
- `docs/project/client.md` — client / audience.

Loading rule:

- **If they exist** → read them as soon as the task needs the domain, stack,
  or audience information. They are the source of truth for the project.
- **If they are missing** → apply the default placeholder content described
  in [docs/docs-standard.md](docs/docs-standard.md) §3 ("Regla de carga
  dinámica del puente AGENTS.md"). Treat any `<!-- … -->` HTML comment as a
  placeholder the dev must fill in.

> These files are project-owned, so they MUST NOT be referenced via OpenCode
> `{file:...}` syntax from this bridge: `check-refs.sh` would fail on missing
> files. Resolve them as **conditional prose**, not as includes.

## 3. Herramientas

The integrity of this bridge (and the project as a whole) is enforced by two
entry points. Run them whenever a change is finished, before opening a PR:

- `bash check-refs.sh` — validates every `{file:...}` reference in
  `opencode.json`, `ai-specs/**/*.md` and `.opencode/**/*.md`; also verifies
  that every skill folder in `ai-specs/skills/*/` is registered in
  `AGENTS.md` (i.e. its name appears somewhere in this file). Exit 0 on
  success.
- `bash specboot.sh --ci` — runs the full CI validation: `check-refs.sh`,
  `.specboot.json` schema check, file structure, placeholders, skills,
  examples, husky, CI/CD config. Exit 0 on success, non-zero on any error.

Both scripts MUST report 0 errors after any change in this repository. If
either fails, fix the implementation (not the scripts — the scripts are
intocable framework files; TICKET-1.x owns them).

## 4. Skills

Skills live in `ai-specs/skills/`. When a request matches one of the triggers
below, load and follow the corresponding `SKILL.md` automatically before
continuing.

### 4.1 Standard cycle skills

| Skill | Trigger |
| --- | --- |
| `commit` | End of the SDD cycle, via `/commit` |
| `plan-change` | Generate OpenSpec specs with descriptive change name, via `/plan-change`. Persisted artifacts from `enrich-us` live in `openspec/tickets/`. |
| `using-git-worktrees` | Parallel feature work during `/plan-change` |
| `deploy` | Release to staging/production, via `/deploy` |
| `onboarding` | A new developer is starting on the project |
| `verify` | Verify the active change works (`/verify`). Read-only. |

### 4.2 Optional skills (use only when needed)

| Skill | Trigger | When to use |
| --- | --- | --- |
| `enrich-us` | Ticket is vague or poorly formed | **Only before `/plan-change`** if the ticket lacks acceptance criteria or context. Skip if ticket is already well-formed. |
| `code-auditing` | Something went wrong during implementation | **Rescue tool only**: use via `/adversarial-review` when tests fail unexpectedly or implementation diverges from spec. Not part of standard cycle. |
| `show-spec-working` | Debug command registered in `opencode.json` | **Debug tool**: use `/show-spec-working` when the agent is confused about current tasks, the user wants to see progress, verification fails, or before `/apply` to confirm the right task. Read-only. |
| `explain` | User asks "why did you do X?" or needs decision context | **On-demand**: use when explaining technical decisions, tradeoffs, or rationale. Not part of standard cycle. |
| `archive` | Skill folder present in `ai-specs/skills/archive/` | Reserved for archive-related helpers. |

For extended detail (phases, full descriptions, examples) see
`ai-specs/README.md` — that file is for humans and is not auto-loaded, so it
can go deeper than this table without duplicating what agents need at
request time.

## 5. Custom commands (OpenCode)

The following custom commands are defined in `opencode.json` for the SDD
workflow.

### 5.1 Modelo de IA (agnóstico — gestionado externamente)

El template **no fija ningún modelo** en `opencode.json`. La selección de
modelo la gestiona tu gestor externo (p.ej. **Omniroute**) o el modelo
activo de tu sesión en OpenCode, no este template.

> Una *recomendación* previa sugería usar un modelo de alto razonamiento
> para las fases de planificación (`/enrich-us`, `/plan-change`). Eso **no
> está cableado** en el template y, en uso personal con control de tokens,
> queda a tu criterio activarlo en tu gestor de modelos. El framework NO
> fuerza ni cambia el modelo por fase por sí mismo.

En la práctica:

- Si quieres más calidad en specs, selecciona un modelo fuerte en tu
  gestor (Omniroute) antes de correr `/plan-change` — el template lo
  respetará sin configuración extra.
- Si priorizas ahorro de tokens, usa un modelo económico; el ciclo SDD
  funciona igual.
- `opencode.json` debe seguir sin el campo `model` para preservar esta
  agnosticidad.

### 5.2 Standard cycle

| Command | Description |
| --- | --- |
| `/plan-change TICKET-ID:"[tag] Título"` | Generate validated, context-enriched OpenSpec specs from a ticket. Tag is optional (`[backend\|frontend\|api\|docs\|fullstack]`) and drives selective standards loading; if omitted, the agent infers it and asks for confirmation. If `openspec/tickets/{TICKET-ID}-enriched.md` exists (from `/enrich-us`), it is used as the primary source. |
| `/apply TICKET-ID` | Implement tasks from OpenSpec artifacts (TDD) |
| `/verify TICKET-ID` | Execute tests and verify the active change works (files per Suggested Path, traceability, delta-incremental), reporting a compact YAML summary. Read-only agent. Ticket ID taken from the active change in `openspec/changes/`. |
| `/archive TICKET-ID` | Close the SDD cycle: pre-checks, preview of specs updated, `openspec archive`, append to manifest JSON, stage commit for `/commit`, cleanup. Token-light (no content reading). Ticket ID taken from the active change in `openspec/changes/`. |
| `/commit` | Create conventional commits and pull request (token-light diff, commit plan approval, TICKET-ID auto-extracted from proposal.md, push/PR only after explicit confirmation. Reuses openspec/ staged by /archive). |
| `/deploy` | **Optional**: Release to staging/production. Not every `/commit` triggers a `/deploy` — use only when the change is ready for release. |

### 5.3 Optional tools

| Command | Description | When to use |
| --- | --- | --- |
| `/enrich-us TICKET-ID` | Enrich a vague user story before planning | Only for poorly formed tickets without acceptance criteria |
| `/adversarial-review` | Adversarial red-team code audit — runs eslint+dependency-cruiser+npm audit, emits SHIP/NO-SHIP verdict, complements /verify (does NOT re-check OpenSpec alignment). Read-only agent. Ticket ID taken from the active change in `openspec/changes/`. |

### 5.4 Subagents (wired via {file:} references)

These are dispatched by `/apply` (and can be invoked directly). Each loads
its role and standards automatically through its `{file:...}` reference, so
the primary agent must delegate to them instead of re-reading the role docs
manually.

| Subagent | File | Use |
| --- | --- | --- |
| `backend` | `{file:.opencode/agents/backend.md}` → `{file:ai-specs/agents/backend-developer.md}` | Backend tasks (NestJS, API, DB, migrations) |
| `frontend` | `{file:.opencode/agents/frontend.md}` → `{file:ai-specs/agents/frontend-developer.md}` | Frontend tasks (Angular, Astro, UI) |
| `reviewer` | `{file:.opencode/agents/reviewer.md}` | Adversarial red-team audit (`/adversarial-review`) |

## 6. Non-negotiable rules

1. One task at a time. Never skip ahead.
2. Write the failing test first. Never write production code before a
   failing test exists.
3. All code fully typed. No `any` without explicit justification.
4. If a fix or change appears after `/apply` and before `/archive`: update
   OpenSpec artifacts first, then code. Never code-only fixes.
5. If anything is ambiguous in the specs, ask before assuming.
6. Documentation is the source of truth — specs before code, always.

## Nota de puente

This file is **only the interface** between the agent and the project. The
"heavy" project content (domain, stack, audience, API, data model,
backend/frontend standards) lives in `docs/`. Concretely:

- The bridge is **injected and replaced** by the framework on
  `specboot update`. It is intocable from the project's perspective.
- The bridge **does not duplicate** the content of `docs/`. If you find
  yourself about to paste a domain description, a stack list, or a business
  rule into this file, stop: that content belongs in
  `docs/project/{domain,stack,client}.md` (or the matching `docs/*.md`).
- The bridge's four sections are stable: **Carga base**, **Carga
  dinámica**, **Herramientas**, **Nota de puente**. Adding or renaming
  sections here is a change to the framework and must go through the SDD
  flow (see `docs/framework-contract.md` → "Puente AGENTS.md ↔ docs/"
  and `docs/docs-standard.md` §3).
- After a `specboot update`, the project context is **preserved** because
  it lives in `docs/`, not in this bridge. If the update looks like it
  "lost" the project context, the fix is in `docs/`, not here.
