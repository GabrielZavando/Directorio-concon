# Skill: using-git-worktrees

## Description

Set up an isolated Git workspace for working on a feature or change, without affecting the main branch. Use at the start of any OpenSpec change.

**Use when:** Before `/plan-change` on a new change. For parallel feature development.

## When to Use

- Before executing `/plan-change` on a new change
- For working on features in parallel
- When you want a clean experimentation environment
- For code reviews that might destabilize your branch

## Benefits of Worktrees

- **Isolated:** Each worktree has its own working directory
- **Parallel:** Work on multiple features simultaneously
- **Clean:** Each feature gets its own branch
- **Shared:** Git history is shared, no full clone needed

---

## Setup Process

### Step 1: Ensure Main Branch is Updated

```bash
# Go to main worktree (if applicable)
git checkout main

# Pull latest
git pull origin main
```

### Step 2: Create Worktree for Feature

```bash
# Create worktree with new branch
git worktree add ../mi-proyecto-SCRUM-42 -b feature/SCRUM-42

# Or from a specific base branch
git worktree add ../mi-proyecto-SCRUM-42 -b feature/SCRUM-42 develop
```

### Step 3: Navigate to Worktree

```bash
cd ../mi-proyecto-SCRUM-42
```

### Step 4: Setup (First Time Only)

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with correct values

# Verify setup
bash specboot.sh --init
```

### Step 5: Start Working

```bash
# You're now in an isolated environment
# Start development
npm run dev

# Open in editor
code .
```

---

## Managing Multiple Worktrees

### List Active Worktrees

```bash
git worktree list
```

**Output:**
```
/path/to/main-repo         8e3f2a1 [main]
/path/to/mi-proyecto-SCRUM-42  4b2c9d1 [feature/SCRUM-42]
/path/to/mi-proyecto-SCRUM-43  7a1b3c5 [feature/SCRUM-43]
```

### Switch Between Worktrees

```bash
# Go to specific worktree
cd ../mi-proyecto-SCRUM-42

# Or use git checkout in any worktree
git worktree move feature/SCRUM-42 ../nuevo-path
```

### Suspend Work (Without Cleanup)

Just close the terminal or `cd` away. Work is preserved.

---

## Cleanup Process

### After PR Merged

```bash
# From main repository directory
git checkout main
git pull origin main

# Remove the worktree
git worktree remove ../mi-proyecto-SCRUM-42

# Delete the branch (if fully merged)
git branch -d feature/SCRUM-42
```

### Force Remove (If Branch Has Uncommitted Changes)

```bash
git worktree remove --force ../mi-proyecto-SCRUM-42
git branch -D feature/SCRUM-42  # Use -D if branch wasn't merged
```

### Verify Cleanup

```bash
git worktree list
# Should only show main worktree
```

---

## Useful Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# List worktrees
alias gwt='git worktree list'

# Create worktree with ticket
wt-create() {
  local ticket=$1
  local name=$(basename "$PWD")
  git worktree add "../${name}-${ticket}" -b "feature/${ticket}"
  cd "../${name}-${ticket}"
}

# Remove worktree and branch
wt-clean() {
  local ticket=$1
  local name=$(basename "$PWD")
  git worktree remove "../${name}-${ticket}"
  git branch -d "feature/${ticket}"
}

# Quick navigate to main
wt-main() {
  cd "$(git worktree list | grep '['main']' | awk '{print $1}')"
}

# Navigate to worktree by ticket
wt-go() {
  local ticket=$1
  local name=$(basename "$PWD")
  cd "../${name}-${ticket}" 2>/dev/null || echo "Worktree not found: ${ticket}"
}
```

Then reload shell:
```bash
source ~/.bashrc
```

Usage:
```bash
wt-create SCRUM-42   # Create worktree for SCRUM-42
wt-clean SCRUM-42    # Remove worktree for SCRUM-42
wt-go SCRUM-42       # Navigate to SCRUM-42 worktree
wt-main             # Navigate to main worktree
gwt                  # List all worktrees
```

---

## Complete Workflow Example

```bash
# 1. Create worktree at project root
cd ~/projects/mi-proyecto
git worktree add ../mi-proyecto-AUTH-42 -b feature/AUTH-42

# 2. Navigate and setup
cd ../mi-proyecto-AUTH-42
npm install
cp .env.example .env
# Edit .env

# 3. Verify setup
bash specboot.sh --init

# 4. Start OpenCode
opencode

# 5. Work on feature using SDD workflow
/enrich-us AUTH-42    # (optional)
/plan-change AUTH-42
/apply AUTH-42
/verify AUTH-42
/adversarial-review   # (optional)
/archive AUTH-42
/commit

# 6. After PR merged, cleanup
cd ~/projects/mi-proyecto
git worktree remove ../mi-proyecto-AUTH-42
git branch -d feature/AUTH-42
```

---

## Troubleshooting

### "Cannot create worktree: 'refname' is already occupied"

The branch already exists. Either:
- `git worktree add ../existing -b new-name` to use different branch name
- Or `git worktree add ../existing` to checkout existing branch

### " fatal: 'feature/X' is already a worktree at:"

The worktree already exists. Check with `git worktree list`.

### Worktree Desync

If main branch was force-pushed:
```bash
git fetch origin main
git worktree prune  # Clean up stale references
```

---

## Notes

- Worktrees share the Git history with the main repository
- Each worktree has its own working directory and staging area
- Branches cannot be checked out in multiple worktrees simultaneously
- On Windows, avoid paths with spaces or special characters
- IDE: Each worktree can be opened as a separate IDE window