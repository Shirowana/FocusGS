#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIEWER_DIR="$SCRIPT_DIR/gs-browser-viewer"

cd "$VIEWER_DIR"
npm run dev
