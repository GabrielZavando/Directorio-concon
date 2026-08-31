---
description: Adversarial red-team code audit — security, robustness, SOLID, tradeoffs. Emits SHIP/NO-SHIP verdict.
mode: subagent
permission:
  edit: deny
  bash:
    "npm audit *": allow
    "npx eslint *": allow
    "npx dependency-cruiser *": allow
    "git diff": allow
    "git diff *": allow
    "git status": allow
    "git log": allow
    "git log *": allow
    "*": deny
---

{file:ai-specs/skills/code-auditing/SKILL.md}
