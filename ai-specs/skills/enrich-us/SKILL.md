# Skill: enrich-us

## Description

Analyzes and enriches a vague user story or ticket into an actionable description with acceptance criteria, technical details, and edge cases.

**Use BEFORE `/plan-change`** to ensure team and AI agent alignment.

## When to Use This Skill

- User story with vague or incomplete description
- Ticket without acceptance criteria
- New idea that needs definition before planning
- Complex feature requiring technical clarification upfront

## Process

### Step 1: Gather Information

Read the ticket or description provided (or fetch via Jira MCP if ticket ID is given):

```bash
# If Jira MCP is configured
jira ticket get TICKET-ID

# Or fetch via API
curl -H "Authorization: Bearer $JIRA_TOKEN" \
  https://your-domain.atlassian.net/rest/api/3/issue/TICKET-ID
```

Identify:
- **Who** is the user/actor?
- **What** do they want to accomplish?
- **Why** is this valuable?
- **When/Where** does this apply?

### Step 2: Analyze and Clarify

Ask these questions internally or to the user:

1. What is the happy path?
2. What are the error scenarios?
3. What are the edge cases?
4. Are there any technical constraints?
5. What does "done" look like?
6. Are there dependencies on other tickets?
7. What is the priority and why?

### Step 3: Draft Enriched Story

Format:

```markdown
## User Story enriched: [TICKET-ID]

**As a** [role/user type]
**I want** [action/feature]
**So that** [benefit/value]
```

### Step 4: Draft Class/Component Design

Generate the design declaration that the implementation agents will be held to during `/apply`. This section is produced **before** the acceptance criteria (Step 5) so that the design is fixed before `/plan-change` generates implementation tasks.

```markdown
## Diseño de Clases/Componentes

- [Nombre de clase/componente]: responsabilidad única = "..."
  - Depende de: [interfaz/abstracción], NO de [implementación concreta]
  - Capa: domain | application | infrastructure (o smart | dumb para Angular)
```

### Step 5: Add Acceptance Criteria (Gherkin)

```markdown
### Acceptance Criteria

**Scenario 1: [Happy path]**
- Given [context/precondition]
- When [action performed]
- Then [expected outcome]

**Scenario 2: [Error case]**
- Given [condition]
- When [action]
- Then [error handling]
```

### Step 6: Identify Edge Cases

```markdown
### Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| [Edge case] | [How system handles it] |
```

### Step 7: Add Technical Considerations

```markdown
### Technical Considerations

- [Constraint or technical detail]
- [Database changes needed]
- [API contract changes]
- [Third-party integrations]
```

### Step 8: Define Done (DoD)

```markdown
### Definition of Done

- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code review approved
- [ ] OpenSpec artifacts updated
- [ ] API spec reflects changes
- [ ] Data model reflects changes (if applicable)
```

### Step 9: Confirm with User

Show the enriched story and ask for confirmation before proceeding to `/plan-change`.

### Step 10: Persist Enriched Artifact

After user confirmation, save the enriched story to:

```
.openspec/tickets/{TICKET-ID}-enriched.md
```

This path is a **contract with `/plan-change`**: that command checks for this exact file and, if present, uses it as the primary source (acceptance criteria, class design, edge cases) instead of the raw ticket title.

The persisted file must contain the full output template below, plus a `Capas afectadas` line derived from the Diseño de Clases/Componentes section (e.g. `backend`, `frontend`, `api`), which `/plan-change` uses as a hint for context loading.

---

## Output Template

```markdown
## User Story enriched: [TICKET-ID]

**As a** [role]
**I want** [action]
**So that** [benefit]

### Context

[Background and motivation]

### Diseño de Clases/Componentes

- [Nombre de clase/componente]: responsabilidad única = "..."
  - Depende de: [interfaz/abstracción], NO de [implementación concreta]
  - Capa: domain | application | infrastructure (o smart | dumb para Angular)

### Acceptance Criteria

**Scenario 1: [description]**
- Given [context]
- When [action]
- Then [result]

**Scenario 2: [description]**
- Given [context]
- When [action]
- Then [result]

### Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| [case] | [behavior] |

### Technical Considerations

- [consideration]
- [consideration]

### Definition of Done

- [ ] [ ] ...
- [ ] [ ] ...

### Questions for Clarification

1. [Pending question]
```

---

## Example: Enriching a Vague Ticket

El ejemplo completo con todos los escenarios Gherkin, consideraciones de diseño y cases de borde se encuentra externalizado en `ai-specs/examples/enrich-us-auth-reset.md` para mantener los skills ligeros y la documentación de ejemplos como single source of truth.