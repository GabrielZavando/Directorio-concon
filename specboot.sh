#!/bin/bash
# specboot.sh — Combined setup & validation for Zavando Specboot (SDD template)
#
# Replaces the former setup.sh and validate.sh with a single script.
#
# Usage:
#   bash specboot.sh --init   Verify project structure (local setup)
#   bash specboot.sh --ci     Validate configuration for CI (no side effects, strict exit codes)
#   bash specboot.sh --help   Show this help

# Resolve the script directory; only change cwd when executed directly
# (not when sourced for tests).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  cd "$SCRIPT_DIR"
fi

# Do NOT use 'set -e': this script counts errors/warnings and must keep running.
set -uo pipefail

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() {
  echo -e "  ${RED}✗${NC} $1"
  ERRORS=$((ERRORS + 1))
}
warn() {
  echo -e "  ${YELLOW}⚠${NC} $1"
  WARNINGS=$((WARNINGS + 1))
}
info() { echo -e "  ${BLUE}ℹ${NC} $1"; }

# ---------------------------------------------------------------------------
# Single source of truth: required files (shared by --init and --ci)
# ---------------------------------------------------------------------------
REQUIRED_FILES=(
  "AGENTS.md"
  "opencode.json"
  "LICENSE"
  "specboot.sh"
  "check-refs.sh"
  "update.sh"
  "README.md"
  "docs/base-standards.md"
  "docs/backend-standards.md"
  "docs/frontend-standards.md"
  "docs/documentation-standards.md"
  "docs/api-spec.yml"
  "docs/data-model.md"
  "docs/deploy-standards.md"
  "ai-specs/README.md"
  "ai-specs/agents/backend-developer.md"
  "ai-specs/agents/frontend-developer.md"
  "ai-specs/agents/build-agent.md"
  "ai-specs/skills/enrich-us/SKILL.md"
  "ai-specs/skills/commit/SKILL.md"
  "ai-specs/skills/code-auditing/SKILL.md"
  "ai-specs/skills/using-git-worktrees/SKILL.md"
  "ai-specs/skills/deploy/SKILL.md"
  "ai-specs/skills/onboarding/SKILL.md"
  ".github/pull_request_template.md"
)

# Note: This template is OpenCode-only. Agent and skill artifacts live in
# ai-specs/ and are consumed directly by OpenCode via {file:...} references in
# opencode.json. No .claude/ or .cursor/ symlinks are created.

# Skill directories that must contain a SKILL.md.
SKILL_DIRS=(
  "ai-specs/skills/enrich-us"
  "ai-specs/skills/commit"
  "ai-specs/skills/code-auditing"
  "ai-specs/skills/using-git-worktrees"
  "ai-specs/skills/deploy"
  "ai-specs/skills/onboarding"
)

# Placeholder patterns that must NOT remain in docs/.
PLACEHOLDER_PATTERNS=(
  "\[definir stack"
  "\[Clean Architecture"
  "\[descripción del dominio"
  "\[nombre del cliente"
  "\[definir stack del proyecto"
)

# Example files (warn if missing).
EXAMPLE_FILES=(
  "ai-specs/examples/scenarios-example.md"
  "ai-specs/examples/requirements-example.md"
  "ai-specs/examples/ticket-ejemplo.md"
  "ai-specs/examples/tasks.md"
)

DEFAULT_MODEL="deepseek-v4-flash-free"

# ---------------------------------------------------------------------------
# Checks (shared)
# ---------------------------------------------------------------------------
check_file_structure() {
  echo "→ Verificando estructura de archivos..."
  local f
  for f in "${REQUIRED_FILES[@]}"; do
    if [ -f "$f" ]; then
      pass "$f"
    else
      fail "FALTA: $f"
    fi
  done
}

check_placeholders() {
  echo "→ Verificando placeholders sin reemplazar..."
  local pattern found=false
  for pattern in "${PLACEHOLDER_PATTERNS[@]}"; do
    if grep -rqE "$pattern" docs/ 2>/dev/null; then
      warn "Placeholder '$pattern' encontrado en: $(grep -rlE "$pattern" docs/ 2>/dev/null | tr '\n' ', ')"
      found=true
    fi
  done
  if [ "$found" = false ]; then
    pass "Sin placeholders detectados en docs/"
  fi
}

check_opencode_json() {
  echo "→ Verificando opencode.json..."
  if command -v node &> /dev/null; then
    if node -e "JSON.parse(require('fs').readFileSync('opencode.json'))" 2>/dev/null; then
      pass "opencode.json es JSON válido"
      if grep -q "\"model\": \"$DEFAULT_MODEL\"" opencode.json 2>/dev/null; then
        warn "opencode.json usa el model por defecto ($DEFAULT_MODEL)"
      else
        pass "Model personalizado configurado"
      fi
    else
      fail "opencode.json tiene errores de sintaxis"
    fi
  else
    warn "Node.js no instalado, no se puede validar JSON"
  fi
}

check_skills() {
  echo "→ Verificando skills..."
  local skill
  for skill in "${SKILL_DIRS[@]}"; do
    if [ -d "$skill" ] && [ -f "$skill/SKILL.md" ]; then
      pass "$skill/SKILL.md"
    else
      fail "$skill/SKILL.md (falta)"
    fi
  done
}

check_examples() {
  echo "→ Verificando ejemplos..."
  local ex
  for ex in "${EXAMPLE_FILES[@]}"; do
    if [ -f "$ex" ]; then
      pass "$ex"
    else
      warn "$ex (falta - agregar para mejores ejemplos)"
    fi
  done
}

check_git_hooks() {
  echo "→ Verificando git hooks..."
  if [ -f ".husky/commit-msg" ]; then
    pass "commit-msg hook instalado"
  elif [ -d ".husky" ]; then
    warn "Directorio .husky existe pero commit-msg no configurado"
  else
    info "Husky no instalado (opcional)"
  fi
}

check_ci_cd() {
  echo "→ Verificando CI/CD..."
  if [ -f ".github/workflows/ci.yml" ]; then
    pass "GitHub Actions CI configurado"
  else
    warn ".github/workflows/ci.yml no encontrado"
  fi
  if [ -f ".commitlintrc.json" ]; then
    pass "commitlint configurado"
  else
    info ".commitlintrc.json no encontrado (opcional)"
  fi
}

check_refs() {
  echo "→ Verificando integridad referencial (check-refs.sh)..."
  bash check-refs.sh || ERRORS=$((ERRORS + 1))
}

print_summary() {
  echo ""
  echo "================================"
  echo "📊 Resumen"
  echo "================================"
  echo -e "  ${RED}Errores: $ERRORS${NC}"
  echo -e "  ${YELLOW}Warnings: $WARNINGS${NC}"
}

# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------
run_init() {
  echo "🔧 Zavando Specboot — Setup SDD"
  echo "================================"
  echo ""
  check_file_structure
  echo ""
  check_placeholders
  echo ""
  check_opencode_json
  echo ""
  print_summary

  if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Setup incompleto: faltan archivos requeridos.${NC}"
    echo "Revisar la estructura del repositorio."
    exit 1
  fi

  echo ""
  echo "✅ Setup completo."
  if [ "$WARNINGS" -gt 0 ]; then
    echo ""
    echo "⚠️  Recuerda personalizar los archivos docs/ antes de comenzar."
  fi
  echo ""
  echo "Próximos pasos:"
  echo "   1. Editar docs/base-standards.md con el stack del proyecto"
  echo "   2. Editar docs/backend-standards.md y docs/frontend-standards.md"
  echo "   3. Actualizar opencode.json con el modelo y reglas del proyecto"
  echo "   4. Ejecutar: openspec init"
  echo "   5. Comenzar con: /enrich-us TICKET-ID o /plan-change TICKET-ID"
}

run_ci() {
  echo "🔍 Zavando Specboot — Validation (CI)"
  echo "================================"
  echo ""
  check_file_structure
  echo ""
  check_placeholders
  echo ""
  check_opencode_json
  echo ""
  check_skills
  echo ""
  check_examples
  echo ""
  check_git_hooks
  echo ""
  check_ci_cd
  echo ""
  check_refs
  echo ""
  print_summary

  if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Validación fallida${NC}"
    echo "Corrige los errores antes de continuar."
    exit 1
  elif [ "$WARNINGS" -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Validación con warnings${NC}"
    echo "Revisa los warnings opcionales."
    exit 0
  else
    echo ""
    echo -e "${GREEN}✅ Validación exitosa${NC}"
    echo "El proyecto está correctamente configurado."
    exit 0
  fi
}

show_help() {
  sed -n '2,8p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  case "${1:-}" in
    --init) run_init ;;
    --ci)   run_ci ;;
    --help|-h|"") show_help ;;
    *) echo "Opción desconocida: $1"; echo "Usa --init, --ci o --help"; exit 2 ;;
  esac
fi
