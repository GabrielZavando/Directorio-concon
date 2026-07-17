#!/usr/bin/env bash
# TDD test for check-refs.sh — referential integrity of {file:...} references.
#
# Verifies, against fixtures and the real repo, that check-refs.sh:
#   - fails (non-zero exit) when a {file:...} reference is broken
#   - passes (exit 0) when all references resolve
#   - passes on the current repository (no broken references)
#
# Run: bash tests/check-refs-test.sh

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/check-refs.sh"

PASS=0
FAIL=0

# assert <description> <expected_exit> <actual_exit>
assert() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" -eq 0 ] && [ "$actual" -eq 0 ]; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  elif [ "$expected" -ne 0 ] && [ "$actual" -ne 0 ]; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (expected exit $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

# --- Precondition (RED before implementation): script must exist ---
if [ ! -f "$SCRIPT" ]; then
  echo "  ✗ check-refs.sh does not exist yet (RED)"
  exit 1
fi

# --- Fixture 1: broken references must FAIL ---
FIXTURE_BROKEN="$(mktemp -d)"
mkdir -p "$FIXTURE_BROKEN/ai-specs/skills/demo"
cat > "$FIXTURE_BROKEN/opencode.json" <<'JSON'
{
  "agent": {
    "build": { "prompt": "{file:ai-specs/agents/build-agent.md}" },
    "reviewer": { "prompt": "{file:ai-specs/missing-skill.md}" }
  }
}
JSON
cat > "$FIXTURE_BROKEN/ai-specs/skills/demo/SKILL.md" <<'MD'
# Demo
See {file:ai-specs/does-not-exist.md} for details.
MD
bash "$SCRIPT" --root "$FIXTURE_BROKEN" >/tmp/check-refs-broken.out 2>&1
assert "broken fixture reports failure" 1 $?

# --- Fixture 2: valid references must PASS ---
FIXTURE_OK="$(mktemp -d)"
mkdir -p "$FIXTURE_OK/ai-specs/agents" "$FIXTURE_OK/ai-specs/skills/demo"
cat > "$FIXTURE_OK/opencode.json" <<'JSON'
{
  "agent": {
    "build": { "prompt": "{file:ai-specs/agents/build-agent.md}" }
  }
}
JSON
cat > "$FIXTURE_OK/ai-specs/agents/build-agent.md" <<'MD'
# build agent
MD
cat > "$FIXTURE_OK/ai-specs/skills/demo/SKILL.md" <<'MD'
# Demo
See {file:ai-specs/agents/build-agent.md}.
MD
# AGENTS.md must mention the demo skill folder so the new check passes.
cat > "$FIXTURE_OK/AGENTS.md" <<'MD'
# Agents
Skills: demo
MD
bash "$SCRIPT" --root "$FIXTURE_OK" >/tmp/check-refs-ok.out 2>&1
assert "valid fixture passes" 0 $?

# --- Fixture 3: a skill folder missing from AGENTS.md must FAIL ---
FIXTURE_SKILL="$(mktemp -d)"
mkdir -p "$FIXTURE_SKILL/ai-specs/agents" "$FIXTURE_SKILL/ai-specs/skills/demo" "$FIXTURE_SKILL/ai-specs/skills/other"
cat > "$FIXTURE_SKILL/opencode.json" <<'JSON'
{
  "agent": {
    "build": { "prompt": "{file:ai-specs/agents/build-agent.md}" }
  }
}
JSON
cat > "$FIXTURE_SKILL/ai-specs/agents/build-agent.md" <<'MD'
# build agent
MD
cat > "$FIXTURE_SKILL/ai-specs/skills/demo/SKILL.md" <<'MD'
# Demo
MD
cat > "$FIXTURE_SKILL/ai-specs/skills/other/SKILL.md" <<'MD'
# Other
MD
# AGENTS.md that mentions only one of the two skill folders on purpose.
cat > "$FIXTURE_SKILL/AGENTS.md" <<'MD'
# Agents
Skills: demo
MD
bash "$SCRIPT" --root "$FIXTURE_SKILL" >/tmp/check-refs-skill.out 2>&1
assert "missing skill folder in AGENTS.md reports failure" 1 $?

# --- Fixture 4: every skill folder mentioned in AGENTS.md must PASS ---
FIXTURE_SKILL_OK="$(mktemp -d)"
mkdir -p "$FIXTURE_SKILL_OK/ai-specs/agents" "$FIXTURE_SKILL_OK/ai-specs/skills/demo" "$FIXTURE_SKILL_OK/ai-specs/skills/other"
cat > "$FIXTURE_SKILL_OK/opencode.json" <<'JSON'
{
  "agent": {
    "build": { "prompt": "{file:ai-specs/agents/build-agent.md}" }
  }
}
JSON
cat > "$FIXTURE_SKILL_OK/ai-specs/agents/build-agent.md" <<'MD'
# build agent
MD
cat > "$FIXTURE_SKILL_OK/ai-specs/skills/demo/SKILL.md" <<'MD'
# Demo
MD
cat > "$FIXTURE_SKILL_OK/ai-specs/skills/other/SKILL.md" <<'MD'
# Other
MD
cat > "$FIXTURE_SKILL_OK/AGENTS.md" <<'MD'
# Agents
Skills: demo and other
MD
bash "$SCRIPT" --root "$FIXTURE_SKILL_OK" >/tmp/check-refs-skill-ok.out 2>&1
assert "all skill folders mentioned in AGENTS.md passes" 0 $?

# --- Real repo: must pass (no broken references, all skills listed) ---
bash "$SCRIPT" >/tmp/check-refs-real.out 2>&1
assert "real repository passes" 0 $?

rm -rf "$FIXTURE_BROKEN" "$FIXTURE_OK" "$FIXTURE_SKILL" "$FIXTURE_SKILL_OK"

echo ""
echo "TDD tests: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
