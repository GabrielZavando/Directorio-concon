---
description: Implement tasks from OpenSpec artifacts (TDD)
agent: build
---

The active OpenSpec change is in openspec/. Read the current tasks.md and determine the domain:

1. If the task involves backend (NestJS, API, database, migrations) → delegate to the `backend` subagent (`{file:.opencode/agents/backend.md}`)
2. If the task involves frontend (Angular, Astro, UI components) → delegate to the `frontend` subagent (`{file:.opencode/agents/frontend.md}`)
3. If the task involves both → continue as the `build` agent (full-stack), reading both standards

Each subagent loads its own standards and role through its file reference, so do not re-read
backend-developer.md / frontend-developer.md manually — dispatch and let it work the
first pending task following TDD as defined in its documentation.
