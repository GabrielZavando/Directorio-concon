# Skill: commit

## Description

Create semantic commits following Conventional Commits and manage Pull Requests when finishing an OpenSpec change.

**Use when:** Executing `/commit` in the SDD workflow, after `/verify` and successful `/adversarial-review`.

---

## Commit Format

```
<type>(<scope>): <short description in English>

[optional body — what and why, not how]

[optional footer — BREAKING CHANGE, Closes #ticket]
```

### Allowed Types

| Type | When to Use |
|------|-------------|
| `feat` | New functionality for the user |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Refactor with no behavior change |
| `test` | Add or fix tests |
| `chore` | Build, dependencies, config |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |
| `revert` | Revert previous commit |

### Examples

```
feat(auth): add password reset endpoint

fix(orders): prevent duplicate submission on slow connections
Closes #SCRUM-42

docs(api): update payment endpoint spec with new error codes

refactor(user): extract email validation to shared util

test(auth): add integration tests for password reset flow

chore(deps): upgrade bcrypt from 5.0.1 to 5.1.0
```

---

## Semver and Versioning

### How Types Map to Version Bumps

| Type | Version Bump | Example |
|------|--------------|---------|
| `feat` | Minor | 1.0.0 → 1.1.0 |
| `fix` | Patch | 1.0.0 → 1.0.1 |
| `feat` + `BREAKING CHANGE` | Major | 1.0.0 → 2.0.0 |
| `refactor` (no feature change) | None | No version bump |

### Version Bump Commands

```bash
# Automatic (creates commit + tag)
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

# Manual with message
git tag v1.2.3 -m "Release v1.2.3"
```

---

## Process

### Step 1: Verify Preconditions

```bash
# All tests must pass
npm test

# No lint errors
npm run lint

# Build succeeds
npm run build
```

**If any check fails:** Fix before committing.

### Step 2: Review Changes

```bash
# See all changes
git status

# See diff stats
git diff --stat

# See full diff
git diff
```

### Step 3: Group Changes

Group into logical commits. One commit = one logical change.

**Commits grouping example for a feature:**

```bash
# Commit 1: Documentation changes
git add docs/api-spec.yml docs/data-model.md
git commit -m "docs(api): update spec with new auth endpoints"

# Commit 2: Tests
git add tests/unit/auth.test.ts tests/integration/auth.test.ts
git commit -m "test(auth): add unit and integration tests"

# Commit 3: Implementation
git add src/
git commit -m "feat(auth): implement password reset flow"
```

### Step 4: Push Commits

```bash
git push origin feature/SCRUM-42
```

### Step 5: Create Pull Request

Use the template in `.github/pull_request_template.md`:

```bash
# Create PR with conventional format
gh pr create \
  --title "feat(auth): implement password reset" \
  --body-file .github/pull_request_template.md \
  --base main \
  --head feature/SCRUM-42
```

Or push to remote and create PR via GitHub UI.

---

## Automated Changelog

For automated changelog generation, use `standard-version`:

```bash
# Install
npm install --save-dev standard-version

# Generate CHANGELOG.md and bump version
npm run release -- --release-as minor

# Or手动
npx standard-version --release-as minor
```

### CHANGELOG.md Format (keep-a-changelog)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2024-01-15

### Features
- **auth**: add password reset endpoint ([#42](link))

### Bug Fixes
- **orders**: prevent duplicate submission on slow connections

### Documentation
- **api**: update payment endpoint spec
```

---

## commitlint Configuration

For enforced conventional commits, use `commitlint` with `@commitlint/config-conventional`:

```bash
npm install --save-dev @commitlint/config-conventional @commitlint/cli
```

### .commitlintrc.json

```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "refactor", "test", "chore", "perf", "ci", "revert"]
    ],
    "subject-case": [
      2,
      "never",
      ["sentence-case", "start-case", "pascal-case", "upper-case"]
    ]
  }
}
```

### Git Hook (husky)

```bash
npm install --save-dev husky
npx husky init

# Add commitlint to commit-msg hook
echo 'npx --no -- commitlint --edit $1' > .husky/commit-msg
```

---

## PR Template

Use `.github/pull_request_template.md`. The key sections:

```markdown
## What changes

<!-- Brief description of changes -->

## Why

<!-- Context and motivation -->

## How to test

1. <!-- Step 1 -->
2. <!-- Step 2 -->

## OpenSpec Change

<!-- Ticket ID (e.g., SCRUM-42) -->

## Checklist

- [ ] Tests passing
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] OpenSpec artifacts updated
```

---

## Tips

1. **Atomic commits:** One logical change per commit
2. **Descriptive subjects:** Start with verb (add, fix, update, remove)
3. **Scope:** Use module/feature name (auth, orders, api, ui)
4. **Breaking changes:** Add `BREAKING CHANGE:` in footer
5. **Reference tickets:** Use `Closes #123` or `Refs #123`
6. **Don't commit secrets:** Use `.env.example`, never `.env` with real values

## Common Mistakes

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `git commit -m "fixed stuff"` | `fix(auth): prevent duplicate submission` |
| `feat: Add new feature` | `feat(checkout): add coupon code support` |
| `Update test.js` | `test(auth): add password reset tests` |
| Commit with real API keys | Use environment variables |