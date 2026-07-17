# Skill: deploy

## Description

Release workflow that follows the project's deploy standards. The concrete process — environments, versioning scheme, Docker/registry, smoke tests, and rollback — lives in [`docs/deploy-standards.md`](../docs/deploy-standards.md). That file is the source of truth and must be personalized per project.

**Use when:** Deploying to staging or production. Executed as `/deploy` (registered in `opencode.json`) or manually before a release.

## Prerequisites

- Read [`docs/deploy-standards.md`](../docs/deploy-standards.md) first — it defines the project's environments, versioning rules, registry, and rollback procedure.
- Docker (or the project's container tool) installed and running.
- Access to the container registry and target servers.
- `openspec` CLI installed; confirm the change is archived before releasing.

## Process

1. **Pre-deploy checklist** — run the checks defined in `docs/deploy-standards.md` (tests, lint, typecheck, build, security audit). All must pass.
2. **Version bump** — choose `patch` / `minor` / `major` per the versioning rules in the standards; create the git tag `vX.Y.Z` and the `release: vX.Y.Z` commit, then push the tag.
3. **Build & push** — build the artifact/image tagged with the version and push it to the registry per the standards.
4. **Deploy to staging** — deploy and run smoke tests; on failure, execute rollback immediately.
5. **Deploy to production** — only after staging smoke tests pass.
6. **Post-deploy** — notify the team and create the GitHub release.

The exact commands (Docker build args, kubectl/compose/SSH invocations, webhook payloads) are derived from the project-specific stack declared in `docs/deploy-standards.md`.

## Rollback

Follow the rollback procedure defined in `docs/deploy-standards.md`.

## Output

Produce a Deploy Report with status, timeline (checks, bump, image/tag, staging, production, smoke tests), and the explicit rollback command for the previous version.
