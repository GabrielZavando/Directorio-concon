# Skill: commit

## Description

Create semantic commits following Conventional Commits and manage Pull Requests when finishing an OpenSpec change.

**Use when:** Executing `/commit` in the SDD workflow, after `/verify` passes. If `/adversarial-review` was used as a rescue tool during this change, it must also pass before committing.

**Reference:** For Conventional Commits format, allowed types, semver, and commitlint configuration, see `ai-specs/reference/commits.md`.

---

## Process

### Step 1: Verify Preconditions

```
# All tests must pass
npm test

# No lint errors
npm run lint

# Build succeeds
npm run build
```

**If any check fails:** Fix before committing.

### Step 2: Review Changes

```
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

```
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

```
git push origin feature/SCRUM-42
```

### Step 5: Create Pull Request

Use the template in `.github/pull_request_template.md`:

```
# Create PR with conventional format
gh pr create \
  --title "feat(auth): implement password reset" \
  --body-file .github/pull_request_template.md \
  --base main \
  --head feature/SCRUM-42
```

Or push to remote and create PR via GitHub UI.

---

## PR Template

Use `.github/pull_request_template.md`. The key sections:

```
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
| --- | --- |
| `git commit -m "fixed stuff"` | `fix(auth): prevent duplicate submission` |
| `feat: Add new feature` | `feat(checkout): add coupon code support` |
| `Update test.js` | `test(auth): add password reset tests` |
| Commit with real API keys | Use environment variables |