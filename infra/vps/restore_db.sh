#!/bin/bash
# ===========================================
# CV Generator - PostgreSQL Restore Script
# ===========================================
# Usage: ./restore_db.sh <backup_file.sql.gz>

set -euo pipefail

# Configuration (overridable via environment)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_FROM_SCRIPT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/cv-generator}"
APP_DIR="${APP_DIR:-}"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Auto-detect APP_DIR if not provided
if [ -z "$APP_DIR" ]; then
    if [ -f "$ROOT_FROM_SCRIPT/.env" ] && [ -f "$ROOT_FROM_SCRIPT/infra/docker/docker-compose.yml" ]; then
        APP_DIR="$ROOT_FROM_SCRIPT"
    elif [ -f "/opt/cv-generator/.env" ] && [ -f "/opt/cv-generator/infra/docker/docker-compose.yml" ]; then
        APP_DIR="/opt/cv-generator"
    elif [ -f "$HOME/sivee.pro/.env" ] && [ -f "$HOME/sivee.pro/infra/docker/docker-compose.yml" ]; then
        APP_DIR="$HOME/sivee.pro"
    else
        echo -e "${RED}Error: Could not detect APP_DIR. Set APP_DIR=/path/to/project.${NC}"
        exit 1
    fi
fi

# Vérifier les arguments
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <backup_file.sql.gz>${NC}"
    echo -e "\nAvailable backups:"
    ls -lh "$BACKUP_DIR"/cv_database_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Si le chemin n'est pas absolu, chercher dans BACKUP_DIR
if [[ ! "$BACKUP_FILE" = /* ]]; then
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
fi

# Vérifier que le fichier existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Charger les variables d'environnement
ENV_FILE="$APP_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found in APP_DIR=$APP_DIR${NC}"
    exit 1
fi

# Parse a variable from .env without executing the file.
read_env_var() {
    local key="$1"
    local value
    value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 | cut -d'=' -f2-)"
    # Trim optional surrounding quotes
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    printf '%s' "$value"
}

POSTGRES_USER="${POSTGRES_USER:-$(read_env_var POSTGRES_USER)}"
POSTGRES_DB="${POSTGRES_DB:-$(read_env_var POSTGRES_DB)}"
POSTGRES_USER="${POSTGRES_USER:-cvuser}"
POSTGRES_DB="${POSTGRES_DB:-cvdatabase}"

echo "=== PostgreSQL Restore - $(date) ==="
echo -e "${YELLOW}Backup file: $BACKUP_FILE${NC}"
echo -e "${YELLOW}Target database: $POSTGRES_DB${NC}"

# Confirmation
echo -e "\n${RED}WARNING: This will OVERWRITE the current database!${NC}"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Vérifier que le container est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "cv-postgres"; then
    echo -e "${RED}Error: PostgreSQL container (cv-postgres) is not running${NC}"
    exit 1
fi

# Effectuer la restauration
echo -e "\n${YELLOW}Restoring database...${NC}"

cd "$APP_DIR"
gunzip -c "$BACKUP_FILE" | docker exec -i cv-postgres psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --quiet

echo -e "${GREEN}Database restored successfully!${NC}"

# Vérifier la restauration
echo -e "\n${YELLOW}Verifying restoration...${NC}"
docker exec -i cv-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"

echo -e "\n=== Restore completed at $(date) ==="
