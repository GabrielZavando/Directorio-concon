# show-spec-working Skill

## Purpose
Debug and visualize the current state of an OpenSpec change.

## When to use
- Agent seems confused about current tasks
- User wants to see progress
- Verification fails and you need context
- Before running `/apply` to confirm you're working on the right task

## Workflow

### Step 1 — Check for active change
1. List `.openspec/` directory
2. If no `.openspec/` exists or is empty, say: "No active OpenSpec change found. Run `/plan-change TICKET-ID` first."
3. Identify the active change directory (most recent or marked as active)

### Step 2 — Extract metadata
Read the change's `proposal.md` or `specs.md` to get:
- Change ID (e.g., SCRUM-42)
- Change title
- Creation date (from file metadata)

### Step 3 — Read tasks.md
Parse `tasks.md` to count:
- Total tasks
- Completed tasks (marked with `[x]`)
- Pending tasks (marked with `[ ]`)
- Current task (first pending task)

### Step 4 — Check enriched artifacts
Check if `.openspec/tickets/{CHANGE-ID}.enriched.md` exists. If yes, note it.

### Step 5 — List OpenSpec artifacts
List files in the change directory:
- proposal.md
- design.md
- specs.md
- scenarios.md
- tasks.md
- Any custom artifacts

### Step 6 — Output compact summary

```
## Active Change: {CHANGE-ID}

**Title**: {change title}
**Created**: {date}

**Progress**: {completed}/{total} tasks completed
**Current task**: {first pending task description}

**Enriched ticket**: .openspec/tickets/{CHANGE-ID}.enriched.md (if exists, else "None")

**Artifacts**:
- ✅ proposal.md
- ✅ specs.md (X acceptance criteria)
- ✅ scenarios.md (Y Gherkin scenarios)
- ✅ tasks.md ({total} tasks)

**Pending tasks**:
- [ ] Task {N}: {description}
- [ ] Task {N+1}: {description}
- [ ] Task {N+2}: {description}
- ... (show next 5 pending tasks)

**Next step**: Run `/apply {CHANGE-ID}` to implement the current task.
```

## Guardrails
- Read-only: do NOT modify any files
- If no active change, say so clearly and suggest `/plan-change`
- If tasks.md is malformed, say so and suggest re-running `/plan-change`
