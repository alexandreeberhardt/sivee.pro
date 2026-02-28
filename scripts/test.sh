#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== Backend tests ==="
cd curriculum-vitae
uv run pytest tests/ -v
cd ..

echo ""
echo "=== Frontend tests ==="
cd frontend
npm test
