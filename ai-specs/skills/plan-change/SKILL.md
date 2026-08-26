# Skill: plan-change

## Description

Generates OpenSpec change proposals from tickets with descriptive brief names. This skill replaces the automatic ticket-ID-based change naming with verb-led, concise descriptors that make OpenSpec folders human-readable.

**Use case:** `/plan-change TICKET-ID:"Ticket title here"` — derives a 2-4 word kebab-case name from the ticket title and generates the change folder accordingly.

## Naming Convention

- **Format**: lowercase kebab-case, 2-4 words maximum
- **Pattern**: verb-led (action-oriented), optionally with domain prefix
- **Ticket ID excluded**: The ticket identifier (e.g., PROJ-123) is never part of the change name
- **Examples**: `auth-reset`, `catalog-filter`, `invoice-pdf-export`, `user-invite`

### Word Formation Guidelines

1. **Identify the core action/verb** from the ticket title (e.g., "Implementar" → `implement`, "Agregar" → `add`, "Crear" → `create`)
2. **Identify the primary noun/entity** (e.g., "reset de contraseña" → `reset`, "filtro" → `filter`, "token" → `token`)
3. **Optional domain prefix**: Prepend if needed for clarity across projects (e.g., `auth-`, `user-`, `invoice-`)
4. **Combine**: verb + noun, or just the noun phrase, in kebab-case
5. **Maximum 4 words**: If more components exist, prioritize the most essential

### Derivation Examples

| Ticket Title                                 | Derived Change Name | Explanation |
|----------------------------------------------|---------------------|-------------|
| PROJ-123: Implementar reset de contraseña    | `auth-reset`        | verb `auth` + noun `reset` |
| PROJ-456: Agregar filtro de catálogo         | `catalog-filter`   | domain `catalog` + noun `filter` |
| PROJ-789: Exportar PDF de factura           | `invoice-pdf-export` | domain `invoice` + nouns `pdf` + `export` |
| PROJ-101: Invitar usuario al sistema        | `user-invite`      | domain `user` + verb `invite` |

## Process

### Step 1: Extract Ticket Title

Read the full ticket title provided after the ticket ID. The format is:

```
openspec new change {ticket-id:"Ticket title here"}
```

or via the `/plan-change TICKET-ID:"title"` command.

### Step 2: Derive Change Name

Apply the naming convention:

1. Parse the title words
2. Select the verb (first or most prominent action word)
3. Select the primary noun/entity
4. Optionally add domain prefix if the ticket specifies or if the action is ambiguous without it
5. Combine into 2-4 word kebab-case string
6. Discard the ticket ID entirely

### Step 3: Generate OpenSpec Change

Run the OpenSpec CLI with the derived name:

```bash
openspec new change {derived-name}
```

This creates the change at `.openspec/changes/{derived-name}/` instead of `.openspec/changes/{ticket-id}/`.

### Step 4: Confirm and Review

Review the generated `.openspec/changes/{derived-name}/tasks.md` and scenarios. The change name should be immediately understandable to any developer without needing to reference the original ticket ID.

## Output Template

```markdown
## Change derived from ticket

**Ticket ID**: [original-ticket-id]
**Original title**: [full ticket title]
**Derived change name**: [derived-name]
**Change folder**: .openspec/changes/[derived-name]/

### Naming rationale

- Selected verb: [action word from title]
- Selected noun/entity: [primary concept]
- Domain prefix (if applicable): [prefix]
- Why this name follows the convention: [brief explanation]
```

## Integration with `/plan-change` Command

The `/plan-change` command in `opencode.json` should:

1. Accept the ticket ID and optional title
2. Derive the change name using the convention above
3. Pass the derived name to `openspec new change {derived-name}`
4. Display both the original ticket ID and the derived change name for confirmation

## Examples

**Example 1:** Minimal title

```
Input: PROJ-123:"Reset de contraseña"
Derived: auth-reset
Folder: .openspec/changes/auth-reset/
```

**Example 2:** Full title with context

```
Input: PROJ-456:"Agregar filtro avanzado de búsqueda en el catálogo de productos"
Derived: catalog-filter   (or product-filter if more specific)
Folder: .openspec/changes/catalog-filter/
```

**Example 3:** Multi-word with domain

```
Input: PROJ-789:"Exportar informe PDF mensual de ventas"
Derived: invoice-pdf-export
Folder: .openspec/changes/invoice-pdf-export/
```

## Tips

1. **Keep it concise**: 2-4 words is the sweet spot. More than that becomes hard to remember.
2. **Be verb-led when possible**: Actions are more memorable than pure nouns.
3. **Domain prefixes add clarity**: When a project has multiple domains (auth, billing, catalog), a prefix prevents ambiguity.
4. **Test the name mentally**: Say the change name out loud: "I'm looking at the auth-reset change." Does it make sense?
5. **Consistency over perfection**: If the team agrees on a slightly different derivation, that's fine as long as the convention is followed.