#!/bin/bash
set -e

echo "=== Backend tests ==="
cd curriculum-vitae
uv run pytest tests/ -v
cd ..

echo ""
echo "=== Frontend tests ==="
cd frontend
npm test
