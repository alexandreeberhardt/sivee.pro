#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Frontend: ESLint ==="
cd "$ROOT/frontend" && npx eslint src/

echo ""
echo "=== Frontend: Prettier ==="
npx prettier --check src/

echo ""
echo "=== Backend: Ruff check ==="
cd "$ROOT/curriculum-vitae" && uv run ruff check .

echo ""
echo "=== Backend: Ruff format ==="
uv run ruff format --check .

echo ""
echo "All checks passed."
