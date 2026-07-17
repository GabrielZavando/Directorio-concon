#!/usr/bin/env bash
# update.sh — Sync Specboot template tooling into an existing project and cut releases.
#
# Modes:
#   bash update.sh [--template DIR] [--dry-run]
#       Copy the template-owned, non-customizable files into the current project,
#       WITHOUT touching docs/ (which the project personalizes).
#   bash update.sh --bump <major|minor|patch> [--template DIR]
#       Maintainers: bump the Specboot semver (git tag vX.Y.Z), prepend a CHANGELOG
#       entry, then sync the tooling.
#
# Sync set (relative to the template directory):
#   ai-specs/  AGENTS.md  specboot.sh  check-refs.sh  Makefile

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR"
DRY_RUN=0
BUMP=""

while [ $# -gt 0 ]; do
  case "$1" in
    --template) TEMPLATE="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=1; shift ;;
    --bump)     BUMP="$2"; shift 2 ;;
    --help|-h)  sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opción desconocida: $1"; exit 2 ;;
  esac
done

# Target is the directory the user invoked the script from (their project).
TARGET="$(pwd)"

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
pass() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; ERRORS=$((ERRORS + 1)); }
note() { echo -e "  ${YELLOW}ℹ${NC} $1"; }

# Template-owned files/dirs that may be safely overwritten in the target project.
SYNC_ITEMS=(
  "ai-specs"
  "AGENTS.md"
  "specboot.sh"
  "check-refs.sh"
  "Makefile"
)

sync_item() {
  local item="$1"
  local src="$TEMPLATE/$item"
  local dst="$TARGET/$item"

  # Never touch docs/, regardless of configuration.
  case "$item" in
    docs/*|docs) warn "Omite $item (docs/ es personalizable por el proyecto)"; return ;;
  esac

  if [ ! -e "$src" ]; then
    warn "Origen no encontrado en el template: $item (se omite)"
    return
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "  → would sync: $item"
    return
  fi

  if [ -d "$src" ]; then
    rm -rf "$dst"
    cp -R "$src" "$dst"
  else
    cp "$src" "$dst"
  fi
  pass "synced: $item"
}

do_sync() {
  # Avoid deleting/recopying the template into itself.
  if [ "$TARGET" = "$TEMPLATE" ]; then
    note "Target y template son iguales; no se sincroniza (usa --template para otro origen)."
    return
  fi

  echo "🔄 Specboot — Sync tooling"
  echo "Template: $TEMPLATE"
  echo "Target:   $TARGET"
  echo ""
  local item
  for item in "${SYNC_ITEMS[@]}"; do
    sync_item "$item"
  done
  echo ""
  if [ "$DRY_RUN" -eq 1 ]; then
    note "Dry-run: no se modificó nada."
  else
    pass "Sync completado. docs/ no fue tocado."
  fi
}

do_bump() {
  # Current version comes from the latest semver git tag (fallback 0.0.0).
  local current
  current="$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")"
  current="${current#v}"
  local major minor patch
  IFS='.' read -r major minor patch <<< "$current"
  major="${major:-0}"; minor="${minor:-0}"; patch="${patch:-0}"

  case "$BUMP" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    patch) patch=$((patch + 1)) ;;
    *) echo "Uso: update.sh --bump <major|minor|patch>"; exit 2 ;;
  esac

  local new_ver="$major.$minor.$patch"
  local new_tag="v$new_ver"
  local today
  today="$(date +%F)"

  echo "🔖 Specboot — Bump version"
  echo "  $current -> $new_tag"
  echo ""

  # Prepend a CHANGELOG.md entry right after the Unreleased section.
  local entry
  entry="## [$new_ver] - $today

### Changed

- Tooling synced to Specboot $new_tag.

"
  if [ -f CHANGELOG.md ]; then
    if grep -q '## \[Unreleased\]' CHANGELOG.md; then
      awk -v e="$entry" '/## \[Unreleased\]/ && !ins {print; print e; ins=1; next} {print}' \
        CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
    else
      printf '%s\n' "$entry" | cat - CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
    fi
  else
    {
      echo "# Changelog"
      echo ""
      echo "All notable changes to Specboot are documented here."
      echo ""
      echo "## [Unreleased]"
      echo ""
      printf '%s\n' "$entry"
    } > CHANGELOG.md
  fi
  pass "CHANGELOG.md actualizado con $new_tag"

  if git tag "$new_tag" 2>/dev/null; then
    pass "Tag $new_tag creado"
  else
    warn "No se pudo crear el tag $new_tag (¿ya existe?)"
  fi

  note "Recuerda commitear CHANGELOG.md y empujar el tag: git push origin $new_tag"

  # Finally, sync the tooling as well.
  do_sync
}

if [ -n "$BUMP" ]; then
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo -e "${RED}❌ --bump requiere un repositorio git.${NC}"
    exit 1
  fi
  do_bump
else
  do_sync
fi
