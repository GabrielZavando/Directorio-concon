#!/bin/bash
# check-refs.sh - Validate {file:...} references and skill registration in AGENTS.md

set -e

# Allow running against a specific root directory (used by tests/fixtures).
# Usage: bash check-refs.sh [--root <dir>]
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

echo "🔍 Validating references and skill registration... (root: $ROOT_DIR)"

errors=0
files_checked=0

# Function to check a single file reference
check_ref() {
  local ref=$1
  files_checked=$((files_checked + 1))
  
  if [ ! -f "$ref" ]; then
    echo "❌ Missing file: $ref"
    errors=$((errors + 1))
  else
    echo "✅ Found: $ref"
  fi
}

echo ""
echo "Step 1/3: Checking {file:...} references in opencode.json..."

# Extract all {file:...} patterns from opencode.json (POSIX-compatible)
if [ -f "opencode.json" ]; then
  while IFS= read -r ref; do
    [ -z "$ref" ] && continue
    check_ref "$ref"
  done < <(grep -oE '\{file:[^}]+\}' opencode.json | sed -E 's/^\{file:(.+)\}$/\1/' | sort -u)
fi

echo ""
echo "Step 2/3: Checking {file:...} references in ai-specs/**/*.md and .opencode/**/*.md..."

# Extract all {file:...} patterns from ai-specs/**/*.md and .opencode/**/*.md (POSIX, escaped braces)
while IFS= read -r file; do
  while IFS= read -r ref; do
    [ -z "$ref" ] && continue
    check_ref "$ref"
  done < <(grep -oE '\{file:[^}]+\}' "$file" 2>/dev/null | sed -E 's/^\{file:(.+)\}$/\1/' | sort -u)
done < <(find ai-specs .opencode -name '*.md' -type f 2>/dev/null)

echo ""
echo "Step 3/3: Checking skill registration in AGENTS.md..."

# Verify each skill folder appears in AGENTS.md
if [ ! -f "AGENTS.md" ]; then
  echo "❌ AGENTS.md not found"
  errors=$((errors + 1))
else
  for skill_dir in ai-specs/skills/*/; do
    if [ -d "$skill_dir" ]; then
      skill_name=$(basename "$skill_dir")
      if grep -q "$skill_name" AGENTS.md; then
        echo "✅ Skill registered in AGENTS.md: $skill_name"
      else
        echo "❌ Skill NOT registered in AGENTS.md: $skill_name"
        errors=$((errors + 1))
      fi
    fi
  done
fi

# Summary
echo ""
echo "📊 Summary: Checked $files_checked file references, found $errors errors"

if [ $errors -gt 0 ]; then
  echo "❌ Validation failed: $errors errors found"
  exit 1
fi

echo "✅ All validations passed"
exit 0
