#!/bin/bash
# ===========================================
# CV Generator - Database Migration Script
# ===========================================
# Usage:
#   ./scripts/migrate.sh              # Auto-detect environment
#   ./scripts/migrate.sh dev          # Force development mode
#   ./scripts/migrate.sh prod         # Force production mode
#   ./scripts/migrate.sh generate     # Generate new migration (dev only)
#   ./scripts/migrate.sh history      # Show migration history

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detect environment
detect_environment() {
    # Check if we're on the VPS (production)
    if [ -d "/opt/cv-generator" ] && [ -f "/opt/cv-generator/.env" ]; then
        echo "prod"
    # Check if docker-compose.dev.yml exists and dev containers are running
    elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q "cv-backend-dev"; then
        echo "dev-docker"
    # Check if we have a local .venv
    elif [ -d "curriculum-vitae/.venv" ] || [ -f "curriculum-vitae/pyproject.toml" ]; then
        echo "dev-local"
    else
        echo "unknown"
    fi
}

# Run Alembic command
run_alembic() {
    local cmd="$1"
    local env="$2"

    case "$env" in
        "prod")
            echo -e "${BLUE}Running in PRODUCTION mode${NC}"
            cd /opt/cv-generator
            docker compose exec -T cv-generator uv run alembic $cmd
            ;;
        "dev-docker")
            echo -e "${BLUE}Running in DEVELOPMENT mode (Docker)${NC}"
            docker compose -f docker-compose.dev.yml exec -T backend uv run alembic $cmd
            ;;
        "dev-local")
            echo -e "${BLUE}Running in DEVELOPMENT mode (Local)${NC}"
            cd curriculum-vitae
            if [ -z "$DATABASE_URL" ]; then
                export DATABASE_URL="postgresql://cvuser:devpassword@localhost:5432/cvdatabase"
                echo -e "${YELLOW}Using default DATABASE_URL: $DATABASE_URL${NC}"
            fi
            uv run alembic $cmd
            ;;
        *)
            echo -e "${RED}Error: Could not detect environment${NC}"
            echo "Please specify: ./scripts/migrate.sh [dev|prod]"
            exit 1
            ;;
    esac
}

# Show usage
show_usage() {
    echo "Usage: ./scripts/migrate.sh [command] [environment]"
    echo ""
    echo "Commands:"
    echo "  (none)      Apply all pending migrations (upgrade head)"
    echo "  generate    Create a new migration from model changes (dev only)"
    echo "  history     Show migration history"
    echo "  current     Show current migration version"
    echo "  downgrade   Rollback one migration"
    echo ""
    echo "Environments:"
    echo "  dev         Force development mode"
    echo "  prod        Force production mode"
    echo "  (auto)      Auto-detect environment"
    echo ""
    echo "Examples:"
    echo "  ./scripts/migrate.sh                    # Apply migrations (auto-detect)"
    echo "  ./scripts/migrate.sh generate           # Generate new migration"
    echo "  ./scripts/migrate.sh generate 'Add profile photo column'"
    echo "  ./scripts/migrate.sh history            # Show history"
    echo "  ./scripts/migrate.sh prod               # Apply migrations in production"
}

# Main
main() {
    local command="${1:-upgrade}"
    local env_override="$2"
    local message="$3"

    # Handle help
    if [ "$command" = "-h" ] || [ "$command" = "--help" ]; then
        show_usage
        exit 0
    fi

    # Detect or use override environment
    if [ -n "$env_override" ] && [ "$env_override" != "dev" ] && [ "$env_override" != "prod" ]; then
        # Second argument is the migration message, not environment
        message="$env_override"
        env_override=""
    fi

    local env="${env_override:-$(detect_environment)}"

    echo -e "${GREEN}=== CV Generator Migration ===${NC}"
    echo -e "Environment: ${YELLOW}$env${NC}"
    echo ""

    case "$command" in
        "upgrade"|"dev"|"prod")
            if [ "$command" = "dev" ] || [ "$command" = "prod" ]; then
                env="$command"
                if [ "$env" = "dev" ]; then
                    env="dev-docker"
                fi
            fi
            echo -e "${YELLOW}Applying all pending migrations...${NC}"
            run_alembic "upgrade head" "$env"
            echo -e "${GREEN}Migrations applied successfully!${NC}"
            ;;

        "generate")
            if [ "$env" = "prod" ]; then
                echo -e "${RED}Error: Cannot generate migrations in production!${NC}"
                echo "Generate migrations locally, then deploy."
                exit 1
            fi

            if [ -z "$message" ]; then
                read -p "Migration message: " message
            fi

            if [ -z "$message" ]; then
                echo -e "${RED}Error: Migration message is required${NC}"
                exit 1
            fi

            echo -e "${YELLOW}Generating migration: $message${NC}"
            run_alembic "revision --autogenerate -m \"$message\"" "$env"
            echo -e "${GREEN}Migration generated! Review the file before applying.${NC}"
            ;;

        "history")
            echo -e "${YELLOW}Migration history:${NC}"
            run_alembic "history --verbose" "$env"
            ;;

        "current")
            echo -e "${YELLOW}Current migration:${NC}"
            run_alembic "current" "$env"
            ;;

        "downgrade")
            echo -e "${RED}WARNING: Rolling back one migration${NC}"
            read -p "Are you sure? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                run_alembic "downgrade -1" "$env"
                echo -e "${GREEN}Rollback complete${NC}"
            else
                echo "Cancelled"
            fi
            ;;

        *)
            echo -e "${RED}Unknown command: $command${NC}"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
