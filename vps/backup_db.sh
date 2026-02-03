#!/bin/bash
# ===========================================
# CV Generator - PostgreSQL Backup Script
# ===========================================
# Usage: ./backup_db.sh
# Cron:  0 3 * * * $HOME/sivee.pro/vps/backup_db.sh >> /var/log/cv-backup.log 2>&1

set -e

# Configuration
BACKUP_DIR="$HOME/backups/sivee"
APP_DIR="$HOME/sivee.pro"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="cv_database_${DATE}.sql.gz"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== PostgreSQL Backup - $(date) ==="

# Vérifier que le répertoire de backup existe
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}Creating backup directory: $BACKUP_DIR${NC}"
    mkdir -p "$BACKUP_DIR"
fi

# Charger les variables d'environnement
if [ -f "$APP_DIR/.env" ]; then
    source "$APP_DIR/.env"
else
    echo -e "${RED}Error: .env file not found in $APP_DIR${NC}"
    exit 1
fi

# Variables par défaut si non définies
POSTGRES_USER="${POSTGRES_USER:-cvuser}"
POSTGRES_DB="${POSTGRES_DB:-cvdatabase}"

# Vérifier que le container PostgreSQL est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "cv-postgres"; then
    echo -e "${RED}Error: PostgreSQL container (cv-postgres) is not running${NC}"
    exit 1
fi

# Effectuer le backup
echo -e "${YELLOW}Starting backup of database '${POSTGRES_DB}'...${NC}"

cd "$APP_DIR"
docker compose exec -T db pg_dump \
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
