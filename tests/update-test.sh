#!/usr/bin/env bash
# TDD test for update.sh — sync tooling into a project and cut a version bump.
#
# Run: bash tests/update-test.sh

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/update.sh"

PASS=0
FAIL=0

assert_exit() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" -eq 0 ] && [ "$actual" -eq 0 ]; then
    echo "  ✓ $desc"; PASS=$((PASS + 1))
  elif [ "$expected" -ne 0 ] && [ "$actual" -ne 0 ]; then
    echo "  ✓ $desc"; PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (expected exit $expected, got $actual)"; FAIL=$((FAIL + 1))
  fi
}
assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $desc"; PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (expected '$expected', got '$actual')"; FAIL=$((FAIL + 1))
  fi
}

if [ ! -f "$SCRIPT" ]; then
  echo "  ✗ update.sh does not exist yet (RED)"; exit 1
fi

# ---------- Sync test ----------
TEMPLATE="$(mktemp -d)"
PROJECT="$(mktemp -d)"
mkdir -p "$TEMPLATE/ai-specs/skills/demo" "$TEMPLATE/docs"
mkdir -p "$PROJECT/ai-specs/skills/demo" "$PROJECT/docs"
echo "new-agent"    > "$TEMPLATE/ai-specs/agents.md"
echo "new-agents"   > "$TEMPLATE/AGENTS.md"
echo "new-specboot" > "$TEMPLATE/specboot.sh"
echo "new-checkrefs"> "$TEMPLATE/check-refs.sh"
echo "new-makefile" > "$TEMPLATE/Makefile"
echo "template-docs-do-not-sync" > "$TEMPLATE/docs/secret.md"
echo "old-agent"    > "$PROJECT/ai-specs/agents.md"
echo "old-agents"   > "$PROJECT/AGENTS.md"
echo "old-specboot" > "$PROJECT/specboot.sh"
echo "CUSTOM DOCS - keep me" > "$PROJECT/docs/base-standards.md"
echo "marker"       > "$PROJECT/project-marker.txt"

( cd "$PROJECT" && bash "$SCRIPT" --template "$TEMPLATE" --dry-run ) >/tmp/up-dry.out 2>&1
assert_exit "sync dry-run exits 0" 0 $?

( cd "$PROJECT" && bash "$SCRIPT" --template "$TEMPLATE" ) >/tmp/up.out 2>&1
assert_exit "sync exits 0" 0 $?

assert_eq "ai-specs synced"      "new-agent"    "$(cat "$PROJECT/ai-specs/agents.md")"
assert_eq "AGENTS.md synced"     "new-agents"   "$(cat "$PROJECT/AGENTS.md")"
assert_eq "specboot.sh synced"   "new-specboot" "$(cat "$PROJECT/specboot.sh")"
assert_eq "check-refs.sh synced" "new-checkrefs" "$(cat "$PROJECT/check-refs.sh")"
assert_eq "Makefile synced"      "new-makefile" "$(cat "$PROJECT/Makefile")"
assert_eq "docs/ untouched"      "CUSTOM DOCS - keep me" "$(cat "$PROJECT/docs/base-standards.md")"
assert_eq "project marker intact" "marker"     "$(cat "$PROJECT/project-marker.txt")"

# ---------- Bump test ----------
REPO="$(mktemp -d)"
( cd "$REPO" && git init -q && git config user.email t@t.t && git config user.name t \
  && printf '# Changelog\n' > CHANGELOG.md \
  && printf '## [Unreleased]\n\n## [0.0.0] - 2000-01-01\n' >> CHANGELOG.md \
  && git add -A && git commit -qm init ) >/dev/null 2>&1

( cd "$REPO" && bash "$SCRIPT" --template "$REPO" --bump minor ) >/tmp/up-bump.out 2>&1
assert_exit "bump exits 0" 0 $?
if git -C "$REPO" tag | grep -q "v0.1.0"; then
  echo "  ✓ tag v0.1.0 created"; PASS=$((PASS + 1))
else
  echo "  ✗ tag v0.1.0 created"; FAIL=$((FAIL + 1))
fi
if grep -q "## \[0.1.0\]" "$REPO/CHANGELOG.md"; then
  echo "  ✓ CHANGELOG has 0.1.0"; PASS=$((PASS + 1))
else
  echo "  ✗ CHANGELOG has 0.1.0"; FAIL=$((FAIL + 1))
fi

rm -rf "$TEMPLATE" "$PROJECT" "$REPO"

echo ""
echo "TDD tests: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
