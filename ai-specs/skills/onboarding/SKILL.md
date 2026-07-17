# Skill: onboarding

## Description

Onboarding guide for new developers joining an Agency Zavando project. Setup environment, configure tools, and first steps.

**Use when:** New developer joins the team. Run by the team lead or self-serve.

## Pre-onboarding (Before Day 1)

The team lead should:

1. [ ] Create GitHub account and add to organization
2. [ ] Send invite to Slack/Discord workspace
3. [ ] Create Jira/Linear account with appropriate role
4. [ ] Share `.env` file securely (use 1Password or similar)
5. [ ] Assign first ticket ("Welcome Ticket" or "Setup")

---

## Day 1 Checklist

### 1. Environment Setup

#### Clone the repository

```bash
git clone https://github.com/org/project-name.git
cd project-name
```

#### Install dependencies

```bash
# Node.js projects
npm install

# Verify installation
node --version    # Should match .nvmrc or engines in package.json
npm --version
```

#### Copy environment file

```bash
cp .env.example .env
# Edit .env with values provided by team lead
```

#### Start the development server

```bash
# Backend
npm run dev        # Starts API on http://localhost:3000

# Frontend (if separate repo)
npm run dev        # Starts on http://localhost:5173
```

### 2. Verify Installation

```bash
# Run the test suite
npm test

# Run linting
npm run lint

# Health check (API running)
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### 3. Configure IDE

#### VS Code (recommended)

Install extensions:
- ESLint
- Prettier
- TypeScript Hero
- GitLens

Settings to add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

#### JetBrains (WebStorm/IDEA)

- Enable ESLint and Prettier integration
- Set "Format on save" to Prettier

### 4. Git Configuration

```bash
# Set identity (use your real name and agency email)
git config user.name "Your Name"
git config user.email "your.name@zavando.cl"

# Set default branch name
git config init.defaultBranch main

# Enable signing commits (recommended)
# gpg --full-generate-key (first time only)
git config commit.gpgsign true
git config tag.gpgsign true
```

### 5. Get Help

If stuck:

1. Check `docs/` folder — most answers are documented
2. Ask in the `#dev-help` Slack channel
3. Check recent commits for patterns: `git log --oneline -20`
4. Read `ai-specs/README.md` for workflow guidance

---

## Project Structure Overview

```
project/
├── docs/                    # 📋 Documentation (read these first)
│   ├── base-standards.md
│   ├── backend-standards.md
│   ├── frontend-standards.md
│   ├── api-spec.yml         # API contracts
│   └── data-model.md        # Database schema
├── ai-specs/                # ⚙️ AI agent configuration
│   ├── agents/
│   ├── skills/
│   └── examples/
├── src/                     # 💻 Application code
│   ├── domain/              #   Business logic
│   ├── application/         #   Use cases
│   ├── infrastructure/       #   DB, external APIs
│   └── presentation/         #   API routes, controllers
├── tests/                   # 🧪 Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .openspec/               # 🔄 OpenSpec change artifacts
├── .env.example             # 📝 Environment template
├── package.json
└── README.md               # Start here
```

---

## Key Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm test` | Run test suite |
| `npm run lint` | Lint code |
| `npm run build` | Production build |
| `openspec ff-change TICKET-ID` | Start a new change |

---

## First Week Goals

### Day 1-2: Environment & First PR
- [ ] Complete setup above
- [ ] Make a small PR (fix typo in docs, add comment)
- [ ] Get PR approved and merged

### Day 3-4: First Feature
- [ ] Pick up a "starter" ticket (labeled `good-first-issue`)
- [ ] Follow the SDD workflow: `/plan-change` → `/apply` → `/verify`
- [ ] Complete the full cycle

### Day 5: Retrospective
- [ ] Share feedback on onboarding experience
- [ ] Update this file if you found unclear steps

---

## Team Contacts

| Role | Name | Slack |
|------|------|-------|
| Tech Lead | [Name] | @[handle] |
| Backend Lead | [Name] | @[handle] |
| Frontend Lead | [Name] | @[handle] |
| DevOps | [Name] | @[handle] |

---

## Resources

- [OpenCode Documentation](https://opencode.ai/docs)
- [OpenSpec Documentation](https://openspec.dev)
- [Agency Standards](docs/base-standards.md)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## Common Issues

### Port already in use

```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>
```

### Docker not running

```bash
# macOS
open -a Docker

# Ubuntu
sudo systemctl start docker
```

### Node version mismatch

```bash
# If using nvm
nvm install
nvm use

# Verify
node --version  # Should match .nvmrc
```