#!/bin/bash
# ===========================================
# CV Generator - PostgreSQL Backup Script
# ===========================================
# Usage: ./backup_db.sh
# Cron:  0 3 * * * $HOME/sivee.pro/infra/vps/backup_db.sh >> /var/log/cv-backup.log 2>&1

set -euo pipefail

# Configuration (overridable via environment)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_FROM_SCRIPT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/cv-generator}"
APP_DIR="${APP_DIR:-}"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="cv_database_${DATE}.sql.gz"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== PostgreSQL Backup - $(date) ==="

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

# Vérifier que le répertoire de backup existe
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}Creating backup directory: $BACKUP_DIR${NC}"
    mkdir -p "$BACKUP_DIR"
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

# Variables par défaut si non définies dans l'environnement shell
POSTGRES_USER="${POSTGRES_USER:-$(read_env_var POSTGRES_USER)}"
POSTGRES_DB="${POSTGRES_DB:-$(read_env_var POSTGRES_DB)}"
POSTGRES_USER="${POSTGRES_USER:-cvuser}"
POSTGRES_DB="${POSTGRES_DB:-cvdatabase}"

# Vérifier que le container PostgreSQL est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "cv-postgres"; then
    echo -e "${RED}Error: PostgreSQL container (cv-postgres) is not running${NC}"
    exit 1
fi

# Effectuer le backup
echo -e "${YELLOW}Starting backup of database '${POSTGRES_DB}'...${NC}"

docker exec -i cv-postgres pg_dump \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Vérifier que le backup a réussi
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ] && [ -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}Backup successful: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
else
    echo -e "${RED}Error: Backup file is empty or not created${NC}"
    exit 1
fi

# Supprimer les backups anciens
echo -e "${YELLOW}Cleaning up backups older than $RETENTION_DAYS days...${NC}"
DELETED=$(find "$BACKUP_DIR" -name "cv_database_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "Deleted $DELETED old backup(s)"

# Lister les backups existants
echo -e "\n${GREEN}Current backups:${NC}"
ls -lh "$BACKUP_DIR"/cv_database_*.sql.gz 2>/dev/null | tail -10 || echo "No backups found"

# Afficher l'espace disque
echo -e "\n${GREEN}Disk usage:${NC}"
du -sh "$BACKUP_DIR"

echo -e "\n=== Backup completed at $(date) ==="
