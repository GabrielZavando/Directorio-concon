---
description: Verification agent — runs tests and checks traceability (read-only)
mode: primary
permission:
  edit: deny
  bash:
    "openspec *": allow
    "git diff": allow
    "git diff *": allow
    "git status": allow
    "git log": allow
    "git log *": allow
    "git merge-base *": allow
    "npm test *": allow
    "npm run test *": allow
    "npx vitest *": allow
    "npx jest *": allow
    "rg *": allow
    "ls *": allow
    "cat *": allow
    "*": deny
---

{file:ai-specs/agents/verify-agent.md}
