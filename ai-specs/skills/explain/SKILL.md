# explain Skill

## Purpose
Explain the reasoning behind a technical decision made during SDD.

## When to use
- User asks "why did you do X?"
- Reviewer needs to understand tradeoffs
- Onboarding new team members
- Debugging unexpected behavior

## Inputs
- Decision to explain (from user query or context)
- Optional: specific artifact or commit to focus on

## Workflow

### Step 1 — Identify the decision
Parse the user's question or infer from context:
- Explicit: "Why did you use NestJS instead of Express?"
- Implicit: Agent notices a pattern and wants to explain it

### Step 2 — Trace back to artifacts
Search for relevant context in this order:
1. OpenSpec artifacts (proposal, design, specs, tasks)
2. Standards (backend-standards.md, frontend-standards.md)
3. Previous commits or changes
4. External constraints (performance, security, team skills)

### Step 3 — Explain the reasoning
For each decision, cover:
- **What**: The decision made (tool, pattern, architecture, etc.)
- **Why**: The requirement or constraint that triggered it
- **Alternatives**: Other options considered (if any)
- **Tradeoffs**: Pros and cons of the chosen approach
- **Alignment**: How it matches project standards or OpenSpec artifacts

### Step 4 — Cite evidence
Reference specific artifacts:
- "As stated in specs.md line 42..."
- "Following backend-standards.md §3.2..."
- "Per task 5 in tasks.md..."

### Step 5 — Output structured explanation

```
## Decision: {brief description}

**Context**: {ticket, requirement, or constraint that triggered it}

**Reasoning**: 
{why this approach was chosen, citing specific requirements or constraints}

**Alternatives considered**:
- {Alternative 1}: {why rejected}
- {Alternative 2}: {why rejected}
(or "No alternatives considered — this is the standard approach per backend-standards.md §X")

**Tradeoffs**:
- ✅ {pro 1}
- ✅ {pro 2}
- ⚠️ {con 1}
- ⚠️ {con 2}

**Alignment**:
- Matches {standard/spec} section {X}
- Implements requirement from {artifact}

**Artifacts**:
- {file path 1}
- {file path 2}
- {commit hash if relevant}
```

## Guardrails
- Cite specific artifacts (file paths, line numbers, commit hashes)
- Be honest about tradeoffs (no sugarcoating)
- If decision was ad-hoc or arbitrary, say so clearly
- If you can't find evidence, say "This decision was not documented in OpenSpec artifacts"
- Do NOT invent justifications that aren't in the artifacts
