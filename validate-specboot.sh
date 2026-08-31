#!/bin/bash
# validate-specboot.sh — Validate project .specboot.json against the canonical schema.
#
# Distributed by @gabrielzavando/specboot (intocable). The project runs it (or it is
# invoked by `specboot.sh --ci`). See docs/specboot-json-standard.md for the schema and
# the full validation contract.
#
# Exit codes:
#   0 = valid, or only warnings (e.g. missing file is non-blocking)
#   1 = hard error (invalid JSON, missing required field, version mismatch, bad path)
#
# Usage:
#   bash validate-specboot.sh [--root <dir>]
#
# Design notes:
#   - JSON parsing uses `node` when available; if node is missing we validate what we
#     can (presence, JSON, required fields, paths) and skip the version check with a
#     non-blocking warning.
#   - The installed framework version is resolved, in order, from:
#       1) `specboot.sh --version`   (preferred; added in TICKET-0.3)
#       2) node_modules/@gabrielzavando/specboot/package.json
#       3) the repo's own ./package.json  (dogfooding: repo is the framework itself)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  cd "$SCRIPT_DIR"
fi

# Allow running against a specific root directory.
ROOT_DIR="."
while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT_DIR="${2:-.}"; shift 2 ;;
    *) shift ;;
  esac
done
if [ ! -d "$ROOT_DIR" ]; then
  echo "❌ Root directory not found: $ROOT_DIR"
  exit 1
fi
cd "$ROOT_DIR"

# ---------------------------------------------------------------------------
# Colors (match specboot.sh style)
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# ---------------------------------------------------------------------------
# Resolve the installed framework version
# ---------------------------------------------------------------------------
get_framework_version() {
  # 1) specboot.sh --version (if available and emits a version)
  if [ -x "specboot.sh" ] && version_out=$(bash specboot.sh --version 2>/dev/null); then
    if echo "$version_out" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+'; then
      echo "$version_out" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1
      return 0
    fi
  fi
  # 2) node_modules package
  if [ -f "node_modules/@gabrielzavando/specboot/package.json" ] && command -v node >/dev/null 2>&1; then
    node -e "try{console.log(require('./node_modules/@gabrielzavando/specboot/package.json').version)}catch(e){process.exit(1)}" 2>/dev/null && return 0
  fi
  # 3) repo's own package.json (dogfooding)
  if [ -f "package.json" ] && command -v node >/dev/null 2>&1; then
    node -e "try{console.log(require('./package.json').version)}catch(e){process.exit(1)}" 2>/dev/null && return 0
  fi
  return 1
}

# Compare two SemVer strings: echoes "gt" | "lt" | "eq" | "bad"
semver_cmp() {
  local a="$1" b="$2"
  # Strip build (+) and pre-release (-) metadata before numeric compare so a version
  # like 1.2.3-rc.1 or 1.2.3+build does not produce a non-integer component.
  a="${a%%+*}"; a="${a%%-*}"
  b="${b%%+*}"; b="${b%%-*}"
  local a_major a_minor a_patch b_major b_minor b_patch
  IFS='.' read -r a_major a_minor a_patch <<< "$a"
  IFS='.' read -r b_major b_minor b_patch <<< "$b"
  # Coerce empties to 0
  a_major=${a_major:-0}; a_minor=${a_minor:-0}; a_patch=${a_patch:-0}
  b_major=${b_major:-0}; b_minor=${b_minor:-0}; b_patch=${b_patch:-0}
  if [ "$a_major" -gt "$b_major" ]; then echo "gt"; return; fi
  if [ "$a_major" -lt "$b_major" ]; then echo "lt"; return; fi
  if [ "$a_minor" -gt "$b_minor" ]; then echo "gt"; return; fi
  if [ "$a_minor" -lt "$b_minor" ]; then echo "lt"; return; fi
  if [ "$a_patch" -gt "$b_patch" ]; then echo "gt"; return; fi
  if [ "$a_patch" -lt "$b_patch" ]; then echo "lt"; return; fi
  echo "eq"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
echo "🔍 Validando .specboot.json (root: $ROOT_DIR)"

CONFIG_FILE=".specboot.json"

# Case 1: file missing -> warning, non-blocking (exit 0)
if [ ! -f "$CONFIG_FILE" ]; then
  warn ".specboot.json no encontrado. Corre 'specboot init' para crearlo."
  echo ""
  echo -e "  ${YELLOW}⚠${NC} Validación omitida (archivo ausente)."
  exit 0
fi

# JSON parsing helper (node-based); if node missing we degrade gracefully.
if ! command -v node >/dev/null 2>&1; then
  warn "Node.js no instalado: se omite validación profunda de JSON/versión."
  # Minimal presence check only.
  if grep -q '"frameworkVersion"' "$CONFIG_FILE" && grep -q '"services"' "$CONFIG_FILE" && grep -q '"stack"' "$CONFIG_FILE"; then
    pass "Campos requeridos presentes (chequeo mínimo sin node)."
    exit 0
  else
    fail "Faltan campos requeridos (chequeo mínimo sin node)."
    exit 1
  fi
fi

# Case 2: invalid JSON -> error exit 1
if ! node -e "JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'))" 2>/dev/null; then
  fail "$CONFIG_FILE no es JSON válido."
  echo ""
  echo -e "  ${RED}✗${NC} Validación fallida."
  exit 1
fi
pass "$CONFIG_FILE es JSON válido."

# Read fields via node into shell variables
FRAMEWORK_VERSION=$(node -e "try{const j=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));console.log(j.frameworkVersion??'')}catch(e){}")
SERVICES_JSON=$(node -e "try{const j=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));console.log(JSON.stringify(j.services||null))}catch(e){}")
STACK_JSON=$(node -e "try{const j=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));console.log(JSON.stringify(j.stack||null))}catch(e){}")
LAYERS_JSON=$(node -e "try{const j=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));console.log(JSON.stringify(j.layers===undefined?null:j.layers))}catch(e){}")

# Case 3: required fields missing -> error exit 1
missing=""
[ -z "$FRAMEWORK_VERSION" ] && missing="${missing} frameworkVersion"
if [ "$SERVICES_JSON" = "null" ] || [ -z "$SERVICES_JSON" ]; then
  missing="${missing} services"
fi
if [ "$STACK_JSON" = "null" ] || [ -z "$STACK_JSON" ]; then
  missing="${missing} stack"
fi
if [ -n "$missing" ]; then
  fail "Faltan campos requeridos:${missing}"
  echo ""
  echo -e "  ${RED}✗${NC} Validación fallida."
  exit 1
fi
pass "Campos requeridos presentes (frameworkVersion, services, stack)."

# Case 4: version comparison
INSTALLED=$(get_framework_version || true)
if [ -z "$INSTALLED" ]; then
  warn "No se pudo determinar la versión instalada del framework; se omite la comparación de versión."
else
  cmp_result=$(semver_cmp "$FRAMEWORK_VERSION" "$INSTALLED")
  case "$cmp_result" in
    gt)
      fail "frameworkVersion ($FRAMEWORK_VERSION) es mayor que la versión instalada ($INSTALLED): proyecto requiere versión más nueva del framework."
      echo ""
      echo -e "  ${RED}✗${NC} Validación fallida."
      exit 1
      ;;
    lt)
      warn "frameworkVersion ($FRAMEWORK_VERSION) es menor que la instalada ($INSTALLED): framework desactualizado, corre 'specboot update'."
      ;;
    eq)
      pass "frameworkVersion ($FRAMEWORK_VERSION) coincide con la instalada ($INSTALLED)."
      ;;
    *)
      warn "No se pudo comparar la versión (formato inesperado): declarada='$FRAMEWORK_VERSION', instalada='$INSTALLED'."
      ;;
  esac
fi

# Case 5: services paths must exist
node -e "
  const j=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));
  const svc=j.services;
  if(!Array.isArray(svc)){process.exit(2);}
  let bad=[];
  for(const s of svc){ if(s==='.'){ if(!require('fs').existsSync('.')) bad.push(s); } else if(!require('fs').existsSync(s)){ bad.push(s); } }
  if(bad.length){ console.log(bad.join('\n')); process.exit(3); }
  process.exit(0);
" 2>/dev/null
svc_rc=$?
if [ "$svc_rc" -eq 2 ]; then
  fail "services debe ser un array de strings."
  echo ""
  echo -e "  ${RED}✗${NC} Validación fallida."
  exit 1
elif [ "$svc_rc" -eq 3 ]; then
  bad_paths=$(node -e "
    const j=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));
    const bad=[];
    for(const s of j.services){ if(s==='.'){ if(!require('fs').existsSync('.')) bad.push(s); } else if(!require('fs').existsSync(s)){ bad.push(s); } }
    console.log(bad.join(', '));
  " 2>/dev/null)
  fail "services contiene rutas inexistentes: $bad_paths"
  echo ""
  echo -e "  ${RED}✗${NC} Validación fallida."
  exit 1
else
  pass "Todas las rutas de services existen."
fi

# Case 6: layers (if present) must be an object
if [ "$LAYERS_JSON" != "null" ] && [ -n "$LAYERS_JSON" ]; then
  # Re-read the file path (do NOT interpolate the serialized value, which breaks on
  # single quotes inside string labels such as "O'Brien").
  if ! node -e "
    const j=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));
    const l=j.layers;
    if(l===undefined||l===null){process.exit(0);}
    if(typeof l!=='object'||Array.isArray(l)){process.exit(1);}
    process.exit(0);
  " 2>/dev/null; then
    fail "layers debe ser un objeto (mapa servicio -> [capas])."
    echo ""
    echo -e "  ${RED}✗${NC} Validación fallida."
    exit 1
  fi
  pass "layers es un objeto válido."
fi

echo ""
echo "================================"
echo "📊 Resumen"
echo "================================"
echo -e "  ${RED}Errores: $ERRORS${NC}"
echo -e "  ${YELLOW}Warnings: $WARNINGS${NC}"

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo -e "  ${RED}✗ Validación fallida.${NC}"
  exit 1
fi

if [ "$WARNINGS" -gt 0 ]; then
  echo ""
  echo -e "  ${YELLOW}⚠ Validación con warnings (no bloqueante).${NC}"
  exit 0
fi

echo ""
echo -e "  ${GREEN}✓ .specboot.json válido.${NC}"
exit 0
