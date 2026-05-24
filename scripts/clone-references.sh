#!/usr/bin/env bash
# Clones OSS reference repos to .references/ for code reading during development.
# These are NOT included in the build — they're documentation.

set -e

REFS_DIR=".references"

mkdir -p "$REFS_DIR"
cd "$REFS_DIR"

clone_or_pull() {
  local url=$1
  local dir=$2
  if [ -d "$dir" ]; then
    echo "→ Updating $dir"
    cd "$dir" && git pull --ff-only && cd ..
  else
    echo "→ Cloning $url"
    git clone --depth 1 "$url" "$dir"
  fi
}

clone_or_pull "https://github.com/bryanjenningz/react-duolingo.git" "react-duolingo"
clone_or_pull "https://github.com/sanidhyy/duolingo-clone.git" "duolingo-clone"
clone_or_pull "https://github.com/chbornman/rpg-pixel-map-generator.git" "rpg-pixel-map-generator"
clone_or_pull "https://github.com/seanmorley15/AdventureLog.git" "AdventureLog"

echo ""
echo "✓ All references ready in $REFS_DIR/"
echo "  Use these for inspiration ONLY. Code copying respects licenses (cf CREDITS.md)."
