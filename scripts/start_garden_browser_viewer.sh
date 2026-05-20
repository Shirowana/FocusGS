#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VIEWER_DIR="$REPO_ROOT/frontend/gs-browser-viewer"

cd "$VIEWER_DIR"
npm run dev
