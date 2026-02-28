#!/bin/bash
# ===========================================
# CV Generator - PostgreSQL Restore Script
# ===========================================
# Usage: ./restore_db.sh <backup_file.sql.gz>

set -e

# Configuration
BACKUP_DIR="/var/backups/cv-generator"
APP_DIR="/opt/cv-generator"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
if [ -f "$APP_DIR/.env" ]; then
    source "$APP_DIR/.env"
else
    echo -e "${RED}Error: .env file not found in $APP_DIR${NC}"
    exit 1
fi

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
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --quiet

echo -e "${GREEN}Database restored successfully!${NC}"

# Vérifier la restauration
echo -e "\n${YELLOW}Verifying restoration...${NC}"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"

echo -e "\n=== Restore completed at $(date) ==="
