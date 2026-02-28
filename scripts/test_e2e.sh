#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/curriculum-vitae"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_PID=""

cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi
    rm -f "$PROJECT_ROOT/e2e_test.db"
}
trap cleanup EXIT

echo -e "${GREEN}=== E2E Tests ===${NC}"

# Load .env if present (for JWT_SECRET_KEY, MISTRAL_API_KEY, etc.)
if [ -f "$PROJECT_ROOT/.env" ]; then
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
        # Remove leading/trailing whitespace
        key=$(echo "$key" | xargs)
        # Export the variable
        export "$key"="$value"
    done < "$PROJECT_ROOT/.env"
fi

# Use a local SQLite database for E2E tests
E2E_DB="$PROJECT_ROOT/e2e_test.db"
rm -f "$E2E_DB"
export DATABASE_URL="sqlite:///$E2E_DB"

# 1. Create DB tables directly (SQLite doesn't support all Alembic migrations)
echo -e "${YELLOW}Creating database tables...${NC}"
cd "$BACKEND_DIR"
uv run python -c "
from sqlalchemy import create_engine, JSON
from database.models import Base, Resume
# Remap JSONB -> JSON for SQLite compatibility
Resume.__table__.c.json_content.type = JSON()
engine = create_engine('$DATABASE_URL')
Base.metadata.create_all(bind=engine)
print('Tables created.')
"

# 2. Start the backend
echo -e "${YELLOW}Starting backend on port 8000...${NC}"
uv run uvicorn app:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend...${NC}"
for i in $(seq 1 30); do
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        echo -e "${GREEN}Backend ready.${NC}"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo -e "${RED}Backend failed to start.${NC}"
        exit 1
    fi
    sleep 1
done

# 3. Run Playwright (it starts the frontend via webServer config)
echo -e "${GREEN}Running Playwright tests...${NC}"
cd "$FRONTEND_DIR"
npx playwright test "$@"

echo -e "${GREEN}=== E2E Tests Done ===${NC}"
