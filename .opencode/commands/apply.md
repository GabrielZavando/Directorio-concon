---
description: Implement tasks from OpenSpec artifacts (TDD)
agent: build
---

The active OpenSpec change is in .openspec/. Read the current tasks.md and determine the domain:

1. If the task involves backend (NestJS, API, database, migrations) → adopt the backend-developer agent role
2. If the task involves frontend (Angular, Astro, UI components) → adopt the frontend-developer agent role
3. If the task involves both → adopt the build agent role (full-stack)

Then implement the first pending task following TDD as defined in the chosen agent's documentation.
