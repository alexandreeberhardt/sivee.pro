#!/bin/bash
# ===========================================
# CV Generator - Deployment Script
# ===========================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== CV Generator Deployment ===${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and configure your variables."
    exit 1
fi

# Step 1: Pull latest changes
echo -e "\n${YELLOW}[1/4] Pulling latest changes from git...${NC}"
git pull

# Step 2: Build Docker images
echo -e "\n${YELLOW}[2/4] Building Docker images...${NC}"
docker-compose build

# Step 3: Start services
echo -e "\n${YELLOW}[3/4] Starting services...${NC}"
docker-compose up -d

# Step 4: Wait for database to be ready and run migrations
echo -e "\n${YELLOW}[4/4] Running database migrations...${NC}"

# Wait for the database to be healthy
echo "Waiting for database to be ready..."
timeout=60
counter=0
until docker-compose exec -T db pg_isready -U "${POSTGRES_USER:-cvuser}" -d "${POSTGRES_DB:-cvdatabase}" > /dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}Error: Database failed to start within ${timeout} seconds${NC}"
        exit 1
    fi
    sleep 1
done
echo "Database is ready!"

# Run Alembic migrations
echo "Applying database migrations..."
docker-compose exec -T cv-generator uv run alembic upgrade head

# Show status
echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "\nService status:"
docker-compose ps

echo -e "\n${GREEN}Application is running at http://localhost:8099${NC}"
echo -e "Health check: curl http://localhost:8099/api/health"
echo -e "Database health: curl http://localhost:8099/health_db"
