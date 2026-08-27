# Skill: plan-change

## Description

Generates validated, context-enriched OpenSpec change proposals from tickets. This skill is the single source of truth for the `/plan-change` flow: ticket parsing, selective context loading, enriched artifact generation, and validation.

**Usage:** `/plan-change TICKET-ID:"[tag] Ticket title here"`

The `[tag]` is optional but recommended — it drives selective context loading (Step 2).

---

## Input Format

```
/plan-change PROJ-123:"[backend] Implementar reset de contraseña"
/plan-change PROJ-456:"[frontend] Agregar filtro de catálogo"
/plan-change PROJ-789:"Exportar PDF de factura"   (no tag → Step 2b)
```

---

## Process

### Step 1 — Parse Ticket

Extract three parts from the argument:

- **Ticket ID** (e.g. `PROJ-123`) — required for artifact detection and traceability. Never part of the change name.
- **Tag** — optional, first word of the title if it matches `[backend|frontend|api|docs|fullstack]`.
- **Title** — the remaining text after the tag.

If the ticket ID or title is missing, stop and show the expected input format.

### Step 2 — Resolve Context

Load **only** the standards files indicated by the tag. `docs/base-standards.md` and `AGENTS.md` are always pre-loaded via `instructions[]` — never re-read them.

| Tag | Files to load |
|---|---|
| `[backend]` | `docs/backend-standards.md`, `docs/data-model.md` |
| `[frontend]` | `docs/frontend-standards.md` |
| `[api]` | `docs/api-spec.yml`, `docs/backend-standards.md` |
| `[docs]` | `docs/documentation-standards.md` |
| `[fullstack]` | backend + frontend rows |

**Step 2b — No tag (hybrid fallback):** infer the most likely tag from the title and/or the enriched artifact's `Capas afectadas` field (see Step 3), then **show the inference and ask the user to confirm** before reading any standards file:

> "Este ticket parece `[backend]` (menciona reset de contraseña / auth). ¿Confirmo y cargo `backend-standards.md` + `data-model.md`?"

Never load "extra" files just in case — that is exactly what this step exists to prevent.

### Step 3 — Detect Enriched Artifact

Check for `.openspec/tickets/{TICKET-ID}-enriched.md`:

- **Exists** → read it and use it as the **primary source**: acceptance criteria (Gherkin), edge cases, Diseño de Clases/Componentes, and technical considerations all feed Step 5 directly. The raw title is only used for naming (Step 4).
- **Absent** → if the title looks vague (no clear actor/action/outcome, no acceptance criteria available), suggest running `/enrich-us {TICKET-ID}` first and stop. If the title is specific enough, continue with the title as the only source.

### Step 4 — Derive Change Name

#### Naming Convention

- **Format**: lowercase kebab-case, 2-4 words maximum
- **Pattern**: verb-led (action-oriented), optionally with domain prefix
- **Ticket ID excluded**: never part of the change name
- **Examples**: `auth-reset`, `catalog-filter`, `invoice-pdf-export`, `user-invite`

Guidelines:

1. **Identify the core action/verb** (e.g., "Implementar" → `implement`, "Agregar" → `add`, "Crear" → `create`)
2. **Identify the primary noun/entity** (e.g., "reset de contraseña" → `reset`, "filtro" → `filter`)
3. **Optional domain prefix**: prepend for clarity across domains (e.g., `auth-`, `user-`, `invoice-`)
4. **Maximum 4 words**: prioritize the most essential components

Examples:

| Ticket Title | Derived Name |
|---|---|
| PROJ-123: Implementar reset de contraseña | `auth-reset` |
| PROJ-456: Agregar filtro de catálogo | `catalog-filter` |
| PROJ-789: Exportar PDF de factura | `invoice-pdf-export` |

### Step 5 — Generate Enriched Artifacts

> ⚠️ Do NOT run `openspec new change` — that command does not exist in the installed CLI. The agent writes the artifact files directly. Use `openspec instructions <artifact>` to consult the expected artifact format if unsure.

Create the folder `.openspec/changes/{derived-name}/` and write, enriched with the loaded context (not generic templates):

1. **`proposal.md`** — origin ticket ID, title, tag, summary and motivation.

2. **`scenarios.md`** — Gherkin scenarios that:
   - If an enriched artifact exists: map its Acceptance Criteria scenarios 1:1 (do not regenerate from scratch).
   - Otherwise: derive from the title, covering happy path, error cases, and edge cases.
   - Reference **real entities from `data-model.md`** and **real endpoints from `api-spec.yml`** when those files are loaded; never invent table or endpoint names.
   - Apply non-functional rules from the loaded standards (e.g. security policies like "no email enumeration" from `backend-standards.md`).

3. **`requirements.md`** — numbered requirements, each traceable to at least one scenario.

4. **`tasks.md`** — tasks with subtasks, priority, layer, and estimate, using the project's layer nomenclature:
    - Backend: `domain | application | infrastructure`
    - Frontend: `smart | dumb`
    - If the enriched artifact declares a Diseño de Clases/Componentes, tasks must map to those classes/components — `/apply` will validate the implementation against that design.
    - **Suggested Path**: `src/...` (archivo de implementación; verify leerá solo este)
    - **Test Path**: `tests/...` (archivo de test; verify buscará coincidencias aquí)

### Step 6 — Validate

Checklist (apply before reporting):

- [ ] Every scenario has Given/When/Then
- [ ] Happy path, error cases, and edge cases are covered
- [ ] Requirements are numbered and traceable to scenarios
- [ ] Every task has subtasks, priority, layer, and estimate
- [ ] Entities mentioned exist in `data-model.md` (if loaded)
- [ ] Endpoints mentioned exist in `api-spec.yml` (if loaded)

Then run:

```bash
openspec validate {derived-name}
```

If any check fails, regenerate the failing artifact with specific fix instructions; do not report success with known gaps.

---

## Output Template

```markdown
## Change created from ticket

**Ticket ID**: [original-ticket-id]
**Original title**: [full title]
**Tag (source)**: [tag] (explicit | inferred+confirmed)
**Derived change name**: [derived-name]
**Change folder**: .openspec/changes/[derived-name]/
**Enriched artifact used**: yes (.openspec/tickets/...) | no

### Naming rationale
- Verb: [action word]
- Noun/entity: [primary concept]
- Domain prefix: [prefix or none]

### Context loaded
- [list of standards files actually read]

### Validation
- Checklist: [N/6 passed]
- `openspec validate`: [result]
- Warnings: [any]
```

---

## Tips

1. **Keep names concise**: 2-4 words. Say it out loud: "I'm looking at the auth-reset change."
2. **Domain prefixes add clarity** across domains (auth, billing, catalog).
3. **One task at a time**: do not write implementation code — this flow ends with validated specs.
