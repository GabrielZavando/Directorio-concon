---
description: Archive agent — closes OpenSpec changes and stages for commit
mode: primary
permission:
  edit:
    "openspec/**": allow
    "CHANGELOG.md": allow
    "*": deny
  bash:
    "openspec archive *": allow
    "openspec *": allow
    "git add *": allow
    "git status": allow
    "ls *": allow
    "cat *": allow
    "rm -rf openspec/changes/*": allow
    "*": deny
---

{file:ai-specs/agents/archive-agent.md}
