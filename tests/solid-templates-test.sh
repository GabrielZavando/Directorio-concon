#!/usr/bin/env bash
# tests/solid-templates-test.sh
# Meta-validation test for the SOLID CI templates in templates/ci/
# Ensures the template files are syntactically valid and contain expected rules.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL+1)); }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }

echo "→ Validating templates/ci/ SOLID templates"

# 1. Check all 7 files exist
required=(
  "templates/ci/eslintrc.backend.js"
  "templates/ci/eslintrc.frontend.js"
  "templates/ci/eslintrc.astro.js"
  "templates/ci/.dependency-cruiser.js"
  "templates/ci/.madge.config.json"
  "templates/ci/package.ci.json"
  "templates/ci/README.md"
)

for f in "${required[@]}"; do
  if [[ -f "$f" ]]; then
    pass "exists: $f"
  else
    fail "missing: $f"
  fi
done

# 2. Validate JS/JSON syntax
if command -v node >/dev/null; then
  for js in templates/ci/eslintrc.backend.js templates/ci/eslintrc.frontend.js templates/ci/eslintrc.astro.js; do
    if node -c "$js" 2>/dev/null; then
      pass "syntax OK: $js"
    else
      fail "syntax ERROR: $js"
    fi
  done

  for json in templates/ci/.madge.config.json templates/ci/package.ci.json; do
    if node -e "JSON.parse(require('fs').readFileSync('$json', 'utf8'))" 2>/dev/null; then
      pass "JSON OK: $json"
    else
      fail "JSON ERROR: $json"
    fi
  done

  # dependency-cruiser config uses module.exports = {} — validate with node
  if node -c templates/ci/.dependency-cruiser.js 2>/dev/null; then
    pass "syntax OK: templates/ci/.dependency-cruiser.js"
  else
    fail "syntax ERROR: templates/ci/.dependency-cruiser.js"
  fi
else
  warn "Node.js not available; skipping syntax checks"
fi

# 3. Check key thresholds present in backend eslint
if grep -q 'max-lines' templates/ci/eslintrc.backend.js && grep -q 'max: 300' templates/ci/eslintrc.backend.js; then
  pass "backend max-lines 300 present"
else
  fail "backend max-lines 300 NOT found"
fi

if grep -qE "complexity:\s*\['error'" templates/ci/eslintrc.backend.js; then
  pass "backend complexity present"
else
  fail "backend complexity NOT found"
fi

if grep -q 'sonarjs/cognitive-complexity' templates/ci/eslintrc.backend.js; then
  pass "backend sonarjs/cognitive-complexity present"
else
  fail "backend sonarjs/cognitive-complexity NOT found"
fi

if grep -q "max-params" templates/ci/eslintrc.backend.js; then
  pass "backend max-params present"
else
  fail "backend max-params NOT found"
fi

# 4. Check dependency-cruiser key rules exist
if grep -q 'no-infra-from-domain' templates/ci/.dependency-cruiser.js; then
  pass "dependency-cruiser no-infra-from-domain present"
else
  fail "dependency-cruiser no-infra-from-domain NOT found"
fi

if grep -q 'no-orm-or-http-from-domain' templates/ci/.dependency-cruiser.js; then
  pass "dependency-cruiser no-orm-or-http-from-domain present"
else
  fail "dependency-cruiser no-orm-or-http-from-domain NOT found"
fi

if grep -q 'no-application-importing-concrete-repository' templates/ci/.dependency-cruiser.js; then
  pass "dependency-cruiser no-application-importing-concrete-repository present"
else
  fail "dependency-cruiser no-application-importing-concrete-repository NOT found"
fi

# 5. Check tsConfig points to ./tsconfig.json (relative to CWD when invoked)
if grep -q "project: './tsconfig.json'" templates/ci/eslintrc.backend.js; then
  pass "dependency-cruiser tsConfig ./tsconfig.json"
else
  fail "dependency-cruiser tsConfig NOT ./tsconfig.json"
fi

# 6. Check frontend eslint has max-lines 400
if grep -q 'max-lines' templates/ci/eslintrc.frontend.js && grep -q 'max: 400' templates/ci/eslintrc.frontend.js; then
  pass "frontend max-lines 400 present"
else
  fail "frontend max-lines 400 NOT found"
fi

# 7. Check madge config points to frontend/tsconfig.app.json
if grep -q 'frontend/tsconfig.app.json' templates/ci/.madge.config.json; then
  pass "madge config points to frontend/tsconfig.app.json"
else
  fail "madge config NOT pointing to frontend/tsconfig.app.json"
fi

# 8. Check README.md exists and mentions thresholds
if grep -q 'max-lines' templates/ci/README.md && grep -q 'dependency-cruiser' templates/ci/README.md; then
  pass "README.md documents thresholds and dependency-cruiser"
else
  fail "README.md missing expected documentation"
fi

echo
echo "=== Summary ==="
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0