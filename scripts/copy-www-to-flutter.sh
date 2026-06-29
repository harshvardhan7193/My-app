#!/usr/bin/env bash
# Copy the Vite production build into the Flutter asset bundle for offline shell.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/frontend/dist"
DEST="$ROOT/flutter_app/assets/www"

echo "Building frontend for Flutter bundle (relative asset paths)..."
(cd "$ROOT/frontend" && VITE_BASE=./ npm run build)

rm -rf "$DEST"
mkdir -p "$DEST"
cp -r "$DIST/." "$DEST/"
echo "Copied $DIST -> $DEST"
