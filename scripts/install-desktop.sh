#!/usr/bin/env bash
# Install the Artix/Linux .desktop launcher for the current user.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/packaging/docs-term.desktop"
DEST_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
DEST="$DEST_DIR/docs-term.desktop"
mkdir -p "$DEST_DIR"
cp "$SRC" "$DEST"
# Prefer the start script so the server comes up if needed.
if [[ -x "$ROOT/scripts/start-docs-term.sh" ]]; then
  sed -i "s|^Exec=.*|Exec=$ROOT/scripts/start-docs-term.sh|" "$DEST" 2>/dev/null \
    || sed -i '' "s|^Exec=.*|Exec=$ROOT/scripts/start-docs-term.sh|" "$DEST"
fi
chmod 644 "$DEST"
echo "Installed: $DEST"
echo "If the app menu does not refresh, run: update-desktop-database \"$DEST_DIR\" (optional)"
