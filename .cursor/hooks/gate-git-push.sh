#!/usr/bin/env bash
# Thin wrapper — real gate is gate-git-push.mjs (Windows-safe Node).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/.cursor/hooks/gate-git-push.mjs"
